# Specification Quality Checklist: Marketing Site Hotel Pivot

**Purpose**: Validate specification completeness and quality before proceeding to planning.
**Created**: 2026-05-13
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — all 3 resolved in
      Clarifications Session 2026-05-13 (OQ-1 pivot surface, OQ-2
      sécurité tone, OQ-3 À propos surface), plus 2 additional
      ambiguities resolved in the same session (canonical CTA wording,
      sector dropdown handling).
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded (homepage `/` + `/calculator.html`; legal
      pages and `audit/` out of scope)
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows (5 stories: hero recognition,
      intake form, ROI calculator, founder block, FAQ reassurance)
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Coverage of the pivot recommendation

- [x] Hero rewrite (FR-005, FR-006, FR-007, FR-008)
- [x] "Pour qui" qualifier section (FR-009, FR-010)
- [x] "Ce que j'analyse" inventory section (FR-013)
- [x] Pain cards rewritten for hotel (FR-011, FR-012)
- [x] Method 3 steps retitled (FR-014, FR-015)
- [x] Before / After softened (FR-016, FR-017)
- [x] Souveraineté & Sécurité reworked (FR-018, FR-019, OQ-2)
- [x] Existing "Pourquoi Nous" 3 cards rewritten (FR-035, FR-036)
- [x] New "Pourquoi l'hôtellerie / À propos" founder block
      (FR-020, FR-021, OQ-3)
- [x] ROI calculator scenarios + labels + units (FR-022, FR-023, FR-024)
- [x] Calculator page (`/calculator.html`) consistency
      (FR-037, FR-038, FR-039, FR-040)
- [x] FAQ rewritten for hotel + vendor-neutral
      (FR-025, FR-026, FR-026a, FR-026b)
- [x] Final CTA section copy rewritten (FR-041, FR-042)
- [x] Intake form + "Diagnostic hôtel" framing (FR-027a, FR-028, FR-029)
- [x] Exploration CTAs route to calculator with hotel labels (FR-027b)
- [x] Sector dropdown locked or removed (FR-030)
- [x] Pivot surface limited to `/` for v1 (FR-031, OQ-1)
- [x] Title, meta, OG, footer (FR-001, FR-002, FR-003, FR-004)
- [x] Style preserved — no new visual vocabulary (FR-033, FR-034)

## Notes

- All 5 Clarifications Session 2026-05-13 decisions are now reflected
  in the spec:
  - **OQ-1 → A**: pivot `/` only for v1; no `/hotellerie-independante`.
  - **OQ-2 → B**: soften souveraineté block to RGPD-only hotel framing
    ("Données clients protégées / Hébergement européen / Accès
    limités / Documentation claire").
  - **OQ-3 → A**: inline À propos block on homepage; no `/a-propos`.
  - **CTA wording → B**: "Diagnostic digital hôtel" is canonical;
    "Diagnostic" short form only in header / mobile menu.
  - **Sector dropdown → B**: replaced by a required hospitality
    typology selector with exactly 4 options (Hôtel indépendant,
    Petit groupe hôtelier, Hôtel-restaurant, Maison d'hôtes); no
    "Autre".
- The pivot must ship the homepage `/` and `/calculator.html`
  together. Edge case in the spec covers what to do if the
  calculator page is not ready (temporarily disable exploration
  CTAs).
- Founder photo, LinkedIn URL, and bio are prerequisites for the À
  propos block; without them, the block is deferred (not shipped
  with placeholder content).
