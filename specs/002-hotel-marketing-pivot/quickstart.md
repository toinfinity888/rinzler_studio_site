# Quickstart — Verify the Hotel Pivot

**Feature**: 002-hotel-marketing-pivot
**Audience**: contributor or reviewer wanting to validate the pivot end-to-end before merging or before triggering the first 30-email outreach batch.
**Time budget**: ≤ 10 minutes.

---

## 0. Prerequisites

- Node.js 20 LTS or newer.
- The repo's working tree on branch `002-hotel-marketing-pivot` with the pivot already applied (otherwise the validations below will fail by design).
- Local `npm install` already run.

## 1. Start the dev server

```bash
cd /Users/saraevsviatoslav/Documents/rinzler_studio_web_site
npm run dev
```

Expect Vite to open `http://localhost:3000/` automatically.

## 2. Above-the-fold self-identification (SC-001, FR-005..008)

On `/` at the initial viewport, without scrolling, verify:

- [ ] The H1 reads "Modernisation digitale pour petits hôtels indépendants" (or the agreed FR-005 variant).
- [ ] The hero sub-headline mentions independent hotels, the digital stack, or réservations directes — and does NOT mention Mistral AI, transport, logistique, or souveraineté.
- [ ] The hero CTA reads "Demander un diagnostic digital hôtel" (FR-007).
- [ ] On a 360 px viewport (DevTools → mobile emulation → iPhone SE), the hero H1 + sub-headline + CTA all fit in the first viewport.

## 3. Grep verification of disallowed phrases (SC-002)

Run this from the repo root:

```bash
grep -rE "Transport|Logistique|Mistral AI|Scaleway Paris|Débloquez 20 ?%|Réduction de 20 ?%|chaos opérationnel|machine à profit|potentiel d'automatisation|Audit Gratuit|Audit gratuit|Réserver Mon Audit|Calculer Mon Potentiel|28 500 ?\\\$|\\+391 ?%|9\\+ ?h|43 ?%|zéro erreur|100 ?% des leads|\\+30 ?% de satisfaction|15 ?€ amende|facturation 2026" \
  src/index.html src/calculator.html \
  | grep -v "mentions-legales\\|politique-confidentialite"
```

Expect **zero matches**. If any line is returned, the pivot is incomplete on that surface.

## 4. CTA routing (SC-004, FR-027a + FR-027b)

Click each of the following on `/` and confirm the destination:

- [ ] Header "Diagnostic" → opens intake modal (anchor `#audit-booking`).
- [ ] Hero "Demander un diagnostic digital hôtel" → opens intake modal.
- [ ] Pain-bridge CTA (hotel-framed label per FR-027b) → navigates to `/calculator.html`.
- [ ] ROI preview "Calcul détaillé pour mon hôtel" (or agreed variant) → navigates to `/calculator.html`.
- [ ] Final CTA button (FR-041) → opens intake modal.
- [ ] On `/calculator.html`, the header "Diagnostic" CTA → routes back to `/#audit-booking` (FR-040).

## 5. Intake form (FR-028, FR-029, FR-030)

Open the modal from any intake CTA and confirm:

- [ ] Modal title and submit button reference "Diagnostic digital hôtel" — not "Audit".
- [ ] Form fields exist: Nom complet, Hôtel, Email, Téléphone, Typologie d'établissement (required), Nombre de chambres (optional), PMS / moteur de réservation actuels (optional), Message (optional).
- [ ] "Typologie" `<select>` has exactly 4 options: Hôtel indépendant, Petit groupe hôtelier, Hôtel-restaurant, Maison d'hôtes. **No "Autre"**, no "Transport", no generic SME sectors.
- [ ] Submitting with required fields missing → HTML5 native validation; no network request.
- [ ] Submitting with all required fields → success panel with FR-028 confirmation wording ("Nous reviendrons vers vous sous 24 h pour planifier votre diagnostic hôtel.").

## 6. Plausible event sanity (Principle V, contracts/plausible-events.md)

In DevTools → Network, filter by `plausible.io`. Submit the form and confirm:

- [ ] Exactly one `event` request fires with `name=Audit Request`.
- [ ] Props contain `hotel`, `typology`, optional `rooms`.
- [ ] Props do NOT contain `email`, `phone`, `message`, or `pms_stack`.

## 7. ROI calculator scenarios (FR-022..024, FR-039)

On `/calculator.html`:

- [ ] The scenario `<select>` lists ≥ 6 hotel scenarios (Réponses aux emails clients, Demandes Booking.com / OTA, Questions répétitives avant arrivée, Mise à jour du site / contenus, Suivi des réservations directes, Reporting direction).
- [ ] Selecting a scenario updates default values without page reload.
- [ ] Input labels read hotel-flavoured ("Nombre de chambres", "Demandes clients par semaine", "Coût horaire réception", etc.) — not "Employés concernés".
- [ ] Result label reads hotel-flavoured ("Heures récupérées à la réception / mois", "Économies estimées / mois").

## 8. Founder block (FR-020, FR-021)

On `/`, scroll to the "Pourquoi l'hôtellerie / À propos" block:

- [ ] Portrait image visible with alt text "Sviatoslav Saraev, fondateur de Rinzler Studio".
- [ ] Bio (3–5 lines) mentions hands-on work in an independent hotel near Paris.
- [ ] LinkedIn link opens the correct profile in a new tab (`target="_blank" rel="noopener"`).
- [ ] Tabbing through the page with the keyboard reaches the LinkedIn link with a visible focus ring.

## 9. Meta / OG / footer (FR-001..004, FR-037)

On `/` and `/calculator.html`, view source and confirm:

- [ ] `<title>` references independent hotels (e.g., "Rinzler Studio | Modernisation digitale pour hôtels indépendants" on `/`; "Calculateur ROI Hôtel | Rinzler Studio" on `/calculator.html`).
- [ ] `<meta name="description">`, `<meta name="keywords">`, `og:title`, `og:description`, `og:image` all hotel-framed.
- [ ] Footer tagline reads "Modernisation digitale pour hôtels indépendants" (FR-003).
- [ ] Mentions légales and Politique de confidentialité links remain in the footer.

## 10. OG link preview (SC-003)

Paste `https://rinzlerstudio.fr/` into each of these and verify the preview shows hotel framing:

- Facebook Sharing Debugger — https://developers.facebook.com/tools/debug/
- LinkedIn Post Inspector — https://www.linkedin.com/post-inspector/
- A generic OG preview — https://www.opengraph.xyz/

(For local dev: deploy to a staging URL first, OG inspectors don't work against localhost.)

## 11. Performance budget (SC-008, Principle constraints)

Run Lighthouse on `/` in DevTools (Mobile, Slow 4G):

- [ ] LCP ≤ 2.5 s.
- [ ] Total JS shipped to `/` ≤ 50 KB gzipped (Lighthouse → Performance → bundle audit).
- [ ] No regressions vs the pre-pivot baseline captured in `tests/performance/lcp-budget.md`.

## 12. Legal-page sync (Principle I)

```bash
grep -E "Hôtel|chambres|typologie|PMS|moteur de réservation" \
  src/mentions-legales.html src/politique-confidentialite.html
```

Expect matches in both files. If empty: the legal pages were not updated to disclose the new form fields → blocker per Principle I.

## 13. Build & deploy

```bash
npm run build
```

Expect zero errors. Manually inspect `dist/index.html` and `dist/calculator.html` to confirm the pivoted content is in the build output. Deploy via the existing o2switch cPanel pipeline (out of scope for this feature).

## Inbox filter rules (deploy-time checklist)

Before the first outreach batch, update the studio inbox filter rules:

- [ ] Any rule keying on `Nouvelle demande d'audit` now also matches `Nouvelle demande de diagnostic`.
- [ ] No rule auto-archives or deprioritizes the new subject line.

## After deploy — 14-day outreach validation (SC-009)

After the pivot is live and the first 30-email outreach batch has been sent:

- [ ] At least one inbound reply references hotel-specific content from the site (PMS, moteur de réservation, Booking.com, parcours de réservation directe, or the founder's hotel experience).
- [ ] Capture the reply in the studio CRM with a tag `pivot-validation`.

---

If every checkbox above passes, the pivot is ready to ship and to support the outreach campaign.
