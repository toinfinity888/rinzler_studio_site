# Phase 0 — Research & Best-Practices Log

**Feature**: 002-hotel-marketing-pivot
**Date**: 2026-05-13
**Status**: All NEEDS CLARIFICATION items resolved in Session 2026-05-13. This document captures the decisions that informed the rewrite and the alternatives considered, so the implementer can defend choices in PR review without re-deriving them.

---

## 1. Hero copy for niche-vertical B2B landing pages

**Decision**: Single-sentence H1 naming the customer category explicitly, followed by a 2-sentence sub-headline describing the offer in plain language without jargon. H1 = "Modernisation digitale pour petits hôtels indépendants" (per FR-005).

**Rationale**: The hero's job in cold outreach is one-shot self-identification within 10 s (SC-001). A director arriving from an email needs to read "hôtels indépendants" (their term) above the fold; abstractions like "modernization" alone don't qualify. Naming the segment in the H1 outperforms naming the benefit because the visitor's first question on a cold landing is "is this for me?", not "what does this cost?".

**Alternatives considered**:
- Benefit-first H1 ("Réduisez vos coûts de 20 %") — rejected: the source recommendation explicitly forbids the 20 % claim without a case study, and it dilutes self-identification.
- Question-form H1 ("Votre hôtel indépendant perd-il du temps sur les réservations directes ?") — rejected: questions read as ads on cold outreach and underperform statement-form H1s in landing-page A/B tests for B2B segments.

---

## 2. "Pour qui" qualifier section structure

**Decision**: A short bullet list of 4–5 visitor profiles placed immediately under the hero, before the pain bridge. Each bullet ≤ 80 characters; no icons; no card chrome (use existing typography vocabulary).

**Rationale**: The qualifier's value is disqualification, not persuasion — a director should be able to read it in 5 seconds and decide self-vs-not. Bulleted lists scan faster than card grids for short profile lines; reusing existing typography keeps Principle IV intact (no new visual vocabulary).

**Alternatives considered**:
- A card grid mirroring the pain bento — rejected: same visual vocabulary as the pain section would create section monotony and dilute hierarchy.
- A single paragraph "We help…" — rejected: paragraphs are skipped by visitors on cold landings; bullet form survives skimming.

---

## 3. Inline founder block — trust signal anatomy

**Decision**: Two-column block (portrait left, copy right on desktop; stacked on mobile). Portrait square WebP, 200–280 px rendered, alt text "Sviatoslav Saraev, fondateur de Rinzler Studio". Copy: name (h3 weight), role line (caption), 3–5 line bio with hands-on hotel experience claim, LinkedIn link with `target="_blank" rel="noopener"`, location line "Paris / Île-de-France". Position: between "Pourquoi nous" 3-card section and ROI calculator preview (per FR-020).

**Rationale**: Trust signals work when the visitor can verify them. The portrait isn't decorative — it's a "this is a real person" anchor. The hands-on hotel claim is the differentiator; it must appear in prose, not as a tagline. The LinkedIn link is the verification handle; it must be one click away, not buried in a footer. Mid-page placement catches readers who have skimmed the pains and method but not yet reached the FAQ — the moment they decide whether to read further.

**Alternatives considered**:
- Hero-area founder photo — rejected: dilutes the hero CTA and pushes the offer below the fold on mobile.
- Footer-only LinkedIn — rejected: directors rarely scroll to the footer on a cold landing; the trust signal needs to be inline.
- Dedicated `/a-propos` page — rejected explicitly in OQ-3 (resolved A: inline-only for v1).

---

## 4. Softening absolute statistics

**Decision**: Replace every absolute statistic on the current homepage with calibrated wording. Replacement rules:

| Disallowed | Replacement pattern |
|---|---|
| "Zéro X" | "Moins d'erreurs", "Réduction des X" |
| "100 % des Y" | "Une plus grande part des Y", "Moins de Y manqués" |
| "+391 %", "+30 %", "20 % de rentabilité", "28 500 $" | Remove entirely; replace with qualitative phrasing ("amélioration mesurable") |
| "9+ h perdues / semaine" | Remove the prefix metric; lead with the pain itself ("Trop d'heures sur des emails répétitifs") |
| "15 € amende par facture dès 2026" | Remove (not a hotel concern; was a 2026 e-invoicing pitch for SME) |

**Rationale**: The source recommendation calls out that unsupported absolute claims ("20 % rentabilité без кейса") undermine trust with directors who have seen a hundred AI-vendor pitches. Calibrated wording ("selon votre cas", "plus rapide", "réduction") is harder to disqualify and signals professional restraint. FR-026b also forbids reintroducing these in the FAQ.

**Alternatives considered**:
- Keep the statistics but cite a source — rejected: no current case study exists for the hotel segment; citing a transport case would re-introduce the dissonance the pivot is fixing.
- Replace with placeholder statistics — rejected: synthetic numbers detected by directors are worse than calibrated qualitative wording.

---

## 5. RGPD-only sécurité framing (OQ-2 resolution → B)

**Decision**: Keep the two-card structure of the existing "Souveraineté & Sécurité" section. Rewrite the content around four pillars:

1. **Données clients protégées** — minimisation, finalité explicite, durée de conservation chiffrée.
2. **Hébergement européen** — serveurs en UE, conformité RGPD; no Cloud Act framing.
3. **Accès limités et tracés** — moindre privilège, journalisation des accès aux données client.
4. **Documentation claire RGPD** — engagements écrits, traçabilité, exportabilité.

Section title becomes "Protection des données clients" (or equivalent hotel-relevant framing). The 🇫🇷 "Hébergement France" badge and "Zero Cloud US" badge are demoted: if kept, they MUST be rephrased to neutral "Hébergement européen" wording (FR-019).

**Rationale**: Independent-hotel directors care about guest-data leakage (PMS data, OTA exchanges) and CNIL exposure, not US-EU cloud sovereignty politics. The recommendation explicitly warns against the souveraineté framing being the loudest message. The two-card structure is kept because the section pattern is visually load-bearing for the page rhythm.

**Alternatives considered**:
- Option A (keep current souveraineté framing) — rejected by OQ-2.
- Option C (remove section entirely) — rejected by OQ-2; loses a real trust signal on guest-data protection.

---

## 6. ROI calculator scenario relabeling — math preservation strategy

**Decision**: The `SCENARIOS` object in `src/scripts/calculator.js` keeps its 6 keys (`custom`, `email`, `leads`, `invoicing`, `onboarding`, `reporting`) as **internal identifiers** but their *user-facing scenario names*, *default values*, and *associated input labels* change. The math formulas, `applyScenario` logic, and `STORAGE_KEY` are untouched. Mapping table:

| Internal key | New user-facing scenario name | Plausibility of defaults |
|---|---|---|
| `custom` | Personnalisé (label kept) | Updated defaults for a 25-chambre hotel |
| `email` | Réponses aux emails clients | Slightly higher frequency; lower hours/task |
| `leads` | Demandes Booking.com / OTA | Higher value/lead, similar frequency |
| `invoicing` | (option) Suivi des réservations directes — OR retire this key | If retired, the `<select>` option is removed but the key stays in the JS object as a dead branch |
| `onboarding` | Questions répétitives avant arrivée | Lower hours/task, higher frequency |
| `reporting` | Reporting direction | Mostly unchanged defaults |

The new sixth scenario ("Mise à jour du site / contenus") is added with a fresh key `site_updates` if FR-022's minimum-six requirement can't be met by the rename alone. **Defaults for `leadsLost` and `leadValue` are reframed as "réservations directes manquées" and "valeur moyenne d'une réservation directe" without changing the field names** — `_input.name` attributes in the calculator HTML keep `name="leads-lost"` etc. to preserve Plausible event payload shape.

**Rationale**: Renaming keys would force schema changes in `calculator.js`, the input ID strings, and the Plausible event props — all out-of-scope for a content pivot. Keeping internal keys and changing only labels is the minimal-edit path that satisfies FR-039 ("math preserved").

**Alternatives considered**:
- Rebuild the calculator with hotel-native scenarios (new keys, new schema) — rejected: violates "no build-system change" assumption and bloats v1.
- Add a wholly new calculator page for hotels — rejected: 2 calculator pages doubles maintenance; OQ-1 → A constrains the surface.

---

## 7. Plausible event taxonomy preservation

**Decision**: Keep the existing event name `Audit Request` and the existing `data-cta-id` strings (`hero-cta`, `pain-bridge-cta`, `final-cta`) literally — they are internal identifiers, not user-visible labels. Only the **rendered label** of each CTA changes (FR-027a / FR-027b). The `sector` prop on `Audit Request` now carries the typology selector value ("Hôtel indépendant" etc.) instead of the legacy generic sector — this is a **payload value change**, not an event-shape change.

**Rationale**: Renaming Plausible events breaks historical comparability and forces a dashboard rebuild. The Assumptions block in the spec already locks this approach. Constitutional Principle V mandates documenting any event changes — the payload-value change must be noted in the PR.

**Alternatives considered**:
- Rename to `Diagnostic Request` — rejected: breaks dashboards; the user-visible label can change without the internal event name following.
- Add a duplicate event for the new flow — rejected: pollutes the dashboard with two events for the same conversion.

---

## 8. Vite static-build cache-busting

**Decision**: Rely on Vite's default hashed filename behaviour. The build emits `dist/assets/index-[hash].js` and `dist/assets/main-[hash].css` automatically; the HTML entry points reference them by the hashed name. **No manual cache-busting query strings, no service-worker, no explicit version stamp needed.** The legacy transport CSS won't be served because (a) Vite rebuilds the bundle fresh, and (b) o2switch serves the new `dist/` output with new hashed asset URLs that bypass any browser cache.

**Caveat**: The HTML files themselves are served at stable URLs (`/`, `/calculator.html`) and may be cached by the visitor's browser. The current `<meta>` tags don't set `Cache-Control`. Recommended (not blocking): add `<meta http-equiv="Cache-Control" content="no-cache">` on the two pivoted HTML pages for the first 7 days post-launch, then remove. **Decision**: deferred to ops; the spec's edge case "Old transport copy still cached" accepts that returning visitors may need one hard refresh.

**Rationale**: Vite's default behaviour already solves 90 % of the cache-busting problem for free. The remaining HTML-level cache is a one-shot operational concern, not an architectural one.

**Alternatives considered**:
- Add a `?v=` query string to every asset link in the HTML manually — rejected: redundant with Vite's hashing.
- Adopt a service-worker cache strategy — rejected: violates Principle I posture (extra runtime that touches every request) and overshoots the problem.

---

## Summary

All eight research areas resolved with explicit decisions. No new dependency is introduced. No constitution exception is requested. The plan can proceed to Phase 1 (data model + contracts + quickstart) without further investigation.
