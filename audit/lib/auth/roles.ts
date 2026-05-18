import "server-only";

import type { UserRole } from "@/db/schema";

/**
 * Composable role helpers (T021, Clarification Q4).
 *
 * A user holds zero or more roles via the `user_roles` table. The effective
 * capability set is the UNION of the per-role scopes.
 *
 * These helpers accept a `Session`-shaped object whose `user.roles` claim is
 * populated by the NextAuth `jwt` / `session` callbacks (T020). The helpers
 * are intentionally pure so they can also be called from worker code that
 * loads roles directly from the DB rather than going through next-auth.
 */

export interface RoleBearingSession {
  user?: {
    id?: string | null;
    email?: string | null;
    roles?: readonly UserRole[];
  } | null;
}

const ROLE_SCOPES: Record<UserRole, readonly string[]> = {
  consultant: [
    "project:read",
    "project:override",
    "internal_notes:write",
    "consultant_workspace:read",
    "report:publish_consultant",
  ],
  questionnaire_admin: [
    "questionnaire:read",
    "questionnaire:write",
    "questionnaire:publish",
  ],
  vendor_database_admin: [
    "vendors:read",
    "vendors:write",
    "vendors:retire",
    "enrichment_queue:review",
  ],
  super_admin: [
    "*", // everything
  ],
};

export function hasRole(session: RoleBearingSession | null | undefined, role: UserRole): boolean {
  return Boolean(session?.user?.roles?.includes(role));
}

export function requireAnyRole(
  session: RoleBearingSession | null | undefined,
  roles: readonly UserRole[],
): asserts session is RoleBearingSession & { user: { roles: readonly UserRole[] } } {
  if (!session?.user?.roles?.some((r) => roles.includes(r))) {
    throw new AuthorizationError(
      `Required one of: ${roles.join(", ")}`,
    );
  }
}

export function effectiveScopes(
  session: RoleBearingSession | null | undefined,
): readonly string[] {
  const roles = session?.user?.roles ?? [];
  if (roles.includes("super_admin")) return ["*"];
  const set = new Set<string>();
  for (const r of roles) for (const s of ROLE_SCOPES[r] ?? []) set.add(s);
  return Array.from(set);
}

export function hasScope(
  session: RoleBearingSession | null | undefined,
  scope: string,
): boolean {
  const scopes = effectiveScopes(session);
  return scopes.includes("*") || scopes.includes(scope);
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}
