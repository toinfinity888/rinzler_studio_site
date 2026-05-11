import { notFound } from "next/navigation";
import { ClientFormStep } from "@/components/client-form/ClientFormStep";
import { loadProjectByToken } from "@/lib/projects/load-by-token";
import { SECTIONS } from "@/lib/form-schema/sections";

interface FormStepProps {
  params: Promise<{ token: string; section: string }>;
}

export const metadata = {
  title: "Audit · Rinzler Studio",
  robots: { index: false, follow: false },
};

const VALID_SECTIONS: ReadonlySet<string> = new Set(SECTIONS.map((s) => s.id as string));

export default async function FormStepPage({ params }: FormStepProps) {
  const { token, section } = await params;
  if (!VALID_SECTIONS.has(section)) notFound();

  const loaded = await loadProjectByToken(token);
  if (!loaded) notFound();
  if (loaded.project.status === "submitted") notFound();

  return (
    <ClientFormStep
      token={token}
      sectionId={section}
      initialAnswers={loaded.answers}
      initialUpdatedAt={new Date(loaded.submission.updatedAt).getTime()}
      initialCompletionPct={loaded.submission.completionPct}
    />
  );
}
