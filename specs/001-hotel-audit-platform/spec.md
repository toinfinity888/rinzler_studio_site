# Feature Specification: Hotel Audit Platform

**Feature Branch**: `001-hotel-audit-platform`
**Created**: 2026-05-09
**Status**: Draft
**Input**: User description: "Build a modern, elegant, responsive web application for hospitality modernization assessments and operational audits for hotels. Private client-facing assessment form via tokenized URL, admin dashboard, JSON export, lightweight scoring, future AI extensibility."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Consultant creates an engagement and sends an audit link (Priority: P1)

A Rinzler Studio consultant working with a prospective hotel client opens the
admin dashboard, creates a new project tied to that hotel, optionally pre-fills
the information they already know (hotel name, contact, room count), and obtains
a unique private URL they can paste into an email. The hotel contact opens the
URL — without any account or login — and lands on a clean, branded landing
screen explaining what the audit is and how long it takes.

**Why this priority**: This is the entry point for every other flow in the
system. Without project creation and a working private URL, neither the client
form nor the dashboard has anything to act on. It is also the smallest slice
that delivers business value on its own — even before the form is fully built,
the consultant gets a structured place to register prospects.

**Independent Test**: A consultant signs into the admin dashboard, creates a
project for "Hôtel Test", optionally pre-fills the hotel name and contact
email, and copies the generated URL. Opening that URL in a private/incognito
browser window loads a branded, no-login landing page that displays the
pre-filled hotel name. The same project appears in the dashboard list with
status "Sent / awaiting response".

**Acceptance Scenarios**:

1. **Given** an authenticated admin on the dashboard, **When** they create a
   new project with hotel name and contact email and click "Generate link",
   **Then** the system returns a unique URL that is unguessable (cryptographically
   strong token), the project appears in the project list with status
   "Awaiting response", and the URL can be copied to the clipboard in one click.
2. **Given** an admin has pre-filled three Section 1 fields, **When** the client
   opens the private URL, **Then** those three fields are visible (and editable)
   on the form with no other client-side login or verification required.
3. **Given** a private URL has been generated, **When** an unauthenticated user
   without that URL tries to access the form route or guess another project's
   URL, **Then** the system returns a generic "not found" response without
   leaking which projects exist.

---

### User Story 2 — Hotel client completes the multi-section audit (Priority: P1)

The hotel contact opens the private URL and is guided through eight sections
covering hotel overview, software stack, operations, commercial/financial,
guest experience, automation interest, priorities & constraints, and open
comments. The form feels structured and elegant, not overwhelming: only a few
fields per screen, a visible progress indicator, smooth transitions, tooltips
for technical terms (e.g., PMS, ADR, OTA), and the ability to skip any
non-required field. Their progress is saved automatically as they answer, so
they can leave and return later from the same URL without losing data. They
finally submit the assessment and receive a clear confirmation.

**Why this priority**: This is the core value transfer — the audit data is the
product. A polished, low-friction form is the difference between a 60% and a
20% completion rate, and completion rate directly drives the studio's pipeline.

**Independent Test**: A client opens a fresh private URL, fills in Section 1
required fields, partially fills Sections 2–4, closes the browser, reopens the
same URL the next day, sees their previous answers restored, completes the
remaining sections, submits, and sees a confirmation screen. The submission
appears in the admin dashboard with the correct answers and a completion
percentage of 100%.

**Acceptance Scenarios**:

1. **Given** a client is on Section 3, **When** they answer two questions and
   wait at least the autosave interval (or navigate to the next section),
   **Then** their answers are persisted server-side without an explicit save
   action, and reloading the page restores those answers.
2. **Given** a client tries to advance past Section 1 with the hotel-name field
   empty, **When** they click "Next", **Then** the form blocks navigation,
   highlights the missing required field, and shows a clear inline message in
   French; non-required fields never block navigation.
3. **Given** a client is on a section with technical jargon (e.g., "Channel
   manager", "ADR"), **When** they hover or tap the field's help icon, **Then**
   a plain-language tooltip explains the term in French.
4. **Given** a client completes all eight sections, **When** they click
   "Submit", **Then** they see a confirmation screen, the project's status in
   the admin dashboard changes to "Submitted", and the completion percentage
   reaches 100%.
5. **Given** a client opens the URL on a mobile device, **When** they navigate
   between sections, **Then** the layout remains readable, inputs are
   thumb-reachable, and transitions remain smooth.

---

### User Story 3 — Consultant reviews a submission and exports it (Priority: P1)

The consultant returns to the dashboard, sees that a submission has arrived,
opens it, and gets a clean read-only view of every answer organized by section.
Beside the answers they see a private "consultant notes" panel that the client
will never see. They can export the full submission as a structured JSON file
suitable for archiving or feeding into downstream tools, and view the data in
a structured, print-ready layout that will eventually become a PDF report.

**Why this priority**: The whole workflow exists to feed the consultant's
deliverable. Without an organized review and a clean export, the data is
trapped in the database and the consultant cannot produce the audit report
the client paid for.

**Independent Test**: An admin opens a submitted project, reads the answers
section by section, types two notes into the internal notes panel, clicks
"Export JSON" and gets a single file containing every answer plus project
metadata. Re-opening the project later still shows the notes. The print/PDF
view renders the same data in a clean, branded layout.

**Acceptance Scenarios**:

1. **Given** a submission exists, **When** the admin opens it, **Then** every
   answered field is displayed grouped by the eight sections, unanswered
   optional fields are shown as "—" or "Non renseigné", and the layout is
   read-only by default.
2. **Given** the admin is viewing a submission, **When** they click "Export
   JSON", **Then** the system produces a single JSON document containing all
   project metadata, all client answers grouped by section, computed scores,
   and timestamps; the schema is stable enough to be parsed by external tools.
3. **Given** the admin types notes in the internal-notes panel, **When** they
   reload the page or another admin opens the same project, **Then** the notes
   are visible to admins but **never** appear in the client's view of the
   form or in any data the client could access via the private URL.
4. **Given** a submission exists, **When** the admin opens the structured
   "report view", **Then** the layout uses the studio's brand styling, prints
   cleanly to PDF from the browser, and contains every answer plus the four
   computed scores.

---

### User Story 4 — Consultant reads at-a-glance scores and dashboard signals (Priority: P2)

When the consultant lands on the dashboard, each project row shows submission
status, completion percentage, last-updated date, priority level (set by the
admin), and — once submitted — four lightweight scores: automation
opportunity, operational complexity, modernization readiness, and digital
maturity level. These give the consultant a quick way to triage which prospects
to call first.

**Why this priority**: Valuable for prioritization but not blocking — a
consultant can still do their job by reading the answers manually. Scores
accelerate triage once the pipeline grows beyond a handful of projects.

**Independent Test**: With at least three submitted projects of clearly
different profiles (one very modern, one very legacy, one mid), the dashboard
list shows differentiated scores that align with the answers, and sorting by
any score column reorders the list correctly.

**Acceptance Scenarios**:

1. **Given** a submission has been received, **When** the dashboard renders the
   project row, **Then** all four scores are displayed with a visual indicator
   (e.g., bar, badge, or numeric value with color band) and recompute if the
   submission is later edited.
2. **Given** the admin clicks a column header (status, priority, completion %,
   any score, last updated), **When** the sort is applied, **Then** the list
   reorders correctly and the chosen sort persists across page reloads in the
   same session.

---

### User Story 5 — Consultant reopens and edits a submitted assessment (Priority: P3)

After a submission, the consultant occasionally needs to reopen the assessment
— either because the client requests a correction, or to invite the client to
fill in fields they originally skipped. The consultant can flip the project
back into "Editable" mode and re-share the same private URL; the client's
existing answers remain intact and editable.

**Why this priority**: Useful but rare. A V1 can ship without it as long as
the dashboard supports it shortly after.

**Independent Test**: Admin opens a submitted project, clicks "Reopen for
client", confirms; the client's URL still works and the form is editable
again with all previous answers preserved. After the client re-submits, the
"submitted" timestamp updates and prior answers are not lost.

**Acceptance Scenarios**:

1. **Given** a project is in "Submitted" state, **When** the admin clicks
   "Reopen", **Then** the project moves back to an editable state, the client
   URL re-allows submission, and the original submission timestamp is preserved
   alongside a new "last edited" timestamp.

---

### Edge Cases

- **Tokenized URL leakage / sharing**: A private URL forwarded by the client
  to a colleague still works (no per-device binding) but never grants access
  to other projects; admins can revoke a URL, after which it returns "not
  found" to anyone who holds it.
- **Client tries to submit with required fields empty**: Submission is
  blocked with inline messages on each missing required field; the client is
  scrolled to the first error.
- **Network loss mid-form**: The form keeps a local copy of unsaved answers
  and retries autosave; the client sees a discreet "saving…" / "saved" / "offline"
  indicator and is never silently dropped.
- **Two browser tabs open on the same URL**: The most recent autosave wins;
  the second tab is shown a "this assessment was updated in another window —
  reload?" notice rather than overwriting silently.
- **Admin deletes a project with answers**: A confirmation modal warns the
  admin that all client answers will be permanently lost; deletion is logged
  with the admin's identity.
- **Client opens a revoked or expired URL**: Generic "this link is no longer
  active — please contact your consultant" page; no project metadata leaked.
- **Very long free-text answers** (Section 8 or "frustrations" fields): The
  form imposes a generous but finite character cap (e.g., 5 000 chars) and
  shows a counter near the limit.
- **Browser refresh on the last step before submit**: The user returns to
  the same step with all answers intact; no double submission is created.
- **Admin loses session mid-compose of an internal note**: The composer
  preserves the in-progress note text in local storage; on re-login the
  admin is returned to the same project view with the draft restored.
- **Concurrent admin notes on the same project**: Both notes are appended
  to the thread in chronological order; no merge or last-write-wins is
  needed because notes are append-only and never overwrite one another.
- **Client opens the URL on a very small viewport (≤ 360 px)**: All inputs
  and CTAs remain usable; sliders fall back to a numeric input if needed.

## Clarifications

### Session 2026-05-09

- Q: How should admins authenticate to the dashboard? → A: Email + password,
  passwords hashed at rest with a memory-hard KDF (Argon2id, fallback bcrypt).
  Password reset in V1 is operator-handled (DB edit) until a self-serve UI is
  added.
- Q: Where will the audit platform (and client submissions) be hosted? → A:
  o2switch (French cPanel hosting), same provider as the existing marketing
  site — French data residency, RGPD-aligned, brand-consistent with "IA
  souveraine". Compatibility of Next.js + server actions with o2switch's
  Node.js / Passenger setup is a planning-phase concern.
- Q: How many admin seats does V1 need? → A: A single hardcoded admin user
  in V1 (one credential row, no in-app user-management UI). The data model
  may still keep an `admins` table to leave room for future multi-admin
  support without a destructive migration, but only one row exists at
  launch; multi-admin and in-app invitations are future enhancements.
- Q: What is the default data retention policy for client submissions? → A:
  Auto-purge a project's submission 36 months after the project's last admin
  activity (aligned with CNIL's 3-year B2B prospect baseline). Admins can
  mark a project as "ongoing engagement" to extend retention while the
  engagement is active. The privacy notice MUST disclose this policy.
- Q: How are internal consultant notes structured per project? → A: Multiple
  timestamped notes per project (append-only thread). Each note carries
  author, created-at timestamp, and body. Notes are immutable once written
  in V1 (no edit, no delete) — admins add a follow-up note for corrections.
  Eliminates the concurrent-edit edge case and future-proofs collaboration.

## Requirements *(mandatory)*

### Functional Requirements

#### Project & Access Management

- **FR-001**: Admins MUST be able to create a new project tied to a hotel,
  providing at minimum a project label and a contact email.
- **FR-002**: The system MUST generate a unique, cryptographically strong
  access token (≥ 128 bits of entropy) for each project, embedded in a
  shareable private URL.
- **FR-003**: The private URL MUST grant access to exactly one project's
  assessment form and to nothing else; the token MUST be the only credential
  required for the client.
- **FR-004**: Admins MUST be able to revoke a project's URL; after revocation,
  the URL MUST return a generic "no longer active" page.
- **FR-005**: Admins MUST be able to pre-fill any field in any section before
  the URL is shared, and pre-filled values MUST appear (and be editable) for
  the client.
- **FR-006**: The system MUST NOT leak project existence to unauthenticated
  visitors who do not hold a valid token (no enumeration of projects, no
  distinguishable error between "no such project" and "wrong token").

#### Client Form Experience

- **FR-007**: The form MUST be presented as a multi-step flow with one section
  per step and a visible progress indicator.
- **FR-008**: The form MUST autosave the client's answers in the background
  after a short period of inactivity (target: ≤ 5 seconds) and on navigation
  between sections, without requiring an explicit save action.
- **FR-009**: The form MUST display per-field state ("saving…", "saved",
  "offline / will retry") so the client always knows whether their progress
  is safe.
- **FR-010**: The form MUST validate only the required fields enumerated in
  Section 1 (hotel name, hotel type, number of rooms, location, main contact
  name, contact email) and MUST allow every other field to be skipped.
- **FR-011**: The form MUST present help text / tooltips for technical terms
  (PMS, channel manager, ADR, OTA, CRM, etc.) in plain French.
- **FR-012**: The form MUST be fully usable on mobile viewports down to 360 px
  wide, including the operational difficulty sliders in Section 3.
- **FR-013**: The form MUST allow the client to navigate forward and backward
  freely between sections without losing data, except that "Submit" requires
  required fields to be filled.
- **FR-014**: On submission, the client MUST see a confirmation screen that
  states the audit was received and that the consultant will follow up.

#### Form Content (Schema)

- **FR-015**: The form MUST collect Section 1 — Hotel Overview fields:
  required (hotel name, hotel type, number of rooms, location, main contact
  name, contact email) and optional (website URL, star rating, average
  occupancy, ADR, number of employees, hotel positioning description).
- **FR-016**: The form MUST collect Section 2 — Current Software Stack across
  the categories PMS, booking engine, channel manager, website CMS, CRM,
  payment provider, review management, housekeeping, communication, and "other
  operational software", capturing for each: current provider, monthly cost,
  contract status, satisfaction level, and main frustrations.
- **FR-017**: The form MUST collect Section 3 — Operations & Workflows using
  textarea fields, optional multiple-choice selectors, and operational
  difficulty rating sliders, covering the seven prompts listed in the input
  description.
- **FR-018**: The form MUST collect Section 4 — Commercial & Financial fields
  (OTA dependency %, main OTA platforms, direct booking challenges, estimated
  monthly software costs, biggest operational costs, current marketing
  channels, current website-performance satisfaction, biggest revenue
  frustrations).
- **FR-019**: The form MUST collect Section 5 — Guest Experience prompts
  (check-in/out process, self check-in availability, communication process,
  complaints patterns, review management process, personalization
  capabilities, upsell process, messaging channels used).
- **FR-020**: The form MUST collect Section 6 — Automation & Modernization
  interest prompts (interest in automation, AI-assisted operations, PMS
  migration openness, manual workload reduction, direct-booking growth,
  operational reporting, staff reduction through automation, desired
  modernization goals).
- **FR-021**: The form MUST collect Section 7 — Priorities & Constraints
  fields (budget sensitivity, timeline expectations, operational constraints,
  existing vendor commitments, biggest concerns regarding modernization,
  internal resistance to change, preferred implementation pace).
- **FR-022**: The form MUST collect Section 8 — Open Comments as a single
  large free-text area covering additional concerns, goals, notes, questions,
  and strategic vision.
- **FR-023**: The form schema MUST be defined declaratively (a single source
  of truth describing sections, fields, types, labels, help text, and
  validation) so that adding, removing, or relabeling fields does not require
  changing UI rendering code in multiple places.

#### Admin Dashboard

- **FR-024**: Access to the admin dashboard MUST be gated by authentication;
  no unauthenticated visitor MUST be able to view any project, submission, or
  internal note.
- **FR-025**: The dashboard MUST list all projects with: project label, hotel
  name, submission status, completion percentage, last-updated date, priority
  level, and the four computed scores when available.
- **FR-026**: Admins MUST be able to set and update each project's priority
  level (e.g., low / medium / high) from the dashboard, and to append
  internal notes to a project's notes thread (notes are append-only, not
  editable or deletable in V1).
- **FR-027**: Admins MUST be able to open a project to see a read-only,
  section-grouped view of every client answer alongside the project's
  internal-notes thread (chronological, with author and timestamp per entry)
  and an "add note" composer.
- **FR-028**: Internal notes MUST never be exposed via the client URL or any
  client-accessible response, even by URL guessing or API enumeration.
- **FR-029**: Admins MUST be able to reopen a submitted project to allow the
  client to edit and re-submit; previous answers MUST be preserved.
- **FR-030**: Admins MUST be able to sort and filter the project list at
  least by status, priority, completion %, last-updated date, and any of the
  four scores.

#### Scoring & Analytics

- **FR-031**: The system MUST compute four scores per submitted project:
  Automation Opportunity, Operational Complexity, Modernization Readiness,
  and Digital Maturity Level, using deterministic heuristics over the
  client's answers.
- **FR-032**: Scores MUST be re-computed automatically whenever an answer
  changes (e.g., after a reopened submission is re-submitted).
- **FR-033**: The scoring logic MUST be isolated in a single, replaceable
  module so that future AI-generated scoring can be swapped in without
  changes to the form or dashboard UI.

#### Export & Reporting

- **FR-034**: Admins MUST be able to export a single project's submission as
  a JSON file with one click, containing project metadata, all answers grouped
  by section, the four scores, and relevant timestamps.
- **FR-035**: The exported JSON MUST conform to a documented, versioned schema
  so that downstream tooling can rely on a stable structure.
- **FR-036**: Admins MUST be able to view a structured, brand-consistent
  report layout of a submission that prints cleanly to PDF from the browser;
  this layout MUST contain every answer and the four scores.

#### Design & Brand

- **FR-037**: The visual design MUST feel premium, minimalist, modern, and
  consistent with the studio's existing brand (dark hero aesthetic, Inter
  typeface, design tokens), and MUST clearly avoid generic "enterprise
  software" styling.
- **FR-038**: The application MUST support a dark mode and a light mode; the
  default MUST be dark for the client form (matching the studio brand) and
  the choice MUST persist per visitor.
- **FR-039**: All transitions between form sections MUST feel smooth (≤ 250 ms
  perceived duration) and MUST never block input or scroll.
- **FR-040**: The application MUST be fully responsive across viewports from
  360 px to 1 920 px wide.

#### Privacy, Security & Data

- **FR-041**: All client data submitted via the form MUST be stored in a
  single backend system controlled by the studio, hosted in France / the EU
  (V1: o2switch, same provider as the marketing site). No cross-posting to
  third-party form services. The privacy notice on the form's landing screen
  MUST disclose the hosting jurisdiction.
- **FR-042**: The application MUST comply with the studio's existing
  RGPD-first stance: cookie-free analytics on the client form, an explicit
  privacy notice on the form's landing screen linking to
  `politique-confidentialite.html`, and lawful basis for the data collected.
- **FR-043**: Authentication MUST apply only to the admin dashboard; client
  form access MUST remain credential-free apart from the tokenized URL.
- **FR-044**: Admin actions that change or delete data (project deletion,
  reopening submissions, revoking URLs) MUST be recorded with timestamp and
  acting admin identity for traceability.
- **FR-044a**: Admin authentication MUST use email + password. Passwords MUST
  be hashed at rest with a memory-hard key-derivation function (Argon2id
  preferred; bcrypt acceptable). Plaintext passwords MUST never be logged or
  persisted. Password reset in V1 is operator-handled (direct database edit
  by a trusted operator); a self-serve reset flow is a future enhancement.
- **FR-044b**: Each Project MUST carry a `last_admin_activity_at` timestamp,
  updated whenever an admin opens, edits, exports, or otherwise interacts
  with the project. Submissions whose project has had no admin activity for
  **36 months** MUST be automatically purged (client answers, scores, and
  internal notes deleted; project metadata retained as a tombstone with a
  "purged" status). Admins MUST be able to mark a project as "ongoing
  engagement" to suspend the auto-purge clock for that project. Auto-purge
  MUST be logged as an audit-log entry. The privacy notice on the form's
  landing screen MUST disclose this 36-month retention policy.

#### Extensibility

- **FR-045**: The architecture MUST allow adding new sections, fields, or
  entire questionnaires (e.g., for a non-hotel industry) by extending the
  declarative form schema, without rewriting form rendering, persistence,
  scoring, or export pipelines.
- **FR-046**: The system MUST expose a clear extension point where future
  AI-generated recommendations can be attached to a submission and surfaced
  in the admin view, without changing the client form or the JSON export
  schema in a breaking way.
- **FR-047**: The data model MUST be structured to allow future
  consultant-collaboration features (multiple admin users assigned to a
  project, comments threads on notes) without a migration that destroys
  existing data.

### Key Entities

- **Project**: A consulting engagement with a single hotel. Holds the hotel's
  identifying information, status (draft / awaiting response / in progress /
  submitted / archived), priority level, timestamps (created, sent, last
  updated, submitted), and the access token. One project owns one
  Submission.
- **Access Token**: The credential embedded in the private URL. Bound to
  exactly one Project, opaque, revocable, and unguessable. Carries no
  permissions beyond reading and writing its project's submission.
- **Submission**: The collection of client answers for a project, organized
  by Section. Carries completion percentage, autosave timestamps, and the
  computed scores.
- **Section**: A logical group of related questions (Sections 1–8 as defined
  above). Defined declaratively in the form schema; not stored as separate
  rows but used for organization in the UI and exports.
- **Answer**: A single client response. Has a field identifier, a value
  (typed: string, number, boolean, enum, slider, multi-select, free text),
  and last-updated timestamp.
- **Score**: A computed numeric or banded value (Automation Opportunity,
  Operational Complexity, Modernization Readiness, Digital Maturity Level)
  derived from a Submission. Re-computed deterministically.
- **Internal Note**: An admin-only annotation attached to a Project. Never
  visible to the client. A Project owns **many** Internal Notes
  (append-only thread). Each note carries author (Admin User), created-at
  timestamp, and free-text body. Notes are immutable in V1: not editable,
  not deletable; corrections are made by appending another note.
- **Admin User**: An authenticated user of the dashboard. Carries identity
  (email), password hash, role (V1: single role "admin"), and is referenced
  by audit records for project mutations. V1 contains exactly one row; the
  table is sized to allow multiple rows in a future iteration without a
  destructive migration.
- **Audit Log Entry**: A timestamped record of admin actions that mutate or
  reveal sensitive data (create/delete project, revoke URL, reopen submission,
  export JSON).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A consultant can create a new project, pre-fill known fields,
  and obtain a shareable private URL in **under 3 minutes** end-to-end.
- **SC-002**: At least **70% of clients** who open a private URL complete and
  submit the assessment within their first session, measured across the first
  20 sent links.
- **SC-003**: A typical hotel client can complete the full assessment in
  **under 30 minutes** of active form time, including the eight sections.
- **SC-004**: After a submission arrives, a consultant can find every answer,
  add internal notes, and export the JSON file in **under 2 minutes** from
  opening the dashboard.
- **SC-005**: The form remains usable and visually polished on every viewport
  width from **360 px to 1 920 px** with no horizontal scroll, no overlapping
  controls, and no broken transitions.
- **SC-006**: Autosave preserves a client's progress such that **0% of
  in-flight answers** are lost after a browser refresh or accidental tab
  close (verified by manual scenarios).
- **SC-007**: Zero client-facing routes expose internal notes, other projects'
  data, or the existence of other projects, verified by an explicit
  authorization test pass.
- **SC-008**: The exported JSON for a fully completed assessment validates
  against the documented export schema for **100%** of fields.
- **SC-009**: Adding a new optional field to an existing section requires
  changes to the **declarative form schema only** — no edits to rendering,
  persistence, or export code paths — and ships in under one developer-hour.
- **SC-010**: Lighthouse / page-load measurement of the client form's first
  meaningful render is **under 2.5 seconds** on a throttled 4G profile (in
  line with the project constitution's performance budget).

## Assumptions

- **Audience & language**: Primary audience is French hotel operators; the
  client-facing form is in French. English is not required for V1.
- **Single tenant**: All projects belong to the studio. Multi-tenant isolation
  (other consultancies) is out of scope for V1.
- **Single admin user, single role**: V1 ships with exactly one admin user
  (one credential row) and one role ("admin / consultant"). Multi-admin
  support, in-app invitations, and granular roles (read-only, restricted,
  etc.) are out of scope; the data model SHOULD nevertheless leave room for
  multiple admin rows so that future expansion is non-destructive.
- **Client identity**: The hotel client is identified by the project they were
  invited to, not by an account; one private URL = one client. Per-individual
  authentication is not required.
- **Token lifetime**: Tokens do not auto-expire by time in V1; revocation is
  manual. A future iteration may add expiry policy.
- **Stack alignment**: Implementation will use Next.js + TypeScript with
  TailwindCSS and a simple SQLite-backed persistence layer for V1, with
  server actions / API routes for mutations. These are user-stated tech
  preferences, captured here so they inform planning; the spec itself remains
  technology-agnostic in its requirements.
- **Hosting separation**: The audit platform is a separate Next.js
  application from the existing static marketing site (Vite-based,
  rinzlerstudio.fr); the two share brand identity but not codebases or
  deployment. Both are hosted on o2switch (French cPanel hosting). The
  planning phase MUST verify that o2switch's Node.js / Passenger environment
  can run a Next.js application with server actions and a SQLite database;
  if not, choose a runtime mode (e.g., static export + lightweight Node API,
  or migrate the audit app to a Node-friendly French sovereign host such as
  Clever Cloud or Scaleway) before implementation.
- **Brand assets**: Logo, color tokens, and typography (Inter) are reused from
  the existing marketing site to maintain visual consistency.
- **Scoring heuristics**: V1 scores are deterministic, hand-tuned heuristics
  over a small set of answer fields (e.g., counts of legacy systems, stated
  interest in automation, OTA dependency band). They are explicitly designed
  to be replaceable by AI-driven scoring later without UI changes.
- **PDF generation**: V1 ships a print-friendly HTML "report view" that the
  consultant can save to PDF from the browser. Server-side PDF generation is
  a future enhancement and not blocking for V1.
- **Email delivery**: V1 does not send emails to clients on the studio's
  behalf; the consultant copies the private URL and sends it manually from
  their own mail client. Automated email is a future enhancement.
- **Data retention**: Submissions are auto-purged 36 months after a
  project's last admin activity (CNIL's standard 3-year B2B prospect
  baseline). Admins may flag a project as "ongoing engagement" to suspend
  the clock for active engagements. RGPD deletion-on-request is handled
  manually by the admin via the dashboard's delete action and supersedes
  the auto-purge clock.
- **Analytics on the client form**: Limited to cookie-free, RGPD-compliant
  events (e.g., section-completion, submission), consistent with the
  constitution's Plausible-only stance.
