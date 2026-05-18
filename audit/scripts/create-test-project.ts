/**
 * Create a test project + submission with a fresh token, then print the
 * audit URL. Used to skip the admin-UI step while feature-001 admin auth
 * is still being wired in this branch.
 *
 *   npm run db:test-project
 *
 * Idempotent: re-running prints a new token; existing projects are left
 * untouched.
 */
import { randomUUID } from "node:crypto";
import { db } from "../lib/db";
import { projects, submissions } from "@/db/schema";
import { generateToken } from "@/lib/tokens";

async function main() {
  const { plaintext, hash } = generateToken();
  const projectId = randomUUID();
  const now = new Date();

  await db.insert(projects).values({
    id: projectId,
    label: `Test project ${now.toISOString().slice(0, 19)}`,
    hotelName: "Hôtel de Démonstration",
    contactEmail: "demo@rinzlerstudio.local",
    priority: "medium",
    status: "in_progress",
    tokenHash: hash,
    tier: "full",
    goalPrimary: "workload_reduction",
    ongoingEngagement: false,
    createdAt: now,
    lastAdminActivityAt: now,
    sentAt: now,
  });

  const submissionId = randomUUID();
  await db.insert(submissions).values({
    id: submissionId,
    projectId,
    completionPct: 0,
    createdAt: now,
    updatedAt: now,
  });

  const port = process.env.PORT ?? "3001";
  console.log("");
  console.log("==============================================");
  console.log("  Test project created");
  console.log("==============================================");
  console.log(`  project_id   : ${projectId}`);
  console.log(`  submission_id: ${submissionId}`);
  console.log(`  token        : ${plaintext}`);
  console.log(``);
  console.log(`  Legacy form  : http://localhost:${port}/a/${plaintext}`);
  console.log(`  Dynamic flow : http://localhost:${port}/a/${plaintext}/audit/start`);
  console.log("==============================================");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[create-test-project]", err);
    process.exit(1);
  });
