# Audit platform — `audit.rinzlerstudio.com`

Private Next.js application for the Rinzler Studio hospitality-modernization
audit workflow. Sibling to the marketing site at `../src/`. Independent build,
test, and deploy lifecycle.

Spec & plan live in [`../specs/001-hotel-audit-platform/`](../specs/001-hotel-audit-platform/).
Constitution lives in [`../.specify/memory/constitution.md`](../.specify/memory/constitution.md).

## Stack

- Next.js 15 (App Router, server actions) on Node 20 LTS — pinned via `.nvmrc`
- TypeScript 5 (strict + `noUncheckedIndexedAccess`)
- React 19, TailwindCSS v4 (CSS-first `@theme` declarations in `app/globals.css`)
- Drizzle ORM + `better-sqlite3` (SQLite at `data/audit.sqlite`)
- Auth.js v5 (Credentials provider) + `@node-rs/argon2`
- Zod (form schema, validation, JSON export contract)
- Vitest (unit / integration), Playwright (E2E)

## Local development

```bash
# From audit/
nvm use                    # respects .nvmrc → Node 20
npm install
cp .env.example .env.local # then edit secrets
npm run db:migrate         # creates data/audit.sqlite from db/schema.ts
npm run db:seed:admin      # interactive — prompts for admin email + password
npm run dev                # http://localhost:3000
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production standalone build (writes to `.next/standalone`) |
| `npm run start` | Run the standalone server (post-build) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint flat config |
| `npm test` | Vitest (unit + integration) |
| `npm run test:e2e` | Playwright (auto-starts dev server) |
| `npm run db:generate` | `drizzle-kit generate` from `db/schema.ts` |
| `npm run db:migrate` | Apply migrations to `data/audit.sqlite` |
| `npm run db:seed:admin` | Seed the V1 admin user (`-- --force` to overwrite) |

## Production deploy on o2switch

1. Upload the `audit/` directory minus `node_modules/`, `.next/`, `data/`.
2. cPanel → **Setup Node.js App**:
   - Application root: `audit/`
   - Application startup file: `.next/standalone/server.js`
   - Node version: 20.x
   - Environment variables: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`,
     `CRON_SECRET`, `PLAUSIBLE_DOMAIN` (see `.env.example`)
3. cPanel runs `npm install --production`; trigger `npm run build` from the
   cPanel terminal once.
4. Bind `audit.rinzlerstudio.com` to the Passenger app and force HTTPS via
   AutoSSL (Let's Encrypt).
5. cPanel → **Cron jobs**, daily auto-purge sweep (FR-044b, T101):
   ```
   15 3 * * * curl -fsS -X POST -H "X-Cron-Secret: $CRON_SECRET" https://audit.rinzlerstudio.com/api/cron/purge
   ```
6. Verify with: `curl -I https://audit.rinzlerstudio.com/admin/login` →
   `200` + `X-Robots-Tag: noindex, nofollow`.

## Project layout

```
audit/
├── app/
│   ├── (admin)/               # Authenticated admin dashboard
│   │   ├── login/             # Auth.js Credentials sign-in
│   │   └── projects/          # List, new, detail/[id], export, report
│   ├── (client)/              # Tokenized, no-auth client form
│   │   ├── a/[token]/         # Landing + form/[section] + confirmation
│   │   └── revoked/           # Generic 404 for revoked/unknown tokens
│   ├── api/auth/[...]/        # Auth.js handlers
│   ├── api/cron/purge/        # 36-month auto-purge sweep endpoint
│   └── layout.tsx             # Root: Inter font, ThemeProvider, noindex meta
├── components/
│   ├── admin/                 # NotesThread, NoteComposer, PriorityCell, ProjectActionsPanel, NewProjectForm
│   ├── brand/                 # Logo, GradientText, GlassPanel, ThemeProvider
│   ├── client-form/           # FormShell, ClientFormStep, AutosaveIndicator
│   ├── form/                  # SectionRenderer, fields.tsx (10 field types), HelpTooltip
│   └── ui/                    # Button, Card, Input/Textarea/Select, Slider, RadioGroup
├── db/
│   ├── schema.ts              # Drizzle schema (8 tables)
│   └── migrations/            # drizzle-kit output
├── lib/
│   ├── analytics/             # Plausible server-side event emitter
│   ├── audit-log/             # writeAuditEntry helper
│   ├── auth/                  # Auth.js v5 config + session helpers
│   ├── client-form/           # useAutosave hook (debounced + retry queue)
│   ├── db/                    # SQLite client (server-only) + factory
│   ├── export/                # ExportV1 Zod schema + buildExport
│   ├── form-schema/           # Single source of truth: types, sections, fr, validation, completion, i18n
│   ├── projects/              # loadProjectByToken
│   ├── purge/                 # 36-month sweep
│   ├── scoring/               # Pluggable Scorer interface (4 stub scores in V1; real heuristics ship in V1.1 / Phase 6)
│   └── tokens/                # generate / hash / verify (constant-time)
├── scripts/
│   ├── migrate.ts             # tsx wrapper around drizzle migrate
│   └── seed-admin.ts          # Interactive admin seed
├── styles/tokens.css          # Mirrored from ../src/styles/tokens.css
├── tests/
│   ├── unit/                  # tokens, form-schema, completion (16 passing)
│   ├── integration/           # (placeholder for US1/US2/US3 server-action tests)
│   └── e2e/                   # (placeholder for Playwright golden flows)
├── middleware.ts              # /admin/* gating via Auth.js
├── drizzle.config.ts
├── next.config.ts             # output: 'standalone' + noindex headers
├── playwright.config.ts
├── tsconfig.json              # strict, noUncheckedIndexedAccess
└── vitest.config.ts
```

(Tailwind v4 has no `tailwind.config.ts`; the theme is declared CSS-first in `app/globals.css` via `@theme inline`.)

## Brand parity with the marketing site

The audit app **mirrors** `../src/styles/tokens.css` byte-for-byte into
`./styles/tokens.css`, then surfaces every token through Tailwind v4's
`@theme inline` directive in `app/globals.css`. Components like `Button`,
`Card`, `HelpTooltip`, `GradientText` mirror the marketing site's `.btn`,
`.calc-card`, `.info-tooltip-trigger`, `.calc-gradient` patterns directly.

Hosting: French sovereign (o2switch) on the studio's `.com` subdomain.
Marketing-site analytics (`rinzlerstudio.fr`) and audit-tool analytics
(`audit.rinzlerstudio.com`) are kept in separate Plausible domains.

## Troubleshooting

- **`better-sqlite3` build fails on cPanel** — ensure cPanel Node version
  matches what was used locally; if not, `npm rebuild better-sqlite3` in the
  cPanel terminal.
- **Passenger 502** — Next.js standalone reads `PORT` from env; set it in
  the cPanel app config to whatever Passenger expects.
- **Sessions lost on every request** — `AUTH_SECRET` not set in env, or
  changed between deploys (invalidates existing JWTs).
- **Auto-purge cron silently failing** — confirm the request includes the
  `X-Cron-Secret` header and the secret matches; the endpoint returns `401`
  with no body to avoid signal to attackers.
- **Tokenized URL returns 404 unexpectedly** — by design: `/a/<unknown>`,
  `/a/<revoked>`, and `/a/<purged>` all return the same generic page (no
  enumeration leak per FR-006).
