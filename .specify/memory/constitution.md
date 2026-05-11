<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 → 1.1.1
Type: PATCH amendment — two scope clarifications surfaced by
`/speckit.analyze` of feature 001-hotel-audit-platform:
  1) Add a one-line scoping note to Principle II so its meaning is clear
     for non-marketing applications (the audit app's CTAs aren't the
     marketing funnel's CTAs). No semantic change to the marketing site.
  2) Lock the Plausible `data-domain` for the audit app to
     `audit.rinzlerstudio.com` (the audit subdomain) — replacing the prior
     "either-or" wording in the audit sub-stack.

No principle was removed, renamed, or redefined; no new section added.
Both edits are clarifications, hence PATCH per the versioning policy.

Earlier amendment (v1.0.0 → v1.1.0, 2026-05-09):
  - Renamed "Technical Constraints & Stack" → "(Marketing Site)" and
    explicitly scoped the no-framework rule to `src/`.
  - Added "Audit Platform Sub-Stack (`audit/`)" sanctioning Next.js 15 +
    TS + Tailwind + Drizzle + SQLite.
  - Added "Repository Scope" preamble.

Templates requiring updates:
  - all .specify/templates/*.md                ✅ compatible (no constitution-specific references)

Dependent feature artifacts:
  - specs/001-hotel-audit-platform/plan.md     ✅ aligned (Plausible domain
    locked; Principle II re-interpretation now constitution-sanctioned)
  - specs/001-hotel-audit-platform/tasks.md    ✅ aligned

Runtime guidance docs:
  - README.md                                  ⚠ still missing at repo
    root — addressed by tasks.md T115 in the audit feature.

Follow-up TODOs: none.
-->

# Rinzler Studio Website Constitution

## Core Principles

### I. RGPD & Privacy First (NON-NEGOTIABLE)
The site MUST operate without setting any non-essential cookies and MUST NOT load
trackers that transmit personally identifiable information to third parties without
explicit consent. Analytics MUST remain cookie-free and EU-hosted (currently Plausible
on `plausible.io`). Lead-capture forms MUST collect only the minimum data required
for the stated purpose, MUST display the legal basis at the point of collection, and
MUST link to `mentions-legales.html` and `politique-confidentialite.html`. Both legal
pages MUST be kept in sync with any change in data processing, hosting, or third-party
integrations.

**Rationale:** The audience is French and EU-based SMEs; an RGPD violation would
destroy commercial trust and expose the studio to CNIL sanctions. Cookie-free is also
why we can avoid a consent banner, which directly improves conversion.

### II. Conversion-Focused Content
Every primary page section MUST have a single, unambiguous call-to-action tied to one
of the two conversion goals: (a) booking a free audit, or (b) using the ROI calculator
(`calculator.html`). New sections that do not advance one of these goals MUST be
justified in writing in the PR description or rejected. Hero, pricing, and proof
sections MUST surface the headline value proposition (cost reduction for transport &
logistics SMEs) above the fold on desktop and within the first viewport on mobile.

**Rationale:** This is a lead-generation site, not a content publication. Sections
without a CTA dilute the funnel and slow page weight without measurable return.

**Scope note for non-marketing applications:** Other applications in this
repository (e.g., the audit platform at `audit/`) are tools rather than
marketing surfaces, so they do not have an audit-booking or ROI-calculator
CTA to point at. For those applications, this principle reads as **"every
primary screen MUST have a single, unambiguous primary action"** (e.g.,
"New project" on the admin dashboard, "Continue / Submit" on the client
form). The intent — no purposeless screens — is preserved.

### III. French-Canonical, i18n-Ready
French (`lang="fr"`) is the canonical content language and the source of truth for
copy. All user-facing strings MUST live in markup or component files in a way that
allows extraction for future translation; inline string concatenation in JavaScript
that hard-codes user-visible French text SHOULD be avoided. Adding a new locale MUST
NOT require rewriting templates — only providing translated strings and per-locale
metadata (title, description, OG tags).

**Rationale:** The studio's near-term market is France, but transport & logistics
SMEs across the EU are a plausible expansion. Locking copy into JS templates now
would force a rewrite later.

### IV. Design Tokens & Component Reuse
All colors, spacing, typography scale, radii, shadows, and motion timings MUST be
declared as CSS custom properties in `src/styles/tokens.css` and referenced by name
from `main.css`, `sections.css`, `components.css`, and `calculator.css`. Ad-hoc hex
codes, pixel values, or font weights in section/component stylesheets are PROHIBITED
unless they reference a token. Repeated UI patterns (buttons, cards, form fields,
nav items) MUST live in `components.css` and be reused across pages rather than
re-declared per section.

**Rationale:** The site is small enough that duplication is tempting but large enough
(4 HTML entry points, multiple sections) that drift would quickly become visible. A
token-based system also makes a future redesign or dark/light variant a one-file change.

### V. SEO & Analytics Discipline
Every HTML entry point MUST define a unique `<title>`, `<meta name="description">`,
`lang` attribute, and Open Graph tags appropriate for sharing. The home page and the
calculator MUST emit structured data where it materially helps indexing
(`Organization`, `Service`, `WebApplication` as appropriate). Plausible custom events
MUST be fired for the conversion-critical interactions: audit-booking submission,
calculator completion, and outbound clicks to contact channels. New analytics events
MUST be named in `snake_case`, documented in the PR, and MUST NOT capture free-text
user input.

**Rationale:** Without per-page metadata the marketing pages cannot rank for the
target keywords. Without consistent event tracking we cannot measure whether changes
to the funnel actually improve conversion — which is the only meaningful success
metric for this site.

## Repository Scope

This repository hosts more than one application. The current set is:

- **Marketing site** at `src/` + `public/` + `vite.config.js` — the public
  brochure deployed to `rinzlerstudio.fr`.
- **Audit platform** at `audit/` — the private Next.js application
  introduced by feature `001-hotel-audit-platform`, deployed to
  `audit.rinzlerstudio.com` (the studio's `.com` subdomain, intentionally
  separate from the marketing site's `.fr`).

**Principles I–V (Core Principles) apply to every application in the repo.**
The "Technical Constraints & Stack" sections below are **per-application**:
each one names the directory it governs in its heading. A constraint
written for one application does NOT silently apply to the other; if a new
application is added, it MUST receive its own sub-stack section in this
constitution (MINOR bump).

## Technical Constraints & Stack (Marketing Site — `src/`)

- **Build & runtime:** Vite (`^6.0.0`) producing a static bundle to `dist/`. No
  server-side runtime, no SSR, no Node process in production. Deployment is static
  hosting (cPanel, per `.cpanel.yml`).
- **Languages:** Vanilla HTML, CSS, and ES module JavaScript only **for the
  marketing site at `src/`**. Adding a frontend framework (React, Vue,
  Svelte, etc.) to the marketing site requires a constitution amendment.
  This rule does NOT govern other applications in the repo (see Repository
  Scope above and the per-app sections below).
- **Entry points:** `src/index.html`, `src/calculator.html`, `src/mentions-legales.html`,
  `src/politique-confidentialite.html`. Adding entry points MUST be reflected in
  `vite.config.js` `rollupOptions.input`.
- **Assets:** Media lives under `src/assets/` (fonts, icons, images, video); favicons
  and root-level public assets under `public/`. Hero video MUST be served compressed
  (H.264 MP4) and `playsinline muted autoplay` on mobile.
- **Third-party scripts:** Limited to Plausible Analytics and Google Fonts (Inter).
  Adding any further third-party script (chat widget, A/B tool, ad pixel) MUST be
  evaluated against Principle I and requires explicit approval in the PR.
- **Performance budget:** Largest Contentful Paint MUST stay under 2.5 s on a
  throttled 4G profile for the home page. Total JS shipped to the home page MUST stay
  under 50 KB gzipped (excluding the Plausible tag). Regressions MUST be justified.

## Audit Platform Sub-Stack (`audit/`)

Sanctioned stack for the audit application introduced by feature
`001-hotel-audit-platform`. Replacing any of these requires a constitution
amendment (MINOR for swap-equivalent technologies, MAJOR for a paradigm
change such as moving away from Node).

- **Framework & runtime:** Next.js 15+ (App Router, server actions) on
  Node.js 20 LTS. SSR and a long-running Node process are explicitly
  permitted **for this application only**. Output mode: `standalone`.
- **Language:** TypeScript 5.6+ (strict mode). React 19 for UI.
- **Styling:** TailwindCSS 3.4+ whose theme is configured to reference the
  brand CSS variables in `audit/styles/tokens.css`, which mirrors
  `src/styles/tokens.css` 1:1. Direct hex/px values in components are
  prohibited (Principle IV applies).
- **Persistence:** SQLite (`better-sqlite3`) accessed via Drizzle ORM.
  Schema is the single source of truth at `audit/db/schema.ts`. Migration
  to Postgres is permitted without amendment provided Drizzle remains the
  ORM and France/EU residency is preserved.
- **Authentication:** Auth.js v5 with the Credentials provider; passwords
  hashed with Argon2id (`@node-rs/argon2`). Magic-link, OAuth, and SSO
  providers MAY be added later as alternative providers without
  amendment, but Credentials MUST remain available.
- **Form runtime:** `react-hook-form` + Zod, fed by a single declarative
  schema at `audit/lib/form-schema/sections.ts` (FR-023, FR-045).
- **Hosting:** France-resident only. Default target is o2switch's cPanel
  Node.js Selector; documented sovereign fallback is Clever Cloud or
  Scaleway. Non-EU hosting (including non-EU control planes such as
  Vercel US, Supabase, PlanetScale) is PROHIBITED for this application.
- **Third-party scripts on client surfaces:** Only Plausible (cookie-free,
  EU-hosted), with `data-domain="audit.rinzlerstudio.com"` (the dedicated
  audit subdomain — keeps audit-tool metrics cleanly separated from the
  marketing funnel on `rinzlerstudio.fr`). Any other third-party script
  requires the same Principle I review as the marketing site.
- **Performance budget:** LCP ≤ 2.5 s on a throttled 4G profile for the
  client form landing. Total JS shipped to the client form MUST stay under
  200 KB gzipped (relaxed from the marketing site's 50 KB budget because
  the form is interactive multi-step UI, not a landing page). Admin-side
  budgets are advisory.
- **Privacy posture:** All tokenized client routes and the entire admin
  surface MUST emit `noindex` headers. Access tokens MUST be stored as
  hashes, never as plaintext. Internal consultant notes MUST be excluded
  from JSON exports by default and never accessible via the client URL.

## Development Workflow & Quality Gates

- **Branching:** `main` is the deployable branch. Feature work happens on
  `feature/*`, `fix/*`, or `chore/*` branches and merges via pull request.
- **Commits:** Imperative mood, English or French, scoped where useful. The repo
  uses spec-kit auto-commit hooks (`.specify/extensions.yml`); these MAY be
  accepted but MUST NOT replace a meaningful human-authored commit message for
  substantive changes.
- **Pre-merge checks:** `npm run build` MUST succeed locally before merging. Any
  change touching `tokens.css` or `components.css` MUST be visually verified on
  every entry-point page (home, calculator, mentions-légales, politique).
- **Manual & performance tests:** Scenarios under `tests/manual/` and
  `tests/performance/` MUST be re-run when changing the hero, the calculator, or
  any analytics event wiring.
- **Legal sync:** Any change to data collection (new form field, new third-party
  integration, new analytics event capturing user input) MUST update both
  `mentions-legales.html` and `politique-confidentialite.html` in the same PR.
- **Spec-kit workflow:** Non-trivial features SHOULD enter via `/speckit.specify`
  → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`. The Constitution
  Check in the plan template MUST evaluate all five principles above.

## Governance

This constitution supersedes ad-hoc preferences and prior conventions. When a
proposed change conflicts with a principle, the principle wins unless the
constitution is amended first.

- **Amendment procedure:** Open a PR that (a) edits this file, (b) updates the
  Sync Impact Report comment block at the top, and (c) updates any dependent
  template flagged as needing changes. Amendments require review and approval by
  the project owner before merge.
- **Versioning policy:** Semantic versioning applies to this document.
  - **MAJOR:** A principle is removed, renamed in a way that changes its meaning,
    or redefined such that previously-compliant code becomes non-compliant.
  - **MINOR:** A new principle or a new mandatory section is added, or guidance
    in an existing principle is materially expanded.
  - **PATCH:** Wording clarifications, typo fixes, or non-semantic refinements.
- **Compliance review:** Every PR description MUST include a one-line statement of
  which principles the change touches (or "none — non-functional"). Reviewers MUST
  reject PRs that violate Principle I (RGPD) without explicit, documented amendment.
- **Runtime guidance:** Day-to-day development guidance (commands, scripts,
  conventions) lives in `package.json` scripts and the spec-kit templates under
  `.specify/templates/`. This constitution is the source of truth only for the
  principles and constraints above.

**Version**: 1.1.1 | **Ratified**: 2026-04-14 | **Last Amended**: 2026-05-09
