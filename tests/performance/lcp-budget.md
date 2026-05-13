# Performance Budget — Marketing Site Hotel Pivot (feature 002)

**Created**: 2026-05-13
**Source**: `specs/002-hotel-marketing-pivot/spec.md` SC-008, constitution "Marketing Site (`src/`) — Performance budget"
**Targets**:
- LCP ≤ 2.5 s on throttled 4G (Mobile, Slow 4G in Chrome DevTools / Lighthouse).
- Total JS shipped to `/` ≤ 50 KB gzipped (excluding Plausible).

---

## Pre-pivot baseline

> Capture **before** any task in this feature edits a `.html` / `.js` file. Run Lighthouse in Chrome DevTools → Performance → Mobile, Slow 4G, 3 runs, take the median.

| Page              | LCP (median) | Total JS gz | Total transfer | Notes |
|-------------------|--------------|-------------|----------------|-------|
| `/` (index)       | _TBD by T003_ | _TBD_       | _TBD_          | Pre-pivot, transport-flavoured copy |
| `/calculator.html`| _TBD by T003_ | _TBD_       | _TBD_          | Pre-pivot, transport-flavoured copy |

**Note on T003 execution**: this file's pre-pivot rows are filled by a contributor who runs the dev server (or stages a build) before any content edits land. The pivot itself does not regress LCP because it is **content-only** (no new JS, no new framework, no new CSS files); the only delta likely to move the needle is the new founder portrait asset (US4) — a single ~50–80 KB WebP added to the network waterfall.

If T003 has not been run, leave the baseline rows as TBD and proceed; the post-pivot measurement still has standalone value against the absolute budget targets above.

---

## Post-pivot measurement (after T076 / T077)

| Page              | LCP (median) | Total JS gz | Total transfer | LCP delta | Verdict |
|-------------------|--------------|-------------|----------------|-----------|---------|
| `/` (index)       |              |             |                |           |         |
| `/calculator.html`|              |             |                |           |         |

**Verdict criterion**: PASS if LCP ≤ 2.5 s AND total JS gz ≤ 50 KB AND LCP delta vs baseline ≤ +200 ms.

---

## Slow-3G hero readability check (SC-008 sub-clause)

Sub-clause: on simulated Slow 3G in DevTools, the hero H1 + sub-headline + primary CTA must render and be tappable within 3 s, with no dependency on the hero video having loaded.

| Page              | Hero text readable in ≤ 3 s? | Hero CTA tappable in ≤ 3 s? | Video-independent? |
|-------------------|------------------------------|------------------------------|---------------------|
| `/` (index)       |                              |                              |                     |

**Verdict criterion**: all three columns "yes".
