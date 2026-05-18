/**
 * T050 — Condition evaluator (FR-010).
 *
 * Pure, side-effect-free evaluator for `question_conditions.expression_json`.
 * The expression AST is intentionally small and JSON-encodable so it can be
 * authored in the admin UI without code changes.
 *
 * Grammar
 * --------
 * A condition expression is one of:
 *
 *   1. A leaf comparison:
 *        { answer: <slug>, op: <op>, value: <unknown> }
 *      or
 *        { scan: <field>, op: <op>, value: <unknown> }
 *
 *      The legacy short forms `{ answer, eq }`, `{ answer, ne }`, etc. are
 *      also accepted: `{ answer: "pms_vendor", eq: "d_edge" }` is sugar for
 *      `{ answer: "pms_vendor", op: "eq", value: "d_edge" }`.
 *
 *   2. A logical composition:
 *        { all: [Expr, ...] }   // AND
 *        { any: [Expr, ...] }   // OR
 *        { not: Expr }
 *
 * Supported operators
 * -------------------
 *   eq, ne          — strict equality (===) / inequality
 *   in              — value is a member of an array on the left side, OR the
 *                     left side is a member of the array on the right side
 *   not_in          — inverse of `in`
 *   gt, gte, lt, lte
 *   exists          — left side is not undefined / null
 *   missing         — left side is undefined / null
 *   contains        — for arrays/strings: left contains value
 *
 * No reflection on the renderer. The expression tree is whatever the question
 * admin stored; we just walk it. Multiple `question_conditions` rows for the
 * same `question_version_id` are OR-ed (per data-model.md §C), which is
 * handled by the caller (`evaluateAnyCondition`).
 */

export interface ConditionContext {
  /** Map of answered question slug → committed value (raw, jsonb-passthrough). */
  answers: Record<string, unknown>;
  /** Map of scan finding field → value_json (raw, jsonb-passthrough). */
  scanFindings: Record<string, unknown>;
}

export type ConditionOp =
  | "eq"
  | "ne"
  | "in"
  | "not_in"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "exists"
  | "missing"
  | "contains";

interface LeafComparison {
  answer?: string;
  scan?: string;
  op?: ConditionOp;
  value?: unknown;
  // Legacy sugar — any of these implies an `op` automatically.
  eq?: unknown;
  ne?: unknown;
  in?: unknown[];
  not_in?: unknown[];
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  exists?: boolean;
  contains?: unknown;
}

interface AllExpr {
  all: ConditionExpression[];
}
interface AnyExpr {
  any: ConditionExpression[];
}
interface NotExpr {
  not: ConditionExpression;
}

export type ConditionExpression = LeafComparison | AllExpr | AnyExpr | NotExpr;

function isAll(expr: ConditionExpression): expr is AllExpr {
  return Array.isArray((expr as AllExpr).all);
}
function isAny(expr: ConditionExpression): expr is AnyExpr {
  return Array.isArray((expr as AnyExpr).any);
}
function isNot(expr: ConditionExpression): expr is NotExpr {
  return (expr as NotExpr).not !== undefined && !isAll(expr) && !isAny(expr);
}

function resolveLeft(leaf: LeafComparison, ctx: ConditionContext): unknown {
  if (typeof leaf.answer === "string") return ctx.answers[leaf.answer];
  if (typeof leaf.scan === "string") return ctx.scanFindings[leaf.scan];
  return undefined;
}

function compareScalar(op: ConditionOp, left: unknown, right: unknown): boolean {
  switch (op) {
    case "eq":
      return left === right;
    case "ne":
      return left !== right;
    case "gt":
      return typeof left === "number" && typeof right === "number" && left > right;
    case "gte":
      return typeof left === "number" && typeof right === "number" && left >= right;
    case "lt":
      return typeof left === "number" && typeof right === "number" && left < right;
    case "lte":
      return typeof left === "number" && typeof right === "number" && left <= right;
    case "exists":
      return left !== undefined && left !== null;
    case "missing":
      return left === undefined || left === null;
    case "in": {
      if (Array.isArray(left)) return left.includes(right);
      if (Array.isArray(right)) return right.includes(left);
      return false;
    }
    case "not_in": {
      if (Array.isArray(left)) return !left.includes(right);
      if (Array.isArray(right)) return !right.includes(left);
      return true;
    }
    case "contains": {
      if (Array.isArray(left)) return left.includes(right);
      if (typeof left === "string") return typeof right === "string" && left.includes(right);
      return false;
    }
    default:
      return false;
  }
}

function evaluateLeaf(leaf: LeafComparison, ctx: ConditionContext): boolean {
  // Resolve legacy-sugar → canonical (op, value)
  let op: ConditionOp | undefined = leaf.op;
  let value: unknown = leaf.value;
  if (op === undefined) {
    if (leaf.eq !== undefined) {
      op = "eq";
      value = leaf.eq;
    } else if (leaf.ne !== undefined) {
      op = "ne";
      value = leaf.ne;
    } else if (leaf.in !== undefined) {
      op = "in";
      value = leaf.in;
    } else if (leaf.not_in !== undefined) {
      op = "not_in";
      value = leaf.not_in;
    } else if (leaf.gt !== undefined) {
      op = "gt";
      value = leaf.gt;
    } else if (leaf.gte !== undefined) {
      op = "gte";
      value = leaf.gte;
    } else if (leaf.lt !== undefined) {
      op = "lt";
      value = leaf.lt;
    } else if (leaf.lte !== undefined) {
      op = "lte";
      value = leaf.lte;
    } else if (leaf.exists === true) {
      op = "exists";
    } else if (leaf.exists === false) {
      op = "missing";
    } else if (leaf.contains !== undefined) {
      op = "contains";
      value = leaf.contains;
    }
  }
  if (!op) return false;
  const left = resolveLeft(leaf, ctx);
  return compareScalar(op, left, value);
}

/**
 * Evaluate a single `expression_json` row.
 * Returns `true` when the condition is satisfied (i.e., the question
 * should be shown).
 */
export function evaluateExpression(
  expr: ConditionExpression | null | undefined,
  ctx: ConditionContext,
): boolean {
  if (expr === null || expr === undefined) return true;
  if (isAll(expr)) return expr.all.every((e) => evaluateExpression(e, ctx));
  if (isAny(expr)) return expr.any.some((e) => evaluateExpression(e, ctx));
  if (isNot(expr)) return !evaluateExpression(expr.not, ctx);
  return evaluateLeaf(expr as LeafComparison, ctx);
}

/**
 * Multiple `question_conditions` rows for the same `question_version_id`
 * are OR-ed (data-model.md §C). Empty list = no conditions = always show.
 */
export function evaluateAnyCondition(
  expressions: ConditionExpression[] | null | undefined,
  ctx: ConditionContext,
): boolean {
  if (!expressions || expressions.length === 0) return true;
  return expressions.some((e) => evaluateExpression(e, ctx));
}
