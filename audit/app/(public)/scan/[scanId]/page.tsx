import * as React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getPublicScanResult,
  type PublicScanResult,
} from "@/lib/scanner/get-public-result";
import { ObservationCard } from "@/components/scan-result/ObservationCard";
import { OpportunityMap } from "@/components/scan-result/OpportunityMap";
import { DetectedVendorList } from "@/components/scan-result/DetectedVendorList";
import { UpgradeCta } from "@/components/scan-result/UpgradeCta";
import { EmailOptInForm } from "@/components/scan-result/EmailOptInForm";
import { ScanStatusPoller } from "./ScanStatusPoller";

/**
 * Free-scan result page (T042).
 *
 * Renders observations, opportunity map, detected vendors, optional email
 * opt-in (FR-009: never gates the visible content), upgrade CTA. INDEXABLE
 * (per public-server-actions.md): the scanId is opaque + unguessable, no
 * listing page enumerates IDs.
 */

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ scanId: string }>;
}

export async function generateMetadata(
  { params }: RouteParams,
): Promise<Metadata> {
  const { scanId } = await params;
  const result = await getPublicScanResult(scanId);
  if (!result) {
    return {
      title: "Diagnostic introuvable — Rinzler Studio",
      robots: { index: false, follow: false },
    };
  }
  const host = safeHost(result.url);
  return {
    title: `Diagnostic ${host} — Rinzler Studio`,
    description: `Diagnostic automatique de ${host} : performance, visibilité IA, tunnel de réservation, outils détectés.`,
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      title: `Diagnostic ${host}`,
      description: "Diagnostic automatique généré par Rinzler Studio.",
      siteName: "Rinzler Studio",
      locale: "fr_FR",
    },
    twitter: { card: "summary" },
  };
}

export default async function ScanResultPage({ params }: RouteParams) {
  const { scanId } = await params;
  const result = await getPublicScanResult(scanId);
  if (!result) notFound();
  return <ResultView initial={result} scanId={scanId} />;
}

function ResultView({
  initial,
  scanId,
}: {
  initial: PublicScanResult;
  scanId: string;
}) {
  const host = safeHost(initial.url);
  const inProgress = initial.status === "queued" || initial.status === "running";
  const failed = initial.status === "failed";
  return (
    <div className="grid gap-10">
      <header className="grid gap-2">
        <p className="text-xs uppercase tracking-wide text-text-muted">
          Diagnostic instantané
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold">
          Résultat pour {host}
        </h1>
        <p className="text-sm text-text-secondary break-all">{initial.url}</p>
      </header>

      {inProgress ? (
        <section className="glass rounded-md p-5" role="status" aria-live="polite">
          <h2 className="text-base font-semibold">Analyse en cours…</h2>
          <p className="mt-1.5 text-sm text-text-secondary">
            Nous chargeons votre page en desktop et en mobile, calculons les
            scores Lighthouse et identifions vos outils. Comptez environ 60
            secondes.
          </p>
          <ScanStatusPoller scanId={scanId} />
        </section>
      ) : null}

      {failed ? (
        <section className="glass rounded-md p-5">
          <h2 className="text-base font-semibold">Impossible de scanner cette page</h2>
          <p className="mt-1.5 text-sm text-text-secondary">
            Le scanner n'a pas pu atteindre l'URL ou la page est protégée. Vous
            pouvez réessayer avec une URL différente, ou nous contacter pour un
            scan manuel.
          </p>
        </section>
      ) : null}

      {!inProgress && initial.observations.length > 0 ? (
        <section className="grid gap-4">
          <h2 className="text-xl font-semibold">Observations</h2>
          <p className="text-sm text-text-muted">
            {initial.observations.length} observations identifiées.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {initial.observations.map((o, i) => (
              <ObservationCard key={i} observation={o} />
            ))}
          </div>
        </section>
      ) : null}

      {!inProgress ? (
        <section className="grid gap-4">
          <h2 className="text-xl font-semibold">Actions rapides</h2>
          <OpportunityMap wins={initial.opportunity_map} />
        </section>
      ) : null}

      {!inProgress ? (
        <section className="grid gap-4">
          <h2 className="text-xl font-semibold">Outils détectés sur votre page</h2>
          <DetectedVendorList vendors={initial.detected_vendors} />
        </section>
      ) : null}

      {!inProgress ? (
        <section className="grid gap-4">
          <UpgradeCta cta={initial.upgrade_cta} />
        </section>
      ) : null}

      {!inProgress ? (
        <section className="grid gap-4">
          <EmailOptInForm scanId={scanId} />
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: `Diagnostic ${host}`,
            inLanguage: "fr-FR",
            isAccessibleForFree: true,
            publisher: {
              "@type": "Organization",
              name: "Rinzler Studio",
            },
          }),
        }}
      />
    </div>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
