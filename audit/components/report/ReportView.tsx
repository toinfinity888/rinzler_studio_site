import { Card, CardHeader } from "@/components/ui/Card";
import { GradientText } from "@/components/brand/GradientText";

import {
  BAND_COLOR,
  DIMENSION_LABEL,
  SEVERITY_COLOR,
  type ReportRendered,
} from "./types";

interface Props {
  data: ReportRendered;
  pdfUrl?: string | null;
}

export function ReportView({ data, pdfUrl }: Props) {
  const goal = data.project.goal_primary;
  const publishedAt = new Date(data.project.published_at);

  const recsById = new Map(data.recommendations.map((r) => [r.id, r]));

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 md:px-6 py-8">
      <header className="space-y-3">
        <h1 className="text-h2 font-semibold">
          <GradientText>Votre diagnostic</GradientText>
        </h1>
        <p className="text-sm text-text-secondary">
          Publié le {publishedAt.toLocaleDateString("fr-FR")} · Objectif principal :{" "}
          <strong>{goal}</strong> · Niveau d&apos;audit : {data.project.tier}
        </p>
        {pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener"
            className="inline-block text-sm text-accent-cyan underline"
          >
            Télécharger le PDF
          </a>
        ) : null}
      </header>

      <Card>
        <CardHeader title="Résumé exécutif" />
        <p className="text-base leading-relaxed">{data.executive_summary}</p>
      </Card>

      <Card>
        <CardHeader title="Scores de maturité" description="9 dimensions clés." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.readiness_scores.map((s) => (
            <div
              key={s.dimension}
              className="rounded-md px-4 py-3 [background:var(--color-bg-tertiary)]"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-text-secondary">
                  {DIMENSION_LABEL[s.dimension] ?? s.dimension}
                </span>
                <span className={`text-lg font-semibold ${BAND_COLOR[s.band]}`}>
                  {s.value}
                </span>
              </div>
              {s.basis && s.basis.length > 0 ? (
                <p className="mt-1 text-[11px] text-text-muted">
                  Basé sur : {s.basis.slice(0, 3).join(", ")}
                  {s.basis.length > 3 ? "…" : ""}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      {data.opportunity_map.length > 0 ? (
        <Card>
          <CardHeader
            title="Carte des opportunités"
            description="Constats issus du scan + des réponses."
          />
          <ul className="space-y-3">
            {data.opportunity_map.map((o, i) => (
              <li key={i} className="border-l-2 border-white/10 pl-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase tracking-wide ${SEVERITY_COLOR[o.severity]}`}>
                    {o.severity}
                  </span>
                  <span className="text-xs text-text-muted">{o.category}</span>
                </div>
                <p className="font-medium text-text-primary">{o.headline}</p>
                {o.detail ? <p className="text-sm text-text-secondary">{o.detail}</p> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {data.bottleneck_analysis.length > 0 ? (
        <Card>
          <CardHeader title="Goulots d'étranglement" />
          <ul className="space-y-2">
            {data.bottleneck_analysis.map((b, i) => (
              <li key={i}>
                <p className="font-medium">{b.bottleneck}</p>
                <p className="text-sm text-text-secondary">{b.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {data.scenarios.length > 0 ? (
        <Card>
          <CardHeader
            title="Scénarios stratégiques"
            description="Trois trajectoires possibles, à choisir selon votre appétence au changement."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.scenarios.map((s) => (
              <div
                key={s.kind}
                className="rounded-md p-4 [background:var(--color-bg-tertiary)] space-y-2"
              >
                <p className="text-xs uppercase tracking-wide text-accent-cyan">{s.kind}</p>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-text-secondary">{s.summary}</p>
                {s.recommendation_ids.length > 0 ? (
                  <p className="text-xs text-text-muted">
                    {s.recommendation_ids.length} action
                    {s.recommendation_ids.length === 1 ? "" : "s"} associée
                    {s.recommendation_ids.length === 1 ? "" : "s"}.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Recommandations"
          description="Pour chaque action : raison, problème résolu, effort attendu, alternatives."
        />
        <div className="space-y-4">
          {data.recommendations
            .filter((r) => !r.do_not_do_now)
            .map((r) => (
              <RecommendationBlock key={r.id} r={r} />
            ))}
        </div>
      </Card>

      {data.tool_shortlist.length > 0 ? (
        <Card>
          <CardHeader title="Shortlist outils" description="Les vendeurs recommandés pour votre profil." />
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.tool_shortlist.map((t) => (
              <li
                key={t.vendor_id}
                className="rounded-md px-3 py-2 [background:var(--color-bg-tertiary)]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-text-muted">
                    {t.category}
                  </span>
                  <span className={`ml-auto text-[10px] ${BAND_COLOR[t.confidence]}`}>
                    conf. {t.confidence}
                  </span>
                </div>
                <p className="text-xs text-text-secondary">{t.reason}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {data.what_not_to_do_now.length > 0 ? (
        <Card>
          <CardHeader
            title="À ne PAS faire ce trimestre"
            description="Section la plus importante du rapport — protégez votre énergie."
          />
          <ul className="space-y-3">
            {data.what_not_to_do_now.map((x, i) => (
              <li key={i} className="rounded-md px-3 py-2 [border:1px_solid_rgba(239,68,68,0.25)]">
                <p className="font-medium">{x.action}</p>
                <p className="text-sm text-text-secondary">{x.reason}</p>
                {x.reconsider_when ? (
                  <p className="text-xs text-text-muted mt-1">
                    Reconsidérer : {x.reconsider_when}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Feuille de route 30 / 60 / 90 jours" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <RoadmapColumn label="Immédiat" items={data.roadmap.immediate} recsById={recsById} />
          <RoadmapColumn label="30 jours" items={data.roadmap.thirty_day} recsById={recsById} />
          <RoadmapColumn label="60 jours" items={data.roadmap.sixty_day} recsById={recsById} />
          <RoadmapColumn label="90 jours" items={data.roadmap.ninety_day} recsById={recsById} />
        </div>
        {data.roadmap.postponed.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-text-muted mb-2">Reportées</p>
            <ul className="text-sm space-y-1">
              {data.roadmap.postponed.map((it, i) => (
                <li key={i} className="text-text-secondary">
                  {recsById.get(it.recommendation_id)?.action ?? it.recommendation_id}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      {data.compliance_checklist.length > 0 ? (
        <Card>
          <CardHeader
            title="Checklist conformité"
            description="Points à vérifier — ce n'est pas un avis juridique."
          />
          <ul className="space-y-2">
            {data.compliance_checklist.map((c, i) => (
              <li key={i}>
                <p className={`font-medium ${SEVERITY_COLOR[c.severity]}`}>{c.topic}</p>
                <p className="text-sm text-text-secondary">{c.explanation}</p>
                <p className="text-sm text-text-primary">→ {c.checklist_item}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {data.next_steps.length > 0 ? (
        <Card>
          <CardHeader title="Prochaines étapes" />
          <ol className="list-decimal pl-6 space-y-1">
            {data.next_steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </Card>
      ) : null}

      {data.metadata.disclaimer ? (
        <p className="text-xs text-text-muted text-center">{data.metadata.disclaimer}</p>
      ) : null}
    </div>
  );
}

function RecommendationBlock({ r }: { r: ReportRendered["recommendations"][number] }) {
  return (
    <div className="rounded-md p-4 [background:var(--color-bg-tertiary)] space-y-2">
      <div className="flex items-baseline gap-2">
        <h4 className="font-semibold">{r.action}</h4>
        {r.vendor ? (
          <span className="text-xs text-accent-cyan">→ {r.vendor.name}</span>
        ) : null}
        <span className={`ml-auto text-[10px] ${BAND_COLOR[r.confidence]}`}>
          conf. {r.confidence}
        </span>
      </div>
      <p className="text-sm text-text-secondary">{r.explanation.relevance}</p>
      <details className="text-sm">
        <summary className="cursor-pointer text-text-muted">Plus de détail</summary>
        <dl className="mt-2 space-y-1 text-xs">
          <Detail label="Problème résolu" value={r.explanation.problem_solved} />
          <Detail label="Ce qui change" value={r.explanation.change} />
          <Detail label="Bénéfice attendu" value={r.explanation.benefit} />
          <Detail label="Effort" value={r.explanation.effort} />
          <Detail label="Risques" value={r.explanation.risks} />
          <Detail label="À vérifier d'abord" value={r.explanation.check_before} />
          <Detail label="Si vous ne faites rien" value={r.explanation.do_nothing_consequence} />
          {r.explanation.alternatives.length > 0 ? (
            <Detail
              label="Alternatives"
              value={r.explanation.alternatives.join(" · ")}
            />
          ) : null}
        </dl>
      </details>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-text-primary pl-3">{value}</dd>
    </>
  );
}

function RoadmapColumn({
  label,
  items,
  recsById,
}: {
  label: string;
  items: ReportRendered["roadmap"]["immediate"];
  recsById: Map<string, ReportRendered["recommendations"][number]>;
}) {
  return (
    <div className="rounded-md p-3 [background:var(--color-bg-tertiary)]">
      <p className="text-xs uppercase tracking-wide text-text-muted mb-2">{label}</p>
      {items.length === 0 ? (
        <p className="text-xs text-text-muted">—</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((it, i) => {
            const rec = recsById.get(it.recommendation_id);
            return (
              <li key={i}>
                <p className="font-medium">{rec?.action ?? it.recommendation_id}</p>
                <p className="text-[11px] text-text-muted">
                  Effort {it.expected_effort} · Impact {it.expected_impact}
                  {it.recommended_owner ? ` · ${it.recommended_owner}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
