import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getUserMember } from "@/lib/get-user-member";
import { hasWriteAccess } from "@/lib/rbac";
import { parseExtractedPacketResponse } from "@/lib/packet-extraction-parse";
import { PACKET_EXTRACTION_PROMPT } from "@/lib/packet-extraction-prompt";
import {
  MAX_PACKET_BYTES,
  MAX_PACKET_MB,
  PACKET_MIME_TYPE,
  REGISTRATION_PACKETS_BUCKET,
} from "@/lib/registration-packets";
import { getActiveSeason } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";
import {
  toUserFacingAuthError,
  toUserFacingExtractionError,
  toUserFacingStorageError,
} from "@/lib/user-facing-errors";

type ExtractPacketRequestBody = {
  storagePath?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: toUserFacingAuthError() }, { status: 401 });
  }

  const member = await getUserMember();
  if (!hasWriteAccess(member?.exec_title ?? null, "team-manager")) {
    return NextResponse.json({ error: toUserFacingAuthError() }, { status: 403 });
  }

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "The AI service is not set up yet. Ask your admin to add the Gemini API key.",
      },
      { status: 500 },
    );
  }

  let body: ExtractPacketRequestBody;
  try {
    body = (await request.json()) as ExtractPacketRequestBody;
  } catch {
    return NextResponse.json(
      { error: "The request was invalid. Please try extracting again." },
      { status: 400 },
    );
  }

  const storagePath = body.storagePath?.trim();
  if (!storagePath) {
    return NextResponse.json(
      { error: "No registration packet was selected. Upload a PDF first." },
      { status: 400 },
    );
  }

  const competitionId = storagePath.split("/")[0];
  const [activeSeason, { data: competitionRow }] = await Promise.all([
    getActiveSeason(),
    supabase.from("competitions").select("season").eq("id", competitionId).maybeSingle(),
  ]);

  if (!competitionRow || competitionRow.season !== activeSeason.label) {
    return NextResponse.json(
      {
        error:
          "This competition belongs to a past, archived season and can't be edited.",
      },
      { status: 403 },
    );
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(REGISTRATION_PACKETS_BUCKET)
    .download(storagePath);

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: toUserFacingStorageError(downloadError ?? new Error("not found")) },
      { status: 404 },
    );
  }

  if (fileData.type && fileData.type !== PACKET_MIME_TYPE) {
    return NextResponse.json(
      { error: "That file isn't a PDF. Upload a PDF registration packet and try again." },
      { status: 415 },
    );
  }

  if (fileData.size > MAX_PACKET_BYTES) {
    return NextResponse.json(
      { error: `That file is too large. Registration packets must be ${MAX_PACKET_MB} MB or smaller.` },
      { status: 413 },
    );
  }

  if (fileData.size === 0) {
    return NextResponse.json(
      { error: "That file is empty. Upload a valid PDF registration packet." },
      { status: 422 },
    );
  }

  const base64 = Buffer.from(await fileData.arrayBuffer()).toString("base64");

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GOOGLE_GEMINI_MODEL ?? "gemini-2.5-flash-lite",
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: PACKET_MIME_TYPE,
          data: base64,
        },
      },
      { text: PACKET_EXTRACTION_PROMPT },
    ]);

    const responseText = result.response.text().trim();
    if (!responseText) {
      return NextResponse.json(
        {
          error:
            "The AI returned an empty response. The PDF may be scanned or unreadable. You can still add deadlines manually on the review screen.",
        },
        { status: 422 },
      );
    }

    const { data, warnings } = parseExtractedPacketResponse(responseText);

    return NextResponse.json({ data, warnings });
  } catch (error) {
    return NextResponse.json(
      { error: toUserFacingExtractionError(error) },
      { status: 500 },
    );
  }
}
