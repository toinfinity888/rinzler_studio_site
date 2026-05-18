import type { Metadata } from "next";

import { ScanStartForm } from "@/components/scan-result/ScanStartForm";

/**
 * Free-scan landing page (T041, US 1).
 *
 * INDEXABLE. Per-page SEO metadata + JSON-LD structured data (WebApplication +
 * Service). Single primary action: URL form -> `/api/scan/start` -> redirect
 * to `/scan/[scanId]`.
 */

const ORIGIN =
  process.env.NEXT_PUBLIC_AUDIT_ORIGIN ?? "https://audit.rinzlerstudio.com";

export const metadata: Metadata = {
  title: "Diagnostic gratuit pour hôtel indépendant — Rinzler Studio",
  description:
    "Entrez l'URL de votre hôtel pour obtenir en 60 secondes un diagnostic clair : performance, visibilité IA, tunnel de réservation, outils détectés et opportunités concrètes. Gratuit, sans inscription.",
  alternates: {
    canonical: ORIGIN,
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    title: "Diagnostic gratuit pour hôtel indépendant",
    description:
      "Diagnostic automatique en 60 secondes : performance, visibilité IA, tunnel de réservation, outils détectés.",
    url: ORIGIN,
    siteName: "Rinzler Studio",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diagnostic gratuit pour hôtel indépendant",
    description:
      "Diagnostic automatique en 60 secondes : performance, visibilité IA, tunnel de réservation, outils détectés.",
  },
};

const STRUCTURED_DATA = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Rinzler Studio — Diagnostic hôtelier",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: ORIGIN,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    description:
      "Outil d'audit automatique pour hôtels indépendants : performance, visibilité IA, tunnel de réservation, détection des outils en place.",
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Diagnostic hôtelier",
    provider: {
      "@type": "Organization",
      name: "Rinzler Studio",
      url: "https://rinzlerstudio.fr",
    },
    areaServed: "FR",
    description:
      "Diagnostic gratuit du site web d'un hôtel indépendant en moins de 60 secondes.",
  },
];

export default function PublicLandingPage() {
  return (
    <div className="grid gap-12">
      <section className="grid gap-6 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
          Un diagnostic clair pour votre hôtel,
          <br className="hidden md:block" /> en moins de 60 secondes.
        </h1>
        <p className="text-base md:text-lg text-text-secondary">
          Entrez l'URL de votre site. Nous analysons la performance, la
          visibilité dans les moteurs IA, le tunnel de réservation, les outils
          que vous utilisez déjà — et nous expliquons ce qui peut bouger vite.
        </p>
        <ScanStartForm />
        <ul className="grid gap-1.5 text-sm text-text-secondary">
          <li>— Pas de compte à créer.</li>
          <li>— Pas de cookie publicitaire, hébergement européen.</li>
          <li>
            — Rapport partageable par lien. Vous restez libre de demander un
            audit plus approfondi ensuite.
          </li>
        </ul>
      </section>

      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">Ce que nous mesurons</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Performance", "Score Lighthouse desktop et mobile, LCP, CLS."],
            [
              "Visibilité IA / SEO",
              "Balisage schema.org, FAQ, hreflang, métadonnées sociales.",
            ],
            [
              "Tunnel de réservation",
              "Bouton Réserver visible, destination interne ou externe.",
            ],
            [
              "Communication client",
              "Présence de WhatsApp, téléphone, contact direct.",
            ],
            [
              "Outils détectés",
              "Moteur de réservation, PMS, channel manager, CRM.",
            ],
            [
              "Mobile-first",
              "Expérience smartphone — où arrive en majorité votre clientèle.",
            ],
          ].map(([title, body]) => (
            <article key={title} className="glass rounded-md p-5">
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-text-secondary">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
    </div>
  );
}
