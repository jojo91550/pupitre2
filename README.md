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
- user-service and course-service running locally (ports 8081 and 8082 by default).

## Contributing

- Branches: [Conventional Branch](https://conventional-branch.github.io/) (`feature/…`,
  `bugfix/…`, `chore/…`).
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
  `docs:`…).
- No direct commit on `main`.
