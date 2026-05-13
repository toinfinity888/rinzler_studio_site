import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, submissions, answers, scores, internalNotes, admins } from "@/db/schema";
import { Card, CardHeader } from "@/components/ui/Card";
import { GradientText } from "@/components/brand/GradientText";
import { NotesThread } from "@/components/admin/NotesThread";
import { NoteComposer } from "@/components/admin/NoteComposer";
import { ProjectActionsPanel } from "@/components/admin/ProjectActionsPanel";
import { SECTIONS } from "@/lib/form-schema/sections";
import { sectionTitle, t } from "@/lib/form-schema/i18n";
import { SYSTEM_BLOCK_SUBFIELDS, systemFieldId } from "@/lib/form-schema/types";
import { bumpLastAdminActivity } from "@/app/admin/projects/actions";

interface ProjectDetailProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  awaiting: "En attente",
  in_progress: "En cours",
  submitted: "Soumis",
  reopened: "Réouvert",
  purged: "Purgé",
};

const SCORE_LABELS: Record<string, string> = {
  automation_opportunity: "Opportunité d'automatisation",
  operational_complexity: "Complexité opérationnelle",
  modernization_readiness: "Préparation à la modernisation",
  digital_maturity: "Maturité digitale",
};

const BAND_COLOR: Record<string, string> = {
  low: "text-text-muted",
  medium: "text-warning",
  high: "text-success",
};

function fmt(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(d));
}

function formatValue(v: unknown, optionLabels?: Record<string, string>): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    return v.map((x) => optionLabels?.[String(x)] ?? String(x)).join(", ");
  }
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (typeof v === "number") return String(v);
  const s = String(v);
  return optionLabels?.[s] ?? s;
}

export default async function ProjectDetailPage({ params }: ProjectDetailProps) {
  const { id } = await params;
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) notFound();

  // Bump activity (covers FR-044b purge clock + FR-029 audit trail).
  await bumpLastAdminActivity(id).catch(() => {});

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.projectId, project.id))
    .limit(1);

  const answerRows = submission
    ? await db.select().from(answers).where(eq(answers.submissionId, submission.id))
    : [];
  const byField = new Map(answerRows.map((a) => [a.fieldId, a]));

  const scoreRows = submission
    ? await db.select().from(scores).where(eq(scores.submissionId, submission.id))
    : [];

  const notes = await db
    .select({
      id: internalNotes.id,
      body: internalNotes.body,
      createdAt: internalNotes.createdAt,
      authorEmail: admins.email,
    })
    .from(internalNotes)
    .leftJoin(admins, eq(internalNotes.authorId, admins.id))
    .where(eq(internalNotes.projectId, project.id))
    .orderBy(asc(internalNotes.createdAt));

  return (
    <div className="space-y-6">
      <Link href="/admin/projects" className="text-sm text-text-muted hover:text-text-primary">
        ← Tous les projets
      </Link>

      <header className="space-y-1">
        <h1 className="text-h2 font-semibold">
          <GradientText>{project.label}</GradientText>
        </h1>
        <p className="text-text-secondary">
          {project.hotelName ?? "Hôtel non renseigné"} · {project.contactEmail}
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-text-muted">
          <span>Statut : {STATUS_LABELS[project.status] ?? project.status}</span>
          <span>·</span>
          <span>Avancement : {submission?.completionPct ?? 0}%</span>
          <span>·</span>
          <span>Créé : {fmt(project.createdAt)}</span>
          {project.submittedAt ? <><span>·</span><span>Soumis : {fmt(project.submittedAt)}</span></> : null}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6 min-w-0">
          {scoreRows.length > 0 ? (
            <Card>
              <CardHeader title="Scores" description="Calculés à partir des réponses du client (V1 : heuristiques déterministes)." />
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scoreRows.map((s) => (
                  <li key={s.id} className="rounded-md p-3 [background:var(--color-bg-tertiary)]">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-text-secondary">{SCORE_LABELS[s.name] ?? s.name}</span>
                      <span className={["text-lg font-semibold", BAND_COLOR[s.band] ?? ""].join(" ")}>
                        {s.value}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {SECTIONS.map((section) => {
            const sectionAnswers: { fieldId: string; label: string; value: unknown }[] = [];
            for (const field of section.fields) {
              if (field.type === "system-block") {
                for (const sub of SYSTEM_BLOCK_SUBFIELDS) {
                  const fid = systemFieldId(field.id, sub);
                  const a = byField.get(fid);
                  if (!a) continue;
                  sectionAnswers.push({ fieldId: fid, label: t(fid).label, value: parseValue(a.valueJson) });
                }
                continue;
              }
              const a = byField.get(field.id);
              if (!a) continue;
              const entry = t(field.id);
              sectionAnswers.push({
                fieldId: field.id,
                label: entry.label,
                value: formatValue(parseValue(a.valueJson), entry.options),
              });
            }
            if (sectionAnswers.length === 0) {
              return (
                <Card key={section.id}>
                  <CardHeader title={`${section.id.toUpperCase()} — ${sectionTitle(section.id)}`} />
                  <p className="text-sm text-text-muted italic">Aucune réponse dans cette section.</p>
                </Card>
              );
            }
            return (
              <Card key={section.id}>
                <CardHeader title={`${section.id.toUpperCase()} — ${sectionTitle(section.id)}`} />
                <dl className="space-y-3">
                  {sectionAnswers.map((a) => (
                    <div key={a.fieldId} className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-2">
                      <dt className="text-xs text-text-muted">{a.label}</dt>
                      <dd className="text-sm text-text-primary whitespace-pre-wrap">
                        {String(a.value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>
            );
          })}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 self-start">
          <Card>
            <CardHeader title="Actions" />
            <ProjectActionsPanel
              projectId={project.id}
              label={project.label}
              status={project.status}
              ongoingEngagement={Boolean(project.ongoingEngagement)}
              tokenRevoked={Boolean(project.tokenRevokedAt)}
            />
          </Card>
          <Card>
            <CardHeader
              title="Notes internes"
              description="Visible uniquement par les consultants. Append-only — pour corriger, ajoutez une nouvelle note."
            />
            <div className="space-y-4">
              <NotesThread
                notes={notes.map((n) => ({
                  id: n.id,
                  authorEmail: n.authorEmail ?? "—",
                  body: n.body,
                  createdAt: n.createdAt,
                }))}
              />
              <NoteComposer projectId={project.id} />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function parseValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
