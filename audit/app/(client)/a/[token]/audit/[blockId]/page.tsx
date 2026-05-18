import { notFound, redirect } from "next/navigation";

import { Card, CardHeader } from "@/components/ui/Card";
import { GradientText } from "@/components/brand/GradientText";
import {
  getNextQuestionBlock,
  getProjectContext,
} from "@/lib/questionnaire/server-actions";
import { commitAnswer } from "@/lib/questionnaire/commit";
import { submitAudit } from "@/lib/questionnaire/submit";
import { QUESTION_BLOCKS, type QuestionBlock } from "@/db/schema";
import { BLOCK_ORDER } from "@/lib/questionnaire/load-block";
import { DynamicBlockClient } from "./DynamicBlockClient";

interface PageProps {
  params: Promise<{ token: string; blockId: string }>;
}

export const metadata = {
  title: "Audit dynamique — Rinzler Studio",
  robots: { index: false, follow: false },
};

function isBlock(id: string): id is QuestionBlock {
  return (QUESTION_BLOCKS as readonly string[]).includes(id);
}

/**
 * Server action wrappers — re-exported so the client island can call them
 * via Next.js server-action plumbing. Both are thin pass-throughs.
 */
async function commitOneAction(input: {
  token: string;
  question_slug: string;
  question_version_id: string;
  value: unknown;
  i_dont_know: boolean;
  voice_capture?: {
    transcript_post_edit: string;
    transcription_provider: "deepgram_eu" | "webspeech";
  } | null;
}) {
  "use server";
  const r = await commitAnswer(input);
  if (!r.ok) return { ok: false as const, reason: r.reason };
  return { ok: true as const, completion_pct: r.completion_pct };
}

async function submitAuditAction(token: string) {
  "use server";
  return await submitAudit(token);
}

export default async function DynamicBlockPage({ params }: PageProps) {
  const { token, blockId } = await params;

  if (blockId !== "start" && !isBlock(blockId)) notFound();

  const ctx = await getProjectContext(token);
  if (!ctx.ok) notFound();

  const startAfter: QuestionBlock | null =
    blockId === "start"
      ? null
      : BLOCK_ORDER[Math.max(BLOCK_ORDER.indexOf(blockId) - 1, -1)] ?? null;

  const next = await getNextQuestionBlock(token, startAfter);
  if (!next.ok) {
    if (next.reason === "locked") redirect(`/a/${token}`);
    notFound();
  }

  if (next.done) {
    redirect(`/a/${token}/confirmation`);
  }

  const initialValues: Record<string, unknown> = {};
  for (const p of next.block.prefilled) {
    initialValues[p.question_slug] = null;
  }

  const isLastBlock =
    next.block.block_progress.index >= next.block.block_progress.total;

  return (
    <div className="space-y-6">
      {ctx.hotel?.display_name ? (
        <Card>
          <CardHeader
            title={
              <span>
                Audit — <GradientText>{ctx.hotel.display_name}</GradientText>
              </span>
            }
            description={`Section ${next.block.block_progress.index} / ${next.block.block_progress.total} — vos réponses sont sauvegardées au passage à la section suivante.`}
          />
        </Card>
      ) : null}

      <DynamicBlockClient
        token={token}
        block={next.block}
        initialValues={initialValues}
        isLastBlock={isLastBlock}
        canEdit={ctx.project.can_edit}
        commitOneAction={commitOneAction}
        submitAuditAction={submitAuditAction}
      />
    </div>
  );
}
