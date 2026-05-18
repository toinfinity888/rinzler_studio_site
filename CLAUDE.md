# rinzler_studio_web_site Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-05-17

## Active Technologies
- HTML5, CSS3 (no preprocessor), ES module JavaScript (vanilla, no framework — locked by constitution Principle IV and the marketing-site sub-stack) + Vite ^6 (static build to `dist/`), Plausible Analytics (cookie-free, EU-hosted), Formspree (existing intake-form transport — unchanged) (002-hotel-marketing-pivot)
- N/A — static site, no persistence. The intake-form submission is forwarded to the studio inbox via Formspree. (002-hotel-marketing-pivot)
- TypeScript 5.6+ on Node.js 20 LTS (matches existing `audit/` runtime). (003-hotel-diagnostic-platform)

- TypeScript 5.6+ on Node.js 20 LTS (001-hotel-audit-platform)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.6+ on Node.js 20 LTS: Follow standard conventions

## Recent Changes
- 003-hotel-diagnostic-platform: Added TypeScript 5.6+ on Node.js 20 LTS (matches existing `audit/` runtime).
- 002-hotel-marketing-pivot: Added HTML5, CSS3 (no preprocessor), ES module JavaScript (vanilla, no framework — locked by constitution Principle IV and the marketing-site sub-stack) + Vite ^6 (static build to `dist/`), Plausible Analytics (cookie-free, EU-hosted), Formspree (existing intake-form transport — unchanged)

- 001-hotel-audit-platform: Added TypeScript 5.6+ on Node.js 20 LTS

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
