# Contract: Client (Tokenized) Server Actions

Reachable from the tokenized client routes `/a/[token]/*`. Token is hashed in `projects.token_hash` and validated by middleware (existing pattern from 001).

All routes here emit `noindex`. All actions enforce that the token has not been revoked and the project status permits the operation.

---

## Project & questionnaire flow

### `getProjectContext(token)`

**Returns**: a sealed snapshot for the renderer:

```ts
{
  project: {
    id, hotel_id, tier, status, goal_primary, goal_secondary, budget_level,
    completion_pct, language, can_edit, scan_id_or_null
  };
  hotel: HotelPublicShape | null;            // null for free-scan projects
  scan_findings: ScanFindingPublicShape[];   // surfaced to the hotelier (FR-004)
  next_block: QuestionBlock | null;
  language_fallback_used: { question_id: string }[];   // FR-104 indicator
}
```

### `getNextQuestionBlock(token)`

**Behavior**:
1. Load the current project's answer set + scan findings.
2. Evaluate `question_conditions` for each `questions` row in the project's tier (FR-010).
3. Apply pre-fill from scan findings and from any consultant pre-fill (FR-016).
4. Build a runtime Zod schema from the resolved question definitions for client-side validation.
5. Return the next block to render (or `null` if the audit is complete).

**Returns**:
```ts
{
  block_id: 'profile' | 'goal' | 'stack' | ...;
  block_title: string;
  block_progress: { index: number; total: number };
  questions: RenderableQuestion[];
  zod_schema_json: object;     // for client-side validation; server re-validates on commit
  prefilled: { question_slug: string; source: 'scan' | 'consultant' }[];
}
```

### `commitAnswer(token, payload)`

**Payload**:
```ts
{
  question_slug: string;
  question_version_id: string;     // pinned by the renderer for traceability
  value: unknown;                  // shape depends on answer_type
  i_dont_know?: boolean;
  voice_capture?: {
    transcript_post_edit: string;
    structured_extraction: object | null;
    transcription_provider: 'deepgram_eu' | 'webspeech';
  };
}
```

**Behavior**:
1. Server-side re-validate against the question's published version (FR-018: "I don't know" is always accepted and lowers confidence).
2. If a consultant override exists for this question, preserve it; the new client answer is recorded as `overrides_answer_id = NULL` and the consultant override remains the effective value.
3. Run server-side redaction (R9) over `voice_capture.transcript_post_edit` if present.
4. Persist `answers`, persist `voice_captures` row if present, update `submissions.completion_pct` and `submissions.updated_at`.
5. Recompute conditional visibility of downstream questions (cheap, in-memory).
6. Emit Plausible event: `audit_section_progressed` if a block transition occurred; `audit_voice_used` if voice was used.

**Response**:
```ts
{ ok: true; next_visibility_changed: boolean }
```

### `submitAudit(token)`

**Behavior**:
1. Enqueue an `ai_reason` worker job for recommendation generation (the heavy reasoning step).
2. Enqueue an `enrichment.worker.ts` job to extract candidate enrichments (FR-120).
3. Set `projects.status = 'submitted'`.
4. Emit Plausible event: `audit_submitted`.

The hotelier sees a "report in progress" screen; the renderer polls `getReportStatus` (below).

### `getReportStatus(token)`

**Returns**:
```ts
{
  status: 'pending' | 'in_progress' | 'ready' | 'failed';
  progress_hint: 0..1;
  estimated_seconds_remaining: number;
}
```

### `getPublishedReport(token)`

**Behavior**:
- For self-service tiers (mini, full): returns the latest `report_snapshots` row immediately on completion.
- For consultant_assisted tier: returns 404 / "awaiting consultant finalization" until the consultant publishes.

**Returns**: `report_snapshots.rendered_json` plus a `pdf_url` (signed object-storage URL, 24h validity) if PDF generation has completed.

---

## Voice transcription session

### `POST /api/transcribe/session` (called from the client during voice capture)

**Auth**: client token (header). Project must be `in_progress`.

**Behavior**: Issues a Deepgram session token with TTL 60 s. The token is scoped to streaming-only, language matched to the project's `language`, configured with `keep_audio=false`.

**Response**:
```ts
{
  provider: 'deepgram_eu';
  session_token: string;        // short-lived, signed
  websocket_url: string;
  expires_at: string;
  fallback_provider: 'webspeech' | null;  // if Deepgram quota exceeded
}
```

The browser opens the WebSocket directly to Deepgram with the session token. **No audio passes through our server.**

### `commitVoiceTranscript(token, payload)`

Already covered by `commitAnswer` with `voice_capture` populated. The browser MAY call this multiple times for the same question if the hotelier re-records — only the final commit persists.

---

## Funding-readiness module

### `getFundingBriefPreview(token)`

**Behavior**: Available only if `hotel.country === 'FR'` (FR-060). Pre-fills from existing audit data (FR-061) and lists the remaining inputs.

**Returns**:
```ts
{
  available: boolean;            // false if not in FR market
  prefilled_sections: Section[];
  remaining_inputs: Field[];
  disclaimer_text: string;       // FR-062, baked into PDF
}
```

### `generateFundingBrief(token, additional_inputs)`

**Behavior**: Persists a `funding_briefs` row, enqueues a `report.worker.ts` PDF render scoped to the brief.

**Returns**:
```ts
{ funding_brief_id: string; pdf_pending: true }
```

---

## Client-side guardrails

- All client routes are `noindex`.
- The token's `project_id` is never exposed in URLs visible to other tabs / referer headers.
- `commitAnswer` is idempotent on `(question_slug, question_version_id)` per project — last write wins for the same question/version pair, but the answer history is preserved in an internal audit trail (per `audit_log`).
- Server actions reject any operation that would mutate a `published` or `archived` project, except `getPublishedReport` (read-only).
