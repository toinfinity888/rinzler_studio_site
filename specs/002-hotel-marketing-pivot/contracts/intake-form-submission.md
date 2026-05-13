# Contract — Intake-Form Submission

**Feature**: 002-hotel-marketing-pivot
**Surface**: `src/index.html` (modal `#audit-modal`) + `src/scripts/main.js` (form handler)
**Transport**: HTTP POST to Formspree
**Status**: v1 (replaces v0 transport-flavoured submission shape)

---

## Endpoint

```
POST https://formspree.io/f/{FORMSPREE_ID}
```

- `{FORMSPREE_ID}` is the studio's Formspree form ID, hardcoded in `src/scripts/main.js` as the constant `FORMSPREE_ID` (current value `xqewrjzy`). Unchanged by this pivot.
- The endpoint, the transport vendor, and the inbox routing are all untouched. Only the submission body and the `_subject` line change.

## Request

### Headers

```
Content-Type: application/json
Accept: application/json
```

### Body (JSON)

```json
{
  "name":      "Jean Dupont",
  "hotel":     "Hôtel des Tilleuls",
  "email":     "jean@hotel-tilleuls.fr",
  "phone":     "+33 6 12 34 56 78",
  "typology":  "independent",
  "rooms":     22,
  "pms_stack": "Mews + Cloudbeds (channel manager)",
  "message":   "Nous voulons clarifier notre stack avant de changer de PMS l'été prochain.",
  "_subject":  "Nouvelle demande de diagnostic digital hôtel — Hôtel des Tilleuls"
}
```

### Field constraints

| Field        | Type    | Required | Constraint                                                                 |
|--------------|---------|----------|-----------------------------------------------------------------------------|
| `name`       | string  | ✅       | 1–120 chars                                                                |
| `hotel`      | string  | ✅       | 1–120 chars                                                                |
| `email`      | string  | ✅       | RFC 5322 lite (HTML5 `type="email"`)                                       |
| `phone`      | string  | ✅       | 1–40 chars; free format                                                    |
| `typology`   | enum    | ✅       | one of: `independent`, `small-group`, `hotel-restaurant`, `maison-d-hotes` |
| `rooms`      | integer | ⛔       | 1–500 if present                                                           |
| `pms_stack`  | string  | ⛔       | ≤ 250 chars                                                                |
| `message`    | string  | ⛔       | ≤ 2 000 chars                                                              |
| `_subject`   | string  | system   | constructed in `main.js`, MUST start with `Nouvelle demande de diagnostic` |

Optional fields that are empty in the form MAY be omitted from the JSON body OR sent as empty strings — either is acceptable to Formspree.

### Validation responsibility

**Client-side (browser)** is the validation boundary:

- Required-field enforcement via HTML5 `required` attribute on `name`, `hotel`, `email`, `phone`, `typology`.
- Email format via HTML5 `type="email"`.
- Phone is a free string; no format enforcement (international formats vary too much for a regex).
- Typology enum enforced by `<select>` + `required` (the placeholder option is `disabled` and `selected` by default but un-submittable).
- Length caps via `maxlength` on text inputs and `<textarea>`.

**Server-side**: Formspree forwards as-is. The studio inbox is the human verifier. No server-side rejection is expected.

## Response

### Success (HTTP 200 / 201)

```json
{ "ok": true, ... }
```

Triggered actions in `main.js`:

1. Modal contents swapped to the success panel with FR-028 wording:
   ```
   ✅ Demande envoyée
   Nous reviendrons vers vous sous 24 h pour planifier votre diagnostic hôtel.
   ```
2. Plausible event fired:
   ```js
   plausible('Audit Request', {
     props: { hotel: <hotel>, typology: <typology>, rooms: <rooms-or-undefined> }
   });
   ```
   Event name `Audit Request` preserved per Assumptions (legacy taxonomy). Prop key `company` renamed to `hotel`, and `sector` renamed to `typology`. `rooms` added.
3. Form fields reset.

### Error (HTTP non-2xx, network failure, timeout)

Triggered actions in `main.js`:

1. Submit button restored from spinner to original label ("Demander un diagnostic digital hôtel").
2. A French error message is displayed:
   ```
   Une erreur est survenue. Veuillez réessayer ou nous contacter directement à hello@rinzlerstudio.com.
   ```
3. No Plausible event is fired on failure.

## Backwards compatibility

Not preserved. The v1 body shape replaces v0 atomically at deploy time. The Formspree inbox routing is unchanged, so the studio still receives all submissions; only the parsed JSON shape and the subject line differ from v0.

## Test scenarios (manual, captured in quickstart.md)

1. Submit with only required fields → expect success modal + Plausible event.
2. Submit with all fields populated → expect success modal + Plausible event with full props.
3. Submit with required fields missing → expect HTML5 native validation messages; no network request.
4. Submit with `typology` left at placeholder → expect HTML5 validation block; no network request.
5. Network failure (offline) → expect error message; submit button re-enabled; no Plausible event.
