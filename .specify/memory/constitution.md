<!--
SYNC IMPACT REPORT
==================
Version change: (uninitialized template) → 1.0.0
Type: Initial ratification (first concrete materialization of the project constitution).

Modified principles:
  - [PRINCIPLE_1_NAME] → I. RGPD & Privacy First (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → II. Conversion-Focused Content
  - [PRINCIPLE_3_NAME] → III. French-Canonical, i18n-Ready
  - [PRINCIPLE_4_NAME] → IV. Design Tokens & Component Reuse
  - [PRINCIPLE_5_NAME] → V. SEO & Analytics Discipline

Added sections:
  - Core Principles (5 principles populated)
  - Technical Constraints & Stack
  - Development Workflow & Quality Gates
  - Governance

Removed sections: none.

Templates requiring updates:
  - .specify/templates/plan-template.md         ✅ compatible (generic "Constitution Check" gate placeholder, no rename needed)
  - .specify/templates/spec-template.md         ✅ compatible (no constitution-specific references)
  - .specify/templates/tasks-template.md        ✅ compatible (no constitution-specific references)
  - .specify/templates/checklist-template.md    ✅ compatible (no constitution-specific references)
  - .specify/templates/agent-file-template.md   ✅ compatible (no constitution-specific references)
  - .specify/templates/constitution-template.md ✅ unchanged (template source, not project copy)

Runtime guidance docs:
  - README.md                                   ⚠ none exists at repo root — optional follow-up to add a project README that links to this constitution.

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

## Technical Constraints & Stack

- **Build & runtime:** Vite (`^6.0.0`) producing a static bundle to `dist/`. No
  server-side runtime, no SSR, no Node process in production. Deployment is static
  hosting (cPanel, per `.cpanel.yml`).
- **Languages:** Vanilla HTML, CSS, and ES module JavaScript only. Adding a frontend
  framework (React, Vue, Svelte, etc.) requires a constitution amendment.
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

**Version**: 1.0.0 | **Ratified**: 2026-04-14 | **Last Amended**: 2026-05-09
