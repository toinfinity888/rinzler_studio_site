import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { userRoles, type UserRole } from "@/db/schema";
import { requireAdmin } from "./session";
import {
  AuthorizationError,
  type RoleBearingSession,
} from "./roles";

/**
 * Hydrate a feature-001 admin session with the composable roles from
 * `user_roles` (data-model.md §K). Until NextAuth's `jwt`/`session`
 * callbacks are wired in T020, we resolve roles directly from the DB
 * for each admin server action. The cost is one indexed query per
 * mutation — acceptable for the admin surface and far simpler than
 * pre-T020 session shaping.
 *
 * A super_admin grant short-circuits role checks elsewhere (`hasScope`
 * already treats `super_admin` as `*`).
 */
export async function getCurrentAdminWithRoles(): Promise<
  RoleBearingSession & {
    user: { id: string; email: string; roles: readonly UserRole[] };
  }
> {
  const admin = await requireAdmin();
  const rows = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, admin.id));
  const roles = rows.map((r) => r.role) as UserRole[];
  return { user: { id: admin.id, email: admin.email, roles } };
}

/**
 * Convenience wrapper: load the current admin, hydrate roles, and reject
 * if none of the required roles are held. Used by every vendor/question
 * admin mutation.
 */
export async function requireAdminWithAnyRole(
  required: readonly UserRole[],
): Promise<{ id: string; email: string; roles: readonly UserRole[] }> {
  const session = await getCurrentAdminWithRoles();
  const userRolesHeld = session.user.roles;
  if (
    !userRolesHeld.includes("super_admin") &&
    !userRolesHeld.some((r) => required.includes(r))
  ) {
    throw new AuthorizationError(
      `Required one of: ${required.join(", ")}`,
    );
  }
  return session.user;
}
