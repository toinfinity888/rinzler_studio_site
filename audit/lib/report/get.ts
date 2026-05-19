"use server";

/**
 * T078 — `getPublishedReport(token)` server action.
 *
 * Tokenized read: a hotelier with a valid project token gets the latest
 * published `report_snapshots.rendered_json` for their project, plus an
 * optional signed URL for the PDF when it's been rendered.
 *
 * The snapshot is immutable (FR-094); subsequent changes to vendors /
 * questions / rules NEVER rewrite past output (SC-020).
 */
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { projects, reportSnapshots } from "@/db/schema";
import { hashToken, verifyToken } from "@/lib/tokens";

export type GetPublishedReportResult =
  | {
      ok: true;
      snapshot: {
        id: string;
        published_at: Date;
        rendered_json: Record<string, unknown>;
        pdf_object_key: string | null;
      };
      project_status: string;
    }
  | {
      ok: false;
      reason: "revoked" | "no_snapshot" | "not_ready" | "unauthorized";
    };

export async function getPublishedReport(
  token: string,
): Promise<GetPublishedReportResult> {
  if (!token) return { ok: false, reason: "unauthorized" };
  const candidateHash = hashToken(token);

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.tokenHash, candidateHash))
    .limit(1);
  if (!project) return { ok: false, reason: "unauthorized" };
  if (project.tokenRevokedAt) return { ok: false, reason: "revoked" };
  if (project.status === "purged") return { ok: false, reason: "revoked" };
  if (!project.tokenHash) return { ok: false, reason: "unauthorized" };
  if (!verifyToken(token, project.tokenHash)) {
    return { ok: false, reason: "unauthorized" };
  }

  if (project.status !== "published" && project.status !== "consultant_finalized") {
    // Project hasn't completed the publish step (snapshot doesn't exist yet).
    return { ok: false, reason: "not_ready" };
  }

  const [snap] = await db
    .select()
    .from(reportSnapshots)
    .where(eq(reportSnapshots.projectId, project.id))
    .orderBy(desc(reportSnapshots.publishedAt))
    .limit(1);
  if (!snap) return { ok: false, reason: "no_snapshot" };

  return {
    ok: true,
    snapshot: {
      id: snap.id,
      published_at: snap.publishedAt,
      rendered_json: snap.renderedJson as Record<string, unknown>,
      pdf_object_key: snap.pdfObjectKey,
    },
    project_status: project.status,
  };
}
