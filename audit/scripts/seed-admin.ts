/**
 * Seed the V1 admin row interactively (T018).
 * Usage: npm run db:seed:admin
 *        npm run db:seed:admin -- --force   # overwrite existing admin
 */
import { hash as argon2Hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import readline from "node:readline/promises";
import { stdin, stdout, exit } from "node:process";
import { createDbClient } from "../lib/db/client";
import { admins } from "../db/schema";

async function main() {
  const force = process.argv.includes("--force");
  const { db, pool } = createDbClient();

  try {
    const existing = await db.select().from(admins).limit(1);
    if (existing.length > 0 && !force) {
      console.error(
        `[seed-admin] An admin already exists (${existing[0]!.email}). Pass --force to overwrite.`,
      );
      await pool.end();
      exit(2);
    }

    const rl = readline.createInterface({ input: stdin, output: stdout });
    try {
      const email = (await rl.question("Admin email: ")).trim().toLowerCase();
      if (!email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
        throw new Error(`Invalid email: ${email}`);
      }
      const password = await rl.question("Password (min 12 chars): ");
      if (password.length < 12) throw new Error("Password must be at least 12 characters.");
      const confirm = await rl.question("Confirm password: ");
      if (password !== confirm) throw new Error("Passwords do not match.");

      const passwordHash = await argon2Hash(password, {
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
      });

      if (existing.length > 0) {
        await db.delete(admins).where(eq(admins.email, existing[0]!.email));
      }
      await db.insert(admins).values({ id: randomUUID(), email, passwordHash });

      console.log(`[seed-admin] Admin '${email}' seeded successfully.`);
    } finally {
      rl.close();
    }
  } finally {
    await pool.end();
  }
}

main().catch(async (err) => {
  console.error(`[seed-admin] ${err instanceof Error ? err.message : String(err)}`);
  exit(1);
});
