# pupitre2

New React frontend of the pupitre e-learning platform. It replaces the Astro frontend of
[`genesary/pupitre`](https://github.com/genesary/pupitre) and uses its Go backend as it is.

- Stack: React 19, TypeScript, Vite, React Router, Tailwind CSS v4, shadcn/ui, TanStack Query,
  pnpm.
- Authentication: OIDC through Keycloak only.
- Specs: [`docs/specs`](docs/specs/README.md).

## Requirements

- Node.js 22 LTS or later.
- pnpm, enabled with `corepack enable`.
- For `pnpm dev` only: user-service and course-service running locally (ports 8081 and 8082 by
  default). `pnpm dev:mock` needs no backend.

## Getting started

```sh
pnpm install
pnpm dev:mock   # http://localhost:3000, no backend needed (docs/specs/006-mock-mode.md)
pnpm dev        # http://localhost:3000, against the Go services
```

| Command | Effect |
| --- | --- |
| `pnpm build` | Type check, then production build in `dist/` |
| `pnpm test` | Unit and component tests (Vitest) |
| `pnpm lint` | ESLint, including the security rules of `docs/specs/003-security.md` |
| `pnpm typecheck` | TypeScript only |

The dev proxy targets can be changed with `VITE_USER_SERVICE_URL` and `VITE_COURSE_SERVICE_URL`.

## Contributing

- Branches: [Conventional Branch](https://conventional-branch.github.io/) (`feature/…`,
  `bugfix/…`, `chore/…`).
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
  `docs:`…).
- No direct commit on `main`.
