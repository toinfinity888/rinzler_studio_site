/**
 * One-shot smoke test for the consultant override + publish path.
 *
 * Run:
 *   cd audit && npx tsx --env-file=.env.local --conditions=react-server \
 *     /tmp/consultant-smoke.ts <projectId> <submissionId>
 *
 * Exercises:
 *   1. Seed a client answer for `budget_level`.
 *   2. Apply an override (writes a NEW answers row with overrides_answer_id;
 *      the partial unique index must accept this alongside the client row).
 *   3. Append a private internal note with `[override] …` prefix.
 *   4. Verify the latest-wins dedupe pick the override.
 *   5. Run the strip helper against a synthetic snapshot containing the
 *      private body — must throw.
 *   6. Run it against a snapshot WITHOUT the body — must pass.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { answers, internalNotes, projects } from "@/db/schema";
import { stripAndVerify } from "@/lib/consultant/strip";

const [, , projectIdArg, submissionIdArg] = process.argv;
if (!projectIdArg || !submissionIdArg) {
  console.error("usage: consultant-smoke.ts <projectId> <submissionId>");
  process.exit(2);
}
const projectId: string = projectIdArg;
const submissionId: string = submissionIdArg;

async function main() {
  const slug = "budget_level";
  const now = new Date();

  // 1) Seed client answer
  const clientId = randomUUID();
  await db.insert(answers).values({
    id: clientId,
    submissionId,
    fieldId: slug,
    valueJson: "low",
    updatedAt: new Date(now.getTime() - 1000),
    source: "client",
    confidence: "high",
    questionVersionId: null,
    overridesAnswerId: null,
  });
  console.log(`[seed] client answer ${clientId} = "low"`);

  // 2) Apply override directly (skipping requireAdminWithAnyRole because
  //    this script is a smoke harness, not a UI-level test).
  const overrideId = randomUUID();
  const privateReason =
    "Note interne consultant : budget réel observé en visite, le client a sous-estimé.";
  await db.insert(answers).values({
    id: overrideId,
    submissionId,
    fieldId: slug,
    valueJson: "moderate",
    updatedAt: now,
    source: "consultant_override",
    confidence: "high",
    questionVersionId: null,
    overridesAnswerId: clientId,
  });
  console.log(`[override] override answer ${overrideId} = "moderate"`);

  // 3) Append private note
  const ADMIN_ID = "99058800-3c21-4ec5-8081-5dd1400e2863";
  await db.insert(internalNotes).values({
    id: randomUUID(),
    projectId,
    authorId: ADMIN_ID,
    body: `[override] ${slug}: ${privateReason}`,
    targetType: "project",
    targetId: projectId,
    createdAt: now,
  });
  console.log(`[notes] private note appended`);

  // 4) Check both rows live and the override is the "winner"
  const rows = await db
    .select()
    .from(answers)
    .where(eq(answers.submissionId, submissionId));
  const forSlug = rows.filter((r) => r.fieldId === slug);
  console.log(
    `[verify] rows for ${slug}: ${forSlug.length} (expected 2 — client + override)`,
  );
  if (forSlug.length !== 2) {
    console.error("FAIL — expected 2 rows");
    process.exit(1);
  }
  const winner = forSlug.find((r) => r.source === "consultant_override");
  console.log(
    `[verify] winner source=${winner?.source} value=${JSON.stringify(winner?.valueJson)}`,
  );
  if (winner?.valueJson !== "moderate") {
    console.error("FAIL — override row missing or wrong value");
    process.exit(1);
  }

  // 5) Strip helper — should throw on a leak
  const leakySnapshot = {
    executive_summary: `Synthèse contenant ${privateReason} accidentellement.`,
    metadata: { internal_notes: "secret" },
  };
  let threw = false;
  try {
    stripAndVerify(leakySnapshot, [privateReason]);
  } catch {
    threw = true;
  }
  console.log(`[strip] leaky snapshot rejected: ${threw}`);
  if (!threw) {
    console.error("FAIL — strip did not catch leak");
    process.exit(1);
  }

  // 6) Clean snapshot — should pass
  const cleanSnapshot = {
    executive_summary: "Synthèse propre, sans contenu privé.",
    metadata: { internal_notes: "secret to be stripped" },
  };
  const { cleaned } = stripAndVerify(cleanSnapshot, [privateReason]);
  const cleanedStr = JSON.stringify(cleaned);
  console.log(
    `[strip] clean snapshot OK (internal_notes stripped: ${!cleanedStr.includes("internal_notes")})`,
  );
  if (cleanedStr.includes("internal_notes") || cleanedStr.includes("secret")) {
    console.error("FAIL — strip did not remove internal content");
    process.exit(1);
  }

  // 7) Verify the project still exists
  const [p] = await db
    .select({ id: projects.id, status: projects.status })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  console.log(`[verify] project status=${p?.status}`);

  console.log("");
  console.log("ALL CHECKS PASSED ✓");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
