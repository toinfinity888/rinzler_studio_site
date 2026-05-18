/**
 * Pure block-ordering helpers — safe to import from client components.
 *
 * Anything that touches the DB lives in `load-block.ts` (server-only).
 * Split out so client islands like `DynamicBlockClient.tsx` can reference
 * the block sequence without dragging the server-only module into the
 * client bundle.
 */
import { QUESTION_BLOCKS, type QuestionBlock } from "@/db/schema";

export const BLOCK_ORDER: readonly QuestionBlock[] = QUESTION_BLOCKS;

export function nextBlock(current: QuestionBlock | null): QuestionBlock | null {
  if (current === null) return BLOCK_ORDER[0] ?? null;
  const idx = BLOCK_ORDER.indexOf(current);
  if (idx < 0) return BLOCK_ORDER[0] ?? null;
  return BLOCK_ORDER[idx + 1] ?? null;
}
