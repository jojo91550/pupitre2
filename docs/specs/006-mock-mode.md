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

- Mock code lives in `src/mocks/` and is loaded only when `import.meta.env.MODE === 'mock'`: it
  is not in a production build, and `public/mockServiceWorker.js` is removed from `dist/`.
- Handlers follow the Go routes and the `{ "error": "…" }` envelope. A page built against the
  mock must work unchanged against the real backend.
- Each batch of [099](099-migration-plan.md) adds the handlers and fixtures of its routes.
- The mock is not a second backend: it carries no business rule beyond what a page needs to be
  shown and tested.
