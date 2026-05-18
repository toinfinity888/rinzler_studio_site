import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, submissions, answers } from "@/db/schema";
import { hashToken, verifyToken } from "@/lib/tokens";

export interface LoadedProject {
  project: typeof projects.$inferSelect;
  submission: typeof submissions.$inferSelect;
  answers: Record<string, unknown>;
}

/**
 * Look up a project by its plaintext access token, returning null on:
 *   - unknown token
 *   - revoked token (`token_revoked_at` set)
 *   - purged project
 *
 * The same null is returned for all three cases — no enumeration leak (FR-006).
 * On success, also bumps `projects.sent_at` if it was null (i.e. first view).
 */
export async function loadProjectByToken(
  plaintext: string | undefined | null,
): Promise<LoadedProject | null> {
  if (!plaintext) return null;
  const candidateHash = hashToken(plaintext);

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.tokenHash, candidateHash))
    .limit(1);
  if (!project) return null;
  if (project.tokenRevokedAt) return null;
  if (project.status === "purged") return null;
  if (!verifyToken(plaintext, project.tokenHash)) return null;

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.projectId, project.id))
    .limit(1);
  if (!submission) return null;

  const rows = await db
    .select({ fieldId: answers.fieldId, valueJson: answers.valueJson })
    .from(answers)
    .where(eq(answers.submissionId, submission.id));

  const answerMap: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      answerMap[r.fieldId] = JSON.parse(r.valueJson);
    } catch {
      answerMap[r.fieldId] = r.valueJson;
    }
  }

  if (!project.sentAt) {
    await db.update(projects).set({ sentAt: new Date() }).where(eq(projects.id, project.id));
  }

  return { project, submission, answers: answerMap };
}
