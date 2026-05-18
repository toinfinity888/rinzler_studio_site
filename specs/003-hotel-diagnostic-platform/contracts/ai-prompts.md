# Contract: Claude Prompt Contracts (via Bedrock Frankfurt)

This document defines the structured contracts between the platform and the Claude inference layer. Every call site uses the same provider adapter (`audit/lib/ai/bedrock-client.ts`), enforces an output JSON schema via Claude tool use, and rejects responses that fail schema validation.

The platform never trusts free-text LLM output for any decision-critical field. The LLM produces *explanations and synthesis*; the *rules engine* produces eligibility and signal-traceability.

---

## P1 — Recommendation reasoning (per-project)

**Used by**: `ai.worker.ts` job `ai.reason_project`.

**Model**: Claude Opus 4.7 for full-tier / consultant-assisted; Claude Sonnet 4.6 for mini-tier (cheaper, sufficient).

**Prompt cache scope**: the stable prefix sections (vendor catalogue snapshot, scoring rubric, question catalogue, system instructions) are marked for prompt caching. Per-project content is the cache-miss tail.

**System message** (cached prefix):
```
You are the reasoning layer of a hotel diagnostic platform. Your job is to
produce structured recommendations, scenarios, scores, and explanations for
an independent-hotel audit, given a vendor catalogue, a scoring rubric, the
hotel's answers, and the external scan findings.

You MUST:
- Output only via the provided structured tool. No free-form prose outside
  the tool call.
- Use only vendor entries from the provided catalogue; never invent vendors.
- Mark a recommendation as do_not_do_now when an action is premature or
  risky for this hotel, and explain why.
- Set confidence conservatively. Lower confidence whenever a relevant
  vendor field is marked uncertain or outdated, or when a critical answer
  is "I don't know".
- Refuse to produce a compliance verdict; describe risk areas and checklist
  items only.
- Never include the hotelier's personal name, contact email, phone, or
  named guests in any rendered field — those have already been redacted
  before reaching you.
```

**User message** (cache-miss tail): JSON payload with:
```ts
{
  hotel_profile: { property_type, room_count, country, region, language, ... },
  goal_primary, goal_secondary, budget_level, change_readiness,
  scan_findings_summary: [{ field, value, confidence }, ...],
  answers: [{ question_slug, question_version_id, value, source, confidence }, ...],
  eligible_vendors: [{ id, version_id, summary }, ...],   // rule-pre-filtered
  rule_engine_version: string,
  scoring_rubric_version: string
}
```

**Tool definition** (Claude tool use schema):
```json
{
  "name": "emit_audit_report",
  "description": "Emit the structured recommendation set for this audit.",
  "input_schema": {
    "type": "object",
    "required": ["scenarios", "recommendations", "readiness_scores", "compliance_findings", "executive_summary"],
    "properties": {
      "executive_summary": { "type": "string", "maxLength": 1200 },
      "scenarios": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["kind", "title", "summary", "tradeoffs"],
          "properties": {
            "kind": { "enum": ["minimal", "balanced", "advanced"] },
            "title": { "type": "string" },
            "summary": { "type": "string", "maxLength": 600 },
            "tradeoffs": { "type": "object" }
          }
        }
      },
      "recommendations": {
        "type": "array",
        "items": {
          "type": "object",
          "required": [
            "action", "scenario_kind", "explanation", "impact",
            "confidence", "do_not_do_now"
          ],
          "properties": {
            "action": { "type": "string", "maxLength": 200 },
            "scenario_kind": { "enum": ["minimal", "balanced", "advanced", "standalone"] },
            "vendor_id": { "type": ["string", "null"] },
            "explanation": {
              "type": "object",
              "required": [
                "relevance", "problem_solved", "change",
                "benefit", "effort", "risks",
                "check_before", "alternatives",
                "do_nothing_consequence"
              ],
              "properties": {
                "relevance":            { "type": "string", "maxLength": 600 },
                "problem_solved":       { "type": "string", "maxLength": 400 },
                "change":               { "type": "string", "maxLength": 400 },
                "benefit":              { "type": "string", "maxLength": 400 },
                "effort":               { "type": "string", "maxLength": 300 },
                "risks":                { "type": "string", "maxLength": 400 },
                "check_before":         { "type": "string", "maxLength": 400 },
                "alternatives":         { "type": "array", "items": { "type": "string" } },
                "do_nothing_consequence": { "type": "string", "maxLength": 400 }
              }
            },
            "impact": {
              "type": "object",
              "properties": {
                "operational":          { "enum": ["low","medium","high"] },
                "workload_reduction":   { "enum": ["low","medium","high"] },
                "guest_experience":     { "enum": ["low","medium","high"] },
                "response_speed":       { "enum": ["low","medium","high"] },
                "consistency":          { "enum": ["low","medium","high"] },
                "onboarding":           { "enum": ["low","medium","high"] },
                "direct_booking":       { "enum": ["low","medium","high"] },
                "complexity":           { "enum": ["low","medium","high"] },
                "cost_band":            { "enum": ["free","entry","mid","premium","enterprise","variable"] },
                "time_to_deploy":       { "enum": ["immediate","30d","60d","90d","quarter_plus"] },
                "risk_level":           { "enum": ["low","medium","high"] },
                "dependencies":         { "type": "array", "items": { "type": "string" } }
              }
            },
            "confidence": { "enum": ["low","medium","high"] },
            "do_not_do_now": { "type": "boolean" },
            "do_not_do_reason": { "type": ["string", "null"] },
            "signals_consulted": {
              "type": "object",
              "required": ["answers", "scan_findings", "vendor_fields"],
              "properties": {
                "answers":       { "type": "array", "items": { "type": "string" } },
                "scan_findings": { "type": "array", "items": { "type": "string" } },
                "vendor_fields": { "type": "array", "items": { "type": "string" } }
              }
            }
          }
        }
      },
      "readiness_scores": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["dimension","value","band","basis"],
          "properties": {
            "dimension": {
              "enum": [
                "website","ai_search","direct_booking","guest_communication",
                "automation","tool_stack_coherence","data_integration",
                "compliance","operational_workload"
              ]
            },
            "value": { "type": "integer", "minimum": 0, "maximum": 100 },
            "band":  { "enum": ["low","medium","high"] },
            "basis": { "type": "array", "items": { "type": "string" } }
          }
        }
      },
      "compliance_findings": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["topic","severity","explanation","checklist_item"],
          "properties": {
            "topic":          { "type": "string" },
            "severity":       { "enum": ["info","advisory","risk"] },
            "explanation":    { "type": "string", "maxLength": 600 },
            "checklist_item": { "type": "string", "maxLength": 300 }
          }
        }
      }
    }
  }
}
```

**Post-processing**:
- The platform validates the tool output against the schema. On failure: one retry with a corrective hint; on second failure: fall back to rules-only output (no LLM explanations) and surface a banner in the consultant view.
- The `signals_consulted` field is cross-checked against the rules engine's enumeration; any LLM-named signal not in the rules-derived set is dropped. The final stored `signals_consulted` is the intersection.
- `confidence` is overridden to `min(rule_confidence, llm_confidence)`.

---

## P2 — Voice transcript structuring

**Used by**: `ai.extract_voice_structure`.

**Model**: Claude Sonnet 4.6.

**System message** (cached):
```
You convert a single hotelier voice answer (already transcribed) into a
structured shape. Output via the provided tool. Do not invent details that
are not in the transcript.
```

**Tool**:
```json
{
  "name": "emit_voice_structure",
  "input_schema": {
    "type": "object",
    "required": ["topics", "channels", "current_process", "automation_opportunity", "candidate_solution_category"],
    "properties": {
      "topics":                       { "type": "array", "items": { "type": "string" } },
      "channels":                     { "type": "array", "items": { "type": "string" } },
      "current_process":              { "type": "string", "maxLength": 400 },
      "automation_opportunity":       { "type": "string", "maxLength": 400 },
      "candidate_solution_category":  { "type": "string", "maxLength": 200 }
    }
  }
}
```

---

## P3 — Candidate-enrichment summarization

**Used by**: `enrichment.worker.ts` after the rule-based diff step. The LLM only *describes* the candidate in plain language; the diff itself is computed deterministically.

---

## P4 — Learned-pattern summarization

**Used by**: `learning.worker.ts` after the materialized view detects a crossed threshold. The LLM turns a numeric aggregate row into a one-sentence observation for team review.

---

## Cross-cutting prompt rules

1. **No PII** reaches the model. The redactor (`audit/lib/ai/redact.ts`) strips personal name, contact, email, phone, and named-guest mentions before any call. The audit log records what was redacted per call.
2. **Prompt caching** is configured on every stable-prefix payload to keep AI cost bounded (target P95 ≤ €0.30 per project).
3. **Deterministic output** is enforced via tool use; the platform refuses to render anything from a free-text response that does not validate.
4. **Provider-portable**: every prompt above is defined in terms of a structured input + a tool schema. Swapping the underlying provider (R2 fallbacks: Mistral Large EU, OpenAI Azure EU) requires only adapter changes, not call-site changes.
