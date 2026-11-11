# GRIT — Track Badge Interview Scheduling

An independent AI Product Engineer hiring assignment prototype for NIAT. A skill-ready student can book a Track Badge interview, the assigned interviewer can complete it and record an outcome, and the team can manage the queue and award integrity. No accounts or external credentials are needed.

## Run locally

Node 22+ and npm:

```sh
npm ci
npm run dev
```

Open the printed local URL. Browser data persists under `grit-interviews-v1`. Reset Demo restores relative-date seed data. The demo starts with Aarav Mehta eligible for AI Product Mastery — Novice.

## Reviewer walkthrough (under five minutes)

1. Start as **Student**, with **Ready to book**. Click **Book Interview**, select the first date/time and confirm. Note the assigned interviewer.
2. Switch **Persona → Interviewer**. Choose the assigned interviewer (the first slot belongs to Ananya Iyer). The appointment appears in **My schedule**, alongside seeded history. Use the Today/Upcoming/History filters as needed.
3. Click **Demo: complete interview** and confirm. This explicit time simulation is audited, allowing review without waiting. Click **Record outcome**, choose **Pass**, review and confirm.
4. Switch to **Student**: the home page celebrates the earned badge; **My badges** and **Interviews** show the same result. Internal notes are not shown to students.
5. Switch to **Interview team**. Filter **Eligible, unbooked**. Counts and student rows are derived from current domain data, per eligible student/badge journey.
6. Under **Badge integrity & corrections**, enter a reason such as “Confirmed malpractice in a required contest”. Invalidate Aarav’s badge and confirm. Switch to Student to see the invalidated award; its historical attempt still shows PASS.
7. Use **Scenario** to preview incomplete, booked, pending, passed, failed, retake, and invalidated states. Loading confirms replacement of browser data; switching personas does not reset it. See `/#demo` for the built-in guide.

You can also change the synthetic student or track journey, add/edit/remove free interviewer availability, cancel/reschedule before interview start, record fail/retake outcomes, authorize retry after failure/no-show, simulate a no-show, restore an overturned integrity finding and inspect the team activity log.

## Requirement mapping

| Assignment requirement                | Experience / implementation                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| Eligible student books from dashboard | Overview → Book Interview; `domain/rules.ts` guards eligibility and collisions           |
| Interviewers manage availability      | Interviewer → Availability; future 30-minute slots, overlap checks, history protection   |
| Record pass, fail, retake later       | My schedule → complete → Record outcome → confirmation                                   |
| Student sees status/result            | Overview, Interview details, My badges; derived from shared state                        |
| Team sees booked vs unbooked          | Interview operations: counts, search, status and track/badge filters                     |
| Before/after screens                  | Confirmed scenario selector, consistent home/details/booking/badges; `docs/` screenshots |
| Three exact messages                  | `src/domain/messages.ts` and two-page write-up                                           |
| States, assumptions, relational model | `docs/assignment-writeup.md`, PDF, and `docs/schema.sql`                                 |
| Malpractice and retake history        | Separate awards/attempts; invalidation/restoration and retry authorization are audited   |

## Architecture

React 19, TypeScript strict, Vite, Lucide, authored responsive CSS. Vitest tests pure domain mutations; Playwright tests cross-role workflows and mobile layouts. `App.tsx` coordinates screens; `components/ui.tsx` contains shared primitives; `domain/types.ts` models entities, `domain/rules.ts` owns guards and transitions, `domain/messages.ts` centralizes copy/IST formatting, `data/seed.ts` creates scenarios, and `data/storage.ts` abstracts persistence.

Four dimensions stay separate: skill/prerequisite eligibility; reservation status; attempt outcome; award validity. Cancelling/rescheduling never deletes history. A retake is a new numbered attempt. A later malpractice finding invalidates an award, preserving PASS. UTC ISO timestamps are canonical; display and date grouping use Asia/Kolkata, including interviewer input conversion. Twelve fictional students, three interviewers, Product Novice, Systems Novice and Product Specialist are seeded. Counts represent actual state.

See the production relational reference in `docs/schema.sql`; it is **not** deployed or connected. Production requires trusted skill verification, server authorization and atomic reservations with DB uniqueness/exclusion constraints.

## Verification

```sh
npm run typecheck
npm test
npx playwright install chromium
# Linux environments may need: npx playwright install-deps chromium
npm run test:e2e
npm run build
node scripts/render-writeup.mjs
```

If reusing a preinstalled Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its absolute path. Otherwise Playwright uses its installed browser. Browser tests create desktop, mobile and operations screenshots in `docs/`. The PDF generator asserts exactly two pages, emits HTML/layout preview, and copies the PDF to `public/` for reviewer access. Final observed test results are in `docs/verification.md`.

## Deployment

The application is static, open to reviewers without login, and has no runtime secrets. Vercel settings are in `vercel.json`: Vite framework, `npm ci`, build `npm run build`, output `dist`. Import this repository into Vercel and deploy, or run `npx vercel --prod` with your authorized account. Netlify/Cloudflare Pages can also serve `dist`; hash routes require no server routing support. Verify a new unauthenticated session, booking → outcome → award, and `/assignment-writeup.pdf` before submitting the live link. No form submission is performed.

Sites deployment identity is stored in `.openai/hosting.json`. The deployment workflow pushes source, saves a version from the exact commit and publishes its matching static archive. Never treat the expected URL as a verified live deployment. See `docs/verification.md` for the final URL/status.

## Assumptions and limitations

- This is an independent prototype, not an official GRIT product or official NIAT policy. Source terminology/requirements were reviewed from [GRIT](https://www.grit.niatindia.com/), [How GRIT works](https://www.grit.niatindia.com/how-grit-works), [Rules](https://www.grit.niatindia.com/rules), and [Track progression](https://www.grit.niatindia.com/tracks-badge-progression). The official dashboard is login-only. Higher badge unlock rules remain with NIAT. No Miles or GRIT final-selection logic is invented.
- Demo assumptions: 30-minute slots; IST display; cancel/reschedule before start; retake-later allows a new attempt; failure/no-show needs team approval. Confirm cancellation notice, retry caps, feedback disclosure, pending-result SLA, appeal/correction authority and cascading invalidation with NIAT.
- Browser-local persistence is demo persistence. It provides no cross-user/cross-tab synchronization or concurrency guarantee. Local role guards demonstrate intended rules, not security. Anyone with browser access can manipulate demo data. Audit logs are inspectable, not tamper-proof.
- No video links, real meeting provider, email, contest integration, authentication or production database. Joining details are explicitly unconfigured. Fonts load from Google with local sans-serif fallback.
- Skill changes are modeled by scenarios rather than a contest-ingestion interface. Eligibility loss after booking preserves reservations for review and blocks results. Invalidated prerequisites prevent future progression; downstream awarded badges need manual review, not automatic deletion. Award flags can be overturned; wrong outcomes are escalated, not overwritten.
- Availability is offered as discrete 30-minute slots rather than recurring windows. The demo protects all slots with history from modification; a cancelled slot can still be booked again. After no-show, the team explicitly authorizes a retry.
- Scenario selection replaces the entire demo dataset with confirmation. State-changing workflow actions mark the scenario “Custom workflow”. Reset is destructive only to local synthetic demo data.
