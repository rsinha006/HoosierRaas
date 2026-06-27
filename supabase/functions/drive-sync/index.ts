import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  MEMBER_WORKBOOK_KEY,
  syncWorkbooksToDrive,
  SYNC_TARGET_KEYS,
} from "./sync-workbooks.ts";
import {
  buildWorkbookData,
  logWorkbookData,
} from "./workbook-data.ts";
import { generateWorkbookFiles } from "./workbook-generate.ts";

const DRIVE_FOLDER_NAME = "HROS Mirror";

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

type DriveSyncTargetRow = {
  key: string;
  drive_folder_id: string | null;
};

type GoogleTokenSuccess = {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type: string;
};

type GoogleTokenError = {
  error?: string;
  error_description?: string;
};

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requireGoogleOAuthEnv(): {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
} {
  return {
    clientId: requireEnv("GOOGLE_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    refreshToken: requireEnv("GOOGLE_REFRESH_TOKEN"),
  };
}

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  if (aBytes.length !== bBytes.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < aBytes.length; i++) {
    mismatch |= aBytes[i]! ^ bBytes[i]!;
  }
  return mismatch === 0;
}

function assertAuthorized(req: Request, expectedSecret: string): void {
  const provided = req.headers.get("x-drive-sync-secret");
  if (!provided) {
    throw new HttpError(
      401,
      "Unauthorized: missing x-drive-sync-secret header",
    );
  }

  if (!timingSafeEqual(provided, expectedSecret)) {
    throw new HttpError(401, "Unauthorized: invalid shared secret");
  }
}

function createServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for drive-sync",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Exchange a refresh token for a short-lived access token.
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#offline
 */
async function exchangeRefreshTokenForAccessToken(config: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<GoogleTokenSuccess> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const responseBody = await readResponseBody(response);

  if (!response.ok) {
    const googleError = responseBody as GoogleTokenError;
    const detail = googleError?.error_description ??
      googleError?.error ??
      responseBody;

    throw new HttpError(
      502,
      `Google OAuth token exchange failed with HTTP ${response.status}`,
      {
        httpStatus: response.status,
        googleError: detail,
        responseBody,
      },
    );
  }

  const token = responseBody as GoogleTokenSuccess;
  if (!token.access_token) {
    throw new HttpError(
      502,
      "Google OAuth token exchange succeeded but access_token was missing",
      responseBody,
    );
  }

  return token;
}

/**
 * Create an app-owned Drive folder.
 * @see https://developers.google.com/drive/api/guides/folder
 * @see https://developers.google.com/drive/api/reference/rest/v3/files/create
 */
async function createDriveFolder(
  accessToken: string,
  name: string,
): Promise<string> {
  const response = await fetch(`${GOOGLE_DRIVE_FILES_URL}?fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  const responseBody = await readResponseBody(response);

  if (!response.ok) {
    throw new HttpError(
      502,
      `Google Drive folder creation failed with HTTP ${response.status}`,
      {
        httpStatus: response.status,
        responseBody,
      },
    );
  }

  const folderId = (responseBody as { id?: string }).id;
  if (!folderId) {
    throw new HttpError(
      502,
      "Google Drive folder creation succeeded but id was missing",
      responseBody,
    );
  }

  return folderId;
}

async function loadMemberWorkbookTarget(): Promise<DriveSyncTargetRow> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("drive_sync_targets")
    .select("key, drive_folder_id")
    .eq("key", MEMBER_WORKBOOK_KEY)
    .single();

  if (error) {
    throw new HttpError(
      500,
      `Failed to read drive_sync_targets row '${MEMBER_WORKBOOK_KEY}'`,
      error,
    );
  }

  return data;
}

async function persistFolderId(folderId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("drive_sync_targets")
    .update({ drive_folder_id: folderId })
    .in("key", [...SYNC_TARGET_KEYS]);

  if (error) {
    throw new HttpError(
      500,
      "Failed to persist drive_folder_id to drive_sync_targets",
      error,
    );
  }
}

async function bootstrapFolder(accessToken: string): Promise<{
  folderId: string;
  folderCreated: boolean;
}> {
  const target = await loadMemberWorkbookTarget();

  if (target.drive_folder_id) {
    return {
      folderId: target.drive_folder_id,
      folderCreated: false,
    };
  }

  const folderId = await createDriveFolder(accessToken, DRIVE_FOLDER_NAME);
  await persistFolderId(folderId);

  return {
    folderId,
    folderCreated: true,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let authSucceeded = false;

  try {
    const expectedSecret = requireEnv("DRIVE_SYNC_SECRET");
    assertAuthorized(req, expectedSecret);

    const oauthConfig = requireGoogleOAuthEnv();
    const token = await exchangeRefreshTokenForAccessToken(oauthConfig);
    authSucceeded = true;

    const { folderId, folderCreated } = await bootstrapFolder(
      token.access_token,
    );

    const supabase = createServiceClient();
    const workbookData = await buildWorkbookData(supabase);
    logWorkbookData(workbookData);

    const generatedWorkbooks = generateWorkbookFiles(workbookData);
    const syncResults = await syncWorkbooksToDrive(
      supabase,
      token.access_token,
      folderId,
      generatedWorkbooks,
    );

    return jsonResponse({
      authSucceeded: true,
      folderId,
      folderCreated,
      generatedAt: generatedWorkbooks.generatedAt.toISOString(),
      workbookSummary: {
        season: workbookData.finance.season,
        generalPoolRows: workbookData.finance.generalPool.length,
        categoryBudgetRows: workbookData.finance.categoryBudgets.length,
        iufbEnvelopeRows: workbookData.finance.iufbEnvelope.length,
        activeMemberRows: workbookData.member.members.length,
      },
      syncResults,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(
        {
          authSucceeded,
          error: error.message,
          details: error.body ?? null,
        },
        error.status,
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error("drive-sync failed:", message);

    return jsonResponse(
      {
        authSucceeded,
        error: message,
      },
      500,
    );
  }
});
