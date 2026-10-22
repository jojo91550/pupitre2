# pupitre2

New React frontend of the pupitre e-learning platform. It replaces the Astro frontend of
[`genesary/pupitre`](https://github.com/genesary/pupitre) and uses its Go backend as it is.

- Stack: React 19, TypeScript, Vite, React Router, Tailwind CSS v4, shadcn/ui, TanStack Query,
  pnpm.
- Authentication: OIDC through Keycloak only.
- Specs: [`docs/specs`](docs/specs/README.md).
- Agent rules: [`AGENTS.md`](AGENTS.md).

## Requirements

- Node.js 24 LTS (`.nvmrc`).
- pnpm, enabled with `corepack enable`.
- For `pnpm dev` only: user-service and course-service running locally (ports 8081 and 8082 by
  default). `pnpm dev:mock` needs no backend.

## Getting started

```sh
pnpm install
pnpm dev:mock   # http://localhost:3000, no backend needed (docs/specs/006-mock-mode.md)
pnpm dev        # http://localhost:3000, against the Go services
# Both start the two apps; the admin app is opened through http://localhost:3000/admin
```

| Command | Effect |
| --- | --- |
| `pnpm build` | Type check, then production build in `apps/app/dist/` and `apps/admin/dist/` |
| `pnpm test:e2e` | End-to-end tests (Playwright) against the mock mode |
| `pnpm test` | Unit and component tests (Vitest), every package |
| `pnpm lint` | ESLint, including the security rules of `docs/specs/003-security.md` |
| `pnpm typecheck` | TypeScript only, every package |

The dev proxy targets can be changed with `VITE_USER_SERVICE_URL` and `VITE_COURSE_SERVICE_URL`.

## Layout

| Path | Package | Content |
| --- | --- | --- |
| `apps/app` | `@pupitre/app` | The learner app: sign-in, catalogue, lessons, learner space, agenda |
| `apps/admin` | `@pupitre/admin` | The admin app, under `/admin` and `/manager`: administration and manager space |
| `packages/core` | `@pupitre/core` | Shared by both apps: API client, session, top bar, guards, markdown, mocks |
| `packages/ui` | `@pupitre/ui` | Design system: shadcn components, pupitre CSS, security helpers |
| `docs/specs` | | Functional and technical specs |

Details: [`docs/specs/000-scope-and-stack.md`](docs/specs/000-scope-and-stack.md).

## Contributing

- Branches: [Conventional Branch](https://conventional-branch.github.io/) (`feature/…`,
  `bugfix/…`, `chore/…`).
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
  `docs:`…).
- No direct commit on `main`.
