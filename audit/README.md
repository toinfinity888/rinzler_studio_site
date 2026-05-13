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
- Drizzle ORM + **MySQL via `mysql2`** (pure JS — no native compilation,
  works on every shared host including o2switch / CloudLinux)
- Auth.js v5 (Credentials provider) + `@node-rs/argon2` (prebuilt binary)
- Zod (form schema, validation, JSON export contract)
- Vitest (unit / integration), Playwright (E2E)

## Local development

```bash
# From audit/
nvm use                    # respects .nvmrc → Node 20
npm install
cp .env.example .env.local # then edit secrets

# Local MySQL (any way you prefer):
#   - Docker:  docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=dev \
#                 -e MYSQL_DATABASE=audit mysql:8
#   - Homebrew: brew install mysql && brew services start mysql
# Then put the connection string in .env.local:
#   DATABASE_URL=mysql://root:dev@localhost:3306/audit

npm run db:migrate         # creates schema in the configured database
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
| `npm run db:migrate` | Apply migrations against `DATABASE_URL` |
| `npm run db:seed:admin` | Seed the V1 admin user (`-- --force` to overwrite) |

## Production deploy on o2switch

### 1. Provision the MySQL database (cPanel)

cPanel → **MySQL Databases**:

1. Create database `<cpaneluser>_audit` (cPanel automatically prefixes with your account name, e.g. `muma6351_audit`).
2. Create a database user `<cpaneluser>_audit` with a strong password.
3. Add the user to the database, granting **ALL PRIVILEGES**.
4. Note the connection details — typically:
   - Host: `localhost`
   - Port: `3306`
   - User / Database: `<cpaneluser>_audit`
   - Password: whatever you just set

The resulting `DATABASE_URL` is:
```
mysql://<cpaneluser>_audit:<password>@localhost:3306/<cpaneluser>_audit
```

### 2. Build the deploy artifact locally

> **⚠️ CloudLinux gotcha:** o2switch runs CloudLinux, which requires
> `<app-root>/node_modules` to be a **symlink** into the nodevenv. Next.js
> standalone normally bundles its own real `node_modules/` directory — if
> we ship that, it clobbers the symlink and CloudLinux refuses all future
> `npm install`s. So we **exclude `node_modules` from the tarball** and
> let `npm install` rebuild it inside the nodevenv on the server.

```bash
# From audit/ on your Mac
rm -rf .next audit-deploy.tar.gz
npm run build

# Copy the runtime extras into the standalone tree.
cp -R public         .next/standalone/public
cp -R .next/static   .next/standalone/.next/static
cp -R db             .next/standalone/db
cp -R scripts        .next/standalone/scripts
cp -R lib            .next/standalone/lib
cp -R styles         .next/standalone/styles
cp    drizzle.config.ts .next/standalone/drizzle.config.ts
cp    tsconfig.json     .next/standalone/tsconfig.json

# Strip macOS xattrs so the server tar is quiet, and EXCLUDE node_modules.
xattr -cr .next/standalone
tar --no-xattrs --no-mac-metadata --exclude='standalone/node_modules' \
    -czf audit-deploy.tar.gz -C .next standalone

ls -lh audit-deploy.tar.gz   # ~3-4 MB, much smaller than a bundled tarball
```

### 3. Upload + extract

```bash
# Via SFTP / cPanel File Manager:
#   Upload audit-deploy.tar.gz to your home dir on the server.

# Then in the cPanel terminal (or SSH, if enabled):
cd ~
rm -rf audit_app
mkdir audit_app
tar -xzf audit-deploy.tar.gz -C audit_app --strip-components=1 \
    --warning=no-unknown-keyword

ls audit_app/
# Expect flat layout (NO node_modules — that's intentional):
# server.js  package.json  .next  public  db  scripts  lib  styles  drizzle.config.ts  tsconfig.json
```

### 3b. Restore the CloudLinux symlink + install deps

```bash
cd ~/audit_app

# Recreate the symlink CloudLinux expects (adjust path if your app name /
# Node version differs):
ln -s ~/nodevenv/audit_app/20/lib/node_modules node_modules
ls -la node_modules           # → "node_modules -> /home/.../nodevenv/.../node_modules"

# Activate the nodevenv so npm uses the right Node + writes to the symlink:
source ~/nodevenv/audit_app/20/bin/activate

# Install everything the standalone artifact's package.json declares.
# CloudLinux routes the install into the nodevenv via the symlink.
npm install 2>&1 | tail -5

# Verify the three packages that scripts/migrate.ts + scripts/seed-admin.ts
# need at runtime are present:
ls node_modules/mysql2/promise.js
ls node_modules/drizzle-orm/package.json
ls node_modules/@node-rs/argon2/package.json
```

All three `ls` lines must show files. If any is missing, `npm install` did
not see the package in `package.json` — check `next.config.ts`'s
`serverExternalPackages` (currently lists `mysql2`, `drizzle-orm`,
`@node-rs/argon2`).

### 4. cPanel Node.js app

cPanel → **Setup Node.js App → Create Application**:

| Field | Value |
|---|---|
| Node.js version | **20.x** (matches `.nvmrc`) |
| Application mode | Production |
| Application root | `audit_app/` |
| Application URL | `audit.rinzlerstudio.com` |
| Application startup file | `server.js` |

Environment variables (set in the same screen — **do NOT** upload `.env.local` to prod):

```
NODE_ENV=production
DATABASE_URL=mysql://<cpaneluser>_audit:<password>@localhost:3306/<cpaneluser>_audit
AUTH_SECRET=<openssl rand -base64 32 — a fresh value, NOT your dev one>
AUTH_URL=https://audit.rinzlerstudio.com
CRON_SECRET=<openssl rand -base64 32 — a fresh value>
PLAUSIBLE_DOMAIN=audit.rinzlerstudio.com
```

`PORT` is set automatically by Passenger.

### 5. Apply the schema + seed the admin

You already activated the nodevenv in step 3b. From the same shell:

```bash
cd ~/audit_app
npx tsx scripts/migrate.ts        # creates the tables in your MySQL DB
npx tsx scripts/seed-admin.ts     # interactive prompts (email + ≥12-char password)
```

### 6. Start + verify

cPanel → Setup Node.js App → **Restart App**. Within ~15 seconds:

```bash
curl -I https://audit.rinzlerstudio.com/admin/login
# HTTP/2 200
# x-robots-tag: noindex, nofollow
```

Open the URL in a browser, sign in with the credentials you seeded.

### 7. Daily auto-purge cron (FR-044b)

cPanel → **Cron Jobs**, add daily 03:15 Europe/Paris:

```
15 3 * * * curl -fsS -X POST -H "X-Cron-Secret: <your CRON_SECRET>" https://audit.rinzlerstudio.com/api/cron/purge >> ~/audit-purge.log 2>&1
```

## Project layout

```
audit/
├── app/
│   ├── admin/                 # Authenticated admin dashboard (force-dynamic)
│   │   ├── login/             # Auth.js Credentials sign-in
│   │   └── projects/          # List, new, detail/[id], export, report
│   ├── (client)/              # Tokenized, no-auth client form (force-dynamic)
│   │   ├── a/[token]/         # Landing + form/[section] + confirmation
│   │   └── revoked/           # Generic 404 for revoked/unknown tokens
│   ├── api/auth/[...]/        # Auth.js handlers
│   ├── api/cron/purge/        # 36-month auto-purge sweep endpoint
│   └── layout.tsx             # Root: Inter font, ThemeProvider, noindex meta
├── components/                # admin, brand, client-form, form, ui
├── db/
│   ├── schema.ts              # Drizzle MySQL schema (8 tables)
│   └── migrations/            # drizzle-kit output (MySQL DDL)
├── lib/                       # analytics, audit-log, auth, client-form, db, export, form-schema, projects, purge, scoring, tokens
├── scripts/
│   ├── migrate.ts             # tsx wrapper around drizzle migrate
│   └── seed-admin.ts          # Interactive admin seed
├── styles/tokens.css          # Audit-specific palette (softened from marketing site)
├── tests/unit/                # 16 tests passing (tokens, form-schema, completion)
├── middleware.ts              # /admin/* gating via Auth.js edge config
├── drizzle.config.ts          # dialect: 'mysql'
├── next.config.ts             # output: 'standalone', outputFileTracingRoot, force argon2 trace
├── playwright.config.ts
├── tsconfig.json
└── vitest.config.ts
```

(Tailwind v4 has no `tailwind.config.ts`; the theme is declared CSS-first in `app/globals.css` via `@theme inline`.)

## Brand parity with the marketing site

`./styles/tokens.css` is an **audit-specific** palette: softer dark grays
(page → card → input hierarchy with visible borders, easier on the eyes for
long form sessions) while keeping the marketing site's cyan/purple accents,
Inter typography, glass-morphism, and tooltip patterns. Components like
`Button`, `Card`, `HelpTooltip`, `GradientText` mirror the marketing site's
visual language directly.

## Troubleshooting

- **`Cloudlinux NodeJS Selector demands to store node modules ...`** — the
  tarball was uploaded with a real `node_modules/` folder included, which
  clobbered the symlink. Fix: `cd ~/audit_app && rm -rf node_modules && ln -s ~/nodevenv/audit_app/20/lib/node_modules node_modules && npm install`.
  Permanent fix: re-build the tarball with `--exclude='standalone/node_modules'`
  (the deploy recipe in step 2 already includes this flag — make sure you're
  using a build that came from that recipe, not an older one).
- **`Cannot find module 'mysql2/promise'` (or `drizzle-orm`, or `@node-rs/argon2`)
  when running migrate/seed scripts** — the package isn't in the nodevenv.
  Run `cd ~/audit_app && npm install <pkg>`. The deploy recipe lists all three
  in `next.config.ts`'s `serverExternalPackages`, so a clean `npm install`
  after restoring the symlink should install them all in one shot.
- **`ECONNREFUSED` from MySQL on first request** — `DATABASE_URL` is wrong
  or MySQL on the cPanel host isn't reachable from inside the Node app.
  Verify via `npx tsx -e 'import mysql from "mysql2/promise"; mysql.createConnection(process.env.DATABASE_URL).then(c=>c.ping().then(()=>console.log("ok")).then(()=>c.end()))'`
  from inside the activated nodevenv.
- **`Access denied for user`** — cPanel hasn't granted the user `ALL PRIVILEGES`
  on the database, or the user was created but never added to the database
  (cPanel separates the two steps).
- **Passenger 502** — Check the cPanel "Errors" log. Usually `AUTH_SECRET`
  or `DATABASE_URL` is missing from the env config.
- **Sessions lost on every request** — `AUTH_URL` doesn't match the URL
  the browser is visiting (must be `https://audit.rinzlerstudio.com` exactly).
- **Tokenized URL returns 404 unexpectedly** — by design: `/a/<unknown>`,
  `/a/<revoked>`, and `/a/<purged>` all return the same generic page (no
  enumeration leak per FR-006).
