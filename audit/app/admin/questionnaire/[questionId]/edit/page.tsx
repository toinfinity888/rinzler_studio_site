import { notFound } from "next/navigation";

import {
  getQuestionForEdit,
  updateQuestion,
  publishQuestionVersion,
  deactivateQuestion,
} from "@/lib/questionnaire/admin-actions";
import { QuestionEditor, type TranslationFormState } from "@/components/questionnaire-admin/QuestionEditor";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Édition question · Admin Rinzler",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ questionId: string }>;
}

export default async function QuestionEditPage({ params }: PageProps) {
  const { questionId } = await params;
  const res = await getQuestionForEdit(questionId);
  if (!res.ok) return notFound();
  const { question, version, translations, conditions } = res.data;

  const initialTranslations: TranslationFormState[] = translations.map((t) => ({
    language: t.language,
    prompt: t.prompt,
    helper: t.helper,
    optionLabels: t.optionLabels as Record<string, string> | null,
  }));
  const initialDefinitionJson = JSON.stringify(version.definitionJson, null, 2);
  const initialConditionsJson = JSON.stringify(
    conditions.map((c) => c.expressionJson),
    null,
    2,
  );

  async function updateAction(form: {
    definition: unknown;
    translations: TranslationFormState[];
    conditions: { expression: unknown }[];
  }) {
    "use server";
    const r = await updateQuestion(questionId, {
      definition: form.definition as Record<string, unknown>,
      translations: form.translations.map((t) => ({
        language: t.language,
        prompt: t.prompt,
        helper: t.helper ?? undefined,
        optionLabels: t.optionLabels ?? undefined,
      })),
      conditions: form.conditions,
    });
    if (!r.ok) return { ok: false, error: r.error.message };
    return { ok: true, versionId: r.data.versionId, version: r.data.version };
  }

  async function publishAction(versionId: string) {
    "use server";
    const r = await publishQuestionVersion(questionId, versionId);
    if (!r.ok) return { ok: false, error: r.error.message };
    return { ok: true };
  }

  async function deactivateAction() {
    "use server";
    const r = await deactivateQuestion(questionId);
    if (!r.ok) return { ok: false, error: r.error.message };
    return { ok: true };
  }

  return (
    <QuestionEditor
      question={{
        id: question.id,
        slug: question.slug,
        block: question.block,
        answerType: question.answerType,
        status: question.status,
        currentVersion: question.currentVersion,
      }}
      initialDefinitionJson={initialDefinitionJson}
      initialTranslations={initialTranslations}
      initialConditionsJson={initialConditionsJson}
      serverActions={{ updateAction, publishAction, deactivateAction }}
    />
  );
}
