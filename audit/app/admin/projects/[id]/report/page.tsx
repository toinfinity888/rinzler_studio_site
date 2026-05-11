import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, submissions, answers, scores } from "@/db/schema";
import { SECTIONS } from "@/lib/form-schema/sections";
import { sectionTitle, t } from "@/lib/form-schema/i18n";
import { SYSTEM_BLOCK_SUBFIELDS, systemFieldId } from "@/lib/form-schema/types";

import "./report.css";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Rapport d'audit · Rinzler Studio",
  robots: { index: false, follow: false },
};

const SCORE_LABELS: Record<string, string> = {
  automation_opportunity: "Opportunité d'automatisation",
  operational_complexity: "Complexité opérationnelle",
  modernization_readiness: "Préparation à la modernisation",
  digital_maturity: "Maturité digitale",
};

function parseValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function fmtValue(v: unknown, options?: Record<string, string>): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    return v.map((x) => options?.[String(x)] ?? String(x)).join(", ");
  }
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  return options?.[String(v)] ?? String(v);
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const project = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) notFound();
  const submission = db.select().from(submissions).where(eq(submissions.projectId, project.id)).get();
  if (!submission) notFound();
  const answerRows = db.select().from(answers).where(eq(answers.submissionId, submission.id)).all();
  const byField = new Map(answerRows.map((a) => [a.fieldId, a]));
  const scoreRows = db.select().from(scores).where(eq(scores.submissionId, submission.id)).all();

  const fmt = (d: Date | null): string =>
    d
      ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(d))
      : "—";

  return (
    <div className="report">
      <header className="report-cover">
        <div className="report-brand">RINZLER STUDIO</div>
        <h1 className="report-title">Audit modernisation</h1>
        <p className="report-subtitle">
          {project.hotelName ?? project.label} · {project.contactEmail}
        </p>
        <dl className="report-meta">
          <div><dt>Soumis</dt><dd>{fmt(project.submittedAt)}</dd></div>
          <div><dt>Avancement</dt><dd>{submission.completionPct}%</dd></div>
          <div><dt>Référence</dt><dd>{project.id.slice(0, 8)}…</dd></div>
        </dl>
      </header>

      {scoreRows.length > 0 ? (
        <section className="report-section">
          <h2>Scores</h2>
          <ul className="scores">
            {scoreRows.map((s) => (
              <li key={s.id}>
                <span className="score-name">{SCORE_LABELS[s.name] ?? s.name}</span>
                <span className={`score-value band-${s.band}`}>{s.value}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {SECTIONS.map((section) => {
        const items: { id: string; label: string; value: string }[] = [];
        for (const field of section.fields) {
          if (field.type === "system-block") {
            for (const sub of SYSTEM_BLOCK_SUBFIELDS) {
              const fid = systemFieldId(field.id, sub);
              const a = byField.get(fid);
              if (!a) continue;
              items.push({ id: fid, label: t(fid).label, value: fmtValue(parseValue(a.valueJson)) });
            }
            continue;
          }
          const a = byField.get(field.id);
          if (!a) continue;
          const entry = t(field.id);
          items.push({
            id: field.id,
            label: entry.label,
            value: fmtValue(parseValue(a.valueJson), entry.options),
          });
        }
        return (
          <section key={section.id} className="report-section">
            <h2>
              {section.id.toUpperCase()} — {sectionTitle(section.id)}
            </h2>
            {items.length === 0 ? (
              <p className="empty">Aucune réponse dans cette section.</p>
            ) : (
              <dl className="answers">
                {items.map((item) => (
                  <div key={item.id} className="answer">
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        );
      })}

      <footer className="report-footer">
        Rapport généré pour usage interne Rinzler Studio. Ne pas redistribuer sans accord du client.
      </footer>
    </div>
  );
}
