import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { parseExtractedPacketResponse } from "@/lib/packet-extraction-parse";
import { PACKET_EXTRACTION_PROMPT } from "@/lib/packet-extraction-prompt";
import {
  PACKET_MIME_TYPE,
  REGISTRATION_PACKETS_BUCKET,
} from "@/lib/registration-packets";
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

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(REGISTRATION_PACKETS_BUCKET)
    .download(storagePath);

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: toUserFacingStorageError(downloadError ?? new Error("not found")) },
      { status: 404 },
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
