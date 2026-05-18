# Quickstart: Hotel Diagnostic Platform — Developer Setup

This is the developer-onboarding guide for working on feature `003-hotel-diagnostic-platform`. It assumes you have completed the `001-hotel-audit-platform` setup (Node 20 LTS, the existing `audit/` workspace).

## 1. Prerequisites

- **Node.js 20 LTS**
- **Docker** (for local Postgres + Redis + MinIO via `docker-compose`)
- **AWS account** with Bedrock access in `eu-central-1` and a Bedrock-scoped IAM user — credentials in `audit/.env.local`
- **Deepgram account** with EU endpoint enabled — API key in `audit/.env.local`
- **Playwright browsers** installed: `pnpm dlx playwright install chromium`

## 2. Local services

```bash
cd audit
docker compose -f infra/dev/docker-compose.yml up -d
# starts: postgres:16, redis:7, minio (S3-compatible local object storage)
```

This stands up:
- Postgres at `localhost:5432`, db `audit_dev`
- Redis at `localhost:6379`
- MinIO at `http://localhost:9001` (console) / `:9000` (S3 API)

## 3. Environment

Copy `audit/.env.example` to `audit/.env.local` and fill:

```
DATABASE_URL=postgres://audit:audit@localhost:5432/audit_dev
REDIS_URL=redis://localhost:6379
NEXTAUTH_SECRET=... # generate
NEXTAUTH_URL=http://localhost:3000

# AI inference (R2)
BEDROCK_REGION=eu-central-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
BEDROCK_MODEL_ID_OPUS=anthropic.claude-opus-4-7-v1:0
BEDROCK_MODEL_ID_SONNET=anthropic.claude-sonnet-4-6-v1:0

# Voice transcription (R3)
DEEPGRAM_API_KEY=...
DEEPGRAM_REGION=eu

# Object storage (R6) — MinIO locally, Scaleway in prod
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=audit-reports-dev
S3_REGION=us-east-1   # MinIO default; production uses fr-par
S3_ACCESS_KEY_ID=minio
S3_SECRET_ACCESS_KEY=minio123

# Cost guardrails
AI_PER_PROJECT_BUDGET_EUR=3.00
```

## 4. Database

```bash
pnpm db:generate         # generate Drizzle migrations from schema.ts
pnpm db:migrate          # apply migrations to local Postgres
pnpm db:seed:admin       # creates the initial super_admin user
pnpm db:seed:vendors     # seeds the vendor catalogue (initial ~50 entries)
pnpm db:seed:questionnaire   # imports the 22-block questionnaire spec into DB
```

If you are migrating from a MySQL development environment carried over from 001, run instead:

```bash
pnpm db:migrate:mysql-to-postgres
```

The script reads from `MYSQL_URL`, writes to `DATABASE_URL`, validates checksums, and prints a summary.

## 5. Running everything locally

Three processes (each in its own terminal):

```bash
# 1. Next.js app
pnpm dev

# 2. BullMQ workers (single process loads all queue handlers in dev)
pnpm workers:dev

# 3. (optional) Local Plausible proxy for cookie-free analytics in dev
pnpm analytics:dev
```

Visit:
- Free-scan landing: http://localhost:3000/
- Admin: http://localhost:3000/admin (login with the seeded super_admin)
- Sample scan result: http://localhost:3000/scan/<scan_id> (after running a scan)

## 6. End-to-end smoke tests for each P1 user story

### US 1 — Free scan from URL only

```bash
# From the landing page, submit a hotel URL (e.g. https://www.lhotel-paris.com).
# Watch the worker log; scan should complete in ~30–60s.
# Result page should render observations, opportunity map, and an "Upgrade" CTA.
# Optional: check the "Receive by email" path.
```

Acceptance signals (cross-reference SC-001):
- Result page renders ≥ 10 plain-language observations.
- No PII captured before consent.
- Scan reused on second submission within freshness window (`scans.freshness_expires_at`).

### US 2 — Dynamic adaptive questionnaire

```bash
# As admin, /admin/projects → New project → tier=full → generate link.
# Open the link in incognito. Walk through profile + goal block.
# Choose "Boutique hotel" + "Improve guest satisfaction" — observe later blocks
# emphasizing guest journey; PMS-migration block should be absent.
# Use the voice button on the "main operational frustrations" question.
```

Acceptance signals:
- Conditional questions appear / disappear based on prior answers.
- Voice path uses Deepgram WebSocket (browser DevTools → Network → WS).
- Transcript is editable before commit.
- No audio file ever appears in Network or in storage.

### US 3 — Decision-support output

```bash
# Submit the audit; watch ai.worker.ts. Report should render within ~60s.
# Confirm the report contains: exec summary, scores, opportunity map,
# bottleneck analysis, scenarios A/B/C, tool shortlist, "what not to do now"
# (at least one entry, with reason), impact analysis, 30/60/90-day roadmap.
# Export to PDF and verify the snapshot is immutable.
```

Acceptance signals:
- Every recommendation has explanation, impact, alternatives, do-nothing consequence, confidence.
- Every recommendation lists its `signals_consulted` (answers, scan findings, vendor fields).
- Vendor entries marked retired in admin DON'T appear in the new shortlist but DO appear in past published reports.

### US 4 — Consultant-assisted session

```bash
# In /admin/consultant/[projectId], read the scan + answers, override
# the "budget_level" answer with consultant_override, watch the report recompute.
# Add an internal note. Publish the consultant report.
# Confirm the client view of the report does NOT show the internal note or
# the override reason.
```

### US 5 / US 6 — Vendor & questionnaire admin

```bash
# In /admin/vendors, add a new vendor entry. Run a synthetic audit for a
# matching profile; the new entry should appear in the shortlist with
# fields you provided cited as reasoning.
# In /admin/questionnaire, add a conditional question; run a synthetic audit;
# the question should appear or hide correctly.
# In /admin/enrichment-queue, confirm candidate enrichments surface after
# a synthetic audit mentions an unknown vendor.
```

## 7. Tests

```bash
pnpm test              # vitest unit + integration (uses testcontainers Postgres)
pnpm test:contract     # contract tests against the server-action and worker-job schemas
pnpm test:e2e          # Playwright E2E for the smoke tests above
pnpm typecheck
pnpm lint
```

## 8. Operational profile (production reference)

Production reference architecture (R6):

| Component | Where |
|---|---|
| Next.js app + workers | Clever Cloud `node` app (France) |
| Postgres | Clever Cloud Managed Postgres (France) |
| Redis | Clever Cloud Managed Redis (France) |
| Object storage | Scaleway Object Storage `fr-par` |
| AI inference | AWS Bedrock `eu-central-1` (Frankfurt) |
| Transcription | Deepgram (EU region, `keep_audio=false`) |
| Email | Postmark EU server |
| Error tracking | Sentry EU |
| Analytics | Plausible (cookie-free, EU-hosted) |
| Domain | `audit.rinzlerstudio.com` (existing) |

Every component is EU-resident. AI redaction (`audit/lib/ai/redact.ts`) runs before any prompt is sent. No US control plane touches PII.

## 9. Common pitfalls

- **Forgetting prompt caching**: the per-project AI budget guardrail will trip frequently if the stable-prefix sections aren't marked cacheable. Verify via Bedrock cost metrics that cache hit rate > 80 %.
- **Storing voice audio**: there is no path in the code that should ever persist audio. If you find one in review, treat it as a Principle I (RGPD) violation and reject the PR.
- **Editing questions in place**: never. Always create a new `question_version`. The runtime depends on version pinning for historical-report fidelity (FR-103, SC-014).
- **Adding vendor recommendations from LLM output**: the LLM can only suggest from the rule-pre-filtered eligible_vendors set. If the schema says a vendor isn't eligible, the recommendation is dropped server-side regardless of what the LLM proposed.
- **MySQL imports**: the legacy `mysql2` driver remains in `package.json` only during the cutover window. Remove it after the migration is verified in production.

## 10. Where to look first

- New entities: [data-model.md](./data-model.md).
- Server-action and worker-job contracts: [contracts/](./contracts/).
- Provider choices and rejected alternatives: [research.md](./research.md).
- The full spec with all user stories and FRs: [spec.md](./spec.md).
- Constitution rules that govern the audit sub-stack: `.specify/memory/constitution.md` (Audit Platform Sub-Stack section).
