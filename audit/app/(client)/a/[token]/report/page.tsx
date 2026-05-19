import { Card, CardHeader } from "@/components/ui/Card";

import { getPublishedReport } from "@/lib/report/get";
import { ReportView } from "@/components/report/ReportView";
import type { ReportRendered } from "@/components/report/types";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Votre diagnostic · Rinzler Studio",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ReportPage({ params }: PageProps) {
  const { token } = await params;
  const res = await getPublishedReport(token);

  if (!res.ok) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Card>
          <CardHeader title="Diagnostic indisponible" />
          {res.reason === "not_ready" ? (
            <p className="text-sm text-text-secondary">
              Votre diagnostic est en cours de génération. Rafraîchissez cette
              page dans une minute.
            </p>
          ) : res.reason === "no_snapshot" ? (
            <p className="text-sm text-text-secondary">
              Le rapport n&apos;a pas encore été publié.
            </p>
          ) : (
            <p className="text-sm text-text-secondary">
              Lien invalide ou expiré.
            </p>
          )}
        </Card>
      </div>
    );
  }

  const data = res.snapshot.rendered_json as unknown as ReportRendered;

  return <ReportView data={data} pdfUrl={null} />;
}
