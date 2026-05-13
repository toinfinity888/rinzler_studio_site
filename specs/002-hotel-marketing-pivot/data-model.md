# Phase 1 — Data Model

**Feature**: 002-hotel-marketing-pivot
**Date**: 2026-05-13

## Scope

This feature is a **content pivot on a static site**. There is no database, no ORM, and no server-side persistence in the marketing-site sub-stack (constitution: "no Node process in production"). The only data shape affected by this pivot is the **intake-form submission body** sent to Formspree on form submit (`src/scripts/main.js`).

The audit platform under `audit/` (feature 001) is a separate application with its own persistent schema (`audit/db/schema.ts`) and is unaffected by this feature.

## Entity: `IntakeFormSubmission` (v1)

Transient, in-flight only. Constructed in the browser from form inputs, POSTed to Formspree as JSON, and not persisted on the marketing-site server side.

### Field schema

| Field           | Type    | Required | Source UI field                          | Validation                                                 | Notes                                                                                       |
|-----------------|---------|----------|------------------------------------------|------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| `name`          | string  | ✅       | `#audit-name` ("Nom complet")             | non-empty, ≤ 120 chars                                     | Unchanged from v0                                                                           |
| `hotel`         | string  | ✅       | `#audit-hotel` ("Hôtel")                  | non-empty, ≤ 120 chars                                     | **Renamed** from v0 `company` / "Entreprise" (FR-029). Input name attribute MAY stay `name="company"` to preserve Plausible payload key; field LABEL changes.   |
| `email`         | string  | ✅       | `#audit-email`                            | RFC 5322 lite (HTML5 `type="email"`)                       | Unchanged                                                                                   |
| `phone`         | string  | ✅       | `#audit-phone`                            | non-empty; free format (HTML5 `type="tel"`)                | Unchanged                                                                                   |
| `typology`      | enum    | ✅       | `#audit-typology` (4-option `<select>`)   | one of: `independent`, `small-group`, `hotel-restaurant`, `maison-d-hotes`  | **Replaces** v0 `sector` 6-option dropdown (FR-030). Internal value uses kebab-case; user-facing label is French (Hôtel indépendant, Petit groupe hôtelier, Hôtel-restaurant, Maison d'hôtes). No "Autre" option in v1. |
| `rooms`         | number  | ⛔ optional | `#audit-rooms` ("Nombre de chambres")    | integer 1–500; HTML5 `type="number" min="1" max="500"`     | **New field** (FR-029). Used for lead segmentation; not displayed back to visitor.          |
| `pms_stack`     | string  | ⛔ optional | `#audit-pms-stack` (textarea, 1 row)      | ≤ 250 chars                                                | **New field** (FR-029). Free text — visitor names current PMS / moteur de réservation / channel manager if they know them. Vendor-neutral.                |
| `message`       | string  | ⛔ optional | `#audit-message` (textarea)               | ≤ 2 000 chars                                              | Placeholder text changes to hotel-flavoured prompt (FR-029).                                |
| `_subject`      | string  | system   | constructed in `main.js`                 | n/a                                                        | Rewritten from `"Nouvelle demande d'audit - ${company}"` to `"Nouvelle demande de diagnostic digital hôtel — ${hotel}"`. |

### Validation rules

1. **Required-field client validation**: HTML5 `required` on `name`, `hotel`, `email`, `phone`, `typology`. The submit button stays disabled until all five are populated and the email pattern matches.
2. **Typology enum**: enforced by `<select>` options + `required` attribute; the form cannot be submitted with the placeholder "Sélectionnez la typologie de votre établissement" still selected.
3. **Rooms bounds**: HTML5 `min="1" max="500"`; visitors typing outside the range get a native browser validation message. No JS validation needed.
4. **Length caps**: enforced by `maxlength` attribute on text inputs and textareas; longer pastes are silently truncated by the browser before submit.
5. **No server-side schema enforcement**: Formspree forwards whatever the client sends; the schema discipline lives in the client form. The studio's inbox is the human validator of last resort.

### Lifecycle (state transitions)

```
[idle, fields empty]
   ↓ visitor opens modal (any intake CTA)
[idle, modal open]
   ↓ visitor types
[partial, some fields valid]
   ↓ visitor completes all required fields
[ready-to-submit]
   ↓ visitor clicks "Envoyer ma demande" (now "Demander un diagnostic digital hôtel" per FR-028)
[submitting]    ← submit button shows spinner
   ↓ network response
   ├── 2xx → [success]  → modal swapped to confirmation panel (FR-028 wording: "Nous reviendrons vers vous sous 24 h pour planifier votre diagnostic hôtel.")
   └── non-2xx / network err → [error] → button restored, alert displayed
```

### Migration from v0

The legacy v0 schema is currently in production:

```json
{
  "name": "...", "company": "...", "email": "...", "phone": "...",
  "sector": "transport|commerce|services|industrie|sante|autre",
  "message": "...",
  "_subject": "Nouvelle demande d'audit - ${company}"
}
```

Migration is a **breaking change of the submission shape** in a single deploy. There is no production data to migrate (Formspree forwards inbox emails, no DB to migrate). Concerns:

1. The Plausible `Audit Request` event currently sends `props.sector = formData.get('sector')`. Post-pivot, the same prop name carries the new typology value (kebab-case enum). The dashboard view of that prop will accumulate the new values starting at the release; legacy values frozen at pivot time.
2. The `_subject` line change does not affect deliverability — Formspree treats it as the email subject, the studio still receives every submission.
3. The studio's inbox filter rules (if any) keying on `Nouvelle demande d'audit` MUST be updated to also match `Nouvelle demande de diagnostic`. Captured as a deploy-time checklist item in `quickstart.md`.

## No other entities

- No User entity (no auth on the marketing site).
- No Project / Lead entity persisted by this site (Formspree owns the inbox lifecycle).
- No ROI-calculator persistence beyond the existing `localStorage` key (`rinzler_roi_calculator`) which is preserved unchanged — labels render against whatever values were saved; no migration needed.

## References

- Spec FR-029, FR-030 (form fields + typology selector).
- Spec FR-028 (modal/confirmation wording).
- Spec Assumptions (Plausible taxonomy preservation).
- Constitution Principle I (RGPD): every new collected field MUST be reflected in `mentions-legales.html` and `politique-confidentialite.html` in the same release.
