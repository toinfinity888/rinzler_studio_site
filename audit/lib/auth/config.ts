import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { verify as argon2Verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { admins } from "@/db/schema";
import { writeAuditEntry } from "@/lib/audit-log";
import { edgeAuthConfig } from "./edge-config";

const credentialsSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

/**
 * In-memory IP rate limiter: 10 attempts per 15 min (R3).
 * Process-local — acceptable for V1 single-node deploy on o2switch; would
 * need shared storage if we ever scale to multiple workers.
 */
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const ATTEMPT_LIMIT = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string | null): boolean {
  if (!ip) return false;
  const now = Date.now();
  const bucket = attempts.get(ip);
  if (!bucket || bucket.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > ATTEMPT_LIMIT;
}

function clearAttempts(ip: string | null): void {
  if (ip) attempts.delete(ip);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...edgeAuthConfig,
  providers: [
    Credentials({
      name: "Email + password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(raw, request) {
        const ip =
          request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          request?.headers?.get("x-real-ip") ??
          null;
        if (isRateLimited(ip)) {
          writeAuditEntry({
            action: "admin.login_failed",
            metadata: { reason: "rate_limited", ip },
          });
          return null;
        }
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) {
          writeAuditEntry({
            action: "admin.login_failed",
            metadata: { reason: "bad_input", ip },
          });
          return null;
        }
        const { email, password } = parsed.data;
        const [admin] = await db
          .select()
          .from(admins)
          .where(eq(admins.email, email))
          .limit(1);
        if (!admin) {
          // Constant-ish time: still verify a dummy hash to avoid a timing
          // oracle that distinguishes "user exists" vs. "user doesn't".
          await argon2Verify(
            "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$placeholderplaceholderplaceholderplaceholder",
            password,
          ).catch(() => false);
          writeAuditEntry({
            action: "admin.login_failed",
            metadata: { reason: "no_user", ip },
          });
          return null;
        }
        let ok = false;
        try {
          ok = await argon2Verify(admin.passwordHash, password);
        } catch {
          ok = false;
        }
        if (!ok) {
          writeAuditEntry({
            action: "admin.login_failed",
            actorId: admin.id,
            metadata: { reason: "bad_password", ip },
          });
          return null;
        }
        clearAttempts(ip);
        await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, admin.id));
        writeAuditEntry({ action: "admin.login", actorId: admin.id, metadata: { ip } });
        return { id: admin.id, email: admin.email, name: admin.email };
      },
    }),
  ],
});

export type AdminSessionUser = { id: string; email: string };
