# Verification record — 11 November 2026

## Observed results

- `npm install --no-audit --no-fund`: dependencies installed; lockfile checked in.
- `npm run typecheck`: passed (strict TypeScript).
- `npm test`: 31 domain tests passed. Includes eligibility, sequential prerequisites, booking collision/ownership checks, protected availability, atomic rescheduling, cancellation, all outcomes, retry authorization, invalidation/restoration, preserved history and storage reload.
- `npm run test:e2e`: 3 Chromium tests passed: full cross-role booking → PASS → award → invalidation → preserved PASS; responsive scenarios and role screens; reschedule/cancel history and persona persistence.
- `npm run build`: passed; Vite emits static `dist/`.
- `node scripts/render-writeup.mjs`: exactly 2 A4 pages, independently confirmed with `pdfinfo`. Rendered pages inspected as PNG: no clipping, overlap or broken table boundaries. Last page is within margins.
- Desktop 1440px and mobile 390px reviewed from browser screenshots. Mobile scenario test asserts no horizontal page overflow. See `student-dashboard.png`, `mobile-dashboard.png`, `team-operations.png`.
- Original supplied assignment PDF read and cross-checked with implementation scope.
- Lint: no ESLint configuration; Prettier applied to source and tests. Type checking and production build pass.

## Environment notes

Chromium was preinstalled but shared libraries were absent. Libraries were downloaded into `/tmp/grit-browser-libs` without system installation. Browser checks required an approved execution outside the sandbox:

```sh
LD_LIBRARY_PATH=/tmp/grit-browser-libs/root/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/home/somu/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell \
npm run test:e2e
```

PDF generation used the same environment. A normal developer workstation can install Chromium with `npx playwright install chromium` and its system dependencies, then run the standard commands in README.

## Deployment

Public deployment succeeded on 11 November 2026. Verified by the Sites deployment response and public access configuration.

Live prototype: https://grit-interview-hub-niat.chattytick8.chatgpt.site

The same three Chromium browser tests also passed against the public URL in a fresh unauthenticated browser context (12.3 seconds total). This verifies cross-role booking, results, invalidation, refresh persistence and mobile scenarios on the actual deployment.

First deployed source: `03dc667230544e803ef6c1e02f44e00504fbc66f`. The final documentation update adds this verified URL to the PDF/README. Hosting identity: `.openai/hosting.json`.
