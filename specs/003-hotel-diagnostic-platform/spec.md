# Feature Specification: Hotel Diagnostic Platform

**Feature Branch**: `003-hotel-diagnostic-platform`
**Created**: 2026-05-17
**Status**: Draft
**Input**: User description: "Evolve the current audit tool into Rinzler Hotel Diagnostic — a decision-support platform for independent hotels that automatically scans a hotel's digital presence, runs a dynamic adaptive questionnaire with voice input, draws from a structured hotel-technology vendor database, and produces multi-scenario recommendations, impact estimates, compliance review, funding-readiness preparation, and a 30 / 60 / 90-day roadmap, in both self-service and consultant-assisted modes. Specify the full project — no staging, no MVP scoping."

## User Scenarios & Testing *(mandatory)*

User stories below are ordered P1 → P3 to indicate **relative importance to the product's value proposition**, not delivery sequencing. The full project is in scope. Each story is independently testable in the sense that its acceptance criteria can be verified on their own once the supporting data exists.

### User Story 1 — Automated External Diagnostic from URL Only (Priority: P1)

A hotel owner or manager opens the platform's landing page, enters only their website URL, and within minutes receives a structured initial diagnostic of their visible digital presence — without having answered a single question. The diagnostic surfaces concrete observations the hotelier can verify themselves: where the "Book" button goes, whether the hotel's information is structured in a way AI-driven search can interpret, whether the booking path creates friction on mobile, which guest-communication channels are visible, and which hotel-technology providers can be inferred from the visible site. The output is presented in plain language with a small number of quick wins they could act on immediately, and a clear invitation to continue into the deeper guided audit.

**Why this priority**: This is the only feature that produces value before the hotelier invests any effort. It is the platform's hook, the validation that the platform "can already see something useful," and the data primer every later step builds on (pre-filling the questionnaire, narrowing the vendor matcher, calibrating scoring).

**Independent Test**: An anonymous visitor enters a hotel website URL on the landing page. Within an acceptable wait time, a structured diagnostic appears with at least the following sections populated: performance & mobile readiness, structured-data & AI-search readiness, direct booking path, visible communication channels, detected technology providers, and an initial opportunity map of quick wins. The visitor can read and screenshot the result without creating an account.

**Acceptance Scenarios**:

1. **Given** a public hotel website URL, **when** the visitor submits it, **then** the platform performs an automated scan and returns a diagnostic with explicit, plain-language observations such as "Your booking button redirects to an external domain," "No structured Hotel schema detected," "WhatsApp not visible as a guest communication channel," and "Initial mobile booking-path friction detected."
2. **Given** a URL that cannot be reached, fails to load, or is not a hotel website, **when** the platform attempts the scan, **then** it returns a clear, non-technical explanation, suggests corrective input, and does not lose the visitor.
3. **Given** a successful scan, **when** the visitor scrolls to the bottom of the result, **then** they see a clear call-to-action to continue into a deeper guided audit, with an honest estimate of how long the deeper audit will take.
4. **Given** the same URL was scanned recently, **when** another scan is requested, **then** the platform reuses prior data when fresh, indicates freshness, and offers explicit re-scan.
5. **Given** a successful scan, **when** the platform stores the result, **then** the data is structured per signal, per field, with confidence and freshness, so later phases of the platform can re-use it without re-scanning.

---

### User Story 2 — Dynamic Adaptive Questionnaire (Priority: P1)

After the automated scan, the hotelier is invited into an internal guided diagnostic interview. The questionnaire feels like a conversation, not a form: questions reshape themselves based on prior answers and the scan; technical jargon is rephrased into plain language; "I don't know" is always available; most answers are dropdowns / sliders / cards / yes-no-unknown; any open-ended question can be answered with voice; pre-filled fields seeded from the scan and from the consultant's project setup reduce friction further. The interview branches by hotel profile (independent / boutique / family / aparthotel / guesthouse / small group), by main audit goal (profitability / workload reduction / direct bookings / AI readiness / PMS evaluation / etc.), and by current stack (e.g., follow-up questions about a specific booking-engine vendor appear only if that vendor was detected or declared). Progress is saved at every step; the hotelier can leave and return; the screen always shows where they are in the flow.

**Why this priority**: This is where the platform learns the hotel's specific situation. Without an adaptive questionnaire, every downstream recommendation would be generic. The dynamic, branching, voice-assisted experience is also the moat against static-form audit tools and PDF questionnaires.

**Independent Test**: A hotelier completes a session in which the questionnaire visibly adapts: choosing "Independent hotel, 28 rooms, Paris" later produces small-property language; selecting "Reduce reception workload" as the main goal causes deeper workload questions to appear and PMS-migration questions to retreat; saying "we don't use WhatsApp" stops further WhatsApp-automation questions; answering one open-ended question by voice produces a clean structured summary the user can review and edit before continuing.

**Acceptance Scenarios**:

1. **Given** a hotelier who selects "Boutique hotel" + "Improve guest satisfaction" as primary goal, **when** they progress through the questionnaire, **then** later blocks emphasize guest-journey friction, response speed, pre-arrival communication, and multilingual support — while questions about multi-property centralization do not appear.
2. **Given** a hotelier who answered "No CRM" earlier, **when** they reach communication and marketing blocks, **then** no detailed CRM-integration questions are asked.
3. **Given** a question that normally requires a paragraph of explanation, **when** the hotelier opens it, **then** a clearly labeled voice-input option is available; tapping it records up to a configured duration and produces both a transcript and a structured extraction (e.g., topics, channels, current process, automation opportunity, candidate solution category).
4. **Given** a hotelier whose scan detected a specific booking-engine vendor, **when** they reach the booking & website block, **then** the platform pre-fills that vendor and asks targeted follow-up questions about that vendor's flow.
5. **Given** a session is interrupted, **when** the hotelier returns via the same access link, **then** their place in the flow, all answers, and any pending voice transcripts are restored.
6. **Given** a question the hotelier feels unable to answer, **when** they select "I don't know," **then** the questionnaire accepts it, does not block progression, and silently records that this answer has lower confidence for downstream reasoning.
7. **Given** the audit-goal block, **when** the hotelier ranks their top three priorities, **then** later question density and final report emphasis shift to those priorities; the same hotel with different goal selections would receive a visibly different audit path.

---

### User Story 3 — Decision-Support Output: Scenarios, Scoring, Roadmap, Impact, Tool Shortlist (Priority: P1)

At the end of the diagnostic the hotelier receives a structured decision-support output — not a single answer, but a navigable report. The report opens with an executive summary in plain language; presents readiness scores across multiple dimensions (website, AI-search, direct booking, guest communication, automation, tool-stack coherence, data & integration, compliance, operational workload); shows an opportunity map and a bottleneck analysis; offers two-to-three recommended improvement scenarios (e.g., "Minimal change," "Balanced upgrade," "Advanced modernization"), each with explicit trade-offs; includes a tool shortlist scoped to the hotel's profile and budget; and contains an explicit "What not to do now" section explaining which actions are premature or risky. Every recommendation is explained: why it was suggested, what problem it solves, what to check before deciding, what alternatives exist, what happens if the hotel does nothing — and every recommendation carries a confidence level. A practical 30 / 60 / 90-day roadmap closes the report.

**Why this priority**: This is the core product output. Everything upstream (scan, questionnaire, vendor database, scoring) exists to make this deliverable trustworthy, specific, and actionable. The "What not to do now" section and the explanation-per-recommendation are the most important trust-building elements of the entire product.

**Independent Test**: For a fully-completed audit of a hypothetical 28-room independent Paris hotel with main goal "reduce workload," the platform produces a report that (a) shows readiness scores along each documented dimension, (b) presents at least two distinct scenarios with side-by-side comparison, (c) recommends at least three concrete actions ordered into 30 / 60 / 90-day buckets, (d) names at least one action explicitly as "do not do this now and here's why," (e) attaches an explanation, alternatives list, and confidence level to each recommendation, and (f) is exportable as a single shareable artifact.

**Acceptance Scenarios**:

1. **Given** a completed audit, **when** the hotelier opens the report, **then** they see an executive summary, readiness scores by dimension, an opportunity map, a bottleneck analysis, scenarios A / B / C with trade-offs, a tool shortlist, a "what not to do now" section, an impact analysis, a 30 / 60 / 90-day roadmap, and a next-steps section.
2. **Given** a recommended tool in the shortlist, **when** the hotelier inspects it, **then** they see: why this tool was suggested for this hotel, the problems it would solve, the expected operational impact, the implementation complexity, the cost band, the risks, the alternatives, what would change if the hotel did nothing, and a confidence indicator.
3. **Given** the same hotel run twice — once with budget "low" and once with budget "open if ROI is clear" — **when** the reports are compared, **then** scenarios, tool shortlists, and roadmaps differ visibly: the low-budget version emphasizes existing tools, templates, FAQ, knowledge base, and WhatsApp Business, while the higher-budget version surfaces guest-messaging platforms, CRM, and possibly PMS evaluation.
4. **Given** a recommendation that has been deprioritized, **when** the hotelier reads "What not to do now," **then** they see a clear reason, what would need to change before reconsidering it, and what risks would arise from doing it prematurely.
5. **Given** a report, **when** the hotelier exports or shares it, **then** it is delivered as a structured, brandable artifact (e.g., a downloadable file and a shareable link) that preserves the same content the hotelier saw on screen.
6. **Given** multiple audit goals selected, **when** the report emphasis is computed, **then** the report visibly prioritizes content tied to the primary goal while still surfacing material relevant to secondary goals.

---

### User Story 4 — Consultant-Assisted Diagnostic Session (Priority: P1)

A Rinzler Studio consultant uses the platform with a hotel during a live diagnostic session — either side-by-side on-site, or in a remote call. In this mode the platform becomes a professional decision-support workspace. The consultant can see the automated scan and questionnaire answers, ask follow-up questions the system has not (or cannot) asked, override or annotate any answer with their own assessment, compare scenarios live in front of the client, adjust assumptions and immediately recompute the report, leave private internal notes the client never sees, and finalize a polished roadmap and implementation plan delivered to the client in a clean public view.

**Why this priority**: Many real hotel decisions require human context, trust, and explanation that a self-service flow cannot provide. The hybrid model — automated scan + structured engine + consultant judgment — is the platform's defensible commercial offering and the highest-value tier.

**Independent Test**: A consultant logs into the platform, joins an active project, sees the scan and the questionnaire answers, opens a "consultant view" that exposes the platform's reasoning behind each recommendation, overrides a single assumption (e.g., budget level), watches the report recompute, leaves a private internal note on one recommendation, exports a finalized version — and the client sees only the polished output, never the private note.

**Acceptance Scenarios**:

1. **Given** an authenticated consultant, **when** they open a project the hotel has partially completed, **then** they can read the scan, the answers so far, the current scoring, and the current recommendation reasoning.
2. **Given** a consultant in session mode, **when** they override an answer (e.g., "Actually budget is moderate, not low"), **then** the override is recorded with attribution and the report recomputes accordingly; the original client answer is preserved and visible alongside.
3. **Given** a consultant view, **when** the consultant opens any recommendation, **then** they see the underlying signals, evidence, and confidence levels driving it, and can adjust the weight or suppress it for this engagement with a private justification note.
4. **Given** a session is finalized, **when** the consultant publishes the report to the client, **then** the client sees only the curated output (no internal notes, no raw weights, no overridden originals).
5. **Given** a consultant wants to compare two scenarios live with the hotelier, **when** they switch between scenarios in session mode, **then** the platform supports a side-by-side comparison (impact, complexity, cost, dependencies, risk, time-to-deploy).
6. **Given** a consultant ends a session, **when** the engagement moves toward implementation, **then** the platform offers a documented handoff (final roadmap, owner per action, expected effort, dependencies, decision points) that can be re-opened at any time.

---

### User Story 5 — Vendor & Tool Database Management (Priority: P1)

The Rinzler team curates a structured database of hotel-technology solutions — PMS, booking engines, channel managers, CRMs, guest-messaging platforms, AI concierges, WhatsApp automation, review-management, revenue-management, housekeeping, payment, website providers, SEO / AI-visibility tools, knowledge-base tools, energy-management, compliance & consent. Each vendor entry is rich enough to drive both matching and explanation: category and tags, target hotel size & type, supported countries & languages, suitability for independent / small hotels, main features, integrations (PMS / booking engine / channel manager / CRM), API availability, AI features, automation capabilities, reporting, implementation complexity, support availability, French-market relevance, GDPR posture & EU-hosting information, price tier, strengths, limitations, when to recommend, when not to recommend, typical implementation risks, compatibility notes, and a confidence level for the information itself. The team can add, edit, retire, tag, version, and translate entries through a dedicated admin interface.

**Why this priority**: The database is the substrate the recommendation engine reasons over. Without it, the platform cannot match scenarios to tools, cannot explain why a tool was suggested, and cannot populate "what not to do now." It is also a strategic asset: every audit makes it richer.

**Independent Test**: A team member opens the admin database interface, creates a new vendor entry with all decision-relevant fields populated, tags it for "small hotels / French market / low budget," saves it, and then runs an end-to-end audit for a matching hotel profile — the new entry appears in the shortlist with an explanation that references the populated fields. The team member then edits the entry, changes a field, and the next audit reflects the change.

**Acceptance Scenarios**:

1. **Given** a team member with admin access, **when** they create a vendor entry, **then** the form captures category, target hotel size & type, countries & languages, integrations, API availability, AI features, implementation complexity, support availability, French-market relevance, GDPR & EU-hosting posture, price tier, strengths, limitations, when-to-recommend, when-not-to-recommend, and an explicit confidence level.
2. **Given** a vendor entry with limitations and "when not to recommend" populated, **when** a hotel profile matches those exclusion criteria, **then** the platform does not place the tool in the shortlist and may surface it in the "what not to do now" section with the entry's documented reasoning.
3. **Given** an edit to an existing vendor entry, **when** the change is saved, **then** the system records the previous version, the editor, and the timestamp, so future drift in recommendations can be traced.
4. **Given** tags (e.g., "small hotels," "French market," "low budget," "easy implementation," "advanced integration required"), **when** the team filters the admin list, **then** they can find, compare, and bulk-update entries by tag.
5. **Given** the same vendor information has come from different sources (vendor's official site, consultant verification, client report, AI inference), **when** the entry is displayed, **then** each field shows its source label and confidence so the platform never silently treats hearsay as verified fact.
6. **Given** a vendor entry must be retired (acquired, shut down, no longer relevant), **when** the team retires it, **then** it disappears from new recommendations but remains visible in historical reports that referenced it.

---

### User Story 6 — Questionnaire Management & Evolution (Priority: P1)

The team manages the questionnaire as living content, not hard-coded software. Through a questionnaire admin interface they can add new questions, edit existing ones, deactivate outdated ones, set answer types (single choice / multi-select / dropdown / slider / ranking cards / yes-no-unknown / short text / voice), assign questions to audit levels and hotel types, define conditional logic ("only ask if X"), assign goal relevance, define scoring contribution, connect answers to recommendation rules, translate to multiple languages, and test changes in staging mode before publishing. Versioning is preserved so historical audits remain interpretable against the question wording at the time they were taken.

**Why this priority**: A hard-coded questionnaire freezes the product. A managed questionnaire lets the team incorporate lessons from real audits, retire dead questions, and add new ones as the hotel-technology market evolves — without engineering deploys.

**Independent Test**: A team member adds a new conditional question ("If hotel uses WhatsApp Business → 'Are replies manual or templated?'"), assigns it to the communication block, attaches it to two specific goals, sets it to contribute to the "automation readiness" score, publishes it, then completes an audit as a test hotelier and verifies the new question appears under the right conditions, contributes to the right score, and renders in the right language.

**Acceptance Scenarios**:

1. **Given** a team member with questionnaire-admin access, **when** they create a new question, **then** they can specify answer type, conditional logic, audit-level assignment, hotel-type relevance, goal relevance, scoring contribution, and translations.
2. **Given** a question is updated, **when** an audit started under the previous version is reopened, **then** the historical question text and answer remain readable — the new version does not silently rewrite past records.
3. **Given** a conditional question with logic "ask only if booking engine = X OR detected booking engine = X," **when** a matching hotel takes the audit, **then** the question appears; when a non-matching hotel takes the audit, the question does not appear.
4. **Given** a question is deactivated, **when** subsequent audits run, **then** the question is not shown to new respondents, but historical responses to it remain visible in past reports.
5. **Given** a translation is missing for a published question, **when** a user in that language reaches the question, **then** the platform falls back to a documented default language with a visible indicator rather than blocking or showing untranslated keys.
6. **Given** a staging mode, **when** a team member previews a new question or branch, **then** they can simulate a full audit path without polluting production analytics or producing live reports.

---

### User Story 7 — Compliance & Risk Assessment Layer (Priority: P2)

For every hotel, the platform produces a compliance and risk overview tailored to its actual stack and intended changes. It identifies tools that process personal data, guest communication data, payment data, identity documents, AI-generated responses, and automated decision-making; it surfaces risks around data transfer outside the EU, unclear retention, AI transparency obligations, consent management, and DPAs with vendors. For AI-related plans, it checks transparency notice, human escalation, data-processing agreements, privacy-policy updates, consent capture, internal AI usage policy, logging & monitoring, and limits on what an AI agent should be allowed to answer. The platform does not provide legal advice; it surfaces risk areas, explains them in plain language, and provides a practical compliance checklist the hotel can act on or share with counsel.

**Why this priority**: Compliance shapes which recommendations are responsible. Without this layer, the platform might recommend tools that create legal exposure. It is also a strong trust signal for European hotels.

**Independent Test**: A hotel declares it uses an AI tool for guest communication, has no transparency notice, no DPA on file, and uncertainty about EU data hosting. The platform's report includes an explicit compliance section: it flags the missing transparency notice, the missing DPA, and the EU-hosting uncertainty; it provides a plain-language checklist to address each; and it tones down (or qualifies) any further AI-related recommendation until those items are addressed.

**Acceptance Scenarios**:

1. **Given** the questionnaire captured "We use AI in guest replies but do not inform guests," **when** the report is generated, **then** the compliance section flags an AI transparency gap with a plain-language explanation and a concrete checklist item.
2. **Given** the hotel declares EU data hosting is "I don't know" for a vendor in the stack, **when** the report is generated, **then** the platform flags this as a verification item rather than treating it as either compliant or non-compliant.
3. **Given** a recommendation involves a vendor whose GDPR posture or EU-hosting status is unknown in the database, **when** the recommendation is rendered, **then** a visible caveat appears and the confidence level reflects the gap.
4. **Given** the compliance checklist, **when** the hotelier exports the report, **then** the checklist is included in a form they can share with counsel or an internal compliance owner.

---

### User Story 8 — Funding & Subsidy Readiness (French Market) (Priority: P2)

For hotels in the French market, the platform produces a funding-readiness module: it does not promise funding, but it helps the hotel understand whether public support, digital-transformation programs, AI diagnostics, or regional initiatives may be relevant, and it prepares the supporting material (company information, project description, digital-transformation goals, AI / data objectives, expected benefits, implementation roadmap, budget estimate, supporting-documents checklist). The hotelier leaves with a clear, structured project brief they can take to a funding application — even if no application happens.

**Why this priority**: This is a commercially powerful differentiator in the French market because hotels see a tangible path to financing part of the transformation. It is P2 (not P1) because it depends on the diagnostic output already existing.

**Independent Test**: A French hotel completes the audit, opts into the funding-readiness module, and is taken through a focused flow that produces a downloadable funding brief containing the company information, project description, objectives, expected benefits, roadmap, budget estimate, and a supporting-documents checklist — all derived from data the hotel has already supplied.

**Acceptance Scenarios**:

1. **Given** a French hotel with a completed audit, **when** they open the funding-readiness module, **then** it pre-fills the project brief from existing audit data and asks only the questions still needed.
2. **Given** the funding brief is generated, **when** the hotelier downloads it, **then** it contains the documented sections and an explicit disclaimer that the platform does not guarantee eligibility or award.
3. **Given** a non-French hotel attempts the module, **when** they open it, **then** the platform either redirects to a generic project-brief generator or transparently states that no localized funding pathway is currently available.

---

### User Story 9 — Tiered Audit Levels & Packaging (Priority: P2)

The platform exposes the diagnostic at multiple levels: a free external website scan; a mini diagnostic combining scan with a short guided block; a full digital & AI audit with the complete questionnaire and decision-support output; a consultant-assisted strategic roadmap; and an implementation-support tier that turns the roadmap into delivery (knowledge-base creation, vendor-selection support, configuration, automation setup, website content improvements, AI-visibility improvements, guest-messaging setup, staff training, performance tracking). Each level produces a clearly differentiated artifact, and the platform makes the progression and value increment explicit at every step.

**Why this priority**: The tier structure defines commercial packaging and the monetization path. It is P2 because the underlying flows (scan, questionnaire, decision-support, consultant mode) are independent capabilities; tiering organizes them into product offers.

**Independent Test**: Five hotels enter the platform at five different tier intents — only-scan, mini, full, consultant, implementation. Each receives a clearly distinct artifact and a clearly distinct experience. The platform never displays paid-tier output to a free-tier hotel, and the upgrade pathway is explicit at the boundary between any two adjacent tiers.

**Acceptance Scenarios**:

1. **Given** a free-tier visitor, **when** they finish the website scan, **then** they see the scan output and an explicit description of what would be added at the next tier.
2. **Given** a mini-tier hotel, **when** they finish the short guided block, **then** they receive a mini-report with the documented contents (external scan + basic stack identification + initial opportunity map + short recommendation summary).
3. **Given** a full-tier hotel, **when** they complete the full audit, **then** they receive the full report with all documented sections, including scenarios, tool shortlist, impact analysis, and 30 / 60 / 90-day roadmap.
4. **Given** a consultant-tier engagement, **when** the consultant publishes the deliverable, **then** the hotel receives the full report plus consultant interpretation, scenario walkthrough, vendor-shortlist discussion, implementation priorities, budget planning, funding-readiness support, and a final roadmap presentation.
5. **Given** an implementation-tier engagement, **when** work is underway, **then** the platform supports tracking of the executed steps (knowledge-base built, vendor selected, tool configured, automation set up, content improved, training delivered, performance tracked) against the roadmap.

---

### User Story 10 — Knowledge Governance & Source Attribution (Priority: P2)

Every piece of information in the platform that drives a recommendation carries provenance: source (official vendor data / publicly available / consultant-verified / client-reported / AI-inferred / outdated / uncertain), the date added, the last verified date, the contributor, the verification status, the confidence level, and any internal notes. Outdated entries are flagged. Conflicting entries are surfaced rather than silently chosen between. The platform never treats client hearsay as verified vendor truth, never treats AI inference as confirmed fact, and never makes a recommendation whose evidence trail cannot be inspected.

**Why this priority**: The platform's credibility depends on never recommending from stale or unverified data. This is also the foundation of the self-enriching loop (US 11) — without governance, enrichment becomes noise.

**Independent Test**: A team member opens any recommendation in any audit report, drills into "why was this tool suggested," and can see, for each data point that informed the recommendation, its source label, last-verified date, confidence level, and contributor.

**Acceptance Scenarios**:

1. **Given** any field on a vendor entry, **when** a viewer hovers or inspects it, **then** they see its source, contributor, date added, last verified date, and confidence level.
2. **Given** a vendor entry has not been re-verified within a configured freshness window, **when** it appears in a shortlist, **then** a "stale data" indicator is visible to consultants and admins (and a softer caveat to the hotel client).
3. **Given** two sources disagree on a vendor capability (e.g., vendor site says "AI feature available," client reports it does not work), **when** the entry is displayed, **then** both observations are recorded with their attribution and the field surfaces the conflict.
4. **Given** a recommendation, **when** it is produced, **then** the platform can list the specific data points (signals, answers, vendor fields) that contributed to it, with their source attribution.

---

### User Story 11 — Self-Enriching Knowledge Base (Priority: P3)

As audits are completed, the platform proposes enrichment of its own knowledge base from real-world signals — a PMS not yet catalogued, a regional booking engine, a guest-messaging tool used in France, an integration the hotel actually uses, a vendor limitation observed in the field, a pricing or implementation detail, vendor support feedback, a compatibility issue, a real operational use case. New information is never silently merged into the verified database; it enters as a candidate enrichment with the appropriate source label, awaiting team review.

**Why this priority**: This is a compounding-value mechanic — the more audits the platform runs, the more it knows about the real hotel-tech landscape. It is P3 because it depends on US 5 (database management), US 6 (audit-content evolution), and US 10 (governance) being in place first.

**Independent Test**: A simulated audit declares it uses an obscure regional PMS not yet in the database, mentions an integration limitation, and provides operational color through voice. After the audit completes, the admin queue contains a candidate enrichment with the new PMS entry skeleton, the integration limitation, and the operational note — each carrying client-reported source attribution and awaiting team review or rejection.

**Acceptance Scenarios**:

1. **Given** an audit mentions a vendor that does not exist in the database, **when** the audit completes, **then** the platform proposes a new candidate entry in the team's review queue with the available data populated and a "client-reported, unverified" status.
2. **Given** an audit produces an observation about a known vendor (e.g., "this PMS does not integrate with X"), **when** the audit completes, **then** the platform proposes the observation as a candidate enrichment on the existing entry, attributed to that audit.
3. **Given** a team member reviews a candidate enrichment, **when** they accept it, **then** the source label upgrades appropriately (e.g., to "consultant-verified") and the entry becomes available for downstream recommendations.
4. **Given** a team member rejects a candidate enrichment, **when** the rejection is recorded, **then** the candidate is preserved for audit traceability but excluded from any active recommendation.

---

### User Story 12 — Aggregate Learning Loop (Priority: P3)

Over time, the platform analyzes its own corpus of completed audits to improve future recommendations: common stack combinations, recurring bottlenecks, frequent goal selections, typical budgets, common PMS limitations, implementation outcomes, consultant notes, and post-recommendation client feedback. Patterns that repeat across many hotels of the same profile increase the confidence of related recommendations; patterns that fail repeatedly de-emphasize the related recommendations. The team can inspect the learned patterns and decide whether to encode them as explicit rules.

**Why this priority**: This is the long-term moat. It depends on having a meaningful audit volume and on US 10 governance to keep noise out. It is P3 because the platform must work convincingly without it from day one.

**Independent Test**: With a configured threshold of "N hotels of profile X reporting outcome Y," when the threshold is crossed the platform surfaces a learned pattern to the team (e.g., "small independent hotels using PMS Z report communication bottlenecks 70 % of the time when no guest-messaging tool is in place"). A team member can promote that pattern into an explicit recommendation rule or dismiss it.

**Acceptance Scenarios**:

1. **Given** a corpus of completed audits, **when** the platform aggregates them, **then** it surfaces patterns (frequent bottlenecks per profile, frequent goal-to-recommendation mappings, frequent stack combinations) to the team.
2. **Given** a learned pattern, **when** a team member promotes it to an explicit rule, **then** it enters the active recommendation logic with source attribution to the supporting audit set.
3. **Given** a recommendation that performed poorly across multiple post-audit follow-ups, **when** the platform aggregates the feedback, **then** the recommendation's confidence is reduced and a review item is queued for the team.
4. **Given** the team requests it, **when** they inspect the aggregate view, **then** they can see segmented learning (by hotel size, type, country, goal) without exposing any single hotel's identifying data outside of consultant-authorized contexts.

---

### User Story 13 — Implementation Support Tooling (Priority: P3)

For hotels in the implementation tier, the platform helps execute the roadmap: it guides creation of the hotel knowledge base (the structured content used for staff training, guest replies, website FAQ, WhatsApp automation, AI agents, and internal procedures); it supports vendor selection through structured shortlists and side-by-side comparisons; it tracks configuration, automation workflow setup, website content improvements, AI-visibility improvements, guest-messaging setup, staff training, and post-implementation performance.

**Why this priority**: This is where the diagnostic becomes a delivery service. It depends on the rest of the platform working and is P3 because it is the highest-touch, lowest-volume tier.

**Independent Test**: A hotel that opted into implementation support is guided through building a structured knowledge base inside the platform (FAQ entries: pre-arrival, access, breakfast, parking, late check-in, billing, room details, special requests); the knowledge base is then reusable by other platform features (e.g., feeding an AI agent if the hotel adopts one, generating website FAQ content, generating templated WhatsApp replies).

**Acceptance Scenarios**:

1. **Given** an implementation-tier engagement, **when** the hotel works through knowledge-base creation, **then** they end with a structured knowledge base organized by the documented topics (pre-arrival, access, breakfast, parking, late check-in, billing, room details, special requests).
2. **Given** a vendor selection step, **when** the hotel compares two shortlisted tools, **then** they see a side-by-side view (features, integrations, complexity, cost band, risk, time-to-deploy, GDPR posture, fit with their profile).
3. **Given** an implementation step is completed, **when** the team marks it done, **then** the roadmap reflects progress and post-implementation performance signals (response time, repetitive-question reduction, direct-booking trend, review trend) are tracked over time.
4. **Given** a knowledge base exists, **when** the hotel later opts into other features that need structured content (AI agent, guest-messaging templates, website FAQ generation), **then** the existing knowledge base is the source — not a re-collection.

---

### User Story 14 — Hospitality Decision & Integration Layer (Long-Term Vision in Scope) (Priority: P3)

In the long term, the platform evolves beyond audit into a decision and integration layer: it matches vendors based on real compatibility and hotel profile (not generic listings); it generates implementation checklists, timelines, and responsibilities; and it helps connect hotel systems through low-code workflows (PMS to CRM, booking engine to email automation, guest messaging to knowledge base, review platform to follow-up workflow, website forms to CRM, AI agent to knowledge base). The audit remains the entry point; the integration hub is the depth.

**Why this priority**: This is the strategic destination. It is P3 because each capability depends on multiple prior capabilities. It is included in the spec — per the requirement that the spec describe the full project without staging — but is explicitly the most distant horizon.

**Independent Test**: A hotel that has completed a full audit and roadmap can opt into an integration workflow (e.g., "post-stay review platform → email follow-up to non-responders → CRM tag update") configured in the platform, observe it run, and inspect logs of each step.

**Acceptance Scenarios**:

1. **Given** a completed audit, **when** the hotel opts into vendor matching, **then** the platform produces a compatibility-scored shortlist (not a directory) based on the hotel's actual profile and integration constraints.
2. **Given** a shortlisted tool is selected, **when** the hotel commits to implementation, **then** the platform produces a checklist with timelines, responsibilities, and decision points.
3. **Given** two systems the hotel uses, **when** the hotel configures a workflow between them (e.g., PMS → CRM data sync, booking engine → email automation), **then** the workflow runs, is observable, can be paused / resumed / edited, and respects the platform's compliance and consent posture.
4. **Given** an integration workflow runs, **when** an error occurs, **then** it is logged, surfaced to the hotel, and does not silently lose or duplicate data.

---

### Edge Cases

- A website returns a captcha, geo-block, or login wall during the automated scan → the platform recognizes the obstacle, returns a partial scan, names the blocked signals, and offers manual entry for the missed fields.
- A hotel's website is offline at scan time → the platform retries, returns a clear non-technical explanation, retains the URL for re-scan, and lets the hotelier continue with the questionnaire using manual input.
- The hotelier abandons the questionnaire halfway → the platform preserves their progress, allows resumption from the same access link, and does not generate a misleading partial report.
- A voice answer is unintelligible, in an unsupported language, or contains sensitive personal information → the platform shows the transcript before structuring it, lets the user edit or discard it, and redacts categories of sensitive content from the structured extraction.
- A vendor that was in a hotel's shortlist is retired between the consultant draft and the client review → historical reports remain accurate to what was recommended, but a notice surfaces that the vendor is no longer current.
- Two team members edit the same vendor entry simultaneously → the platform either serializes the writes or surfaces the conflict; it never silently loses an edit.
- A hotel selects "I don't know" for many critical questions → the report visibly reduces its confidence levels, broadens recommendations toward verification steps, and prioritizes recommendations that do not require the unknown information.
- A hotel selects contradictory inputs (e.g., "no new tools" + "we want an AI agent on WhatsApp") → the platform surfaces the contradiction in the report, treats the explicit "no new tools" as a hard constraint, and reframes the AI-agent goal as a longer-term path.
- A hotel exists in a market the platform's vendor database underrepresents → the platform admits low confidence rather than recommending unfit vendors, and prioritizes platform-agnostic improvements (knowledge base, FAQ, templates, communication structure).
- A consultant's override conflicts with the recommendation engine's reasoning → both are preserved with attribution; the published report reflects the consultant's view; the engine can still learn from the override.
- A funding brief is generated for a hotel that later turns out to be ineligible → the brief carries an explicit disclaimer; no claim of eligibility is rendered.
- A previously confident recommendation is invalidated by aggregate feedback → the platform downgrades its confidence prospectively, but does not silently rewrite past reports; affected past clients can be flagged for proactive follow-up.

## Requirements *(mandatory)*

### Functional Requirements

#### A. Automated External Diagnostic

- **FR-001**: System MUST accept a hotel website URL as the only required input to start a diagnostic.
- **FR-002**: System MUST perform an automated external scan and produce structured findings covering: website performance, mobile usability, Core Web Vitals, HTTPS, sitemap & robots presence, metadata, schema markup, hotel-entity clarity, direct booking path behavior, booking-button destination, external booking-engine redirects, FAQ presence, contact clarity, multilingual structure, AI-search readability, review signals, Google Business consistency, social & OTA consistency, visible communication channels, and detected technology providers.
- **FR-003**: System MUST store every scan finding with a field-level confidence indicator and a freshness timestamp.
- **FR-004**: System MUST present scan results in plain non-technical language and never expose raw tool output as the primary user-facing surface.
- **FR-005**: System MUST handle unreachable, blocked, or non-hotel URLs without losing the visitor — it MUST explain the obstacle, offer corrective input, and continue.
- **FR-006**: System MUST reuse a recent scan when available rather than re-scanning, but MUST indicate freshness and offer explicit re-scan.
- **FR-007**: System MUST produce, from each successful scan, an initial opportunity map with concrete observations and quick wins surfaced to the visitor before any internal questionnaire is requested.

#### B. Dynamic Adaptive Questionnaire

- **FR-010**: System MUST present questions adaptively, with conditional logic based on prior answers, scan findings, hotel profile, declared audit goals, and current stack.
- **FR-011**: System MUST translate every technical concept into plain hotel-facing language and offer "I don't know" as an explicit, accepted answer.
- **FR-012**: System MUST minimize free-text input, defaulting to dropdowns, multi-select, sliders, ranking cards, yes-no-unknown, and short selections.
- **FR-013**: System MUST allow voice input for any question that would otherwise require a paragraph, providing a transcript the user can review and edit, and a structured extraction (topics, channels, current process, automation opportunity, candidate solution category) the user can review before continuing.
- **FR-014**: System MUST save progress continuously and allow the hotelier to leave and return from the same access link without losing data.
- **FR-015**: System MUST show progress, place in flow, and an honest time-to-complete estimate.
- **FR-016**: System MUST pre-fill questionnaire fields from prior scan findings and prior consultant inputs where data is available, while clearly indicating which fields were pre-filled and allowing the hotelier to correct them.
- **FR-017**: System MUST support questionnaire blocks covering at least: hotel profile, audit goal, current technology stack, website & direct booking, guest communication, reception & operations, knowledge base & AI readiness, reviews & reputation, AI-search & visibility readiness, compliance / GDPR / AI Act, budget & change readiness, PMS deep-dive (conditional), goal-based branching, and final prioritization.
- **FR-018**: System MUST never block progression because of a technical question the hotelier cannot answer; it MUST silently lower confidence for downstream reasoning instead.
- **FR-019**: System MUST allow the hotelier to declare a primary audit goal and secondary priorities, and MUST adapt subsequent question density and final report emphasis to that selection.

#### C. Hotel-Technology Vendor Database

- **FR-020**: System MUST maintain a structured vendor database covering at least the categories: PMS, booking engine, channel manager, CRM, guest messaging, AI concierge, WhatsApp automation, email automation, review management, reputation management, revenue management, housekeeping, staff collaboration, payment, website provider, digital-marketing agency, SEO & AI-visibility, knowledge base, analytics & reporting, energy management, compliance & consent.
- **FR-021**: For each vendor entry, System MUST capture: category, official website, target hotel size, target market, countries served, language support, suitability for independent / small hotels, main use cases, core features, supported channels, PMS integrations, booking-engine integrations, channel-manager integrations, CRM integrations, API availability, automation capabilities, AI features, reporting capabilities, implementation complexity, price tier, support availability, French-market relevance, GDPR posture, EU-hosting information (when available), strengths, limitations, when to recommend, when not to recommend, typical implementation risks, compatibility notes, and confidence level of the available information.
- **FR-022**: System MUST tag vendor entries (e.g., "small hotels," "French market," "low budget," "easy implementation," "advanced integration required") and allow filtering, comparison, and bulk-management by tag.
- **FR-023**: System MUST version vendor entries and preserve historical versions so past reports remain interpretable.
- **FR-024**: System MUST distinguish, per field, between official vendor data, publicly available information, consultant-verified data, client-reported data, AI-inferred data, outdated data, and uncertain data — and MUST never silently elevate a less-confident source.
- **FR-025**: System MUST allow team members to add, edit, tag, retire, translate, and revise vendor entries through an admin interface, with attribution and timestamps.

#### D. Recommendation & Decision-Support Engine

- **FR-030**: System MUST produce, for each completed audit, a set of recommended scenarios (e.g., minimal change, balanced upgrade, advanced modernization) with explicit trade-offs.
- **FR-031**: System MUST evaluate each recommendation across multiple dimensions: fit with hotel profile, fit with stated goal, fit with budget, integration compatibility, expected operational impact, expected revenue impact, implementation complexity, time to value, compliance risk, staff adoption difficulty, scalability, and confidence level.
- **FR-032**: System MUST attach to every recommendation an explanation answering: why is this relevant, what problem does it solve, what would change operationally, what is the expected benefit, what is the effort required, what are the risks, what should be checked before deciding, what alternatives exist, and what happens if the hotel does nothing.
- **FR-033**: System MUST produce a "What not to do now" section that names specific actions that are premature, unnecessary, or risky for this hotel and explains why.
- **FR-034**: System MUST produce a tool shortlist scoped to the hotel's profile, goal, and budget, with explicit per-tool reasoning and confidence levels.
- **FR-035**: System MUST adapt recommendations to declared budget level (no budget / low / moderate / high / open if ROI clear / not sure), distinguishing one-time implementation cost, monthly subscription, internal staff time, training cost, migration cost, maintenance cost, and opportunity cost.
- **FR-036**: System MUST produce readiness scores covering at least: website readiness, AI-search readiness, direct-booking readiness, guest-communication readiness, automation readiness, tool-stack coherence, data & integration readiness, compliance readiness, and operational-workload score.
- **FR-037**: System MUST treat every score as auditable — every score MUST be explainable in terms of the signals and answers that produced it.

#### E. Impact Estimation & Roadmap

- **FR-040**: System MUST produce, per recommendation, a qualitative impact estimate covering at least: expected operational impact, expected workload reduction, expected guest-experience improvement, expected effect on response speed, expected effect on consistency of service, expected impact on staff onboarding, expected effect on direct-booking potential, expected complexity of implementation, expected cost level, expected time to deploy, risk level, dependency on other tools, and confidence level.
- **FR-041**: System MUST never present impact as a precise ROI guarantee; it MUST present it as a reasoned, qualified estimate with confidence.
- **FR-042**: System MUST generate a 30 / 60 / 90-day roadmap with: what to do first, quick wins, what requires preparation, what should be postponed, what should not be done now, which tools to consider, which tools to avoid, which dependencies must be resolved first, what the hotel team can handle, and what may require external support.
- **FR-043**: Each roadmap item MUST carry expected effort, expected impact, dependencies, recommended owner, implementation risk, and decision points.

#### F. Compliance & Risk Layer

- **FR-050**: System MUST evaluate the hotel's existing and planned stack for personal-data processing, guest-communication data, payment data, identity documents, CRM data, email-marketing consent, WhatsApp communication, AI-generated responses, automated decision-making, third-party processors, EU data transfer, and retention clarity.
- **FR-051**: For AI tools, System MUST check whether the hotel needs: transparency notice to guests, human escalation, vendor DPAs, privacy-policy updates, consent management, internal AI usage policy, logging & monitoring, and limits on what the AI may answer.
- **FR-052**: System MUST present compliance findings as a practical, plain-language checklist with disclaimers that the platform does not provide legal advice.
- **FR-053**: System MUST flag, in any recommendation, when the underlying vendor's GDPR posture or EU-hosting status is unknown, and MUST reduce confidence accordingly.

#### G. Funding & Subsidy Readiness

- **FR-060**: System MUST offer hotels (initially in the French market) a funding-readiness module that helps prepare: company information, project description, digital-transformation goals, AI / data objectives, expected benefits, implementation roadmap, budget estimate, and supporting-documents checklist.
- **FR-061**: System MUST pre-fill the funding brief from the audit data already supplied and ask only for what is still missing.
- **FR-062**: System MUST clearly disclaim that the platform does not guarantee funding eligibility or award.

#### H. Self-Service & Consultant-Assisted Modes

- **FR-070**: System MUST support self-service mode where a hotelier completes the diagnostic without consultant involvement.
- **FR-071**: System MUST support consultant-assisted mode where a Rinzler Studio consultant works on a project alongside the hotel.
- **FR-072**: In consultant-assisted mode, the consultant MUST be able to: view the scan; view all client answers; override or annotate any answer (preserving the client's original); adjust assumptions and recompute the report; leave private internal notes; compare scenarios live in front of the client; and publish a curated final deliverable that excludes private internal content.
- **FR-073**: System MUST distinguish, in every record, between client-supplied data, consultant-supplied data, and engine-inferred data, with attribution and timestamps.
- **FR-074**: System MUST support handing off from a consultant-assisted session into an implementation engagement without re-collecting data.

#### I. Tiered Audit Levels

- **FR-080**: System MUST support five audit levels, each producing a clearly differentiated artifact: free website scan; mini diagnostic (scan + short guided block); full digital & AI audit (complete questionnaire + decision-support output); consultant-assisted strategic roadmap; implementation support.
- **FR-081**: System MUST clearly communicate, at the boundary between any two adjacent tiers, what is added at the next tier.
- **FR-082**: System MUST never expose paid-tier output to a tier the hotel has not opted into.

#### J. Reports & Output

- **FR-090**: System MUST generate a structured report per audit that includes at least: executive summary, digital-readiness scores, opportunity map, bottleneck analysis, tool-stack overview, recommended scenarios, tool shortlist, "what not to do now," impact analysis, 30 / 60 / 90-day roadmap, and next-steps section.
- **FR-091**: System MUST adapt report emphasis to the hotel's primary goal (profitability / workload reduction / guest satisfaction / direct bookings / AI readiness / PMS evaluation / etc.).
- **FR-092**: System MUST adapt report depth to the audit tier (free / mini / full / consultant-assisted).
- **FR-093**: System MUST allow the hotel to receive the report in a shareable, exportable form, and the consultant to receive an extended version with internal context preserved.
- **FR-094**: System MUST preserve historical reports as-rendered: subsequent changes to vendor entries, question wording, or scoring logic MUST NOT silently rewrite past output.

#### K. Questionnaire Management

- **FR-100**: System MUST allow the team to add, edit, deactivate, version, and translate questions through an admin interface.
- **FR-101**: System MUST allow team members to define answer type (single choice / multi-select / dropdown / slider / ranking cards / yes-no-unknown / short text / voice), conditional logic, audit-level assignment, hotel-type relevance, goal relevance, and scoring contribution per question.
- **FR-102**: System MUST support staging / preview of questionnaire changes before publication.
- **FR-103**: System MUST preserve historical wording so reopened audits remain interpretable.
- **FR-104**: System MUST fall back from a missing translation to a documented default language with a visible indicator, never to untranslated keys.

#### L. Knowledge Governance

- **FR-110**: For every data point that drives a recommendation, System MUST record source, contributor, date added, last-verified date, confidence level, and verification status.
- **FR-111**: System MUST flag vendor entries that have not been verified within a configured freshness window.
- **FR-112**: System MUST surface conflicting source observations rather than silently choosing between them.
- **FR-113**: System MUST be able to enumerate, for any rendered recommendation, the specific data points that informed it.

#### M. Self-Enriching Knowledge Base

- **FR-120**: System MUST detect, in completed audits, information that is candidate enrichment of the vendor database (new vendor, new integration, new limitation, new use case, new pricing detail, new compatibility note, vendor support feedback).
- **FR-121**: System MUST stage candidate enrichments in a team review queue, labeled with their client-reported source attribution, and MUST never silently merge them into the verified database.
- **FR-122**: System MUST upgrade source labels appropriately on team acceptance and MUST preserve rejected candidates for audit traceability.

#### N. Aggregate Learning Loop

- **FR-130**: System MUST aggregate patterns across completed audits — common stack combinations, recurring bottlenecks, frequent goal selections, typical budgets, common PMS limitations, implementation outcomes, consultant notes, post-recommendation client feedback.
- **FR-131**: System MUST present learned patterns to the team for promotion to explicit recommendation rules or dismissal.
- **FR-132**: System MUST adjust the confidence of existing recommendations in light of aggregate post-audit feedback.
- **FR-133**: Aggregate learning MUST never expose any single hotel's identifying data outside of consultant-authorized contexts.

#### O. Implementation Support

- **FR-140**: System MUST guide implementation-tier hotels through structured knowledge-base creation organized by the documented topics (pre-arrival, access, breakfast, parking, late check-in, billing, room details, special requests).
- **FR-141**: System MUST support side-by-side vendor comparison for shortlisted tools.
- **FR-142**: System MUST track implementation progress against the roadmap and capture post-implementation performance signals (response time, repetitive-question reduction, direct-booking trend, review trend) over time.
- **FR-143**: The implementation-tier knowledge base MUST be reusable as the source for any later platform feature that needs structured hotel content (AI agent, guest-messaging templates, website FAQ).

#### P. Long-Term Integration Layer

- **FR-150**: System MUST be able to produce, post-audit, vendor matches scored on real compatibility with the hotel's profile and integration constraints — distinct from generic vendor listings.
- **FR-151**: System MUST produce, on selection of a vendor for implementation, a checklist with timelines, responsibilities, and decision points.
- **FR-152**: System MUST support configuration of inter-system workflows (e.g., PMS to CRM, booking engine to email automation, guest messaging to knowledge base, review platform to follow-up workflow, website forms to CRM, AI agent to knowledge base) with observability, pause / resume / edit controls, error visibility, and respect for the platform's compliance posture.

#### Q. Cross-Cutting Concerns

- **FR-160**: System MUST support multilingual delivery, with French as the primary language for the initial market.
- **FR-161**: System MUST be accessible from mobile devices throughout the hotelier flows.
- **FR-162**: System MUST authenticate team members (consultants and admins) and constrain access by role (consultant / questionnaire admin / vendor-database admin / super-admin).
- **FR-163**: System MUST grant hotel clients access to their own diagnostic via an unguessable, revocable access link without requiring account creation.
- **FR-164**: System MUST record an operational audit log of significant actions (project creation, link revocation, report publication, vendor-entry change, question change, candidate-enrichment review).
- **FR-165**: System MUST never use a hotel's data for aggregate learning in any form that exposes its identity outside of consultant-authorized contexts.
- **FR-166**: System MUST honor data-retention rules and provide deletion paths consistent with applicable regulation.

### Key Entities

- **Hotel Profile** — The hotel under diagnostic: property type, room count, star rating, location, primary contact role, declared digital maturity, declared audit goal and priorities, declared budget level, declared change readiness, current tool stack, current communication channels, current bottlenecks, current operational workload, current compliance posture, language. Used to scope every recommendation.
- **Project / Engagement** — One diagnostic for one hotel at one point in time, with status (draft / awaiting client / in progress / submitted / consultant-finalized / published / archived), tier (free scan / mini / full / consultant-assisted / implementation), owner (consultant), client access link, and lifecycle timestamps. The container for all artifacts of a single diagnostic.
- **External Scan Finding** — A single structured observation from the automated scan (e.g., "booking-button-target=external-domain"), with field, value, evidence, confidence, and freshness timestamp.
- **Questionnaire Question** — A managed question: identifier, current wording (translated), answer type, conditional logic, audit-level assignment, hotel-type relevance, goal relevance, scoring contribution, version, status (draft / published / deactivated), and historical versions.
- **Answer** — A client (or consultant) response to a question: project link, question reference (with version), value, source (client / admin pre-fill / consultant override / voice extraction), confidence (especially for "I don't know" and voice-extracted answers), and timestamps.
- **Voice Capture** — An open-ended voice answer: raw transcript, structured extraction, link to the question, link to the project, source attribution.
- **Vendor / Tool** — A hotel-technology solution: category, tags, target profile, features, integrations, AI features, automation capabilities, GDPR / EU-hosting posture, French-market relevance, complexity, price tier, strengths, limitations, when-to-recommend, when-not-to-recommend, version, status (active / retired), provenance per field.
- **Source / Provenance Record** — For any data point on a vendor entry, audit answer, or scan finding: source label (official vendor / public / consultant-verified / client-reported / AI-inferred / outdated / uncertain), contributor, date added, last verified, confidence, conflict notes.
- **Recommendation** — An action proposed for a project: scenario it belongs to, the action itself, vendor reference (if any), explanation, expected impact across documented dimensions, complexity, time-to-deploy, cost band, risks, alternatives, "what happens if you do nothing," confidence, the specific signals and answers that informed it, and the version of the engine that produced it.
- **Scenario** — A grouping of recommendations into a coherent strategic option (e.g., minimal change / balanced upgrade / advanced modernization) with cross-recommendation trade-offs.
- **Readiness Score** — A score along a documented dimension (website / AI-search / direct booking / guest communication / automation / tool-stack coherence / data & integration / compliance / operational workload), with band, basis, and the answers and findings that produced it.
- **Roadmap Item** — An action placed into a 30 / 60 / 90-day bucket with expected effort, expected impact, dependencies, recommended owner, implementation risk, and decision points. Linked back to the recommendation it implements.
- **Compliance Finding** — A risk or obligation surfaced for the hotel (e.g., AI transparency notice missing, DPA missing, EU hosting unverified), with plain-language explanation and the corresponding checklist item.
- **Funding Brief** — A generated project brief for funding-readiness, including company information, project description, objectives, expected benefits, implementation roadmap, budget estimate, and supporting-documents checklist; carries an eligibility disclaimer.
- **Report** — The finalized output of an audit: executive summary, scores, opportunity map, bottleneck analysis, tool-stack overview, scenarios, tool shortlist, what-not-to-do-now, impact analysis, roadmap, next steps. Frozen at publication so subsequent system changes do not rewrite past output.
- **Internal Note** — A consultant-only annotation on a project or recommendation, never exposed to the hotel client.
- **Candidate Enrichment** — A proposed change to the vendor database (new entry or modification to an existing entry) extracted from an audit and awaiting team review.
- **Learned Pattern** — A pattern detected across completed audits (e.g., "for hotel profile X, bottleneck Y occurs Z % of the time") that the team may promote to an explicit recommendation rule.
- **Knowledge Base Entry** — A structured piece of hotel content (FAQ, procedure, response template) created in the implementation tier and reusable by other features.
- **Integration Workflow** — A configured low-code workflow between two systems the hotel uses, with steps, observability, error handling, and compliance posture.
- **Audit Log Entry** — A record of a significant action in the platform (project creation, link revocation, report publication, vendor-entry edit, question change, enrichment review).
- **Access Link** — An unguessable, revocable URL granting a hotel client access to their own diagnostic without account creation.
- **User / Role** — Consultant, questionnaire admin, vendor-database admin, super-admin — each with documented scopes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a fresh URL submission, a hotelier sees an initial structured external-diagnostic result with no fewer than ten distinct, plain-language observations in under two minutes for at least 90 % of valid hotel URLs.
- **SC-002**: At least 60 % of hoteliers who complete the automated scan choose to proceed into the guided questionnaire.
- **SC-003**: At least 70 % of hoteliers who start the guided questionnaire complete it (no abandonment), measured across a representative sample of audits.
- **SC-004**: Across a sample of audits, no fewer than 80 % of hoteliers can complete the questionnaire without leaving any required question unanswered or stuck on a technical concept, as measured by completion rate and post-audit survey.
- **SC-005**: A complete audit, from URL submission through the published full report, can be finished by a self-service hotelier in under 30 minutes of active time (excluding voluntary breaks).
- **SC-006**: Every published recommendation in the report carries: a plain-language explanation, an impact estimate across the documented dimensions, an alternatives list, a "what happens if you do nothing," and a confidence level — measured at 100 % coverage across reports.
- **SC-007**: Every report contains a "What not to do now" section with at least one explicitly de-prioritized action and a plain-language reason — measured at 100 % coverage.
- **SC-008**: At least 90 % of hoteliers surveyed after a published report report that the recommendations "felt specific to my hotel" rather than generic.
- **SC-009**: At least 80 % of consultants surveyed after a consultant-assisted engagement report that the platform "saved meaningful preparation time" relative to producing a comparable audit manually.
- **SC-010**: For every recommendation rendered, an authorized inspector can enumerate the specific signals, answers, and vendor fields that informed it — measured at 100 % traceability.
- **SC-011**: For every vendor entry surfaced in any shortlist, an authorized inspector can identify the source label, contributor, and last-verified date of each decision-relevant field — measured at 100 % governance coverage.
- **SC-012**: No more than 5 % of vendor entries surfaced in a shortlist carry a freshness indicator older than the configured staleness window at the time of the report, measured across a representative sample.
- **SC-013**: When the same hotel completes the questionnaire twice with materially different budget or goal selections, the produced reports differ visibly in scenarios, tool shortlists, and roadmap — verified by an A/B regression test set.
- **SC-014**: When the team publishes a question change, the next audit reflects the change while reopened historical audits continue to render their original wording — measured at 100 % preservation.
- **SC-015**: For French hotels who opt into funding-readiness, the generated brief contains the documented sections in 100 % of cases and carries the eligibility disclaimer in 100 % of cases.
- **SC-016**: The platform handles a website that is unreachable, blocked, or non-hotel without losing the visitor in at least 95 % of such cases, measured by continuation rate into the questionnaire.
- **SC-017**: Consultants can override any client answer with their own assessment, recompute the report, and publish a curated client-facing version that excludes private internal content — measured at 100 % separation in a published artifact.
- **SC-018**: Candidate enrichments extracted from audits are queued for team review in 100 % of cases where the audit mentions a vendor, integration, limitation, pricing detail, or operational use case not yet in the database — verified by sampled audits.
- **SC-019**: Across a corpus of at least N completed audits (where N is determined by the team's calibration), the platform surfaces at least one learned pattern per hotel-profile segment for team review.
- **SC-020**: All published reports remain readable and faithful to what was rendered at publication time, regardless of any subsequent change to vendors, questions, or scoring — measured at 100 % preservation across a regression sample.

## Assumptions

- The platform inherits foundational primitives from the existing audit system (project lifecycle, tokenized client access, autosave, internal notes, operational audit log, multilingual delivery in French) and extends rather than replaces them.
- French is the primary language for the initial market; the platform's content architecture must allow additional languages without engineering changes per question, but content production for additional languages is a separate workstream not in scope here.
- The funding-readiness module is initially scoped to the French market; for hotels outside France the module either redirects to a generic project-brief generator or transparently states that no localized funding pathway is currently available.
- Vendor data accuracy depends on a content workstream parallel to the engineering work; the platform's governance features (provenance, freshness, confidence) are designed to make that workstream sustainable but do not replace it.
- Voice transcription quality is sufficient for everyday hotel-context vocabulary in the supported languages; the structured-extraction step is the user-facing surface and the raw transcript is always reviewable before commit.
- The platform does not provide legal advice; compliance findings are framed as risk areas and checklist items the hotel can act on or escalate to counsel.
- The platform does not guarantee funding eligibility or award; the funding-readiness brief is preparation material, not an application.
- Self-enriching, learning-loop, and integration-layer capabilities (User Stories 11, 12, 14) depend on a meaningful audit corpus and on the governance layer (User Story 10) being in place; the spec describes them as in scope but does not assert their value before the corpus exists.
- Implementation-tier engagements (User Story 13) are highest-touch, lowest-volume by design; the platform is the support spine, not a replacement for human delivery.
- Tiered packaging (User Story 9) defines commercial offers; the underlying flows (scan, questionnaire, decision-support, consultant mode) are independent capabilities.
- The hotel-technology vendor database is populated and curated by the Rinzler team; the self-enriching pipeline (User Story 11) augments but does not replace deliberate curation.
- Performance, mobile usability, and accessibility expectations follow standard modern web norms; concrete targets are captured in Success Criteria, not as implementation specifications.
- Standard authentication for the team-facing surfaces is session-based with role scoping; client access remains link-based without account creation.
- Data retention follows applicable European regulation and the hotel-client relationship's natural lifecycle; specific durations are configured operationally rather than fixed in this spec.
- Integration-hub workflows (User Story 14) are subject to the same compliance posture as the rest of the platform; new workflows do not bypass vendor DPAs, consent capture, or EU-hosting verification.
