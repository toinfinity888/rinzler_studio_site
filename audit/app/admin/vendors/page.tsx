import Link from "next/link";

import { filterVendors } from "@/lib/vendor/admin-actions";
import { VendorCard } from "@/components/vendor/VendorCard";
import { Button } from "@/components/ui/Button";
import { GradientText } from "@/components/brand/GradientText";
import { Card, CardHeader } from "@/components/ui/Card";
import { VENDOR_CATEGORIES } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Vendeurs · Admin Rinzler",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{
    category?: string;
    tag?: string;
    country?: string;
    language?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function VendorsAdminPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filter = {
    category:
      sp.category && (VENDOR_CATEGORIES as readonly string[]).includes(sp.category)
        ? (sp.category as (typeof VENDOR_CATEGORIES)[number])
        : undefined,
    tag: sp.tag || undefined,
    country: sp.country || undefined,
    language: sp.language || undefined,
    status: (sp.status as "active" | "retired" | "any") ?? "active",
    search: sp.search || undefined,
  };

  const rows = await filterVendors(filter);
  const active = rows.filter((r) => r.status === "active");
  const retired = rows.filter((r) => r.status === "retired");

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold">
            <GradientText>Catalogue des vendeurs</GradientText>
          </h1>
          <p className="mt-1 text-text-secondary">
            {active.length} actif{active.length === 1 ? "" : "s"} ·{" "}
            {retired.length} retiré{retired.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Link href="/admin/vendors/new">
          <Button>+ Nouveau vendeur</Button>
        </Link>
      </div>

      <Card className="!p-4">
        <form className="flex flex-wrap gap-3 items-end" method="get">
          <label className="block">
            <span className="block text-xs text-text-muted mb-1">Catégorie</span>
            <select
              name="category"
              defaultValue={filter.category ?? ""}
              className="min-h-9 px-3 py-2 text-sm rounded-sm [background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)] text-text-primary"
            >
              <option value="">Toutes</option>
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs text-text-muted mb-1">Tag</span>
            <input
              name="tag"
              defaultValue={filter.tag ?? ""}
              placeholder="ex. small_hotels"
              className="min-h-9 px-3 py-2 text-sm rounded-sm [background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)] text-text-primary placeholder:text-text-muted"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-text-muted mb-1">Pays</span>
            <input
              name="country"
              defaultValue={filter.country ?? ""}
              placeholder="ex. FR"
              maxLength={2}
              className="min-h-9 px-3 py-2 text-sm rounded-sm [background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)] text-text-primary placeholder:text-text-muted w-20"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-text-muted mb-1">Langue</span>
            <input
              name="language"
              defaultValue={filter.language ?? ""}
              placeholder="ex. fr"
              maxLength={2}
              className="min-h-9 px-3 py-2 text-sm rounded-sm [background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)] text-text-primary placeholder:text-text-muted w-20"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-text-muted mb-1">Statut</span>
            <select
              name="status"
              defaultValue={filter.status ?? "active"}
              className="min-h-9 px-3 py-2 text-sm rounded-sm [background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)] text-text-primary"
            >
              <option value="active">Actif</option>
              <option value="retired">Retiré</option>
              <option value="any">Tous</option>
            </select>
          </label>
          <label className="block grow min-w-[200px]">
            <span className="block text-xs text-text-muted mb-1">Recherche (slug)</span>
            <input
              name="search"
              defaultValue={filter.search ?? ""}
              placeholder="ex. mews"
              className="w-full min-h-9 px-3 py-2 text-sm rounded-sm [background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)] text-text-primary placeholder:text-text-muted"
            />
          </label>
          <Button type="submit" size="sm">
            Filtrer
          </Button>
        </form>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardHeader
            title="Aucun vendeur"
            description="Aucun vendeur ne correspond aux filtres. Créez votre premier vendeur ou élargissez la recherche."
          />
          <Link href="/admin/vendors/new">
            <Button>+ Créer un vendeur</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {active.map((v) => (
            <VendorCard key={v.id} vendor={v} />
          ))}
        </div>
      )}

      {retired.length > 0 && filter.status !== "active" ? (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-text-muted hover:text-text-primary">
            Vendeurs retirés ({retired.length})
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {retired.map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
