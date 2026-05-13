# Implementation Plan: Marketing Site Hotel Pivot

**Branch**: `002-hotel-marketing-pivot` | **Date**: 2026-05-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-hotel-marketing-pivot/spec.md`

## Summary

Pivot the public marketing site (`src/index.html` + `src/calculator.html`) from "PME transport & logistique" to "petits hôtels indépendants" (10–50 chambres, 2–4 étoiles). Visual style, layout grid, animations, and section sequence are preserved; **only content changes** — hero copy, two new qualifier sections, four pain cards, three method steps, before/after, sécurité (softened to RGPD-only hotel framing per OQ-2 → B), "Pourquoi nous" 3 cards, new inline founder block, ROI scenarios + labels (math preserved), FAQ rewrite, intake form (required hospitality typology selector + 2 new optional fields per OQ-5 → B), Final CTA copy, calculator page meta/hero/CTA/footer, and all meta/OG/title/footer touchpoints. Canonical CTA wording: **"Diagnostic digital hôtel"** ("Diagnostic" short form only in header / mobile menu).

The pivot ships as a single release covering `/` and `/calculator.html` together (FR-031). No new framework, no new dependency, no build-system change. The legal pages are out of scope as content but **MUST be updated** with the new form fields (Principle I — Legal sync).

## Technical Context

**Language/Version**: HTML5, CSS3 (no preprocessor), ES module JavaScript (vanilla, no framework — locked by constitution Principle IV and the marketing-site sub-stack)
**Primary Dependencies**: Vite ^6 (static build to `dist/`), Plausible Analytics (cookie-free, EU-hosted), Formspree (existing intake-form transport — unchanged)
**Storage**: N/A — static site, no persistence. The intake-form submission is forwarded to the studio inbox via Formspree.
**Testing**: Manual scenarios under `tests/manual/` (currently empty — populate as part of this feature per Development Workflow gate), performance under `tests/performance/`, `npm run build` as the structural gate
**Target Platform**: Static hosting (o2switch cPanel per `.cpanel.yml`), French-language single-locale (`lang="fr"`), desktop + mobile (down to 360 px viewport per SC-008)
**Project Type**: Marketing site (single project under `src/` + `public/`)
**Performance Goals**: LCP ≤ 2.5 s on throttled 4G for `/`; total JS shipped to `/` ≤ 50 KB gzipped (excluding Plausible) — both enforced by constitution
**Constraints**: No new third-party script (Principle I); no new front-end framework (Principle IV); no inline-JS hardcoded user-visible strings (Principle III — i18n-ready); every primary section keeps a single unambiguous CTA (Principle II)
**Scale/Scope**: 2 entry pages pivoted (~1 100 lines of HTML), ~10 sections rewritten in `index.html`, ~6 calculator scenarios relabelled in `calculator.js` (defaults + labels only, math preserved per FR-039), 1 new image asset (founder portrait), legal-page sync (1 new field schema), Plausible event taxonomy preserved (per Assumptions)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Verdict | Notes |
|---|---|---|---|
| I | RGPD & Privacy First (NON-NEGOTIABLE) | **PASS — with legal-sync task required** | New form schema adds 1 required field (hospitality typology) + 2 optional fields (Nombre de chambres, PMS/moteur de réservation actuels). These are purpose-relevant minima for the diagnostic. `mentions-legales.html` + `politique-confidentialite.html` MUST be updated in the same release to reflect the new collected fields (Development Workflow gate "Legal sync"). No new third-party script; Plausible stays cookie-free and EU-hosted; Formspree transport unchanged. |
| II | Conversion-Focused Content | **PASS** | All primary sections preserve a single CTA. New sections (Pour qui, Ce que j'analyse, founder block) are qualifier/trust signals on the funnel path; their secondary CTA is the same intake form (or scroll-to). Header / hero / final CTA → intake form (`#audit-booking`). Exploration CTAs (pain bridge, ROI preview) → `/calculator.html` per FR-027b (sanctioned as the second conversion goal in Principle II). |
| III | French-Canonical, i18n-Ready | **PASS** | All new copy lives in HTML markup (index.html, calculator.html). The calculator script's new default values are numbers; label text stays in HTML/aria-label, not in JS. No inline JS string concatenation for user-visible French copy. |
| IV | Design Tokens & Component Reuse | **PASS** | FR-033 / FR-034 explicitly forbid new visual vocabulary. New sections reuse existing card / section-header / icon-glass components. No new tokens, no ad-hoc hex/px. |
| V | SEO & Analytics Discipline | **PASS — with verification task** | FR-001 / FR-002 / FR-037 update titles, meta descriptions, OG, keywords on both entry points; FR-003 updates footer tagline. Plausible event taxonomy preserved per Assumptions — `Audit Request` event name kept for historical comparability; `data-cta-id` strings kept (rendered label changes, identifier doesn't). Verification: run the events on the deployed pivot and confirm no analytics regression. |

**Result**: All gates pass. No violations to record in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-hotel-marketing-pivot/
├── plan.md              # This file
├── research.md          # Phase 0 output (best practices + decisions log)
├── data-model.md        # Phase 1 output (intake-form schema + Plausible event shape)
├── quickstart.md        # Phase 1 output (dev + verification commands)
├── contracts/
│   ├── intake-form-submission.md    # POST /f/{FORMSPREE_ID}
│   └── plausible-events.md          # Plausible custom events emitted by the page
├── checklists/
│   └── requirements.md  # Spec validation checklist (already created by /speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks command — NOT created here)
```

### Source Code (repository root)

Single-project marketing site (Option 1, simplified — no `models/`, `services/`, `cli/`, `lib/` because this is a static HTML site, not a runtime application). Concrete tree of files touched by this feature:

```text
src/
├── index.html                       # MAJOR rewrite (content, meta, OG, footer)
├── calculator.html                  # MEDIUM rewrite (meta, hero, header CTA, labels, tooltips, footer)
├── mentions-legales.html            # MINOR update (new form-field disclosure, Principle I)
├── politique-confidentialite.html   # MINOR update (new form-field disclosure, Principle I)
├── scripts/
│   ├── main.js                      # Form schema update: add `typology`, `rooms`, `pms_stack` fields to fetch body; update success message; preserve Plausible event name `Audit Request`
│   └── calculator.js                # SCENARIOS object: replace `email/leads/invoicing/onboarding/reporting` keys with hotel scenarios; relabel inputs; preserve math
├── styles/                          # UNCHANGED (FR-033 — no new visual vocabulary)
│   ├── tokens.css                   # untouched
│   ├── main.css                     # untouched
│   ├── components.css               # untouched
│   ├── sections.css                 # untouched
│   └── calculator.css               # untouched
└── assets/
    ├── images/
    │   └── sviatoslav-portrait.webp # NEW — founder portrait (FR-020). Source from founder; ~50–80 KB WebP, square aspect.
    └── (everything else)            # UNCHANGED

tests/
├── manual/
│   └── hotel-pivot-checklist.md     # NEW — manual smoke test for FR-001..042, SC-001..009
└── performance/
    └── lcp-budget.md                # NEW — record LCP measurements pre/post pivot on `/` and `/calculator.html`

# UNTOUCHED by this feature (kept for reference):
public/                              # favicon + logo
vite.config.js                       # 4 entry points unchanged
audit/                               # feature 001 — completely separate sub-stack
```

**Structure Decision**: Single-project marketing site under `src/`. The constitution's "Marketing Site (`src/`)" sub-stack governs every file in scope. No new entry points, no new build-system input. Two CSS rules apply unchanged: token-only colors/spacing (Principle IV) and vanilla-only JS (Principle IV + marketing-site sub-stack).

## Complexity Tracking

> No Constitution Check violations. Table omitted intentionally.

## Phase 0 — Outline & Research

**Status**: ✅ Complete — output written to [`research.md`](./research.md).

The spec was fully clarified in Session 2026-05-13 (5 decisions logged). There are no `NEEDS CLARIFICATION` items propagating into the plan. Research is therefore reframed as a **best-practices + decision-log document** covering the 8 areas where the rewrite needs a defensible reference point:

1. Hero copy patterns for niche-vertical B2B landing pages (FR / EU)
2. "Pour qui" qualifier section structure (above-the-fold disqualification heuristic)
3. Inline founder block trust signals (portrait + bio length + LinkedIn placement)
4. Softening absolute statistics into calibrated wording (FR-012, FR-017, FR-026)
5. RGPD-only sécurité framing without invoking sovereignty (OQ-2 → B)
6. ROI calculator scenario relabeling while preserving the math (FR-039)
7. Plausible event taxonomy preservation across CTA-label changes
8. Vite static-build cache-busting on a content-only pivot

## Phase 1 — Design & Contracts

**Status**: ✅ Complete — outputs written to [`data-model.md`](./data-model.md), [`contracts/`](./contracts/), [`quickstart.md`](./quickstart.md). Agent context refreshed via `.specify/scripts/bash/update-agent-context.sh claude`.

### Data model (`data-model.md`)

No persistent entities. The single touched data shape is the **intake-form submission** — see `data-model.md` for the v1 schema, validation rules, and migration notes from the legacy schema.

### Contracts (`contracts/`)

- **`intake-form-submission.md`** — POST to `https://formspree.io/f/{FORMSPREE_ID}` with the v1 JSON body. Validation rules, required vs optional fields, success / error responses, and the `_subject` rewriting rule.
- **`plausible-events.md`** — The set of custom events fired by `/` and `/calculator.html`, the props attached, and the preservation rule for legacy event names.

### Quickstart (`quickstart.md`)

How a contributor verifies the pivot end-to-end in < 10 minutes: `npm run dev`, manual smoke against the spec's acceptance scenarios, grep verification of disallowed phrases (SC-002), LCP measurement, OG preview check via the three external inspection tools, and the Plausible event sanity check.

### Constitution re-check (post-design)

Re-evaluated after writing Phase 1 artifacts. Still **PASS** on all five principles. No new third-party script, no new framework, no new tokens, no PII captured, no inline-JS hardcoded copy. Legal-sync task is captured for `/speckit.tasks` to enumerate.

## Next phase

`/speckit.tasks` — generate `tasks.md` from this plan plus the spec, with parallel markers `[P]` where edits are file-independent.
