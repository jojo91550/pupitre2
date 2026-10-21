# 006 - Mock mode

The frontend can run and be tested without the Go backend or Keycloak. The mock mode answers
`/api/*` in the browser with [MSW](https://mswjs.io/) (Mock Service Worker), using response
shapes copied from the Go structs.

## Commands

| Command | Backend |
| --- | --- |
| `pnpm dev:mock` | None: MSW answers every `/api/*` call in the browser |
| `pnpm dev` | The real services, through the Vite proxy ([004](004-api-and-routing.md)) |
| `pnpm test` | None: tests mock the API modules or use the MSW handlers |

## What is simulated

- `GET /api/settings/public`: `oidc_enabled` is `"true"`, local login and registration are
  `"false"`.
- **Keycloak**: `GET /api/auth/oidc/authorize` returns a URL to `/mock-keycloak`, a page that
  lists test accounts. Choosing one goes back to `/auth/callback` with a `code` and the same
  `state`, as Keycloak does, so the real callback code runs (state check included). « Annuler la
  connexion » returns `error=access_denied`.
- `POST /api/auth/oidc/callback`: checks that the state was issued and not used yet, then
  returns an unsigned JWT (valid 8 hours) and the user.
- `GET /api/auth/me`: reads the JWT and returns the user, or 401 once it has expired.
- **Learner flow (batch 1)**, in `apps/app/src/mocks/learner-handlers.ts` and `course-logic.ts`, which mirror
  the Go handlers:
  - catalogue and course: `GET /api/courses`, `GET /api/courses/{slug}` (private courses only for
    enrolled users and admins);
  - modules: list with the sequential and prerequisite locking of `ListModules`, detail with the
    inline quiz of the next module, automatic enrolment in public courses, 403 when course
    prerequisites are not met;
  - quizzes: scoring of the four question types (no partial scoring), exponential cooldowns,
    lock after the maximum attempts, 425 while a cooldown runs;
  - lessons: `…/lessons/{slug}/complete`, badge awarded once every module is done;
  - labs: step and module checks fail on the first try and pass on the second, so both outcomes
    can be seen; `…/record` echoes the result;
  - user-service: `GET /api/my/courses`, `/my/skills`, `/my/badges`, `/my/session-bookings`,
    enrolment (with the XP gate: 200 XP per earned badge), session booking, `GET /api/patterns`.
- **Fixtures**: the 17 demo courses and 2 paths of the Go seed (`fixtures/seed-courses.ts`,
  generated from `course-service/internal/db/seed`), plus `fixtures/demo-courses.ts`, which covers
  what the seed does not (admonitions, mermaid, patterns, trap HTML, media, every question type,
  GitLab lab, in-person sessions, XP gate, private course), and two patterns.
- **State**: enrolments, viewed lessons, quiz results, cooldowns, bookings and badges are kept in
  `sessionStorage` (`pupitre.mock.db`): they survive reloads and reset with the tab. `alice` starts
  enrolled in three courses, with one badge.
- Any other `/api/*` route answers **501** « Route non simulée en mode mock », until the batch
  that needs it adds its handler.

## Test accounts

| Account | Role | Purpose |
| --- | --- | --- |
| `alice` | `student` | Learner flows |
| `marc.manager` | `manager` | Manager space, exports, attendance |
| `admin` | `admin` | Administration |
| `<img src=x onerror=alert("xss-username")>` | `student` | Security check: its username, avatar and bio carry the C2 and C4 payloads of the audit. **Any alert box is a regression.** |

## Rules

- Mock code lives in `apps/app/src/mocks/` and is loaded only when `import.meta.env.MODE === 'mock'`: it
  is not in a production build, and `apps/app/public/mockServiceWorker.js` is removed from `dist/`.
- Handlers follow the Go routes and the `{ "error": "…" }` envelope. A page built against the
  mock must work unchanged against the real backend.
- Each batch of [099](099-migration-plan.md) adds the handlers and fixtures of its routes.
- The mock is not a second backend: it carries no business rule beyond what a page needs to be
  shown and tested.
