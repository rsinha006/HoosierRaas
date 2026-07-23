import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { getUserMember } from "@/lib/get-user-member";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasWriteAccess } from "@/lib/rbac";
import { ONBOARDING_STORAGE_BUCKET } from "@/lib/onboarding";
import { formatMemberName, type Member } from "@/lib/members";
import {
  buildExportRows,
  DOCUMENT_CATEGORY_FIELD,
  getMemberDocumentEntries,
  type ExportCategoryKey,
} from "@/lib/member-export";

type ExportRequestBody = {
  memberIds?: string[];
  categories?: ExportCategoryKey[];
};

export async function POST(request: Request) {
  const callerMember = await getUserMember();

  if (!hasWriteAccess(callerMember?.exec_title ?? null, "members")) {
    return NextResponse.json(
      { error: "You do not have permission to export member data." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as ExportRequestBody | null;
  const memberIds = Array.isArray(body?.memberIds) ? body.memberIds : [];
  const categories = Array.isArray(body?.categories) ? body.categories : [];

  if (memberIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one member to export." },
      { status: 400 },
    );
  }

  if (categories.length === 0) {
    return NextResponse.json(
      { error: "Select at least one data category to export." },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();

    const { data, error } = await admin.from("members").select("*").in("id", memberIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const members = (data ?? []) as Member[];
    const zip = new JSZip();

    const selectedDocumentFields = new Set(
      categories
        .map((key) => DOCUMENT_CATEGORY_FIELD[key])
        .filter((field): field is NonNullable<typeof field> => Boolean(field)),
    );

    if (selectedDocumentFields.size > 0) {
      for (const member of members) {
        for (const entry of getMemberDocumentEntries(member)) {
          if (!selectedDocumentFields.has(entry.field)) {
            continue;
          }

          const { data: fileData } = await admin.storage
            .from(ONBOARDING_STORAGE_BUCKET)
            .download(entry.path);

          if (!fileData) {
            continue;
          }

          const extension = entry.path.split(".").pop() || "bin";
          const documentName = entry.field.replace("_path", "");
          const buffer = Buffer.from(await fileData.arrayBuffer());

          zip.file(
            `documents/${formatMemberName(member)}/${documentName}.${extension}`,
            buffer,
          );
        }
      }
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Roster");
    const rows = buildExportRows(members, categories);

    if (rows.length > 0) {
      worksheet.columns = Object.keys(rows[0]).map((key) => ({ header: key, key }));
      worksheet.addRows(rows);
    }

    zip.file("roster.xlsx", await workbook.xlsx.writeBuffer());

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Deliver the export even if the audit-log write fails — denying a competition
    // submission over a logging hiccup would be worse than a gap in the log.
    const { error: logError } = await admin.from("member_export_log").insert({
      exported_by_member_id: callerMember?.id ?? null,
      member_ids: memberIds,
      member_count: memberIds.length,
      categories,
    });

    if (logError) {
      console.error("Failed to log member export", logError);
    }

    return new NextResponse(Uint8Array.from(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="member-export-${new Date().toISOString().slice(0, 10)}.zip"`,
      },
    });
  } catch (err) {
    console.error("Member export failed", err);
    return NextResponse.json(
      {
        error:
          "Member export is not configured. Ask your admin to add SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }
}
