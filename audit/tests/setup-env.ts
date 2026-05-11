// Vitest global setup. The unit tests use an in-memory SQLite per test
// file, configured via DATABASE_URL=":memory:" — but for tests that don't
// touch the DB (tokens, form-schema, completion) the env var is ignored.
process.env.DATABASE_URL = process.env.DATABASE_URL ?? ":memory:";
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-secret-not-used-anywhere-real";
process.env.CRON_SECRET = process.env.CRON_SECRET ?? "test-cron-secret";
process.env.PLAUSIBLE_DOMAIN = process.env.PLAUSIBLE_DOMAIN ?? "audit.rinzlerstudio.com";
