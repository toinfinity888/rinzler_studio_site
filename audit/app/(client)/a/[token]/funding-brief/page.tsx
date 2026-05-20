import { Card, CardHeader } from "@/components/ui/Card";

import { getFundingBriefPreview } from "@/lib/funding/server-actions";
import { FundingBriefClient } from "./FundingBriefClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Note de cadrage projet · Rinzler Studio",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function FundingBriefPage({ params }: PageProps) {
  const { token } = await params;
  const res = await getFundingBriefPreview(token);

  if (!res.ok) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Card>
          <CardHeader title="Note de cadrage indisponible" />
          {res.reason === "no_report" ? (
            <p className="text-sm text-text-secondary">
              Le rapport d&apos;audit n&apos;a pas encore été publié. La note de
              cadrage projet sera disponible une fois le diagnostic finalisé.
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

  if (!res.available) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Card>
          <CardHeader title="Note de cadrage non disponible pour cette zone" />
          <p className="text-sm text-text-secondary">
            La note de cadrage projet pour les programmes de soutien public est
            actuellement disponible uniquement pour les établissements situés
            en France. Pour les autres marchés, contactez Rinzler Studio pour
            une approche adaptée.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <FundingBriefClient
      token={token}
      initialPreview={res.preview}
      persisted={
        res.persisted
          ? {
              id: res.persisted.id,
              generated_at: res.persisted.generated_at.toISOString(),
            }
          : null
      }
    />
  );
}
