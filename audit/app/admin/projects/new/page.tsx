import { NewProjectForm } from "@/components/admin/NewProjectForm";
import { Card, CardHeader } from "@/components/ui/Card";
import { GradientText } from "@/components/brand/GradientText";

export const metadata = {
  title: "Nouveau projet · Rinzler Audit",
  robots: { index: false, follow: false },
};

export default function NewProjectPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-h2 font-semibold">
          <GradientText>Nouveau projet d'audit</GradientText>
        </h1>
        <p className="mt-1 text-text-secondary">
          Créez l'engagement, pré-remplissez ce que vous savez déjà, puis copiez le lien privé à
          envoyer à votre client.
        </p>
      </header>
      <Card>
        <CardHeader
          title="Informations de base"
          description="Le nom interne du projet est privé. L'email est utilisé pour identifier le contact ; aucun email n'est envoyé automatiquement par la plateforme en V1 — vous copiez le lien et l'envoyez vous-même."
        />
        <NewProjectForm />
      </Card>
    </div>
  );
}
