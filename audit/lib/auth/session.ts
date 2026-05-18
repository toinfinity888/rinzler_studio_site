import "server-only";
import { redirect } from "next/navigation";
import { auth, type AdminSessionUser } from "./config";

export async function getSession() {
  return auth();
}

export async function requireAdmin(): Promise<AdminSessionUser> {
  const session = await auth();
  const user = session?.user as Partial<AdminSessionUser> | undefined;
  if (!user?.id || !user.email) {
    redirect("/admin/login");
  }
  return { id: user.id!, email: user.email! };
}
