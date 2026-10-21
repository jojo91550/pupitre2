# pupitre2

React frontend of the pupitre e-learning platform. It replaces the Astro frontend of
[`genesary/pupitre`](https://github.com/genesary/pupitre) and talks to its Go backend
(user-service, course-service) **as it is**. Specs: [`docs/specs`](docs/specs/README.md), in
English; they are the source of truth for behaviour.

## Git: commit and push only when asked

- Work on a Conventional Branch feature branch (`feature/<name>`), never on `main`.
- Commit **only when the user asks**, on the feature branch, with an English Conventional Commits
  message. Push that branch only when the user asks.
- Never commit or push to `main`, never force-push, never rewrite published history. Changes reach
  `main` through a pull request, squash merged by the user.
- Before committing, `typecheck`, `lint`, `test` and `build` pass.

## Constraints

- **The Go backend is not changed.** Every request matches a route and a struct of
  `genesary/pupitre` at commit `3cdf7b2`, the reference of every spec. A
  backend defect is recorded in [`090`](docs/specs/090-gaps-and-defects.md), never worked around
  by inventing a route.
- **The pupitre design is kept as is**: colours, fonts, spacing, markup and class names of the
  Astro pages ([`005`](docs/specs/005-ui-theme-navigation.md), "Visual design").
  `packages/ui/src/styles/pupitre/*.css` are copies of the original CSS: do not edit them. shadcn
  components are themed with the pupitre tokens, never the other way round.
- **Code reused from [`ebuildy/pupitre2`](https://github.com/ebuildy/pupitre2)** follows the rules
  of [`090`](docs/specs/090-gaps-and-defects.md) ("Reusing the reference frontend"): adapt it to
  the Go API, restyle it with pupitre's classes, keep its file name, credit it in a comment.
- Interface text is in French. Code, comments, specs, branches and commits are in English.
- Authentication is OIDC through Keycloak only ([`001`](docs/specs/001-keycloak-authentication.md)).

## Layout

pnpm monorepo, same layout as `ebuildy/pupitre2`:

| Path | Package | Content |
| --- | --- | --- |
| `apps/app` | `@pupitre/app` | The whole frontend (learner, manager, admin) |
| `packages/ui` | `@pupitre/ui` | Design system: shadcn components, pupitre CSS, security helpers |
| `docs/specs` | | Specs, one file per feature area |
| `e2e` | | Playwright tests |

Inside `apps/app/src`:

- `routes/` - one **PascalCase** file per page (`Catalogue.tsx`, `CourseDetail.tsx`), its
  component named after the file; `admin/` and `manager/` hold their section's pages.
- `components/` - app components, PascalCase, grouped by domain (`quiz/`, `lab/`, `sessions/`).
- `lib/` - kebab-case modules: `api.ts` (one function per route), `api-client.ts`,
  `api-types.ts`, `session.ts`, `markdown.ts`, helpers.
- `mocks/` - MSW handlers and fixtures.

`packages/ui` never imports from `apps/*`. The app imports it through its exports:
`@pupitre/ui/components/<name>`, `@pupitre/ui/lib/<name>`, `@pupitre/ui/globals.css`. Inside
`packages/ui`, imports are relative; after `shadcn add`, rewrite the generated `@/` imports.

## Commands

Node 24 (`.nvmrc`), pnpm through corepack (`corepack enable`). From the repository root:

```sh
pnpm install
pnpm dev:mock    # http://localhost:3000, no backend (docs/specs/006-mock-mode.md)
pnpm dev         # http://localhost:3000, proxied to the Go services
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Run `typecheck`, `lint`, `test` and `build` before handing work back. A UI change is also checked
in the browser with `pnpm dev:mock`, in light and dark mode.

Dependencies are pinned to exact versions. pnpm's `minimumReleaseAge` policy rejects versions that
are too recent: pick an older version, never add an exclusion.

## Security rules

[`003`](docs/specs/003-security.md) is enforced by lint and tests:

- No `dangerouslySetInnerHTML`, `innerHTML` or `outerHTML` outside
  `packages/ui/src/components/safe-html.tsx`, `apps/app/src/lib/markdown.ts` and shadcn's
  `components/ui/`. API data is rendered as JSX text; markdown goes through `renderMarkdown`
  (DOMPurify) and `<SafeHtml>`.
- URLs from the API go through `safeUrl` / `safeExternalUrl`, redirects through `safeRedirect`
  (`@pupitre/ui/lib/security`).
- The token lives in `sessionStorage`, behind `apps/app/src/lib/session.ts` only. `localStorage`
  is reached through `@pupitre/ui/lib/storage` (lint rule).
- No secret in `VITE_*` variables: they ship to the browser.
- The dev proxy forwards only the allowed headers (`apps/app/vite.config.ts`).

## Mock mode

`pnpm dev:mock` answers `/api/*` with MSW, mirroring the Go handlers. A page that needs a new route
gets its handler and fixtures in `apps/app/src/mocks/` in the same change. The mock carries no
business rule beyond what the Go code does. Test accounts: `alice` (student), `marc.manager`,
`admin`, and an XSS account whose payloads must never run.

## Git conventions

- Branches: [Conventional Branch](https://conventional-branch.github.io/) (`feature/…`,
  `bugfix/…`, `chore/…`), lowercase, English.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/), English.
- Pull requests into `main`, squash merged.
