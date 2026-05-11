import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, submissions } from "@/db/schema";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { GradientText } from "@/components/brand/GradientText";
import { PriorityCell } from "@/components/admin/PriorityCell";

export const metadata = {
  title: "Projets · Rinzler Audit",
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

const STATUS_COLOR: Record<string, string> = {
  draft: "text-text-muted",
  awaiting: "text-accent-cyan",
  in_progress: "text-accent-purple",
  submitted: "text-success",
  reopened: "text-warning",
  purged: "text-text-muted line-through",
};

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(d));
}

export default async function ProjectsPage() {
  const rows = db
    .select({
      id: projects.id,
      label: projects.label,
      hotelName: projects.hotelName,
      status: projects.status,
      priority: projects.priority,
      lastEditedAt: projects.lastEditedAt,
      submittedAt: projects.submittedAt,
      lastAdminActivityAt: projects.lastAdminActivityAt,
      ongoingEngagement: projects.ongoingEngagement,
      completionPct: submissions.completionPct,
    })
    .from(projects)
    .leftJoin(submissions, eq(submissions.projectId, projects.id))
    .orderBy(desc(projects.lastAdminActivityAt))
    .all();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold">
            <GradientText>Projets d'audit</GradientText>
          </h1>
          <p className="mt-1 text-text-secondary">
            Suivi des engagements clients. {rows.length} projet{rows.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Link href="/admin/projects/new">
          <Button>+ Nouveau projet</Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardHeader
            title="Aucun projet pour l'instant"
            description="Créez votre premier audit pour générer un lien client."
          />
          <Link href="/admin/projects/new">
            <Button>+ Créer un projet</Button>
          </Link>
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/5 [background:var(--color-bg-tertiary)]">
              <tr className="text-left text-text-muted">
                <th className="px-4 py-3 font-medium">Projet</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Avancement</th>
                <th className="px-4 py-3 font-medium">Priorité</th>
                <th className="px-4 py-3 font-medium">Dernière activité</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:[background:rgba(255,255,255,0.02)]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/projects/${p.id}`} className="block">
                      <div className="font-medium text-text-primary">{p.label}</div>
                      <div className="text-xs text-text-muted">{p.hotelName ?? "—"}</div>
                    </Link>
                  </td>
                  <td className={["px-4 py-3", STATUS_COLOR[p.status] ?? ""].join(" ")}>
                    {STATUS_LABELS[p.status] ?? p.status}
                    {p.ongoingEngagement ? (
                      <span className="ml-2 text-xs text-warning">★</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {p.completionPct ?? 0}%
                  </td>
                  <td className="px-4 py-3">
                    <PriorityCell projectId={p.id} priority={p.priority} />
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {fmtDate(p.lastAdminActivityAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="text-accent-cyan hover:text-accent-cyan-hover text-xs"
                    >
                      Ouvrir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
