# Feature Specification: Marketing Site Hotel Pivot

**Feature Branch**: `002-hotel-marketing-pivot`
**Created**: 2026-05-13
**Status**: Draft
**Input**: User description: "Pivot the Rinzler Studio public marketing site from a 'PME transport & logistique' positioning to 'petits hôtels indépendants' (10–50 chambres, 2–4 étoiles). Keep the existing visual style, layout grid, animations, and section sequence — change the content. Soften absolute claims ('zéro erreur', '100 % des leads', '+391 %', '28 500 $'); replace transport pain points with hotel pain points (réservations directes, tâches répétitives, outils dispersés, décisions coûteuses); add a 'Pour qui' qualifier, a 'Ce que j'analyse' inventory, a 'Pourquoi l'hôtellerie / À propos' founder block with photo and LinkedIn; retune the ROI calculator scenarios to hotel use cases; rewrite the FAQ around PMS, moteur de réservation, OTA, and hôtel de 15 chambres; replace the 'Audit gratuit' CTA with 'Diagnostic hôtel'; update title, meta description, OG/social tags, footer tagline."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Hotel director clicks an outreach email and recognizes the offer is for them (Priority: P1)

A director of a 15–40 room independent hotel receives a cold email pitching a
hospitality modernization diagnostic. They click through to the Rinzler Studio
homepage. Within the first screen — hero headline, sub-headline, hero CTA, and
the first qualifier section — they must understand, without scrolling deep,
that this site is specifically for independent hotels of their size, not for
transport companies, e-commerce, or generic SMEs.

**Why this priority**: This is the entry gate of the entire outreach funnel.
If the hero, qualifier, title, meta description, and footer still read
"Transport & Logistique", every other improvement is wasted because the
director closes the tab before reaching them. This story alone is the
minimum viable pivot — the rest of the page can lag a few hours behind.

**Independent Test**: A reviewer who has never seen the site is given the URL
in an email styled as if from a hospitality consultant. They open the page on
desktop and on mobile. Within 10 seconds and without scrolling past the first
viewport, they can correctly answer the question "Who is this site for?" with
"independent hotels of about 10–50 rooms" — using only the words visible on
the page. The browser tab title and the social-share preview likewise read
hospitality, not transport/logistics.

**Acceptance Scenarios**:

1. **Given** a first-time visitor opens the homepage, **When** the hero
   renders, **Then** the H1, sub-headline, and primary CTA reference
   independent hotels (e.g., "hôtels indépendants", "diagnostic hôtel") and
   contain no remaining mention of "transport", "logistique", "PME générique",
   "facturation 2026", or "Mistral AI" as a hero-level claim.
2. **Given** a visitor scrolls past the hero, **When** the first qualifier
   block appears, **Then** it states the target profile explicitly (room
   range 10–50, indépendants, 2–4 étoiles, petits groupes hôteliers
   indépendants) so a director can immediately self-identify or rule
   themselves out.
3. **Given** the same URL is pasted into a chat client or social network,
   **When** the link preview is generated, **Then** the title, description,
   and OG image describe a hotel modernization offer, not a transport &
   logistique offer.
4. **Given** a director reads the page on a 360 px viewport, **When** they
   reach the hero CTA, **Then** the CTA label reads "Demander un diagnostic
   hôtel" (or the agreed variant) and remains tappable above the fold.

---

### User Story 2 — Hotel director requests a "Diagnostic hôtel" via the form (Priority: P1)

After reading the page, the director wants to engage. The primary call-to-
action no longer says "Audit gratuit" but "Diagnostic hôtel" (or equivalent
hospitality-framed wording). Clicking it opens the request form. The form
asks only the questions that matter for a hotel diagnostic (name, hotel,
contact, room count, current PMS / booking engine if known, short note).
Submitting it produces a clear confirmation and routes the request to the
studio inbox.

**Why this priority**: The form is the only conversion path on the site. If
it still uses "Secteur d'activité = Transport / Commerce / Industrie / …",
or asks for "Entreprise" instead of "Hôtel", the conversion feels off-topic
and trust drops at the most fragile step of the funnel.

**Independent Test**: A reviewer follows any CTA on the page. The form that
opens uses hospitality vocabulary ("Hôtel", "Nombre de chambres"), has no
dropdown options unrelated to hospitality, and a successful submission shows
a confirmation message that references a hotel diagnostic and a 24 h response
window.

**Acceptance Scenarios**:

1. **Given** a director clicks any of the page's primary CTAs (header,
   hero, pain-bridge, ROI preview, final CTA), **When** the form opens,
   **Then** the modal title, sub-title, and submit button reference a
   "Diagnostic hôtel" — not "Audit gratuit" — and the form fields are
   hotel-appropriate (Nom, Hôtel, Email, Téléphone, Nombre de chambres,
   PMS / moteur de réservation actuels (optionnel), Message).
2. **Given** the form opens, **When** the "Secteur" field renders (if it
   remains at all), **Then** it is either removed, locked to "Hôtellerie",
   or replaced by a hotel-typology selector (Indépendant, Petit groupe
   indépendant, Hôtel-restaurant, Maison d'hôtes).
3. **Given** the director submits a valid form, **When** the request is
   accepted, **Then** the confirmation explicitly references a hotel
   diagnostic ("Nous reviendrons vers vous sous 24 h pour planifier votre
   diagnostic hôtel.") and a copy of the request reaches the studio's
   intake channel.

---

### User Story 3 — Hotel director estimates impact in the ROI calculator using hotel scenarios (Priority: P2)

The visitor opens the ROI calculator (preview on the homepage or the full
page at `/calculator.html`) and is offered hotel-specific scenarios rather
than generic SME scenarios. They pick a scenario such as "Réponses aux
emails clients" or "Demandes Booking.com / OTA", adjust a couple of inputs
that make sense for a hotel (chambres, occupation moyenne, temps passé par
demande, coût horaire de la réception), and see an estimated monthly gain.

**Why this priority**: The calculator is the most-clicked secondary CTA on
the current site. Hotel scenarios make the number believable; generic SME
scenarios make it feel like marketing math. Useful but not blocking — a
director can still convert via the form without ever touching the
calculator.

**Independent Test**: A reviewer opens the calculator from the homepage,
selects a hotel scenario from the scenario list, changes one input, and the
result updates instantly with a label and units that make sense for a hotel
(e.g., "Heures récupérées à la réception / mois", "Réservations directes
récupérées estimées / mois").

**Acceptance Scenarios**:

1. **Given** the calculator is loaded, **When** the visitor reviews the
   scenario list, **Then** the scenarios are hotel-specific and include at
   least: Réponses aux emails clients, Demandes Booking.com / OTA, Questions
   répétitives avant arrivée, Mise à jour du site / contenus, Suivi des
   réservations directes, Reporting direction.
2. **Given** the visitor changes any numeric input, **When** the field
   loses focus or the slider settles, **Then** the result recomputes with no
   page reload and the units in the result match the chosen scenario.
3. **Given** the visitor lands on the homepage ROI preview, **When** they
   read the labels, **Then** at least one default value or label references
   hotel reality (e.g., "Demandes clients par semaine", "Coût horaire
   réception"), not "Employés concernés".

---

### User Story 4 — Hotel director reads "Pourquoi l'hôtellerie" and trusts the founder (Priority: P2)

Hotel directors buy from operators they trust. The visitor reaches a dedicated
block on the homepage that explains why Rinzler Studio focuses on independent
hotels: the founder works in an independent hotel near Paris, sees the front-
desk constraints firsthand, and built the offer around that experience. The
block shows a portrait, a short bio, a LinkedIn link, and a location.

**Why this priority**: The biggest objection in outreach is "another generic
AI/automation vendor". A short founder block with a photo and a verifiable
LinkedIn link is the cheapest, highest-leverage trust signal we can add.
Valuable but not absolutely blocking — the page is still coherent without
it, just less convincing.

**Independent Test**: A reviewer scrolls through the homepage and finds a
"Pourquoi l'hôtellerie" / "À propos" block that includes (a) a photo of
Sviatoslav Saraev, (b) a 3–5 line bio mentioning hands-on hotel experience
near Paris, (c) a working LinkedIn link, and (d) a location line
(Paris / Île-de-France). Tabbing through with a keyboard reaches the
LinkedIn link with a visible focus state.

**Acceptance Scenarios**:

1. **Given** the homepage renders, **When** the visitor reaches the
   founder block, **Then** they see a portrait image, the founder's name
   and role, a short bio referencing hands-on work in an independent hotel
   near Paris, and a LinkedIn link that opens the correct profile in a new
   tab.
2. **Given** images fail to load, **When** the founder block renders,
   **Then** the portrait has descriptive alt text ("Sviatoslav Saraev,
   fondateur de Rinzler Studio") and the block remains coherent.

---

### User Story 5 — Hotel director skims the FAQ and feels they don't have to "change everything" (Priority: P3)

A director's top objection on a discovery call is usually "I don't want to
change my PMS" or "my booking engine is fine for now". The FAQ on the
homepage addresses these objections head-on: it is rewritten around hotel
worries (PMS, moteur de réservation, OTA, hôtel de 15 chambres, démarrer
sans refonte de site, emails répétitifs) rather than generic worries
(complexity, headcount replacement, sector applicability).

**Why this priority**: Useful for reassurance but not on the critical path
— directors who reach the FAQ are already engaged. A director can still
convert without reading it.

**Independent Test**: A reviewer reads each FAQ question and answer pair.
Every question is one a hotel director would plausibly ask; no question
remains framed in transport, logistics, or generic SME terms.

**Acceptance Scenarios**:

1. **Given** the FAQ section is rendered, **When** the visitor reads the
   questions, **Then** the questions are hotel-specific and cover at least:
   "Dois-je forcément changer de PMS ?", "Est-ce compatible avec mon
   moteur de réservation ?", "Est-ce adapté à un hôtel de 15–40 chambres ?",
   "Peut-on commencer sans refaire tout le site ?", "Combien coûte une
   modernisation ?", "Est-ce que l'IA remplace la réception ?".
2. **Given** the visitor expands an FAQ item, **When** they read the
   answer, **Then** the answer avoids absolute claims ("zéro", "100 %",
   "+391 %") and instead uses calibrated wording ("moins de", "plus de",
   "selon votre cas").

---

### Edge Cases

- **Old transport copy still cached**: A visitor returning from an earlier
  session may load a stale CSS/HTML cache that still shows transport
  language. Page versioning (cache-busting on the affected files) MUST
  ensure the visitor sees the hotel version on next reload.
- **Outreach link with UTM parameters**: A visitor lands via
  `?utm_source=outreach-hotel&utm_campaign=...`. The page MUST render the
  hotel version unconditionally; there is no segmented A/B copy in v1.
- **Visitor from a transport background** (legacy referral, old bookmark):
  The page no longer pitches transport. They land on a hotel-focused page;
  this is acceptable — no transport landing is preserved in v1. The footer
  and meta description make the new focus unambiguous.
- **Director shares the URL with a colleague** via WhatsApp / Slack: The
  link preview (OG image, title, description) MUST render hotel framing,
  not transport framing.
- **Portrait image missing or slow to load**: The founder block MUST
  remain readable; the bio text and LinkedIn link are independent of the
  image asset.
- **Visitor on a slow 3G connection (rural property)**: The hero MUST
  remain readable before the hero video downloads; text and CTA MUST not
  depend on the video being loaded.
- **Print / PDF "save as"**: A director may save the page to share
  internally. The print stylesheet (if any) MUST not reintroduce transport
  copy through hidden default text.
- **Reservation engine / PMS names mentioned in FAQ**: The FAQ MUST be
  vendor-neutral (no exclusive endorsement of one PMS or booking engine);
  generic phrasing only.
- **Sector dropdown left in the form**: If the multi-sector dropdown is
  preserved instead of removed, it MUST default to "Hôtellerie" and MUST
  NOT default to "Transport".
- **Existing pages `mentions-legales.html` and `politique-confidentialite.html`**:
  These MUST still be linked from the footer and their legal text MUST
  remain valid — they are not part of the pivot but must not be broken.
- **Calculator deep-link `/calculator.html`**: A visitor who lands on the
  calculator page directly (e.g., from a saved bookmark) MUST see hotel
  scenarios; the calculator is reachable without first passing the home
  page.
- **Calculator page partially shipped**: If the homepage pivot ships
  before the calculator page is rewritten, a director arriving via the
  exploration CTA (pain bridge or ROI preview) would land on a still-
  generic calculator. To avoid that mismatch, FR-037 to FR-040
  (calculator page) MUST ship in the same release as the homepage
  pivot, or the exploration CTA on `/` MUST be temporarily disabled.
- **À propos block without founder assets**: If the portrait photo,
  bio text, or LinkedIn URL is not ready at release time, the founder
  block MUST be deferred (not shipped with placeholder content). The
  rest of the pivot MAY ship without it; the page remains coherent
  per SC-007's conditional ("when inline on the homepage").

## Clarifications

### Session 2026-05-13

- Q: Pivot surface — pivot `/` only, dedicated `/hotellerie-independante` only, or both? → A: Pivot `/` only for v1; no `/hotellerie-independante` page.
- Q: Sécurité section treatment — keep current souveraineté framing, soften to RGPD-only hotel framing, or remove entirely? → A: Soften to RGPD-only hotel framing (2 cards retained, content rewritten — "Données clients protégées / Hébergement européen / Accès limités / Documentation claire").
- Q: À propos location — inline on `/`, dedicated `/a-propos` page, or both? → A: Inline only on `/` for v1; no `/a-propos` page.
- Q: Final CTA canonical wording — "Diagnostic hôtel", "Diagnostic digital hôtel", "Diagnostic modernisation hôtel", or "Diagnostic numérique hôtel"? → A: "Diagnostic digital hôtel" (canonical). Short form "Diagnostic" allowed where space is tight (header CTA, mobile menu). Method step 1 title becomes "Diagnostic digital hôtel".
- Q: Sector dropdown — remove entirely, replace with a hospitality typology selector, or lock to a single read-only value? → A: Replace with a hospitality typology selector (Hôtel indépendant / Petit groupe hôtelier / Hôtel-restaurant / Maison d'hôtes), required field. Doubles as trust signal and lead-segmentation field.

### Terminology

- **Diagnostic digital hôtel** is the canonical name of the primary
  CTA (resolved per Session 2026-05-13). It replaces every instance
  of "Audit gratuit" / "Audit Gratuit" / "Audit d'efficacité" in the
  user-facing copy. The short form **"Diagnostic"** is permitted only
  where space is tight (header CTA on desktop and mobile, mobile-menu
  CTA, breadcrumb/back-link contexts). All other surfaces (hero CTA,
  modal title, submit button, Final CTA button, exploration CTA
  labels per FR-027b, confirmation message, footer mentions) MUST
  use the full "Diagnostic digital hôtel" wording. Internal
  documentation and analytics event names MAY keep the legacy
  `audit-*` identifiers as long as the rendered label is the new
  one.
- **Director / Directeur** is the canonical persona for visitor-facing
  copy. The acceptance scenarios use "director" interchangeably to mean
  any decision-maker of an independent hotel (owner, gérant, directeur).
- **Petits hôtels indépendants** is defined for this spec as: independent
  ownership (no large chain), 10 to 50 rooms, 2 to 4 stars, located in
  France. Petits groupes hôteliers indépendants (2–5 properties under one
  owner) are explicitly in scope.

### Open Questions

The three OQs below significantly affected scope or user experience.
All three have been **resolved** in the 2026-05-13 clarification
session above; this block is preserved as a decision log. Their
resolutions are also propagated into the relevant functional
requirements (FR-018, FR-020, FR-031).

- **OQ-1 — Pivot surface**: ✅ **Resolved (Session 2026-05-13)** —
  v1 pivots `/` only. No `/hotellerie-independante` landing page in v1;
  outreach emails link directly to `/`. A dedicated page may be added
  later as an SEO play, but it is out of scope here.
- **OQ-2 — Sécurité tone**: ✅ **Resolved (Session 2026-05-13)** —
  Soften to RGPD-only hotel framing. The two-card structure and styling
  are preserved; content is rewritten around guest-data protection,
  European hosting, restricted access, and clear documentation. Cloud
  Act US / Zero Cloud US / IA souveraine framings are removed from the
  homepage.
- **OQ-3 — À propos surface**: ✅ **Resolved (Session 2026-05-13)** —
  Inline only on the homepage `/` for v1. No dedicated `/a-propos`
  page is published; no extra header link is added. A standalone
  `/a-propos` page may be considered later but is out of scope here.

## Requirements *(mandatory)*

### Functional Requirements

#### Positioning & Meta

- **FR-001**: The homepage `<title>` MUST reference independent hotels
  (e.g., "Rinzler Studio | Modernisation digitale pour hôtels indépendants")
  and MUST NOT contain "Transport", "Logistique", or "PME générique".
- **FR-002**: The homepage `<meta name="description">`, the OG tags
  (`og:title`, `og:description`, `og:image`), and any Twitter card tags
  MUST describe a hotel modernization offer.
- **FR-003**: The footer tagline MUST read "Modernisation digitale pour
  hôtels indépendants" (or the agreed variant) and MUST NOT read
  "Automatisation & IA pour Transport & Logistique".
- **FR-004**: The `<meta name="keywords">` MUST be updated to hospitality
  terms (e.g., "hôtellerie", "hôtel indépendant", "PMS", "moteur de
  réservation", "réservation directe", "Booking.com", "modernisation
  digitale").

#### Hero

- **FR-005**: The hero H1 MUST be replaced with hospitality wording.
  Default text: **"Modernisation digitale pour petits hôtels
  indépendants"**.
- **FR-006**: The hero sub-headline MUST describe the offer in hotel
  terms (clarifier la stack digitale, réduire les tâches manuelles,
  améliorer les réservations directes, approche progressive et chiffrée)
  and MUST NOT mention transport, Mistral AI, or souveraineté at the
  hero level.
- **FR-007**: The hero primary CTA label MUST read **"Demander un
  diagnostic digital hôtel"** (per the canonical wording locked in
  Clarifications Session 2026-05-13) and MUST anchor or open the
  form, not a generic audit page.
- **FR-008**: An optional secondary hero CTA, if kept, MUST read
  **"Voir les points analysés"** and MUST scroll to the "Ce que
  j'analyse" block (FR-013).

#### Qualifier & Inventory (new sections)

- **FR-009**: The page MUST include a "Pour qui" qualifier section
  immediately below the hero, listing the target profiles: hôtels
  indépendants 2/3/4 étoiles, 10 à 50 chambres, petits groupes
  hôteliers indépendants, hôtels avec un site correct mais un parcours
  de réservation perfectible, directions souhaitant comprendre les
  coûts avant de changer PMS / moteur de réservation / site.
- **FR-010**: The "Pour qui" section MUST be visually consistent with
  existing section styling (uses the same tokens, spacing, and headings
  as adjacent sections — no new visual vocabulary).
- **FR-013**: The page MUST include a "Ce que j'analyse" inventory
  section listing the diagnostic perimeter: Site web, Moteur de
  réservation, PMS, Channel manager, Emails clients, Demandes
  Booking.com / OTA, FAQ et informations avant arrivée, Tracking /
  analytics, Coûts logiciels mensuels, Tâches répétitives à la
  réception. Items MUST be presented as a scannable list, not prose.

#### Pain Bridge

- **FR-011**: The four pain cards MUST be rewritten to address hotel
  pains. Required topics, in order or equivalent:
  1. **Réservations directes** — "Votre site est correct, mais le
     parcours de réservation peut encore freiner certains clients."
  2. **Tâches répétitives** — "Votre équipe répond souvent aux mêmes
     questions par email, téléphone ou Booking.com."
  3. **Outils dispersés** — "Site, PMS, moteur de réservation, channel
     manager et emails ne travaillent pas toujours ensemble."
  4. **Décisions coûteuses** — "Changer de PMS, refaire un site ou
     ajouter une automatisation demande une estimation claire du coût
     et du ROI."
- **FR-012**: Pain cards MUST NOT carry the legacy statistics
  "28 500 $", "+391 %", "9+ h", "43 %", or "15 € amende par facture
  dès 2026". Any preserved metric MUST be qualitative or clearly
  attributed.

#### Method (3 steps)

- **FR-014**: The three method steps MUST be retitled to hotel-fit
  wording:
  1. **Diagnostic digital hôtel** — analyse du site, du moteur de
     réservation, des outils et des tâches répétitives.
  2. **Plan priorisé** — estimation des coûts, bénéfices, complexité
     et ordre de mise en œuvre.
  3. **Implémentation progressive** — MVP, automatisation ciblée,
     amélioration du site ou intégration d'outils selon le ROI.
- **FR-015**: The supporting copy and bullets under each step MUST be
  rewritten to reflect hotel reality (front desk, OTA, moteur de
  réservation, parcours de réservation directe). The existing visual
  layout, scrollytelling animation, and step indicator MUST be
  preserved unchanged.

#### Before / After

- **FR-016**: The "Avant / Après" comparison MUST be rewritten to hotel
  reality. Required items:
  - **Avant**: Questions répétitives traitées manuellement, Réservations
    directes difficiles à mesurer, Outils séparés, Mises à jour du
    site lentes, Coûts logiciels peu lisibles.
  - **Après**: Réponses plus rapides, Parcours de réservation clarifié,
    Outils mieux connectés, Processus documentés, Décisions basées sur
    coûts, temps gagné et ROI.
- **FR-017**: The before/after section MUST NOT contain absolute claims
  ("Zéro erreur", "100 % des leads traités"). Calibrated wording only.

#### Souveraineté & Sécurité

- **FR-018**: The "Souveraineté & Sécurité" section MUST be reworked
  for a hotel audience (resolved per OQ-2): the two existing cards
  are preserved structurally; their content is rewritten around
  guest-data protection — recommended pillars: "Données clients
  protégées", "Hébergement européen", "Accès limités et tracés",
  "Documentation claire RGPD". The section tag and title MUST be
  retitled away from "Souveraineté & Sécurité" toward a hotel-
  relevant framing (e.g., "Protection des données clients").
- **FR-019**: The section MUST NOT centre the message on "Cloud Act
  US", "anti-cloud américain", "Zero Cloud US", or "IA souveraine"
  as the primary value proposition for hotel visitors. The current
  trust badges "Zero Cloud US" and the "🇫🇷 Hébergement France"
  flag MAY be retained only if rephrased neutrally
  ("Hébergement européen") and demoted below the two main cards.

#### "Pourquoi nous" 3-card section (existing)

- **FR-035**: The existing "Pourquoi Nous" section's three cards
  (currently titled *Business-First*, *Méthodologie MVP*,
  *Partenariat Long-Terme*) MUST be rewritten so each card
  speaks to an independent-hotel director. Required angles, in
  order or equivalent:
  1. **Connaissance terrain de l'hôtellerie indépendante** —
     l'offre est conçue à partir d'une expérience opérationnelle
     en hôtel indépendant (réception, OTA, parcours client) et
     non d'une grille générique PME.
  2. **MVP adapté aux petits hôtels** — un premier livrable
     concret en quelques semaines (script email, page de
     réservation directe, automatisation ciblée), pas un grand
     projet PMS de douze mois.
  3. **Accompagnement sur la durée** — relation continue avec la
     direction, transfert de compétences à l'équipe de réception,
     évolution des outils selon l'occupation et la saisonnalité.
- **FR-036**: The three cards MUST reuse the existing card
  styling, icon-glass component, and grid. The supporting bullet
  list under each card MUST be rewritten with hotel vocabulary
  (réception, OTA, moteur de réservation, occupation, saisonnalité,
  parcours direct) and MUST NOT mention CRM, ERP, "outils métier"
  in the generic SME sense.

#### "Pourquoi l'hôtellerie / À propos" founder block (new)

- **FR-020**: The homepage MUST include an inline "Pourquoi
  l'hôtellerie / À propos" founder block (resolved per OQ-3 —
  inline on `/`, no `/a-propos` page in v1) containing: founder
  name (Sviatoslav Saraev), role (Fondateur de Rinzler Studio),
  a short bio (3–5 lines) explicitly stating hands-on work in an
  independent hotel near Paris, a portrait image, a LinkedIn link
  (opens in a new tab), and a location line (Paris / Île-de-France).
  The block MUST sit between the "Pourquoi nous" 3-card section
  (FR-035) and the ROI Calculator preview, or in an equivalent
  position that keeps it above the fold of a mid-page scroll.
- **FR-021**: The portrait image MUST have descriptive alt text and
  MUST degrade gracefully (block remains readable when the image is
  blocked or fails to load).

#### ROI Calculator

- **FR-022**: The homepage ROI preview and the full calculator at
  `/calculator.html` MUST offer hotel-specific scenarios. Minimum
  scenario set: Réponses aux emails clients, Demandes Booking.com /
  OTA, Questions répétitives avant arrivée, Mise à jour du site /
  contenus, Suivi des réservations directes, Reporting direction.
- **FR-023**: Default input labels and units MUST reflect hotel
  reality (e.g., "Nombre de chambres", "Demandes clients par
  semaine", "Temps moyen par demande", "Coût horaire réception")
  instead of generic "Employés concernés / Heures par tâche /
  Fréquence / Coût horaire" — where the underlying math is preserved,
  only the labels and default values change.
- **FR-024**: Result wording MUST be hotel-flavoured (e.g., "Heures
  récupérées à la réception / mois", "Économies estimées / mois") and
  MUST NOT regress to generic SME phrasing.

#### Calculator page (`/calculator.html`)

- **FR-037**: The standalone calculator page MUST be pivoted to
  the hotel framing on the same release as the homepage. The page
  `<title>`, `<meta name="description">`, and
  `<meta name="keywords">` MUST reference hotel-specific
  modernization and reservation use cases (e.g., "Calculateur
  ROI Hôtel | Rinzler Studio") and MUST NOT retain the current
  "Calculateur ROI Automatisation" generic wording.
- **FR-038**: The calculator hero (`.calc-hero-title`,
  `.calc-hero-subtitle`) MUST reference hotel reality —
  recommended: "Estimez les gains digitaux pour votre hôtel" /
  "Évaluez en quelques minutes les heures économisées à la
  réception et les réservations directes potentielles."
- **FR-039**: The full calculator's input field labels and the
  associated tooltip copy MUST be aligned with the hotel scenarios
  from FR-022 / FR-023 (Nombre de chambres, Demandes clients par
  semaine, Temps moyen par demande, Coût horaire réception, Taux
  d'occupation moyen, etc.). The underlying scenario object keys
  in the script MAY remain unchanged to preserve calculation
  parity; only labels, default values, and tooltips change.
- **FR-040**: The calculator page header CTA MUST follow
  FR-027a (header short form "Diagnostic", routing to the intake
  form on `/`). A second CTA at the bottom of the calculator
  page, if present, MUST use the full canonical "Diagnostic
  digital hôtel" wording. The calculator page footer tagline MUST
  follow FR-003.

#### FAQ

- **FR-025**: The FAQ section MUST be replaced with at least 5 hotel-
  specific question/answer pairs covering: changer de PMS, moteur de
  réservation actuel, hôtel de 15–40 chambres, commencer sans refaire
  le site, coût d'une modernisation, IA et réception.
- **FR-026**: FAQ answers MUST avoid absolute claims and MUST use
  calibrated wording ("moins de", "plus de", "selon votre cas").
- **FR-026a — Vendor-neutral FAQ**: FAQ answers MUST be
  vendor-neutral on PMS, booking engines, OTAs, AI providers, and
  hosting. They MUST NOT namedrop a specific vendor as the
  product's secret sauce. Concretely, the current security
  answer's reference to "Mistral AI" and "Scaleway Paris" MUST be
  replaced with generic phrasing ("hébergement européen",
  "fournisseurs IA conformes RGPD", "accès restreints et
  documentés"). Vendor names MAY appear in a neutral list (e.g.,
  "compatible avec Mews, Cloudbeds, Misterbooking, Asterio…")
  only when the answer is *which PMS we work with*, never as an
  exclusive endorsement.
- **FR-026b — Hero / FAQ alignment**: The FAQ MUST NOT
  reintroduce hero-level disallowed wording. In particular, no
  FAQ answer may quote "+30 % de satisfaction employé", "+391 %",
  "20 % de rentabilité", or any other absolute statistic without a
  named source.

#### Final CTA and Form

- **FR-027a — Intake CTAs**: The intake CTAs (header CTA, hero
  primary CTA, final-CTA section button, mobile-menu CTA) MUST
  resolve to the intake form (current anchor `#audit-booking`,
  no path change required). The hero primary CTA, final-CTA
  button, and modal-opened submit button MUST use the canonical
  label "Diagnostic digital hôtel" (or "Demander un diagnostic
  digital hôtel" where verb+object framing is needed). The
  header CTA and mobile-menu CTA MAY use the short form
  "Diagnostic" alone for space. These CTAs MUST NOT carry the
  legacy "Audit Gratuit" / "Réserver Mon Audit Gratuit
  d'Efficacité" wording on either `/` or `/calculator.html`.
- **FR-027b — Exploration CTAs**: The pain-bridge CTA and the
  homepage ROI preview CTA MAY continue to route to
  `./calculator.html` (the exploration path). Their labels MUST
  be hotel-framed (e.g., "Estimer mes gains hôtel", "Calcul
  détaillé pour mon hôtel") and MUST NOT use the generic
  "potentiel d'automatisation" wording. The CTA at the bottom of
  the calculator page MUST route to the intake form per FR-027a.
- **FR-028**: The intake form modal title, sub-title, submit-button
  label, and confirmation message MUST reference a hotel diagnostic
  rather than a generic audit.
- **FR-029**: The form fields MUST be hotel-appropriate: Nom complet
  (required), Hôtel (required, replaces "Entreprise"), Email
  (required), Téléphone (required), Nombre de chambres (optional),
  PMS / moteur de réservation actuels (optional, free text), Message
  (optional, hospitality-flavoured placeholder).
- **FR-030**: The "Secteur d'activité" dropdown MUST be replaced
  by a hospitality typology selector (resolved per Clarifications
  Session 2026-05-13). The selector MUST be a required field with
  exactly these four options, in this order: Hôtel indépendant,
  Petit groupe hôtelier, Hôtel-restaurant, Maison d'hôtes. The
  field label MUST read "Typologie d'établissement" (or
  equivalent hotel-framed label). It MUST NOT include "Transport &
  Logistique", "Commerce & Distribution", "Services aux
  entreprises", "Industrie & Production", "Santé & Médical", or
  "Autre". No catch-all "Autre" option is offered in v1 — visitors
  outside these four types are not the target persona.
- **FR-041 — Final CTA section copy**: The Final CTA section
  title, subtitle, three feature bullets, and primary button
  label MUST be rewritten for hotel framing. The current copy
  ("Prêt à transformer le chaos opérationnel en machine à
  profit ?", "Découvrez en 30 minutes le potentiel
  d'automatisation caché dans vos processus actuels.", "Audit
  gratuit et sans engagement", "Estimation chiffrée de vos
  gains", "Plan d'action personnalisé", button label "Calculer
  Mon Potentiel d'Automatisation") MUST be replaced. Required
  shape:
  1. Title — invitation to a hotel diagnostic (calibrated, no
     "machine à profit" / "chaos opérationnel" wording).
  2. Subtitle — 30-minute hotel-focused conversation, no jargon.
  3. Three bullets — diagnostic digital hôtel gratuit et sans
     engagement, estimation des gains réalistes (heures
     réception, réservations directes), plan priorisé adapté à
     la taille de l'hôtel.
  4. Button label — same as the hero intake CTA ("Demander un
     diagnostic digital hôtel").
- **FR-042 — Final CTA note**: The supporting note line
  ("Réponse sous 24h • Appel de 30 min • 100 % confidentiel")
  MAY be preserved or lightly rephrased. It MUST NOT reintroduce
  "audit" wording.

#### Pivot Surface

- **FR-031**: The pivot MUST land on the public homepage `/` and
  on `/calculator.html` (per FR-037 – FR-040), and **only** on
  those two pages in v1. No dedicated `/hotellerie-independante`
  landing page is published in v1 (resolved per OQ-1). No
  transport-themed alternative landing page is preserved.
- **FR-032**: The pages `mentions-legales.html` and
  `politique-confidentialite.html` MUST remain reachable from the
  footer and MUST remain legally valid; their text is out of scope
  for the pivot.

#### Style preservation

- **FR-033**: The pivot MUST reuse the existing CSS tokens, fonts,
  spacing scale, gradient palette, and animation timings. No new
  visual components are introduced; new sections (Pour qui, Ce que
  j'analyse, À propos inline) reuse the styling vocabulary of
  adjacent sections.
- **FR-034**: The hero video, the workflow video, and the platforms
  icon row MAY remain as is. If the platforms row is kept, the icon
  set MUST be reviewed so that any icon that signals transport/logistics
  in particular (none currently identified) is removed.

### Key Entities

Not applicable — this feature is a content and positioning change
to an existing static marketing site. No new persistent data is
introduced. The only entity touched is the existing intake form
submission, whose schema is updated by FR-029 / FR-030 but whose
storage and routing are unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor on desktop or mobile can correctly
  state "this site is for independent hotels of ~10–50 rooms" within
  10 seconds of page load, using only words visible above the fold.
  Validated with 5 unprompted reviewers; ≥ 4 of 5 must answer
  correctly.
- **SC-002**: After the pivot is live, zero occurrences of the
  following phrases remain in the rendered homepage and
  `/calculator.html` copy (excluding `mentions-legales.html` and
  `politique-confidentialite.html`, whose legal text is out of
  scope):
  - "Transport", "Logistique", "PME transport & logistique"
  - "Mistral AI", "Scaleway Paris" as hero-level or trust-block
    name-drops (a neutral mention in a vendor list is acceptable
    per FR-026a)
  - "Débloquez 20 % de Rentabilité", "Réduction de 20 % des
    Coûts", "20 % de Rentabilité"
  - "+391 %", "28 500 $", "9+ h perdues par semaine", "43 %", and
    "15 € amende par facture dès 2026"
  - "facturation 2026" as a sales hook
  - "Zéro erreur", "100 % des leads traités", "+30 % de
    satisfaction employé"
  - "chaos opérationnel", "machine à profit", "potentiel
    d'automatisation"
  - "Audit Gratuit", "Audit gratuit", "Réserver Mon Audit",
    "Calculer Mon Potentiel d'Automatisation"
  Verification: grep the deployed HTML, CSS, and JS bundles
  served from `/` and `/calculator.html` for each phrase; expect
  zero matches.
- **SC-003**: The OG / social link preview of `/` displays a
  hospitality-framed title and description on at least three
  inspection tools (Facebook Sharing Debugger, LinkedIn Post
  Inspector, a generic OG preview such as opengraph.xyz).
- **SC-004**: 100 % of intake CTAs on the homepage and on
  `/calculator.html` resolve to the same intake form and render
  the canonical "Diagnostic digital hôtel" label, with
  "Diagnostic" permitted only in the header CTA and the
  mobile-menu CTA. Exploration CTAs (pain bridge, ROI preview)
  route to `/calculator.html` with hotel-framed labels per
  FR-027b. Verified by manual click-through on header, hero,
  pain-bridge, ROI preview, final CTA, and the calculator-page
  header CTA on both desktop and mobile.
- **SC-005**: The ROI calculator (`/calculator.html` and the
  homepage preview) presents at least 6 hotel-specific scenarios
  with hotel-flavoured input labels and result units.
- **SC-006**: The FAQ contains at least 5 hotel-specific
  question/answer pairs and zero questions framed in transport,
  logistics, or generic SME terms.
- **SC-007**: The "Pourquoi l'hôtellerie / À propos" block, when
  inline on the homepage, contains a portrait image with descriptive
  alt text, a working LinkedIn link to the founder's profile, and a
  location line. Tabbing reaches the LinkedIn link with a visible
  focus ring.
- **SC-008**: Page load on a simulated Slow 3G connection (Chrome
  DevTools) keeps the hero H1, sub-headline, and primary CTA
  readable and tappable within 3 seconds, with no dependency on
  the hero video having loaded.
- **SC-009**: First outreach batch (≥ 30 emails) sent after the
  pivot yields at least one inbound reply that explicitly references
  hotel-specific content from the site (PMS, moteur de réservation,
  Booking.com, parcours de réservation directe, or the founder's
  hotel experience) — evidence that the new positioning is
  perceived. Measured 14 days after pivot launch.

## Assumptions

- The visual style, layout, animations, fonts, gradient palette,
  and overall vibe of the existing site are kept. Only content
  (text, images, scenario sets, FAQ items, form labels, meta tags)
  changes. No visual redesign is in scope.
- The site remains a static set of HTML/CSS/JS pages hosted on
  o2switch (per `[[deploy_o2switch_cloudlinux]]` notes) and built
  with the existing tooling. The pivot does not add a CMS, a backend,
  or a build-system change.
- The intake form continues to route to the same studio inbox /
  endpoint as today; only labels, dropdown options, and an added
  optional field ("Nombre de chambres", "PMS / moteur de réservation
  actuels") change.
- The founder will provide a portrait photo, a confirmed LinkedIn
  URL, and a 3–5 line bio for the À propos block. If these are not
  yet available at implementation time, the block is deferred
  rather than launched with placeholder content.
- French is the sole content language for v1. No English variant
  is shipped; the existing site is French and the outreach is to
  French independent hotels.
- The audit platform under `audit/` (built by feature 001) is a
  separate product from this public marketing site and is not
  affected by this pivot. Cross-links between the two, if added,
  are out of scope for v1.
- Analytics (Plausible) keeps its existing event taxonomy where
  feasible; CTA labels change, but `data-cta-id` values may keep
  their legacy strings to preserve historical comparability.
- Cache-busting for the affected files (HTML, CSS, JS) is handled
  by the existing deployment process; no special infrastructure
  work is required to roll out the pivot.
- "Diagnostic digital hôtel" is the canonical CTA wording
  (locked in Clarifications Session 2026-05-13). "Diagnostic"
  alone is the permitted short form in space-constrained
  surfaces. The underlying intent — a hotel-specific, free,
  scoped diagnostic of the digital stack — is fixed.
- The pivot is intended to ship as a "fast version in 1–2 hours of
  copy work" before the first 30-email outreach batch; perfectionism
  on copy is explicitly deprioritized over getting a coherent
  hotel-framed page in front of directors.
- Two pages are in scope for v1: the homepage `/` (`src/index.html`)
  and the calculator page `/calculator.html`. Legal pages
  (`mentions-legales.html`, `politique-confidentialite.html`) are out
  of scope; the audit platform under `audit/` (feature 001) is a
  separate product and unaffected.
- The platforms icon row in the method section (n8n, Mistral, OpenAI,
  Notion, Slack, WhatsApp, HubSpot, OVH) is reviewed but not
  reordered for v1; it remains as is unless a specific icon contradicts
  the hotel framing. The Mistral icon stays in the row even though
  the *Mistral AI* namedrop is removed from hero copy and FAQ — the
  icon is a tool affiliation, not a hero-level claim.
