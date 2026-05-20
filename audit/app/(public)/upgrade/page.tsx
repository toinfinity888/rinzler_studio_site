import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import {
  ARTEFACT_LABELS,
  TIERS,
  artefactsAddedBetween,
  type TierArtefact,
  type TierDefinition,
} from "@/lib/tier/differences";
import type { ProjectTier } from "@/db/schema/identity";

export const metadata: Metadata = {
  title: "Tarifs et niveaux de diagnostic · Rinzler Studio",
  description:
    "Cinq niveaux : du scan gratuit à l'accompagnement de mise en œuvre. Ce que chaque niveau produit et ce qu'apporte le suivant.",
  robots: { index: true, follow: true },
};

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

const ALL_ARTEFACTS = Object.keys(ARTEFACT_LABELS) as TierArtefact[];

function isProjectTier(v: string | undefined): v is ProjectTier {
  return !!v && TIERS.some((t) => t.tier === v);
}

export default async function UpgradePage({ searchParams }: PageProps) {
  const { from, to } = await searchParams;
  const fromTier = isProjectTier(from) ? from : null;
  const toTier = isProjectTier(to) ? to : null;

  const focused =
    fromTier && toTier
      ? {
          from: TIERS.find((t) => t.tier === fromTier)!,
          to: TIERS.find((t) => t.tier === toTier)!,
          added: artefactsAddedBetween(fromTier, toTier),
        }
      : null;

  return (
    <div className="space-y-10">
      <header className="space-y-3 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
          Niveaux de diagnostic et accompagnement
        </h1>
        <p className="text-sm md:text-base text-text-secondary leading-relaxed">
          Cinq niveaux progressifs, du scan gratuit basé sur les signaux
          publics jusqu&apos;à l&apos;accompagnement complet de mise en œuvre.
          Chaque niveau produit des artefacts distincts ; aucun niveau ne
          donne accès aux livrables d&apos;un autre.
        </p>
      </header>

      {focused ? <FocusedUpgrade focused={focused} /> : null}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">
          Comparaison des niveaux
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left">
                <th className="py-3 pr-4 align-bottom font-medium text-text-secondary uppercase text-xs tracking-wide">
                  Livrable
                </th>
                {TIERS.map((t) => (
                  <th
                    key={t.tier}
                    className="py-3 pr-4 align-bottom min-w-[160px]"
                  >
                    <div className="font-semibold text-text-primary">{t.label_fr}</div>
                    <div className="text-xs text-text-secondary mt-1">
                      {t.price_band_fr}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_ARTEFACTS.map((artefact) => (
                <tr key={artefact} className="border-t border-white/5">
                  <td className="py-2 pr-4 text-text-primary">
                    {ARTEFACT_LABELS[artefact].fr}
                  </td>
                  {TIERS.map((t) => (
                    <td key={t.tier} className="py-2 pr-4">
                      {t.artefacts.includes(artefact) ? (
                        <span className="text-accent-cyan" aria-label="inclus">
                          ●
                        </span>
                      ) : (
                        <span className="text-text-muted" aria-label="non inclus">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TIERS.map((t) => (
          <TierCard key={t.tier} tier={t} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-text-primary">Prochaine étape</h2>
        <p className="text-sm text-text-secondary leading-relaxed max-w-3xl">
          Pour un devis adapté à votre établissement, contactez Rinzler Studio.
          Les tarifs précis dépendent de la taille de l&apos;établissement, du
          niveau d&apos;intégration souhaité et du contexte de financement.
        </p>
        <Link
          href="https://rinzlerstudio.fr/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-accent-cyan hover:underline"
        >
          rinzlerstudio.fr/contact →
        </Link>
      </section>
    </div>
  );
}

function FocusedUpgrade({
  focused,
}: {
  focused: {
    from: TierDefinition;
    to: TierDefinition;
    added: TierArtefact[];
  };
}) {
  return (
    <Card className="border border-accent-cyan/40">
      <p className="text-xs uppercase tracking-wide text-accent-cyan font-semibold">
        Passer de {focused.from.label_fr} à {focused.to.label_fr}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-text-primary">
        Ce que vous gagnez à l&apos;upgrade
      </h2>
      <p className="mt-2 text-sm text-text-secondary leading-relaxed">
        {focused.to.tagline_fr}
      </p>
      {focused.added.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm">
          {focused.added.map((a) => (
            <li key={a} className="flex items-start gap-2">
              <span className="text-accent-cyan mt-0.5">+</span>
              <span className="text-text-primary">
                {ARTEFACT_LABELS[a].fr}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-text-secondary italic">
          Aucun livrable supplémentaire à ce niveau.
        </p>
      )}
    </Card>
  );
}

function TierCard({ tier }: { tier: TierDefinition }) {
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-text-primary">
          {tier.label_fr}
        </h3>
        <span className="text-xs text-text-secondary">{tier.price_band_fr}</span>
      </div>
      <p className="mt-2 text-sm text-text-secondary leading-relaxed">
        {tier.tagline_fr}
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-text-primary">
        {tier.highlights_fr.map((h, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-accent-cyan mt-0.5">●</span>
            <span>{h}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
