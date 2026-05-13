---
description: "Task list for feature 002-hotel-marketing-pivot"
---

# Tasks: Marketing Site Hotel Pivot

**Input**: Design documents from `/specs/002-hotel-marketing-pivot/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: NOT requested in the spec. Test-related tasks are limited to (a) writing manual smoke / acceptance checklists under `tests/manual/` and (b) capturing performance baselines under `tests/performance/`. No automated unit / contract / integration test tasks are generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and shipping of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- File paths are absolute from repo root `/Users/saraevsviatoslav/Documents/rinzler_studio_web_site/`

## Path Conventions

- Marketing site: `src/index.html`, `src/calculator.html`, `src/scripts/`, `src/styles/`, `src/assets/`
- Legal pages: `src/mentions-legales.html`, `src/politique-confidentialite.html`
- Manual + perf test stubs: `tests/manual/`, `tests/performance/`
- CSS files (`src/styles/*.css`) are **OFF LIMITS** — FR-033 forbids new visual vocabulary. Any CSS edit in this feature is a bug.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the local toolchain works and create the manual / performance test scaffolding that several stories will write to.

- [X] T001 Verify the dev environment: from repo root, run `npm install && npm run dev` and confirm Vite serves `http://localhost:3000/` showing the **current** transport-flavoured site (proves the baseline, not the pivot). Stop the server once verified.
- [X] T002 [P] Create the manual test scaffold file `tests/manual/hotel-pivot-checklist.md` with placeholder sections for US1..US5 + Polish; copy the section headings from `specs/002-hotel-marketing-pivot/quickstart.md` (steps 2–13). Individual stories will fill their section.
- [X] T003 [P] Create the performance scaffold file `tests/performance/lcp-budget.md`. Run Lighthouse on the current `/` and `/calculator.html` (Mobile, Slow 4G) and record the **pre-pivot baseline** (LCP, total JS gz, total transfer) in the file. Post-pivot rows will be added in Polish.

**Checkpoint**: Local dev works, the two test scaffolds exist with the baseline captured. User stories can now start.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Read the design artifacts before touching code. This is the only true cross-story prerequisite — every story below references decisions made in `research.md` and shapes locked in `data-model.md`.

**⚠️ CRITICAL**: No user story work can begin until every implementer has read the spec, plan, research, data-model, and contracts. The pivot is content-driven, not framework-driven — getting the copy direction wrong is the dominant risk, not getting the code wrong.

- [X] T004 Read `specs/002-hotel-marketing-pivot/spec.md` end-to-end, with special attention to the `## Clarifications → Session 2026-05-13` block (5 locked decisions) and the `### Terminology` block (canonical CTA wording, "petits hôtels indépendants" definition).
- [X] T005 Read `specs/002-hotel-marketing-pivot/research.md` — the 8 best-practices decisions are the editorial brief for every copy task below. Especially sections 1 (hero), 4 (softening statistics), 5 (RGPD-only sécurité framing), and 6 (calculator math preservation).
- [X] T006 Read `specs/002-hotel-marketing-pivot/data-model.md` and `specs/002-hotel-marketing-pivot/contracts/intake-form-submission.md` — these are the binding shapes for US2.
- [X] T007 Read `specs/002-hotel-marketing-pivot/contracts/plausible-events.md` — the event-name preservation rule applies to US2 and is easy to break accidentally.

**Checkpoint**: Everyone on the implementation is aligned. User story work can now start in parallel.

---

## Phase 3: User Story 1 — Hero recognition (Priority: P1) 🎯 MVP

**Goal**: A first-time visitor opens `/` and, within 10 seconds without scrolling past the hero, understands the site is for independent hotels of 10–50 rooms. The pivoted page communicates its target audience through hero copy, qualifier section, "Ce que j'analyse" inventory, hotel pain cards, hotel method steps, before/after, and the title/meta/OG/footer touchpoints that drive social-share previews. Exploration CTAs (pain-bridge, ROI-preview) get hotel-framed labels.

**Independent Test**: Quickstart §2 + §3 + §10. A reviewer who has never seen the site loads `/` on desktop and 360 px mobile, answers "Who is this site for?" correctly using only above-the-fold words, grep finds zero disallowed phrases (SC-002), and the OG link preview on 3 inspectors shows hotel framing.

### Implementation for User Story 1

#### Meta, title, OG, footer (sets the "is this for me?" baseline before any visual section renders)

- [X] T008 [US1] Rewrite the `<title>`, `<meta name="description">`, `<meta name="keywords">`, OG / Twitter card tags (`og:title`, `og:description`, `og:image`, etc.) on `src/index.html` to hospitality wording per FR-001 / FR-002 / FR-004. Title default: `Rinzler Studio | Modernisation digitale pour hôtels indépendants`. Keep `<meta name="theme-color">` and Plausible script tag unchanged.
- [X] T009 [US1] Rewrite the footer tagline in `src/index.html` from `Automatisation & IA pour Transport & Logistique` to `Modernisation digitale pour hôtels indépendants` per FR-003. Keep footer links (mentions-légales, politique-confidentialite) and copyright untouched.

#### Hero (FR-005..008)

- [X] T010 [US1] Replace the hero H1 in `src/index.html` (current: `Réduction de 20% des Coûts via l'Automatisation`) with `Modernisation digitale pour petits hôtels indépendants` per FR-005. Preserve the `.hero-tagline.hero-tagline-white` styling classes.
- [X] T011 [US1] Rewrite the hero sub-headline in `src/index.html` (current mentions Mistral AI + souveraineté) per FR-006: focus on clarifying the digital stack, reducing manual work, improving direct bookings, progressive and quantified approach. Forbidden words in hero copy: `transport`, `logistique`, `Mistral AI`, `souveraineté`.
- [X] T012 [US1] Rewrite the hero primary CTA label in `src/index.html` from `Réserver Mon Audit Gratuit d'Efficacité` to `Demander un diagnostic digital hôtel` per FR-007. Keep the `href="#audit-booking"`, `data-cta`, `data-cta-id="hero-cta"`, and `data-section="hero"` attributes literally.
- [X] T013 [US1] (Optional) Add a secondary hero CTA `Voir les points analysés` per FR-008, anchored to the `Ce que j'analyse` section (T016). Re-use the existing `.btn.btn-secondary` (or equivalent) component if available; otherwise skip — secondary CTA is explicitly optional in the spec.

#### Qualifier + Inventory (new sections)

- [X] T014 [P] [US1] Insert a `Pour qui` qualifier section in `src/index.html` immediately below the hero per FR-009 / FR-010. Use the existing section-header styling (`.section-tag`, `.section-title`) and a simple bullet list (no card chrome, per research.md §2). Profiles: hôtels indépendants 2/3/4 étoiles, 10–50 chambres, petits groupes hôteliers indépendants, hôtels avec un site correct mais un parcours de réservation perfectible, directions souhaitant comprendre les coûts avant de changer PMS / moteur de réservation / site.
- [X] T015 [P] [US1] Insert a `Ce que j'analyse` inventory section in `src/index.html` per FR-013. Scannable list (not prose) of: Site web, Moteur de réservation, PMS, Channel manager, Emails clients, Demandes Booking.com / OTA, FAQ et informations avant arrivée, Tracking / analytics, Coûts logiciels mensuels, Tâches répétitives à la réception. Same styling vocabulary as adjacent sections.
- [X] T016 [US1] Anchor the `Ce que j'analyse` section so the optional hero secondary CTA from T013 (if implemented) scrolls to it. Use a stable ID like `id="ce-que-j-analyse"`.

#### Pain bridge (4 cards, FR-011 / FR-012)

- [X] T017 [US1] Rewrite the 4 pain cards in `src/index.html` (`.pain-bento` block, `.pain-card--1..4`) per FR-011, in order: (1) Réservations directes, (2) Tâches répétitives, (3) Outils dispersés, (4) Décisions coûteuses. Recommended micro-copy from FR-011. Keep card structure, tag, title, stat layout (`.pain-card-tag`, `.pain-card-title`, `.pain-card-stats`) unchanged.
- [X] T018 [US1] Remove the legacy statistics from the 4 pain cards per FR-012: `28 500 $`, `+391 %`, `9+ h`, `43 %`, `15 € amende par facture dès 2026`. If a card needs a stat, use a qualitative phrasing instead (e.g., `Variable selon votre stack`). Update `.pain-card-stat-caption` text accordingly.
- [X] T019 [US1] Rewrite the pain-bridge CTA label per FR-027b (exploration CTA). Default: `Estimer mes gains hôtel`. Keep the `href="./calculator.html"`, `data-cta`, `data-cta-id="pain-bridge-cta"`, `data-section="pain"` attributes literal.

#### Method 3 steps (FR-014, FR-015)

- [X] T020 [US1] Retitle the 3 method phases in `src/index.html` (`.journey-phase.phase-1..3`) per FR-014: (1) `Diagnostic digital hôtel`, (2) `Plan priorisé`, (3) `Implémentation progressive`. Update the `.phase-tag` text (currently `Étape 1 — Identification & Priorisation` etc.) to match. Keep the `.journey-sticky-container`, the phase-indicator dot markup, and the scrollytelling script untouched (FR-015 preserves animation).
- [X] T021 [US1] Rewrite the supporting copy and bullets under each method phase per FR-015: hotel reality (front desk, OTA, moteur de réservation, parcours de réservation directe). Replace `Opportunités à fort ROI identifiées` / `MVP fonctionnel` / `Intégration complète` headlines with hotel-flavoured variants. Update `.diag-points`, `.wf-process-flow`, `.scale-points` content.
- [X] T022 [US1] Review the `.workflow-platforms-icons` row in the Method §2 (current icons: n8n, Mistral, OpenAI, Notion, Slack, WhatsApp, HubSpot, OVH). No removal needed per Assumptions, but verify the `alt` attributes are still accurate.

#### Before / After (FR-016, FR-017)

- [X] T023 [US1] Rewrite the `Avant` items in `src/index.html` (`.ba-card--before .ba-item-text`) per FR-016: Questions répétitives traitées manuellement, Réservations directes difficiles à mesurer, Outils séparés, Mises à jour du site lentes, Coûts logiciels peu lisibles. Update the metric `.ba-card-metric` to a calibrated value (no absolute `+20h`).
- [X] T024 [US1] Rewrite the `Après` items per FR-016: Réponses plus rapides, Parcours de réservation clarifié, Outils mieux connectés, Processus documentés, Décisions basées sur coûts/temps/ROI. **MUST NOT** contain `Zéro erreur` or `100 % des leads traités` (FR-017). Update the `.ba-card-metric` to calibrated wording.

#### ROI preview CTA label (homepage only — full calculator page is US3)

- [X] T025 [US1] Rewrite the homepage ROI preview CTA label in `src/index.html` (`.roi-preview-cta`) from `Calcul détaillé avec ROI complet` to a hotel-framed label per FR-027b (e.g., `Calcul détaillé pour mon hôtel`). Keep the `href="./calculator.html"` and any analytics attributes literal.

**Checkpoint**: At this point, a visitor landing on `/` from a cold outreach email recognizes the site is for them within 10 seconds. Quickstart §2 + §3 + §10 pass. US1 ships an MVP-quality pivot even if US2..US5 lag.

---

## Phase 4: User Story 2 — Intake form (Priority: P1)

**Goal**: A director who decides to engage clicks any intake CTA, fills the form with hospitality-appropriate fields (Hôtel, typology dropdown, optional rooms, optional PMS stack, message), submits successfully, and sees a hotel-framed confirmation. The Plausible event preserves the legacy taxonomy with renamed props.

**Independent Test**: Quickstart §5 + §6. Open the modal from any intake CTA, verify all field labels are hotel-framed and the typology dropdown has exactly 4 options (no "Autre"). Submit with required fields missing → HTML5 validation. Submit successfully → success panel with FR-028 confirmation wording + Plausible event with `name=Audit Request` and props `{hotel, typology, [rooms]}`.

### Implementation for User Story 2

#### Modal structure (FR-027a, FR-028, FR-029, FR-030)

- [X] T026 [US2] Rewrite the modal header in `src/index.html` (`.modal-header`): `.modal-tag` becomes `Diagnostic digital hôtel` (replacing `Audit Gratuit`); `.modal-title` becomes `Demandez votre diagnostic digital hôtel` (or agreed variant); `.modal-subtitle` references the hotel diagnostic in 30 minutes per FR-028.
- [X] T027 [US2] Rename the form field in `src/index.html` from `Entreprise` to `Hôtel` per FR-029: change `<label for="audit-company">Entreprise *</label>` to `<label for="audit-hotel">Hôtel *</label>` and update the input `id` and `name` attributes accordingly. **Note**: optionally keep `name="company"` to preserve the existing Plausible payload key shape — see plausible-events.md decision. If keeping, document the name/label mismatch in a single inline HTML comment.
- [X] T028 [US2] Replace the `Secteur d'activité` `<select>` with a `Typologie d'établissement` `<select>` per FR-030. Exactly 4 options (no `Autre`, no transport, no commerce, no industrie, no santé): `Hôtel indépendant` (value `independent`), `Petit groupe hôtelier` (value `small-group`), `Hôtel-restaurant` (value `hotel-restaurant`), `Maison d'hôtes` (value `maison-d-hotes`). Field is `required`. Update label, `id="audit-typology"`, `name="typology"`.
- [X] T029 [US2] Add an optional `Nombre de chambres` number input in `src/index.html` per FR-029: `<input type="number" id="audit-rooms" name="rooms" min="1" max="500">`. Place it in the same `.form-row` block as the typology selector for visual rhythm.
- [X] T030 [US2] Add an optional `PMS / moteur de réservation actuels` text input in `src/index.html` per FR-029: `<input type="text" id="audit-pms-stack" name="pms_stack" maxlength="250" placeholder="Mews, Asterio, Cloudbeds, Misterbooking… (optionnel)">`. Vendor-neutral placeholder — no exclusive endorsement.
- [X] T031 [US2] Rewrite the message textarea placeholder in `src/index.html` (`#audit-message`) per FR-029: hospitality-flavoured prompt mentioning réservations directes, OTA, ou parcours guest.
- [X] T032 [US2] Rewrite the submit button label from `Envoyer ma demande` to `Demander un diagnostic digital hôtel` per FR-028. Keep the icon SVG and `.btn.btn-primary.btn-hero-cta.animate-glow.btn-submit` classes literal.

#### Intake CTAs (FR-027a)

- [X] T033 [US2] Rewrite the header CTA in `src/index.html` (`.nav-cta` in `.header-nav`) from `Audit Gratuit` to short form `Diagnostic`. Keep `href="#audit-booking"` and the `.btn.btn-primary.btn-sm` classes literal.
- [X] T034 [US2] Rewrite the final CTA button label in `src/index.html` (`.final-cta` section) from `Calculer Mon Potentiel d'Automatisation` to `Demander un diagnostic digital hôtel` per FR-027a / FR-041 step 4. Keep `href="#audit-booking"` literal.

#### Form handler (`src/scripts/main.js`)

- [X] T035 [US2] Update the `fetch` body in `src/scripts/main.js` (currently sends `{name, company, email, phone, sector, message, _subject}`) to the v1 schema per `contracts/intake-form-submission.md`. Rename `company` → `hotel` (or keep `formData.get('company')` if you kept `name="company"` per T027), rename `sector` → `typology`, add `rooms` and `pms_stack`. Update `_subject` from `Nouvelle demande d'audit - ${company}` to `Nouvelle demande de diagnostic digital hôtel — ${hotel}`.
- [X] T036 [US2] Update the success-panel `innerHTML` in `src/scripts/main.js` (`showSuccess()` function): change `Merci pour votre intérêt. Nous vous contacterons dans les 24 heures pour planifier votre audit gratuit.` to `Merci pour votre intérêt. Nous vous contacterons sous 24 h pour planifier votre diagnostic digital hôtel.` per FR-028. Change the heading `Demande envoyée !` if needed.
- [X] T037 [US2] Update the Plausible event call in `src/scripts/main.js` per `contracts/plausible-events.md`: keep `plausible('Audit Request', ...)` (event name preserved), update props to `{hotel, typology, rooms}`. **MUST NOT** add `email`, `phone`, `message`, or `pms_stack` to the props (Principle I).
- [X] T038 [US2] Update the error-alert string in `src/scripts/main.js` to drop the generic `audit` framing if present. Currently `Une erreur est survenue. Veuillez réessayer ou nous contacter directement.` — keep as is or rephrase to `… ou nous contacter à hello@rinzlerstudio.com.`. Trivial.

#### Manual test fill-in

- [X] T039 [US2] Fill in the US2 section of `tests/manual/hotel-pivot-checklist.md` with the 5 form-submission scenarios from `contracts/intake-form-submission.md` (test scenarios block).

**Checkpoint**: Intake CTAs route to the form, the form is hotel-shaped, submission succeeds with the new payload, Plausible records the legacy event with new props. Quickstart §5 + §6 pass.

---

## Phase 5: User Story 3 — ROI calculator (Priority: P2)

**Goal**: A visitor opens the ROI calculator preview on `/` or navigates to `/calculator.html` and is offered hotel-specific scenarios with hotel-flavoured input labels and result units. The underlying math is preserved; only labels and defaults change (FR-039).

**Independent Test**: Quickstart §7. The scenario `<select>` lists ≥ 6 hotel scenarios, selecting a scenario updates defaults without page reload, input labels read hotel-flavoured, result label reads hotel-flavoured.

### Implementation for User Story 3

#### Homepage ROI preview labels (FR-022, FR-023, FR-024)

- [X] T040 [US3] Rewrite the 4 ROI preview input labels in `src/index.html` (`.roi-preview-inputs`) per FR-023: `Employés concernés` → `Nombre de chambres` (or `Demandes clients par semaine`), `Heures par tâche` → `Temps moyen par demande`, `Fréquence / semaine` → `Demandes par semaine`, `Coût horaire (€)` → `Coût horaire réception (€)`. Keep `id` and `for` attributes intact so calculator.js still finds them.
- [X] T041 [US3] Update the default values of the 4 ROI preview inputs to plausible hotel-relevant numbers per research.md §6 (e.g., 25 chambres or 20 demandes / semaine, 0.5 h per demand, 20 demands / week, 28 €/h réception). Keep the calculation formula in calculator.js untouched.
- [X] T042 [US3] Rewrite the ROI result label and footnote in `src/index.html` (`.roi-result-label`, `.roi-result-note`) per FR-024: `Économies potentielles` stays acceptable; the `*Basé sur 70% d'efficacité d'automatisation` footnote becomes `*Estimation à 70 % d'efficacité — selon votre cas.` (calibrated wording per FR-026).
- [X] T043 [US3] Rewrite the `.roi-preview-title` and `.roi-preview-subtitle` in `src/index.html` per FR-022 to hotel framing (e.g., `Estimez vos économies hôtel en 30 secondes` / `Heures récupérées à la réception et réservations directes potentielles, en quelques chiffres.`).

#### Calculator page meta + hero + header / footer (FR-037, FR-038, FR-040)

- [X] T044 [P] [US3] Rewrite the `<title>`, `<meta name="description">`, `<meta name="keywords">` in `src/calculator.html` per FR-037. Title default: `Calculateur ROI Hôtel | Rinzler Studio`. Description hotel-framed.
- [X] T045 [P] [US3] Rewrite the `.calc-hero-title` and `.calc-hero-subtitle` in `src/calculator.html` per FR-038: title `Calculateur ROI Hôtel`, subtitle `Estimez en quelques minutes les heures économisées à la réception et les réservations directes potentielles.`
- [X] T046 [US3] Rewrite the calculator header CTA in `src/calculator.html` (`.nav-cta` — currently `Audit Gratuit`) to short form `Diagnostic` per FR-040 (header short form, FR-027a). Keep `href="./index.html#audit-booking"` literal.
- [X] T047 [US3] Rewrite the calculator page footer tagline in `src/calculator.html` (if present in `.site-footer .footer-tagline`) per FR-003 / FR-040 — same wording as `/`.

#### Calculator scenarios + input labels + tooltips (FR-022, FR-023, FR-024, FR-039)

- [X] T048 [US3] Rewrite the scenario `<select>` options in `src/calculator.html` (`#calc-scenario`) per FR-022. New option labels: `Personnalisé`, `Réponses aux emails clients`, `Demandes Booking.com / OTA`, `Questions répétitives avant arrivée`, `Mise à jour du site / contenus`, `Suivi des réservations directes`, `Reporting direction`. Keep the `<option value=...>` strings literal (`custom`, `email`, `leads`, `onboarding`, `site_updates`, `invoicing`, `reporting`) — see T049 for the SCENARIOS object alignment.
- [X] T049 [US3] Update the `SCENARIOS` object in `src/scripts/calculator.js` per research.md §6: keep keys `custom`, `email`, `leads`, `invoicing`, `onboarding`, `reporting` literal (they're internal IDs). Update each scenario's default values (`employees`, `hoursPerTask`, `frequency`, `hourlyRate`, `errorRate`, `errorCost`, `errorVolume`, `leadsLost`, `leadValue`, `implCost`, `monthlyCost`, `efficiency`) to plausible hotel-relevant numbers. **MUST NOT** change the formula, the `applyScenario` function, or the `STORAGE_KEY`. If FR-022 mandates 6 scenarios and you need a 7th key (`site_updates`), add it.
- [X] T050 [US3] Rewrite the full calculator input field labels and tooltip text in `src/calculator.html` per FR-039: `Employés concernés` → `Nombre de chambres` (or appropriate per field), `Heures par tâche` → `Temps moyen par demande`, `Fréquence par semaine` → `Demandes par semaine`, `Coût horaire` → `Coût horaire réception (€)`, `Taux d'erreur` → `Taux de demandes mal traitées (%)`, etc. Update the tooltip text inside `.info-tooltip` to match the hotel context. Keep input `id` and `name` attributes literal so calculator.js bindings still resolve.
- [X] T051 [US3] Rewrite the calculator result labels in `src/calculator.html` per FR-024 to hotel-flavoured wording (`Heures récupérées à la réception / mois`, `Économies estimées / mois`, `Réservations directes récupérées estimées / mois`).
- [X] T052 [US3] (Optional) Add a second CTA at the bottom of `src/calculator.html` per FR-040 — `Demander un diagnostic digital hôtel`, routed to `./index.html#audit-booking`. Re-use the existing `.btn.btn-primary.btn-hero-cta` component.

#### Manual test fill-in

- [X] T053 [US3] Fill in the US3 section of `tests/manual/hotel-pivot-checklist.md` with the calculator scenarios + label verification checks from quickstart.md §7.

**Checkpoint**: Both the homepage ROI preview and `/calculator.html` are pivoted. Math unchanged. Quickstart §7 passes.

---

## Phase 6: User Story 4 — Founder block + "Pourquoi nous" trust signals (Priority: P2)

**Goal**: A visitor mid-page on `/` reaches an inline "Pourquoi l'hôtellerie / À propos" founder block (portrait + bio + LinkedIn + location) and a rewritten "Pourquoi nous" 3-card section that speaks to hotel directors specifically.

**Independent Test**: Quickstart §8. The founder block renders with a portrait, hands-on hotel claim in the bio, working LinkedIn link, and keyboard-accessible focus state. The 3 "Pourquoi nous" cards speak to terrain hôtelier, MVP adapted to small hotels, and ongoing partnership.

### Implementation for User Story 4

#### Founder asset

- [X] T054 [US4] Acquire the founder portrait asset (FR-020 prerequisite). The founder provides a square portrait, exported to WebP at ~200–280 px × 200–280 px, target file size 50–80 KB. Save to `src/assets/images/sviatoslav-portrait.webp`. **Block this story** if the founder hasn't provided the photo, the confirmed LinkedIn URL, or the 3–5 line bio — the spec's edge case says defer rather than placeholder.

#### Existing "Pourquoi nous" 3-card rewrite (FR-035, FR-036)

- [X] T055 [P] [US4] Rewrite the 3 `Pourquoi Nous` cards in `src/index.html` (`.why-card--1..3`) per FR-035: (1) `Connaissance terrain de l'hôtellerie indépendante`, (2) `MVP adapté aux petits hôtels`, (3) `Accompagnement sur la durée`. Update `.why-card-title`, `.why-card-description`, and the `.why-card-points` bullets to hotel vocabulary (réception, OTA, moteur de réservation, occupation, saisonnalité, parcours direct). Keep the `.why-icon-glass` SVG icons literal — they're abstract enough to fit any positioning per FR-036.
- [X] T056 [P] [US4] Rewrite the section header in `src/index.html` (`.why-us-header`): `.why-us-tag` stays `Pourquoi Nous`; `.why-us-title` becomes a hotel-relevant variant (e.g., `Une approche taillée pour<br><span class="why-us-gradient">les petits hôtels indépendants.</span>`); `.why-us-subtitle` references the hands-on hotel context.

#### New "Pourquoi l'hôtellerie / À propos" founder block (FR-020, FR-021)

- [X] T057 [US4] Insert a new section in `src/index.html` between the "Pourquoi Nous" 3-card section and the ROI preview section per FR-020. Two-column layout (portrait left, copy right on desktop; stacked on mobile). Use existing section-header tokens (`.section-tag`, `.section-title`) — no new visual vocabulary (FR-033). Section content: `À propos / Pourquoi l'hôtellerie` tag, hotel-specific title, founder name (Sviatoslav Saraev) at h3 weight, role (Fondateur de Rinzler Studio), 3–5 line bio (hands-on independent hotel near Paris), LinkedIn link, location line (Paris / Île-de-France).
- [X] T058 [US4] In the founder block, render the portrait `<img src="./assets/images/sviatoslav-portrait.webp" alt="Sviatoslav Saraev, fondateur de Rinzler Studio" width="220" height="220" loading="lazy">` per FR-021. The block MUST remain coherent when the image fails to load — verify the layout doesn't collapse if `src` returns 404.
- [X] T059 [US4] In the founder block, render the LinkedIn link with `target="_blank" rel="noopener noreferrer"` and a visible focus ring on keyboard tab (re-use the existing focus-ring tokens — do not add new CSS). Place the LinkedIn link as a clear inline call (e.g., `→ LinkedIn`) on its own line.

#### Manual test fill-in

- [X] T060 [US4] Fill in the US4 section of `tests/manual/hotel-pivot-checklist.md` with the founder block + Pourquoi nous verification steps from quickstart.md §8.

**Checkpoint**: Mid-page trust signals are in place. Quickstart §8 passes. If the photo is missing, the founder block is deferred per the spec's edge case and the rest of US4 (Pourquoi nous rewrite) still ships.

---

## Phase 7: User Story 5 — FAQ + Souveraineté reframe + Final CTA copy (Priority: P3)

**Goal**: A reassurance-seeking visitor at the bottom half of the page sees: a Sécurité section softened to RGPD hotel framing (no Cloud Act US), an FAQ rewritten around PMS / moteur de réservation / OTA / hôtel de 15 chambres / coût / IA-et-réception, and a Final CTA section reframed for hotel diagnostic conversion.

**Independent Test**: Quickstart §9. Read every FAQ Q/A pair — each is plausibly asked by a director and uses calibrated wording. The sécurité section's two cards lead on RGPD / guest data / European hosting (not Cloud Act). The Final CTA's title, subtitle, and 3 bullets are hotel-framed; the button label is the canonical CTA.

### Implementation for User Story 5

#### Sécurité section reframe (FR-018, FR-019, OQ-2 → B)

- [X] T061 [US5] Retitle the section header in `src/index.html` (`.sov-section-tag`, `.sov-section-title`, `.sov-section-subtitle`): tag becomes `Protection des données clients` (replacing `Souveraineté & Sécurité`); title becomes hotel-relevant (e.g., `Vos données clients restent sous contrôle.`); subtitle drops `Cloud US` framing and references RGPD-compliant European hosting.
- [X] T062 [US5] Rewrite the two `.sov-card` blocks per research.md §5 / FR-018. Card 1 (`.sov-card--sovereignty`): retitle to `Données clients protégées` with 3 features around minimisation, finalité, durée de conservation. Card 2 (`.sov-card--compliance`): retitle to `Conformité RGPD` with 3 features around documentation claire, accès limités et tracés, exportabilité des données. **MUST NOT** mention `Cloud Act US`, `anti-cloud américain`, `Zero Cloud US`, or `IA souveraine` per FR-019.
- [X] T063 [US5] Rephrase or remove the trust badges in `.sov-badges`: the `🇫🇷 Hébergement France` flag may become `Hébergement européen`; the `Zero Cloud US` badge MUST either be rephrased (`Pas d'export hors UE`) or removed. The RGPD badge stays.

#### FAQ rewrite (FR-025, FR-026, FR-026a, FR-026b)

- [X] T064 [US5] Replace all 5 FAQ items in `src/index.html` (`.faq-item × 5`) per FR-025. Required questions: (1) `Dois-je forcément changer de PMS ?`, (2) `Est-ce compatible avec mon moteur de réservation ?`, (3) `Est-ce adapté à un hôtel de 15 à 40 chambres ?`, (4) `Peut-on commencer sans refaire tout le site ?`, (5) `Combien coûte une modernisation ?`, (6) `Est-ce que l'IA remplace la réception ?`. Either 5 or 6 items — spec requires "at least 5". Keep the `.faq-question` button + `.faq-answer` div structure literal (the JS toggle in main.js binds to it).
- [X] T065 [US5] Write the FAQ answers per FR-026, FR-026a, FR-026b: calibrated wording (`moins de`, `plus de`, `selon votre cas`); vendor-neutral on PMS / OTA / AI provider; **MUST NOT** namedrop `Mistral AI` or `Scaleway Paris` as exclusive endorsements; **MUST NOT** quote `+30 % de satisfaction employé`, `+391 %`, `20 % de rentabilité`, or any absolute statistic without a named source.
- [X] T066 [US5] Rewrite the FAQ section header in `src/index.html` (`.faq-header`): `.faq-tag` stays `Questions Fréquentes`; `.faq-title` may stay `Vos questions, nos réponses` or refine to hotel framing. Trivial.

#### Final CTA section copy (FR-041, FR-042)

- [X] T067 [US5] Rewrite the Final CTA section title in `src/index.html` (`.final-cta-title`) from `Prêt à transformer le chaos opérationnel en machine à profit ?` to a calibrated hotel-framed invitation per FR-041.1 (e.g., `Prêt à clarifier la stack digitale de votre hôtel ?`). Forbidden words: `chaos opérationnel`, `machine à profit`.
- [X] T068 [US5] Rewrite the Final CTA subtitle in `.final-cta-subtitle` from `Découvrez en 30 minutes le potentiel d'automatisation caché dans vos processus actuels.` to a 30-minute hotel-focused conversation per FR-041.2. Forbidden word: `potentiel d'automatisation`.
- [X] T069 [US5] Rewrite the 3 `.final-cta-feature` bullets per FR-041.3: (1) `Diagnostic digital hôtel gratuit et sans engagement`, (2) `Estimation des gains réalistes — heures réception, réservations directes`, (3) `Plan priorisé adapté à la taille de votre hôtel`. Replace the existing wording (`Audit gratuit et sans engagement`, `Estimation chiffrée de vos gains`, `Plan d'action personnalisé`).
- [X] T070 [US5] Rewrite the Final CTA note (`.final-cta-note`) per FR-042: `Réponse sous 24h • Appel de 30 min • 100 % confidentiel` MAY be preserved or lightly rephrased. **MUST NOT** reintroduce `audit` wording.
- [X] T071 [US5] (Crosscheck with T034) The Final CTA button label is `Demander un diagnostic digital hôtel` per FR-041.4. If T034 has already done this, mark as verified.

#### Manual test fill-in

- [X] T072 [US5] Fill in the US5 section of `tests/manual/hotel-pivot-checklist.md` with the FAQ + sécurité + Final CTA verification steps from quickstart.md §9 + §10.

**Checkpoint**: Bottom half of the page is fully reframed. Quickstart §9 passes. All 5 user stories are independently complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Legal-page sync (Principle I, mandatory before any release), grep verification, manual smoke, perf measurement, deploy checklist, and the inbox-rule update.

- [X] T073 [P] Update `src/mentions-legales.html` per Constitution Principle I (Legal sync). Disclose: the new required `typology` field, the optional `rooms` field, the optional `pms_stack` field, and the unchanged Formspree transport. Keep all other legal text untouched.
- [X] T074 [P] Update `src/politique-confidentialite.html` per Constitution Principle I. Add the same disclosures as T073: purpose, legal basis, retention, third-party transport (Formspree, US — disclose its data-transfer mechanism). Keep all other legal text untouched.
- [X] T075 Run the grep verification from quickstart.md §3 against the final state of `src/index.html` and `src/calculator.html`. Expect zero matches. If any match remains, treat as a US1..US5 bug, fix, and re-run.
- [X] T076 Run the full manual checklist `tests/manual/hotel-pivot-checklist.md` end-to-end (US1 → US5 + Polish sections). Tick every box. Document any deferred item (e.g., founder block deferred if photo unavailable) in the checklist Notes.
- [ ] T077 Run Lighthouse on `/` and `/calculator.html` (Mobile, Slow 4G). Append the post-pivot row to `tests/performance/lcp-budget.md`. Verify: LCP ≤ 2.5 s, total JS ≤ 50 KB gz (excluding Plausible), no regression vs the pre-pivot baseline captured in T003.
- [ ] T078 [P] Verify the OG link preview on Facebook Sharing Debugger, LinkedIn Post Inspector, and opengraph.xyz against the staging deploy URL per SC-003. (Local dev won't work — needs a public URL.)
- [ ] T079 [P] Update the studio's email inbox filter rules per quickstart.md "Inbox filter rules" — any rule keying on `Nouvelle demande d'audit` MUST also match `Nouvelle demande de diagnostic`.
- [X] T080 Run `npm run build` from the repo root. Expect zero errors. Manually inspect `dist/index.html` and `dist/calculator.html` to confirm the pivoted content is in the build output (no stale transport phrases).
- [ ] T081 (Post-deploy, 14-day) Capture inbound reply quality per SC-009: at least one inbound reply from the first ≥30-email outreach batch references hotel-specific content (PMS, moteur de réservation, Booking.com, parcours de réservation directe, or the founder's hotel experience). Tag the reply in the studio CRM as `pivot-validation`.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately.
- **Phase 2 (Foundational)**: Depends on Setup. Reading-only, no code touched.
- **Phases 3–7 (User Stories)**: All depend on Phase 2 completion. Within Phase 3..7, stories are **largely independent** because they edit different sections of the same HTML files — except the few shared blocks called out below.
- **Phase 8 (Polish)**: Depends on every desired story being complete. Legal sync (T073, T074) MUST land in the same release as US2 (form schema change) per Constitution Principle I.

### Cross-story file conflicts (same HTML file, different sections — coordinate, do not parallelize at line-level)

- `src/index.html` is edited by every story. Most edits target disjoint section blocks, so concurrent editing is safe **at the section level** but a single contributor working sequentially per story will avoid merge conflicts most cleanly.
- `src/scripts/main.js` is edited only by US2 (T035..T038). No conflict with other stories.
- `src/scripts/calculator.js` is edited only by US3 (T049). No conflict.
- `src/calculator.html` is edited only by US3 (T044..T052). No conflict.
- `src/mentions-legales.html` and `src/politique-confidentialite.html` are edited only in Polish (T073, T074). [P] safe.

### Within each user story

- Setup/meta first (T008, T009 for US1; T026..T032 for US2; T044..T047 for US3; T054 for US4; T061..T063 for US5)
- Then section content
- Then per-story manual-test fill-in (T039, T053, T060, T072)
- Then cross-check tasks marked "(Crosscheck with TXX)"

### Parallel opportunities

- T002, T003 (different files, no dependencies).
- T014, T015 (different new sections in `src/index.html`, but inserted between existing sections — sequence them if both inserts target the same anchor block).
- T044, T045 (different sections of `src/calculator.html`).
- T055, T056 (different sub-blocks of the "Pourquoi nous" section in `src/index.html`).
- T073, T074 (different files).
- T078, T079 (independent external work).

### Cross-story dependencies

- T034 (US2, Final CTA button label) and T071 (US5, Final CTA verification) — T034 does the edit, T071 confirms. If working on US5 before US2 is merged, T071 will fail; sequence US2 before the final read-through of US5.
- T027 (renaming `company` → `hotel` in the HTML) and T035 (updating `main.js` to read `hotel` field) — T035 depends on T027. Same story, sequential.

---

## Parallel Example: Phase 1 Setup

```bash
# Run T001 first (verifies the baseline), then T002 + T003 in parallel:
Task: "Create tests/manual/hotel-pivot-checklist.md scaffold"
Task: "Record pre-pivot LCP baseline in tests/performance/lcp-budget.md"
```

## Parallel Example: US4 Founder section

```bash
# Once T054 (asset) is done, T055 and T056 can proceed in parallel
# because they edit distinct DOM blocks of src/index.html:
Task: "Rewrite the 3 Pourquoi Nous cards (FR-035, FR-036)"
Task: "Rewrite the Pourquoi Nous section header (FR-035 header copy)"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 (Setup) — 30 min.
2. Phase 2 (Foundational reading) — 30 min for one implementer.
3. Phase 3 (US1) — ~2–3 hours.
4. **STOP and VALIDATE** US1 with the quickstart §2 + §3 + §10 checklist. The page already self-identifies as a hotel site, has hotel meta/OG, and exploration CTAs are hotel-framed. **Outreach is technically possible at this point** even without US2..US5 — but US2 (intake form) is also P1 and should not lag the MVP for more than a day.

### Incremental delivery (recommended)

1. Setup + Foundational → 1 hour.
2. US1 + US2 (both P1) → ship together as the **launch release** (~4 hours). At this point the marketing site is coherent, the form converts, and the first outreach batch can start.
3. US3 (ROI calculator) → next minor release (~2 hours). The pain-bridge + ROI preview CTAs already route to the calculator from US1, so directors will be exposed to the un-pivoted calculator until US3 ships. Mitigation: the spec's edge case says either ship US3 with US1, or temporarily disable the exploration CTAs.
4. US4 (founder + Pourquoi nous) → next release (~2 hours, plus founder-asset prep).
5. US5 (FAQ + sécurité + final CTA) → next release (~2 hours).
6. Polish (T073..T081) — landed alongside the release that touches the affected surfaces. Legal sync (T073, T074) MUST land with US2.

### Parallel team strategy

With multiple contributors:

- Contributor A: US1 (hero + sections, owns `src/index.html` top half).
- Contributor B: US2 (form, owns `src/scripts/main.js` + modal block + intake CTAs in `src/index.html`).
- Contributor C: US3 (owns `src/calculator.html` + `src/scripts/calculator.js` + ROI preview block in `src/index.html`).
- Founder: provides photo + bio + LinkedIn URL early (T054) so US4 doesn't block.

Merge conflicts on `src/index.html` are the only real risk; rebase frequently and section-by-section.

---

## Notes

- Tests were not requested in the spec; only manual checklists and the performance baseline are written here. If automated tests are wanted later, add them as a follow-up feature.
- The CSS files (`src/styles/*.css`) and the `vite.config.js` entry-points block are NOT in scope. Any task that wants to touch them is a bug in this plan.
- Plausible event name `Audit Request` is preserved on purpose (legacy comparability). The renamed user-visible CTA labels don't propagate to event names.
- Founder block is conditional on asset availability; the rest of US4 (Pourquoi nous rewrite) ships even if T054 is deferred.
- Legal-page sync (T073, T074) is mandatory before any deploy that includes US2's form schema change.
