/**
 * Google Drive multipart upload helpers.
 * @see https://developers.google.com/drive/api/guides/manage-uploads#multipart
 * @see https://developers.google.com/drive/api/reference/rest/v3/files/update
 */

const GOOGLE_DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

/** Target Google Workspace type — Drive converts uploaded .xlsx on create/update. */
export const GOOGLE_SHEET_MIME_TYPE = "application/vnd.google-apps.spreadsheet";

export const XLSX_SOURCE_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type DriveFileResponse = {
  id?: string;
};

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
 * Build a multipart/related body per RFC 2387.
 * Metadata part first (application/json), media part second.
 */
export function buildMultipartRelatedBody(
  boundary: string,
  metadata: Record<string, unknown>,
  mediaBytes: Uint8Array,
  mediaMimeType: string,
): Uint8Array {
  const encoder = new TextEncoder();
  const prefix = encoder.encode(
    `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mediaMimeType}\r\n\r\n`,
  );
  const suffix = encoder.encode(`\r\n--${boundary}--`);

  const body = new Uint8Array(
    prefix.length + mediaBytes.length + suffix.length,
  );
  body.set(prefix, 0);
  body.set(mediaBytes, prefix.length);
  body.set(suffix, prefix.length + mediaBytes.length);

  return body;
}

async function uploadMultipart(
  accessToken: string,
  method: "POST" | "PATCH",
  url: string,
  metadata: Record<string, unknown>,
  mediaBytes: Uint8Array,
  mediaMimeType: string,
): Promise<string> {
  const boundary = `drive_sync_${crypto.randomUUID()}`;
  const body = buildMultipartRelatedBody(
    boundary,
    metadata,
    mediaBytes,
    mediaMimeType,
  );

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body,
  });

  const responseBody = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      `Google Drive ${method} upload failed with HTTP ${response.status}: ${
        JSON.stringify(responseBody)
      }`,
    );
  }

  const fileId = (responseBody as DriveFileResponse).id;
  if (!fileId) {
    throw new Error(
      `Google Drive ${method} upload succeeded but id was missing: ${
        JSON.stringify(responseBody)
      }`,
    );
  }

  return fileId;
}

/**
 * Create a new native Google Sheet from an .xlsx payload.
 * @see https://developers.google.com/drive/api/guides/manage-uploads#multipart
 */
export async function createSpreadsheetFromXlsx(
  accessToken: string,
  config: {
    name: string;
    folderId: string;
    xlsxBytes: Uint8Array;
  },
): Promise<string> {
  const url =
    `${GOOGLE_DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id`;

  return uploadMultipart(
    accessToken,
    "POST",
    url,
    {
      name: config.name,
      mimeType: GOOGLE_SHEET_MIME_TYPE,
      parents: [config.folderId],
    },
    config.xlsxBytes,
    XLSX_SOURCE_MIME_TYPE,
  );
}

/**
 * Overwrite an existing Google Sheet in place from an .xlsx payload.
 * @see https://developers.google.com/drive/api/reference/rest/v3/files/update
 */
export async function updateSpreadsheetFromXlsx(
  accessToken: string,
  config: {
    fileId: string;
    name: string;
    xlsxBytes: Uint8Array;
  },
): Promise<string> {
  const url =
    `${GOOGLE_DRIVE_UPLOAD_URL}/${config.fileId}?uploadType=multipart&fields=id`;

  return uploadMultipart(
    accessToken,
    "PATCH",
    url,
    {
      name: config.name,
      mimeType: GOOGLE_SHEET_MIME_TYPE,
    },
    config.xlsxBytes,
    XLSX_SOURCE_MIME_TYPE,
  );
}
