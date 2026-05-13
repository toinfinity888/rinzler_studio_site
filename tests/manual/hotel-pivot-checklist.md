# Manual Test Checklist — Marketing Site Hotel Pivot (feature 002)

**Created**: 2026-05-13
**Source**: `specs/002-hotel-marketing-pivot/quickstart.md` §2–§13
**Pass criterion**: every box ticked before deploy. Document any deferred items at the bottom.

Run each section after the relevant story is implemented. Run end-to-end again in Polish (T076).

---

## US1 — Hero recognition (quickstart §2 + §3 + §10)

- [ ] Hero H1 references "petits hôtels indépendants" or equivalent; no "transport", "logistique".
- [ ] Hero sub-headline mentions digital stack / réservations directes / tâches manuelles; no "Mistral AI", no "souveraineté".
- [ ] Hero primary CTA reads "Demander un diagnostic digital hôtel".
- [ ] On 360 px viewport, hero H1 + sub + CTA fit above the fold.
- [ ] Pour qui section visible just below hero; lists 4–5 profiles.
- [ ] Ce que j'analyse section lists the diagnostic perimeter scannably.
- [ ] 4 pain cards (Réservations directes / Tâches répétitives / Outils dispersés / Décisions coûteuses) replace the legacy 4.
- [ ] Pain-bridge CTA reads "Estimer mes gains hôtel" and routes to `./calculator.html`.
- [ ] Method 3 steps retitled: Diagnostic digital hôtel / Plan priorisé / Implémentation progressive.
- [ ] Before/After items hotel-flavoured; no "Zéro erreur" / "100 % des leads".
- [ ] ROI preview CTA reads "Calcul détaillé pour mon hôtel".
- [ ] Title, meta description, meta keywords, OG, Twitter card all hotel-framed (view source).
- [ ] Footer tagline reads "Modernisation digitale pour hôtels indépendants".
- [ ] OG link preview on Facebook / LinkedIn / opengraph.xyz shows hotel framing (SC-003).
- [ ] Grep test (quickstart §3) returns zero disallowed phrases (SC-002).

## US2 — Intake form (quickstart §5 + §6)

- [ ] Modal title and submit-button reference "Diagnostic digital hôtel"; no "Audit".
- [ ] Form fields: Nom, Hôtel, Email, Téléphone, Typologie (required), Nombre de chambres (optional), PMS / moteur de réservation (optional), Message (optional).
- [ ] Typology selector has exactly 4 options (Hôtel indépendant / Petit groupe hôtelier / Hôtel-restaurant / Maison d'hôtes). No "Autre".
- [ ] Submit with required fields missing → HTML5 native validation; no network request.
- [ ] Submit with required fields populated → success panel with FR-028 confirmation wording.
- [ ] Plausible event `Audit Request` fires once with props `{hotel, typology, [rooms]}`.
- [ ] Plausible event payload does NOT contain `email`, `phone`, `message`, or `pms_stack` (Principle I).
- [ ] Header CTA reads "Diagnostic" (short form); routes to `#audit-booking`.
- [ ] Final CTA button reads "Demander un diagnostic digital hôtel".

## US3 — ROI calculator (quickstart §7)

- [ ] Calculator page `<title>` reads "Calculateur ROI Hôtel | Rinzler Studio".
- [ ] Scenario `<select>` lists ≥ 6 hotel scenarios.
- [ ] Selecting a scenario updates defaults without page reload.
- [ ] Input labels read hotel-flavoured (chambres, demandes clients, coût horaire réception, etc.).
- [ ] Result labels read hotel-flavoured (heures récupérées / réservations directes récupérées).
- [ ] Calculator header CTA reads "Diagnostic"; routes back to `./index.html#audit-booking`.
- [ ] Calculator footer tagline matches the homepage footer.

## US4 — Founder + Pourquoi nous (quickstart §8)

- [ ] 3 "Pourquoi nous" cards retitled (Connaissance terrain / MVP adapté petits hôtels / Accompagnement sur la durée).
- [ ] Card bullets reference hotel vocabulary (réception, OTA, moteur de réservation, occupation, saisonnalité, parcours direct).
- [ ] **Deferred** until founder asset + LinkedIn + bio ready: portrait visible with alt text "Sviatoslav Saraev, fondateur de Rinzler Studio"; bio mentions hands-on independent-hotel work near Paris; LinkedIn link opens in new tab with visible keyboard focus ring.

## US5 — FAQ + Sécurité + Final CTA (quickstart §9)

- [ ] Sécurité section retitled to "Protection des données clients" (no "Souveraineté & Sécurité").
- [ ] Two sécurité cards lead on guest-data protection, RGPD, European hosting; no "Cloud Act US", no "Zero Cloud US", no "IA souveraine".
- [ ] FAQ has ≥ 5 hotel-specific Q/A pairs (PMS, moteur de réservation, hôtel de 15–40 chambres, sans refonte de site, coût, IA et réception).
- [ ] FAQ answers use calibrated wording; no "Mistral AI", no "Scaleway Paris", no "+30 % de satisfaction", no "+391 %", no "20 % de rentabilité".
- [ ] Final CTA title is hotel-framed; no "chaos opérationnel", no "machine à profit".
- [ ] Final CTA 3 bullets hotel-framed; no "Audit gratuit", no "Potentiel d'automatisation".
- [ ] Final CTA button label matches the hero intake CTA ("Demander un diagnostic digital hôtel").

## Polish (quickstart §11 + §12 + §13)

- [ ] `mentions-legales.html` discloses the new form fields (typology, rooms, pms_stack) and Formspree transport.
- [ ] `politique-confidentialite.html` discloses the same.
- [ ] Lighthouse mobile slow 4G on `/`: LCP ≤ 2.5 s.
- [ ] Lighthouse mobile slow 4G on `/calculator.html`: LCP ≤ 2.5 s.
- [ ] Total JS shipped to `/` ≤ 50 KB gzipped (excluding Plausible).
- [ ] On simulated Slow 3G, hero H1 + sub + CTA render within 3 s without hero video (SC-008).
- [ ] `npm run build` runs without error.
- [ ] `dist/index.html` and `dist/calculator.html` contain the pivoted content (no stale transport phrases).
- [ ] Studio inbox filter rules updated for "Nouvelle demande de diagnostic" subject prefix.

---

## Deferred items

(List anything deferred — e.g., founder block T057–T059 if portrait not yet provided.)
