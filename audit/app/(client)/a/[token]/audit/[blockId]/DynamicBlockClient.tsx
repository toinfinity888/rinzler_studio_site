"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { BlockShell } from "@/components/questionnaire/BlockShell";
import type { QuestionBlockPayload } from "@/lib/questionnaire/types";
import { BLOCK_ORDER } from "@/lib/questionnaire/blocks";

export interface DynamicBlockClientProps {
  token: string;
  block: QuestionBlockPayload;
  initialValues: Record<string, unknown>;
  isLastBlock: boolean;
  canEdit: boolean;
  commitOneAction: (input: {
    token: string;
    question_slug: string;
    question_version_id: string;
    value: unknown;
    i_dont_know: boolean;
    voice_capture?: {
      transcript_post_edit: string;
      transcription_provider: "deepgram_eu" | "webspeech";
    } | null;
  }) => Promise<
    | { ok: true; completion_pct?: number }
    | { ok: false; reason?: string }
  >;
  submitAuditAction: (token: string) => Promise<unknown>;
}

export function DynamicBlockClient(props: DynamicBlockClientProps) {
  const router = useRouter();
  const {
    token,
    block,
    initialValues,
    isLastBlock,
    canEdit,
    commitOneAction,
    submitAuditAction,
  } = props;

  return (
    <BlockShell
      token={token}
      block={block}
      initialValues={initialValues}
      readOnly={!canEdit}
      isLastBlock={isLastBlock}
      commitOne={(input) =>
        commitOneAction({ token, ...input }).then((r) => {
          if (r.ok) return { ok: true, completion_pct: r.completion_pct };
          return { ok: false, reason: r.reason };
        })
      }
      onBlockComplete={() => {
        const idx = BLOCK_ORDER.indexOf(block.block_id);
        const nextId =
          idx >= 0 && idx + 1 < BLOCK_ORDER.length
            ? BLOCK_ORDER[idx + 1]
            : null;
        if (nextId) {
          router.push(`/a/${token}/audit/${nextId}`);
        } else {
          router.push(`/a/${token}/confirmation`);
        }
      }}
      onSubmitAudit={
        isLastBlock
          ? async () => {
              await submitAuditAction(token);
              router.push(`/a/${token}/confirmation`);
            }
          : undefined
      }
    />
  );
}
