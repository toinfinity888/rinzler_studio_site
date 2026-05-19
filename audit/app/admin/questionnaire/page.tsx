import Link from "next/link";

import { listQuestionsForAdmin } from "@/lib/questionnaire/admin-actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GradientText } from "@/components/brand/GradientText";
import {
  QUESTION_BLOCKS,
  QUESTION_STATUSES,
  type QuestionBlock,
  type QuestionStatus,
} from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Questionnaire · Admin Rinzler",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{
    block?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function QuestionnaireAdminPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filter = {
    block:
      sp.block && (QUESTION_BLOCKS as readonly string[]).includes(sp.block)
        ? (sp.block as QuestionBlock)
        : undefined,
    status:
      sp.status && ([...QUESTION_STATUSES, "any"] as readonly string[]).includes(sp.status)
        ? (sp.status as QuestionStatus | "any")
        : ("any" as const),
    search: sp.search || undefined,
  };

  const res = await listQuestionsForAdmin(filter);
  if (!res.ok) {
    return (
      <div className="space-y-4">
        <h1 className="text-h2 font-semibold">
          <GradientText>Questionnaire</GradientText>
        </h1>
        <Card>
          <p className="text-sm text-error">Erreur : {res.error.message}</p>
        </Card>
      </div>
    );
  }
  const items = res.data.items;

  const grouped = new Map<string, typeof items>();
  for (const it of items) {
    const arr = grouped.get(it.block) ?? [];
    arr.push(it);
    grouped.set(it.block, arr);
  }

  const drafts = items.filter((q) => q.status === "draft").length;
  const published = items.filter((q) => q.status === "published").length;
  const deactivated = items.filter((q) => q.status === "deactivated").length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold">
            <GradientText>Questionnaire</GradientText>
          </h1>
          <p className="mt-1 text-text-secondary">
            {items.length} question{items.length === 1 ? "" : "s"} · {drafts} brouillon
            {drafts === 1 ? "" : "s"} · {published} publiée{published === 1 ? "" : "s"} ·{" "}
            {deactivated} désactivée{deactivated === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/admin/questionnaire/new">
          <Button>+ Nouvelle question</Button>
        </Link>
      </div>

      <Card className="!p-4">
        <form className="flex flex-wrap gap-3 items-end" method="get">
          <label className="block">
            <span className="block text-xs text-text-muted mb-1">Bloc</span>
            <select
              name="block"
              defaultValue={filter.block ?? ""}
              className="min-h-9 px-3 py-2 text-sm rounded-sm [background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)] text-text-primary"
            >
              <option value="">Tous</option>
              {QUESTION_BLOCKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs text-text-muted mb-1">Statut</span>
            <select
              name="status"
              defaultValue={filter.status ?? "any"}
              className="min-h-9 px-3 py-2 text-sm rounded-sm [background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)] text-text-primary"
            >
              <option value="any">Tous</option>
              {QUESTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs text-text-muted mb-1">Recherche (slug)</span>
            <input
              name="search"
              defaultValue={filter.search ?? ""}
              placeholder="property_type, pms_…"
              className="min-h-9 px-3 py-2 text-sm rounded-sm [background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)] text-text-primary placeholder:text-text-muted"
            />
          </label>
          <Button type="submit" size="sm">
            Filtrer
          </Button>
        </form>
      </Card>

      {[...grouped.entries()].map(([block, qs]) => (
        <Card key={block}>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-h3 font-semibold">{block}</h2>
            <span className="text-xs text-text-muted">
              {qs.length} question{qs.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="divide-y divide-white/5">
            {qs.map((q) => (
              <li key={q.id} className="py-3 flex items-center gap-3">
                <Link
                  href={`/admin/questionnaire/${q.id}/edit`}
                  className="font-medium text-text-primary hover:text-accent-cyan"
                >
                  {q.slug}
                </Link>
                <span className="text-xs text-text-muted">{q.answerType}</span>
                <span
                  className={[
                    "text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-sm",
                    q.status === "published"
                      ? "bg-success/15 text-success"
                      : q.status === "draft"
                        ? "bg-warning/15 text-warning"
                        : "bg-error/15 text-error",
                  ].join(" ")}
                >
                  {q.status}
                </span>
                <span className="text-xs text-text-muted">
                  v{q.currentVersion} ({q.versionsCount} versions)
                </span>
                <span className="ml-auto text-xs text-text-muted">
                  {q.updatedAt.toISOString().slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
