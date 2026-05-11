# Quickstart: Hotel Audit Platform (Local Development)

**Audience**: Developers (or future-Claude) implementing the audit app per
`plan.md` after `/speckit.tasks` produces `tasks.md`.

## Prerequisites

- Node.js **20 LTS** (matches the o2switch target).
- npm 10+.
- macOS / Linux for `better-sqlite3` native build (Windows works but needs
  build-tools).
- The repository checked out on the `001-hotel-audit-platform` branch.

## First-time setup

```bash
# From repo root
mkdir -p audit && cd audit

# (initial scaffold — only needed once; tasks.md will sequence this)
npx create-next-app@15 . --ts --tailwind --app --eslint --src-dir=false --import-alias="@/*"

# Install runtime deps
npm i drizzle-orm better-sqlite3 \
      next-auth@beta @auth/drizzle-adapter @node-rs/argon2 \
      zod react-hook-form @hookform/resolvers \
      next-themes

# Install dev deps
npm i -D drizzle-kit vitest @vitest/coverage-v8 \
         @playwright/test \
         @types/better-sqlite3 \
         eslint-plugin-tailwindcss
```

Copy the marketing-site brand tokens into the audit app:

```bash
cp ../src/styles/tokens.css ./styles/tokens.css
cp ../src/assets/icons/rinzler_studio_logo_white.svg ./public/brand/logo.svg
```

Wire `tokens.css` into `app/globals.css`:

```css
@import "../styles/tokens.css";
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Map the CSS variables into Tailwind in `tailwind.config.ts` (see plan §R10
for the full pattern).

## Environment

Create `audit/.env.local`:

```
DATABASE_URL=file:./data/audit.sqlite
AUTH_SECRET=<openssl rand -base64 32>
CRON_SECRET=<openssl rand -base64 32>
PLAUSIBLE_DOMAIN=audit.rinzlerstudio.com
```

`.env.example` (committed) documents the same keys with placeholder values.

## Database

```bash
mkdir -p audit/data
npm run db:generate      # drizzle-kit generates SQL migrations from db/schema.ts
npm run db:migrate       # applies them to data/audit.sqlite
npm run db:seed:admin    # interactive: prompts for admin email + password
```

## Run dev

```bash
npm run dev
# Next.js dev server at http://localhost:3000
```

## Manual smoke test (golden path)

1. Browse `http://localhost:3000/admin/login`, sign in with the seeded admin.
2. Click **Nouveau projet**, fill label + hotel name + contact email + a few
   pre-fill answers, submit. Copy the generated URL.
3. Open the URL in a private/incognito window — confirm landing page shows
   the pre-filled hotel name in FR, no auth prompt.
4. Walk through Sections 1 → 8. Verify:
   - Autosave indicator transitions `saving → saved` after each field
     (≤ 1.5 s debounce).
   - Closing the tab and reopening the URL restores all answers.
   - Required Section 1 fields block "Suivant" when empty.
   - Help tooltips appear on hover/tap for fields like ADR, PMS, channel
     manager.
5. Submit. Confirmation page appears.
6. In the admin window, refresh the project list — status `Submitted`,
   completion 100%, four scores visible.
7. Open the project, append a note, click **Exporter JSON** — file
   downloads, validates against `contracts/json-export.schema.json`.
8. Click **Vue rapport**, print to PDF, confirm brand styling and complete
   answer set.

## Run tests

```bash
npm run test            # vitest unit + integration
npm run test:e2e        # playwright (auto-starts dev server)
npm run lint            # eslint + tailwind-classnames lint
npm run typecheck       # tsc --noEmit
```

## Production build (target o2switch)

```bash
npm run build              # produces .next/standalone
node .next/standalone/server.js
```

For deployment on o2switch's cPanel Node.js Selector:

1. Upload the `audit/` directory minus `node_modules/`, `.next/`, `data/`.
2. In cPanel → "Setup Node.js App", point Application root to `audit/`,
   Application startup file to `.next/standalone/server.js`, Node version
   20.x.
3. cPanel runs `npm install --production` and `npm run build`.
4. Bind the `audit.rinzlerstudio.com` subdomain to the Passenger app (the marketing site stays on `rinzlerstudio.fr`; the audit tool lives on the studio's `.com` domain).
5. In cPanel → Cron jobs, add the daily purge sweep (see
   `contracts/admin-api.md` § Cron / Maintenance).
6. Confirm **HTTPS** is forced for the audit subdomain (Let's Encrypt via
   AutoSSL on cPanel).

## Troubleshooting

- **`better-sqlite3` build fails on cPanel**: ensure the cPanel Node version
  matches what was used locally; if not, run `npm rebuild better-sqlite3`
  inside the cPanel terminal.
- **Passenger 502**: usually the standalone server bound to a different port
  than Passenger expects — Next.js reads `PORT` from env; set it in the
  cPanel app config.
- **Sessions lost on every request**: confirm `AUTH_SECRET` is set in env.
- **Auto-purge cron silently failing**: check the request shows
  `X-Cron-Secret` and the secret matches; the endpoint logs `401` with no
  body to avoid signal to attackers.
