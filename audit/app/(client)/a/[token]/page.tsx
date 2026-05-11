import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GradientText } from "@/components/brand/GradientText";
import { loadProjectByToken } from "@/lib/projects/load-by-token";

interface ClientLandingProps {
  params: Promise<{ token: string }>;
}

export const metadata = {
  title: "Audit Rinzler Studio",
  robots: { index: false, follow: false },
};

const STATUS_BANNER: Record<string, string | null> = {
  reopened:
    "Cet audit a été rouvert pour modification par votre consultant — vos réponses précédentes sont conservées.",
};

export default async function ClientLanding({ params }: ClientLandingProps) {
  const { token } = await params;
  const loaded = await loadProjectByToken(token);
  if (!loaded) notFound();

  const { project } = loaded;
  if (project.status === "submitted") {
    // Client revisits a finished audit — show a soft "thank you, this audit is closed" page.
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader
            title={
              <span>
                <GradientText>Audit complété — merci</GradientText>
              </span>
            }
            description={`L'audit pour ${project.hotelName ?? "votre établissement"} a déjà été soumis. Votre consultant Rinzler Studio reviendra vers vous sous 48 h.`}
          />
        </Card>
      </div>
    );
  }

  // Auto-route in-progress sessions back into the form.
  if (project.status === "in_progress") {
    redirect(`/a/${token}/form/s1`);
  }

  const banner = STATUS_BANNER[project.status];

  return (
    <div className="space-y-6">
      {banner ? (
        <div className="rounded-md p-4 [background:rgba(255,170,0,0.08)] [border:1px_solid_var(--color-warning)] text-sm text-warning">
          {banner}
        </div>
      ) : null}

      <Card>
        <CardHeader
          title={
            <>
              Audit modernisation —{" "}
              <GradientText>{project.hotelName ?? "votre hôtel"}</GradientText>
            </>
          }
          description="Bienvenue. Cet audit nous permet de comprendre votre établissement et vos enjeux. Comptez environ 25 à 30 minutes ; vos réponses sont sauvegardées automatiquement à chaque pas, vous pouvez fermer la page et revenir."
        />

        <div className="space-y-4 text-text-secondary text-sm leading-relaxed">
          <p>
            <strong className="text-text-primary">8 sections</strong>, allant d'un aperçu de votre
            établissement jusqu'à vos priorités de modernisation. Seuls les <em>champs de la
            Section 1</em> sont obligatoires — vous pouvez sauter tout le reste.
          </p>
          <p>
            Vos réponses restent privées et ne sont accessibles qu'à Rinzler Studio. Voir le bloc
            de bas de page pour la politique complète.
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href={`/a/${token}/form/s1`}>
            <Button>Commencer l'audit →</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
