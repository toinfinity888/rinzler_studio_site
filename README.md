# Rinzler Studio — Repository

This repository hosts two independent applications for **Rinzler Studio**
(Automatisation & IA pour Transport & Logistique). Both share brand identity
at the design-token level only; they build, test, and deploy independently.

| App | Path | What | Stack | Deployed to |
|-----|------|------|-------|-------------|
| **Marketing site** | [`src/`](./src) (+ `vite.config.js`, `public/`) | Public brochure, hero video, ROI calculator, audit-booking CTA — the lead-gen funnel. | Vanilla HTML/CSS/JS via **Vite 6**, static bundle to `dist/`. No runtime, no backend. | [`rinzlerstudio.fr`](https://rinzlerstudio.fr) (cPanel static, o2switch) |
| **Audit platform** | [`audit/`](./audit) | Private hospitality-modernization audit tool — admin dashboard + tokenized client form + JSON/PDF export. | **Next.js 15** + TypeScript + TailwindCSS v4 + Drizzle/SQLite + Auth.js v5. | [`audit.rinzlerstudio.com`](https://audit.rinzlerstudio.com) (cPanel Node app, o2switch) |

## Constitution

The project is governed by [`/.specify/memory/constitution.md`](./.specify/memory/constitution.md).
Five non-negotiable principles apply to **both** apps; per-application stack
constraints are scoped per directory in the constitution itself.

Current version: **v1.1.1** (2026-05-09).

## Spec-kit workflow

Non-trivial features enter via the spec-kit workflow:

```
/speckit.specify  →  /speckit.clarify  →  /speckit.plan  →
/speckit.tasks    →  /speckit.analyze  →  /speckit.implement
```

Active feature: `001-hotel-audit-platform` →
[spec](./specs/001-hotel-audit-platform/spec.md) ·
[plan](./specs/001-hotel-audit-platform/plan.md) ·
[tasks](./specs/001-hotel-audit-platform/tasks.md).

## Repository layout

```
.
├── .specify/                     # Spec-kit config, templates, scripts, memory/
│   ├── memory/constitution.md   # Source of truth for principles + stack constraints
│   └── templates/               # spec / plan / tasks / checklist templates
├── audit/                        # Next.js audit app (independent package.json)
├── src/                          # Vite marketing site (independent package.json)
├── specs/                        # Per-feature specs from /speckit.specify
├── public/                       # Marketing site static assets
├── package.json                  # Marketing site only
└── vite.config.js                # Marketing site only
```

## Working in either app

### Marketing site

```bash
npm install        # from repo root
npm run dev        # vite at http://localhost:3000 with the studio brochure
npm run build      # static bundle → dist/
```

Marketing-site files live under `src/`; entry points are wired in
`vite.config.js` `rollupOptions.input`. See the constitution's
"Technical Constraints & Stack (Marketing Site — `src/`)" section for the
applicable rules (vanilla HTML/CSS/JS, no frontend framework, ≤ 50 KB JS
budget, etc.).

### Audit platform

```bash
cd audit
nvm use            # respects audit/.nvmrc (Node 20 LTS)
npm install
npm run dev        # Next.js at http://localhost:3000
```

Full setup, deploy, and troubleshooting docs in
[`audit/README.md`](./audit/README.md).
