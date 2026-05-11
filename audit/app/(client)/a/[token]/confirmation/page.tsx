import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { GradientText } from "@/components/brand/GradientText";
import { loadProjectByToken } from "@/lib/projects/load-by-token";

interface ConfirmationProps {
  params: Promise<{ token: string }>;
}

export const metadata = {
  title: "Merci · Rinzler Studio",
  robots: { index: false, follow: false },
};

export default async function ConfirmationPage({ params }: ConfirmationProps) {
  const { token } = await params;
  const loaded = await loadProjectByToken(token);
  if (!loaded) notFound();

  const { project } = loaded;

  return (
    <Card>
      <CardHeader
        title={
          <span>
            <GradientText>Merci — votre audit est reçu.</GradientText>
          </span>
        }
        description={`L'audit pour ${project.hotelName ?? "votre établissement"} a bien été soumis. Votre consultant Rinzler Studio reviendra vers vous sous 48 h pour partager les premières observations.`}
      />
      <Link
        href="https://rinzlerstudio.fr"
        className="text-sm text-accent-cyan underline hover:text-accent-cyan-hover"
      >
        rinzlerstudio.fr
      </Link>
    </Card>
  );
}
