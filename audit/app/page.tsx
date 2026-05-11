import { redirect } from "next/navigation";

/**
 * The audit app has no public landing page. Direct visits to `/` are sent
 * to the admin login (or onward to the dashboard if already authenticated
 * — middleware handles the conditional).
 */
export default function RootRedirect() {
  redirect("/admin/projects");
}
