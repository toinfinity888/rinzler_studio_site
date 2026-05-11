# Implementation Plan: Hotel Audit Platform

**Branch**: `001-hotel-audit-platform` | **Date**: 2026-05-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-hotel-audit-platform/spec.md`

## Summary

A standalone Next.js + TypeScript web application that lets a single Rinzler
Studio consultant create hotel-modernization audit projects, share a tokenized
private URL with the client, capture an 8-section structured assessment with
autosave, review submissions in an admin dashboard with append-only consultant
notes, compute four lightweight readiness scores, and export everything as
versioned JSON or print-ready HTML.

The audit app is a sibling of the existing Vite-based marketing site
(`rinzlerstudio.fr`), shares its visual identity (dark canvas, cyan/purple
accents, Inter typography, glass-morphism, fluid clamped scale) by porting
`src/styles/tokens.css` into the audit app's Tailwind layer, but ships and
deploys independently. Persistence is SQLite via Drizzle ORM; admin auth is
email + password (Argon2id) per Auth.js Credentials provider; data is stored
in France (o2switch) with a 36-month auto-purge per CNIL B2B guidance.

## Technical Context

**Language/Version**: TypeScript 5.6+ on Node.js 20 LTS
**Primary Dependencies**:
- Next.js 15 (App Router, server actions)
- React 19
- TailwindCSS 3.4 (with brand tokens ported from `src/styles/tokens.css`)
- Auth.js v5 (NextAuth) with Credentials provider + `@node-rs/argon2`
- Drizzle ORM + `better-sqlite3`
- Zod (declarative form schema + JSON export schema)
- react-hook-form (multi-step form state, autosave)
- next-themes (dark default / light optional toggle)
- Plausible script (cookie-free, EU-hosted) with `data-domain="audit.rinzlerstudio.com"` — the audit subdomain, kept separate from the marketing site's `rinzlerstudio.fr` so audit-tool metrics don't pollute the marketing-funnel view

**Storage**: SQLite (`audit/data/audit.sqlite`) via `better-sqlite3`. Single
file, atomic backups via cPanel cron + tar; future migration path to Postgres
is straightforward through Drizzle's adapter.

**Testing**:
- Vitest for unit (form schema, scoring, token gen, export schema)
- Vitest + better-sqlite3 in-memory for integration (DB + server actions)
- Playwright for E2E (golden client flow + admin flow)

**Target Platform**: Linux (cPanel/LiteSpeed Node.js app) on o2switch, France.
Fallback if o2switch's Node app environment is too constrained for Next.js
SSR + server actions: deploy to Clever Cloud (FR-sovereign).

**Project Type**: Web application (separate Next.js app, sibling to existing
Vite marketing site). Not a monorepo refactor — both apps live side-by-side
in the same repository.

**Performance Goals**:
- LCP ≤ 2.5 s on throttled 4G for the client form landing (constitution budget)
- TTI ≤ 3 s on the admin dashboard
- Form section transitions ≤ 250 ms perceived
- Autosave debounce: 1.5 s after last keystroke; flush on section navigation

**Constraints**:
- Must run as a Node.js process under cPanel Passenger/LiteSpeed on o2switch
  (no edge runtime, no Vercel-specific APIs).
- Must store all client data in France (RGPD).
- No cookies on client form except a single auth-session cookie scoped to
  `/admin/*` (Plausible is cookie-free; tokenized client URL needs no cookie).
- Total client form JS budget ≤ 200 KB gzipped (relaxed vs the marketing
  site's 50 KB budget because this is a multi-step form, not a landing page).

**Scale/Scope**:
- ≤ 1 admin user in V1 (single hardcoded credential).
- ≤ 100 active projects in V1 (consultancy pipeline).
- 8 form sections, ~80 distinct fields total.
- ≤ 500 KB DB size projected at V1 maturity.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (**v1.1.0**, amended 2026-05-09 in response to
this plan) defines 5 principles that apply to every application in the
repo, a "Technical Constraints & Stack (Marketing Site — `src/`)" section
scoped to the Vite brochure, and a new **"Audit Platform Sub-Stack
(`audit/`)"** section that explicitly sanctions the Next.js + TypeScript +
Tailwind + Drizzle + SQLite stack used by this plan. The earlier ambiguity
about whether the no-framework rule applied repo-wide is resolved.

| Principle | Verdict | Notes |
|-----------|---------|-------|
| **I. RGPD & Privacy First (NON-NEGOTIABLE)** | PASS | French residency (o2switch); cookie-free Plausible on client form; admin session cookie scoped to `/admin/*`; legal page link from form landing; FR-044b 36-month auto-purge encoded; admin/client routes both `noindex`. |
| **II. Conversion-Focused Content** | PASS (re-interpreted) | This app is a tool, not marketing. Translated as "every screen has a single primary action" — admin dashboard CTA = "New project / View"; client form CTA = "Continue / Submit". |
| **III. French-Canonical, i18n-Ready** | PASS | All client-form copy in `lib/form-schema/fr.ts` keyed by field id; admin UI shipped FR; structure ready for an `en.ts` to land without rendering changes. |
| **IV. Design Tokens & Component Reuse** | PASS | `audit/styles/tokens.css` mirrors `src/styles/tokens.css` 1:1 then maps into `tailwind.config.ts` via `theme.extend`. No ad-hoc hex/px in components — enforced by lint. |
| **V. SEO & Analytics Discipline** | PASS (scoped) | Per-page metadata for the public-facing **landing** of the form; **`noindex` for tokenized form pages and the entire admin area** (private). Plausible custom events: `audit_section_completed`, `audit_submitted`, `admin_export_json`. |

**Constitution amendment status**: Done. The constitution was amended from
v1.0.0 to **v1.1.0** on 2026-05-09 — the marketing-site stack constraints
are now scoped explicitly to `src/`, and a new "Audit Platform Sub-Stack
(`audit/`)" section sanctions the Next.js + TS + Tailwind + Drizzle +
SQLite stack used by this plan, with hosting locked to France/EU.

## Project Structure

### Documentation (this feature)

```text
specs/001-hotel-audit-platform/
├── plan.md                # This file
├── research.md            # Phase 0 output
├── data-model.md          # Phase 1 output
├── quickstart.md          # Phase 1 output
├── contracts/             # Phase 1 output
│   ├── client-api.md      # Client (tokenized) endpoints + server actions
│   ├── admin-api.md       # Admin (authenticated) endpoints + server actions
│   └── json-export.schema.json   # Versioned JSON export schema (Zod-derived)
├── checklists/
│   └── requirements.md    # From /speckit.specify
└── tasks.md               # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

The audit app lives in a new top-level `audit/` directory, sibling to the
existing Vite marketing site (`src/`, `public/`, `vite.config.js`). The two
apps share the repository for brand-asset proximity and shared `.specify/`
workflow but build, lint, test, and deploy independently.

```text
audit/                                 # Next.js audit application (NEW)
├── app/
│   ├── (client)/                      # Tokenized, no-auth routes
│   │   ├── a/[token]/
│   │   │   ├── page.tsx               # Landing (intro + start)
│   │   │   ├── form/[section]/page.tsx  # Multi-step form
│   │   │   ├── confirmation/page.tsx
│   │   │   └── actions.ts             # autosave + submit server actions
│   │   ├── revoked/page.tsx
│   │   └── layout.tsx                 # FR locale, dark default, Plausible
│   ├── (admin)/
│   │   ├── login/page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx               # list + sort/filter
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx           # detail + answers + notes thread
│   │   │       ├── edit/page.tsx      # admin pre-fill
│   │   │       ├── report/page.tsx    # print-ready
│   │   │       ├── export/route.ts    # JSON export endpoint
│   │   │       └── actions.ts         # revoke, reopen, mark ongoing, add note
│   │   └── layout.tsx                 # noindex, session-required
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── cron/purge/route.ts        # 36-month auto-purge (shared-secret)
│   ├── layout.tsx                     # root: theme, fonts, headers
│   └── globals.css                    # imports tokens.css + Tailwind layers
├── components/
│   ├── form/                          # Schema-driven renderer
│   │   ├── FormShell.tsx              # progress bar, autosave indicator
│   │   ├── SectionRenderer.tsx        # iterates fields by type
│   │   ├── fields/                    # one per field type (text, slider, ...)
│   │   └── HelpTooltip.tsx            # mirrors marketing-site tooltip pattern
│   ├── ui/                            # primitives (Button, Card, Input, ...)
│   ├── admin/                         # ProjectsTable, NotesThread, ScoresBadge
│   └── brand/                         # Logo, GlassPanel, GradientText
├── lib/
│   ├── auth/                          # Auth.js config, session helpers
│   ├── db/                            # Drizzle client + helpers
│   ├── form-schema/
│   │   ├── sections.ts                # Section/field schema (single source)
│   │   ├── fr.ts                      # French copy keyed by field id
│   │   ├── validation.ts              # Zod for required-only validation
│   │   └── completion.ts              # completion-% calculator
│   ├── scoring/                       # 4 deterministic heuristics + tests
│   ├── export/
│   │   ├── schema.ts                  # Zod schema for JSON export (vN)
│   │   └── build.ts                   # Submission to ExportV1 mapper
│   ├── tokens/                        # generate, hash, verify access tokens
│   ├── audit-log/                     # writeAuditEntry helper
│   └── purge/                         # 36-month sweep logic
├── db/
│   ├── schema.ts                      # Drizzle schema (single source)
│   └── migrations/                    # drizzle-kit output
├── styles/
│   └── tokens.css                     # Brand tokens (mirrors marketing site)
├── public/
│   └── brand/                         # Reused logo assets (svg)
├── tests/
│   ├── unit/                          # form-schema, scoring, export, tokens
│   ├── integration/                   # DB + server actions
│   └── e2e/                           # Playwright: client + admin happy paths
├── drizzle.config.ts
├── next.config.mjs                    # output: 'standalone', noindex headers
├── tailwind.config.ts                 # extends theme with brand tokens
├── postcss.config.js
├── tsconfig.json
├── package.json
├── .env.example
└── README.md

# Existing marketing site (UNCHANGED)
src/                                   # Vite-based marketing site
public/
vite.config.js
package.json                           # marketing site's package.json
```

**Structure Decision**: Two independent applications co-located in one
repository. The audit app uses its own `audit/package.json` (no npm
workspaces in V1 — overkill for two apps with no shared code). Brand
identity is shared at the design-token level only (mirrored CSS variables),
not at the runtime/build level. This keeps the marketing site's
constitution-mandated 50 KB JS budget intact while letting the audit app
ship a richer Next.js bundle without contamination.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Two `package.json` files in one repository (no monorepo tooling). | Each app has independent dependencies, scripts, lockfiles, and CI lifecycle; the audit app needs Next.js while the marketing app must stay minimal Vite. | npm workspaces / pnpm / Turborepo were rejected as premature: there is no shared code between the two apps in V1, and adding workspace tooling would force the marketing site's lockfile to absorb every audit-app dep — directly conflicting with constitution Principle V (small JS budget) supply-chain expectations. Revisit when (and only if) shared component libraries emerge. |

*(The earlier item about constitution stack-scope ambiguity was resolved
by the v1.0.0 → v1.1.0 amendment on 2026-05-09 and is no longer a
violation.)*
