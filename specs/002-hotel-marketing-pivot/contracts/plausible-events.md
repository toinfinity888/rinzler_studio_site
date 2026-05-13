# Contract — Plausible Custom Events

**Feature**: 002-hotel-marketing-pivot
**Surfaces**: `src/index.html`, `src/calculator.html`, `src/scripts/main.js`, `src/scripts/calculator.js`
**Plausible domain**: `rinzlerstudio.fr` (unchanged by this feature)
**Status**: v1 — event taxonomy preserved; only payload values change.

---

## Preservation rule

Per the Assumptions section of the spec (and Principle V), the **event names and `data-cta-id` strings stay literally identical** across the pivot. Only the rendered CTA labels and the *values* of certain props change. This preserves dashboard comparability with pre-pivot data.

> If a dashboard chart breaks because of this pivot, that's a bug in the implementation — not the intended behaviour.

## Event catalogue

### 1. `Audit Request`

Fired when an intake-form submission succeeds (`main.js`, success branch).

```js
plausible('Audit Request', {
  props: {
    hotel:    "<value of formData.get('hotel')>",
    typology: "<value of formData.get('typology')>",
    rooms:    <number-or-undefined>
  }
});
```

Changes from v0:

- Prop `company` → renamed `hotel`. Internal form field name attribute can keep `name="company"` to make this a pure server-side label rename if preferred; otherwise update both.
- Prop `sector` → renamed `typology`; value space changes from generic-SME enum to hospitality 4-option enum.
- New prop `rooms` (optional integer).
- Event name **unchanged** (`Audit Request`).

### 2. CTA click events (implicit, via `data-cta` markers)

The page uses `data-cta` and `data-cta-id` attributes on its primary CTAs. Plausible's "outbound link / file download" tracker doesn't auto-fire on these; if explicit click events exist in `main.js`, they MUST keep the same `data-cta-id` strings post-pivot:

| Surface                     | `data-cta-id`        | Action                                                              |
|-----------------------------|----------------------|----------------------------------------------------------------------|
| Header CTA                  | (no id today)        | Opens modal — label changes to "Diagnostic"; id unchanged          |
| Hero CTA                    | `hero-cta`           | Opens modal — label changes to "Demander un diagnostic digital hôtel" |
| Pain-bridge CTA             | `pain-bridge-cta`    | Navigates to `./calculator.html` — label changes per FR-027b        |
| ROI preview CTA             | (no id today)        | Navigates to `./calculator.html` — label changes per FR-027b        |
| Final CTA                   | `final-cta`          | Opens modal — label changes per FR-041                              |

The `data-cta-id` strings are internal identifiers and stay literal. If a Plausible event is fired with these as props in a future iteration, the analytics dashboard remains comparable.

### 3. Calculator interaction events (current behaviour)

The calculator script doesn't emit explicit Plausible events today (only the page-view tracker fires automatically). This feature does NOT add new calculator events; the scope is content only.

## Privacy posture (Principle I)

- All emitted props are derived from form fields the visitor explicitly submitted.
- `hotel` (formerly `company`) is business name, not personal name; acceptable for Plausible per RGPD analytic-purposes exemption.
- `rooms` is a numeric business attribute; acceptable.
- `typology` is an enum; acceptable.
- **DO NOT** add `email`, `phone`, or free-text `message` / `pms_stack` to Plausible props — those are PII and would violate Principle I and the constitution's "MUST NOT capture free-text user input" rule for analytics events.

## Verification (manual, in quickstart.md)

1. Open `/` in dev with the network tab filtering on `plausible.io`.
2. Submit the intake form successfully.
3. Confirm exactly one `event` payload is sent with `name=Audit Request` and `props={hotel, typology, [rooms]}`.
4. Confirm NO request contains `email`, `phone`, `message`, or `pms_stack` as a prop value.
5. Cross-check the Plausible dashboard 24 h later: the `Audit Request` goal is incremented, and the `typology` breakdown shows the new enum values.
