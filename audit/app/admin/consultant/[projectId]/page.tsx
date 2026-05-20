/**
 * T090 — Consultant workspace page (US 4).
 *
 * Server-rendered. Gates on `consultant` or `super_admin`. Left pane = scan
 * + client answers (read). Right pane = recommendation reasoning + override
 * controls + private internal-note thread + publish action.
 *
 * Override / scenario-weight / publish controls are small client islands
 * inside `components/consultant/`. The page itself is server-only.
 */
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  projects,
  hotels,
  submissions,
  answers,
  scans,
  scanFindings,
  internalNotes,
  users,
  reportSnapshots,
  questions as questionsTable,
  questionVersions,
  questionTranslations,
} from "@/db/schema";
import { Card, CardHeader } from "@/components/ui/Card";
import { GradientText } from "@/components/brand/GradientText";
import { requireAdminWithAnyRole } from "@/lib/auth/hydrate-roles";
import { AuthorizationError } from "@/lib/auth/roles";

import { WorkspaceOverlay } from "@/components/consultant/WorkspaceOverlay";
import { OverrideControl } from "@/components/consultant/OverrideControl";
import { InternalNotePane } from "@/components/consultant/InternalNotePane";
import {
  ScenarioSideBySide,
  type ScenarioColumn,
} from "@/components/consultant/ScenarioSideBySide";
import { PublishButton } from "@/components/consultant/PublishButton";

export const metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function displayAnswerValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(String).join(", ");
  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
}

const FMT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ConsultantWorkspacePage({ params }: PageProps) {
  const { projectId } = await params;

  // Role gate — `consultant` or `super_admin` only.
  try {
    await requireAdminWithAnyRole(["consultant", "super_admin"]);
  } catch (err) {
    if (err instanceof AuthorizationError) {
      redirect("/admin/login");
    }
    throw err;
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) notFound();

  let hotelRow: typeof hotels.$inferSelect | null = null;
  if (project.hotelId) {
    const [row] = await db
      .select()
      .from(hotels)
      .where(eq(hotels.id, project.hotelId))
      .limit(1);
    hotelRow = row ?? null;
  }

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.projectId, projectId))
    .limit(1);

  // Answers — both client + overrides. We group by slug to pair them up.
  const answerRows = submission
    ? await db
        .select()
        .from(answers)
        .where(eq(answers.submissionId, submission.id))
        .orderBy(desc(answers.updatedAt))
    : [];

  // Index by slug. The most-recent override wins as effective; the most-
  // recent non-override row is the "original."
  type AnswerPair = {
    slug: string;
    original: (typeof answerRows)[number] | null;
    override: (typeof answerRows)[number] | null;
  };
  const pairsBySlug = new Map<string, AnswerPair>();
  for (const a of answerRows) {
    const existing = pairsBySlug.get(a.fieldId) ?? {
      slug: a.fieldId,
      original: null,
      override: null,
    };
    if (a.source === "consultant_override") {
      if (!existing.override) existing.override = a;
    } else if (!existing.original) {
      existing.original = a;
    }
    pairsBySlug.set(a.fieldId, existing);
  }

  // Resolve human prompts for the slugs we have. We pull the published-
  // version prompt for the answer's pinned question_version_id when
  // available, else fall back to the slug.
  const versionIds = Array.from(
    new Set(
      answerRows
        .map((a) => a.questionVersionId)
        .filter((v): v is string => typeof v === "string"),
    ),
  );
  const versionRows =
    versionIds.length > 0
      ? await db
          .select({
            id: questionVersions.id,
            questionId: questionVersions.questionId,
          })
          .from(questionVersions)
          .where(inArray(questionVersions.id, versionIds))
      : [];
  const questionIds = Array.from(new Set(versionRows.map((v) => v.questionId)));
  const questionRows =
    questionIds.length > 0
      ? await db
          .select()
          .from(questionsTable)
          .where(inArray(questionsTable.id, questionIds))
      : [];
  const questionBySlug = new Map(questionRows.map((q) => [q.slug, q]));
  const translationRows =
    versionIds.length > 0
      ? await db
          .select()
          .from(questionTranslations)
          .where(inArray(questionTranslations.questionVersionId, versionIds))
      : [];
  // Pick fr prompt by question_version_id.
  const promptByVersion = new Map<string, string>();
  for (const t of translationRows) {
    if (t.language === "fr") promptByVersion.set(t.questionVersionId, t.prompt);
  }

  // Scan + findings.
  const [scan] = await db
    .select()
    .from(scans)
    .where(and(eq(scans.projectId, projectId), eq(scans.status, "succeeded")))
    .orderBy(desc(scans.createdAt))
    .limit(1);
  const findings = scan
    ? await db
        .select()
        .from(scanFindings)
        .where(eq(scanFindings.scanId, scan.id))
        .orderBy(scanFindings.field)
    : [];

  // Notes thread.
  const noteRows = await db
    .select({
      id: internalNotes.id,
      body: internalNotes.body,
      createdAt: internalNotes.createdAt,
      authorEmail: users.email,
    })
    .from(internalNotes)
    .leftJoin(users, eq(internalNotes.authorId, users.id))
    .where(eq(internalNotes.projectId, projectId))
    .orderBy(desc(internalNotes.createdAt));

  // Latest snapshot — to surface the current scenarios in side-by-side.
  const [latestSnapshot] = await db
    .select()
    .from(reportSnapshots)
    .where(eq(reportSnapshots.projectId, projectId))
    .orderBy(desc(reportSnapshots.publishedAt))
    .limit(1);

  const scenariosForCompare: ScenarioColumn[] = (() => {
    if (!latestSnapshot) return [];
    const r = latestSnapshot.renderedJson as Record<string, unknown> | null;
    const ss = (r?.scenarios as unknown[] | undefined) ?? [];
    const recs = (r?.recommendations as Array<{ id?: string }> | undefined) ?? [];
    return ss.map((sRaw, idx) => {
      const s = sRaw as {
        kind?: string;
        title?: string;
        summary?: string;
        tradeoffs?: Record<string, unknown>;
        recommendation_ids?: string[];
      };
      const recIds = s.recommendation_ids ?? [];
      return {
        id: `${idx}:${s.kind ?? "scenario"}`,
        kind: s.kind ?? "—",
        title: s.title ?? "Scénario",
        summary: s.summary ?? "",
        tradeoffs: s.tradeoffs ?? {},
        recommendationCount: recIds.length || recs.length,
      };
    });
  })();

  // Recommendations from the latest snapshot — public-facing surface for
  // the consultant to review BEFORE publishing.
  type SnapRec = {
    id: string;
    action: string;
    explanation: { relevance?: string; problem_solved?: string };
    confidence: string;
    do_not_do_now?: boolean;
    do_not_do_reason?: string;
  };
  const snapshotRecs: SnapRec[] = (() => {
    const r = latestSnapshot?.renderedJson as Record<string, unknown> | null;
    return ((r?.recommendations as unknown[]) ?? []) as SnapRec[];
  })();

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
            Consultant workspace
          </p>
          <h1 className="text-2xl mt-1">
            <GradientText>{project.label}</GradientText>
          </h1>
          <p className="text-sm text-text-muted mt-1">
            status=<span className="font-mono">{project.status}</span> · tier=
            <span className="font-mono">{project.tier}</span> · hôtel=
            <span className="font-mono">
              {hotelRow?.displayName ?? hotelRow?.canonicalUrl ?? "—"}
            </span>
          </p>
        </div>
        <Link
          href={`/admin/projects/${projectId}`}
          className="text-sm text-accent-cyan hover:underline"
        >
          ← Vue projet classique
        </Link>
      </header>

      <WorkspaceOverlay
        left={
          <>
            <Card>
              <CardHeader
                title="Scan automatique"
                description={
                  scan
                    ? `Status ${scan.status} · ${FMT.format(new Date(scan.createdAt))}`
                    : "Aucun scan réussi"
                }
              />
              {findings.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-text-muted italic">
                  Pas de findings disponibles.
                </p>
              ) : (
                <ul className="px-6 pb-6 space-y-1.5 text-sm">
                  {findings.slice(0, 30).map((f) => (
                    <li key={f.id} className="grid grid-cols-[1fr_2fr] gap-2">
                      <span className="font-mono text-xs text-text-muted">
                        {f.field}
                      </span>
                      <span className="text-text-secondary break-words">
                        {displayAnswerValue(f.valueJson)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader
                title="Réponses client"
                description={`${pairsBySlug.size} questions répondues`}
              />
              <div className="px-6 pb-6 space-y-3">
                {pairsBySlug.size === 0 ? (
                  <p className="text-sm text-text-muted italic">
                    Le client n'a encore rien soumis.
                  </p>
                ) : (
                  Array.from(pairsBySlug.values())
                    .slice(0, 30)
                    .map((pair) => {
                      const effective = pair.override ?? pair.original;
                      const questionVersionId =
                        pair.original?.questionVersionId ??
                        pair.override?.questionVersionId ??
                        null;
                      const prompt = questionVersionId
                        ? promptByVersion.get(questionVersionId) ??
                          questionBySlug.get(pair.slug)?.slug ??
                          pair.slug
                        : pair.slug;
                      return (
                        <OverrideControl
                          key={pair.slug}
                          projectId={projectId}
                          questionSlug={pair.slug}
                          questionPrompt={prompt}
                          originalValueDisplay={displayAnswerValue(
                            pair.original?.valueJson,
                          )}
                          effectiveValueDisplay={displayAnswerValue(
                            effective?.valueJson,
                          )}
                          hasOverride={Boolean(pair.override)}
                        />
                      );
                    })
                )}
              </div>
            </Card>
          </>
        }
        right={
          <>
            <Card>
              <CardHeader
                title="Raisonnement recommandations"
                description={
                  latestSnapshot
                    ? `Snapshot ${latestSnapshot.id.slice(0, 8)} · ${FMT.format(new Date(latestSnapshot.publishedAt))} · rules=${latestSnapshot.ruleEngineVersion}`
                    : "Aucun snapshot — relancer le re-calcul après les overrides."
                }
              />
              <div className="px-6 pb-6 space-y-3">
                {snapshotRecs.length === 0 ? (
                  <p className="text-sm text-text-muted italic">
                    Le moteur n'a pas encore produit de recommandations.
                  </p>
                ) : (
                  snapshotRecs.slice(0, 20).map((r) => (
                    <div
                      key={r.id}
                      className="rounded-md p-3 [background:var(--color-bg-tertiary)]"
                    >
                      <p className="text-sm text-text-primary font-medium">
                        {r.action}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        {r.explanation?.relevance ?? "—"}
                      </p>
                      <p className="mt-2 text-[11px] text-text-muted uppercase tracking-wider">
                        confiance={r.confidence}
                        {r.do_not_do_now
                          ? ` · exclusion : ${r.do_not_do_reason ?? "—"}`
                          : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Comparer deux scénarios"
                description="Vue side-by-side pour la conversation client"
              />
              <div className="px-6 pb-6">
                <ScenarioSideBySide scenarios={scenariosForCompare} />
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Notes internes (privées)"
                description="Jamais exposées au client"
              />
              <div className="px-6 pb-6">
                <InternalNotePane
                  projectId={projectId}
                  notes={noteRows.map((n) => ({
                    id: n.id,
                    authorEmail: n.authorEmail,
                    body: n.body,
                    createdAt: n.createdAt,
                  }))}
                />
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Publication consultant"
                description="Strip internal_notes + override reasons + raw weights avant écriture"
              />
              <div className="px-6 pb-6">
                <PublishButton projectId={projectId} />
              </div>
            </Card>
          </>
        }
      />
    </div>
  );
}

// Silence unused-import warnings under strict linting.
void isNull;
