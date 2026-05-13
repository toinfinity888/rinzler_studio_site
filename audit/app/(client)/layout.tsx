import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Client (tokenized) pages query the DB by token at every request — always
// dynamic, never statically rendered.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PLAUSIBLE_DOMAIN = process.env.PLAUSIBLE_DOMAIN ?? "audit.rinzlerstudio.com";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      {/* Cookie-free Plausible — constitution v1.1.1 locks the audit subdomain */}
      <Script
        defer
        data-domain={PLAUSIBLE_DOMAIN}
        src="https://plausible.io/js/script.js"
        strategy="afterInteractive"
      />
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link
            href="https://rinzlerstudio.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center"
            aria-label="Rinzler Studio"
          >
            <Logo height={28} />
          </Link>
          <span className="text-xs text-text-muted">Audit confidentiel</span>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-10 md:py-16">{children}</main>
      <footer className="border-t border-white/5 mx-auto w-full max-w-5xl px-6 py-6 text-xs text-text-muted">
        Vos réponses sont stockées en France (o2switch). Conservation : 36 mois après la dernière
        activité, conformément aux recommandations CNIL. Un journal interne de traçabilité (qui a
        fait quoi, et quand) est conservé sans limite de durée pour des raisons de sécurité
        opérationnelle ; il ne contient aucune réponse client.{" "}
        <a
          href="https://rinzlerstudio.fr/politique-confidentialite.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-accent-cyan"
        >
          Politique complète
        </a>
        .
      </footer>
    </div>
  );
}
