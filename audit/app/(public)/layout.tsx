import * as React from "react";
import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";

import { Logo } from "@/components/brand/Logo";

/**
 * Public surface layout (T041). UNLIKE the admin/client layouts, pages under
 * `(public)/` are indexable. The site-wide `robots: noindex` in app/layout.tsx
 * is overridden here by setting `metadata.robots.index = true` on each
 * indexable page (the landing and individual scan results).
 *
 * No auth gate. No noindex header (middleware lets `/` and `/scan/*` pass
 * through). Plausible is loaded cookie-free.
 */

export const metadata: Metadata = {
  // Per-page metadata overrides robots here — see page.tsx and scan/[scanId].
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_AUDIT_ORIGIN ?? "https://audit.rinzlerstudio.com",
  ),
};

const PLAUSIBLE_DOMAIN =
  process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ??
  process.env.PLAUSIBLE_DOMAIN ??
  "audit.rinzlerstudio.com";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      <Script
        defer
        data-domain={PLAUSIBLE_DOMAIN}
        src="https://plausible.io/js/script.js"
        strategy="afterInteractive"
      />
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center"
            aria-label="Rinzler Studio — diagnostic hôtelier"
          >
            <Logo height={28} />
          </Link>
          <Link
            href="https://rinzlerstudio.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-text-muted hover:text-text-primary"
          >
            rinzlerstudio.fr
          </Link>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-10 md:py-16">
        {children}
      </main>
      <footer className="border-t border-white/5 mx-auto w-full max-w-5xl px-6 py-6 text-xs text-text-muted">
        Diagnostic généré automatiquement à partir de signaux publics. Aucun
        cookie publicitaire. Hébergement et traitements en France et dans
        l'Union européenne.{" "}
        <a
          href="https://rinzlerstudio.fr/politique-confidentialite.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-accent-cyan"
        >
          Politique de confidentialité
        </a>
        .
      </footer>
    </div>
  );
}
