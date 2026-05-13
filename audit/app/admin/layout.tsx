import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Admin pages are never statically rendered — they need an auth session and
// live DB data. Disable build-time prerendering for everything under /admin/*.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-white/5 [background:var(--color-bg-secondary)]">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <Link href="/admin/projects" className="inline-flex items-center" aria-label="Tableau de bord">
            <Logo height={26} />
            <span className="ml-3 text-sm text-text-muted hidden md:inline">/ Audit interne</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/admin/projects"
              className="text-text-secondary hover:text-text-primary transition-colors duration-[var(--duration-fast)]"
            >
              Projets
            </Link>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-text-muted hover:text-text-primary transition-colors duration-[var(--duration-fast)]"
              >
                Déconnexion
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-8 md:py-10">{children}</main>
    </div>
  );
}
