import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { buildExport } from "@/lib/export/build";
import { writeAuditEntry } from "@/lib/audit-log";
import { track } from "@/lib/analytics/plausible";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  const { id } = await params;
  const url = new URL(request.url);
  const includeNotes = url.searchParams.get("include") === "notes";

  let payload;
  try {
    payload = await buildExport(id, { includeNotes });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "export_failed" },
      { status: 404 },
    );
  }

  writeAuditEntry({
    actorId: admin.id,
    action: "project.export_json",
    projectId: id,
    metadata: { includeNotes },
  });
  track("admin_export_json", { project_id: id, include_notes: includeNotes });

  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const filename = `audit-${id}-${yyyymmdd}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
