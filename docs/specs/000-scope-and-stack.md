# 000 - Scope, stack and repository conventions

## Scope

pupitre2 holds the platform **frontend**. It talks to the existing Go API, which is not changed.
The repository is a frontend monolith: a single React application that holds the learner space,
the manager space and the administration. There is no separate admin application.

## Stack

| Role | Choice | Note |
| --- | --- | --- |
| Development runtime | Node.js **≥ 22 LTS** | Node 18 is end-of-life and not supported by Vite or the current CLIs |
| Package manager | **pnpm** (through `corepack enable`) | `packageManager` pinned in `package.json` |
| Language | **TypeScript**, `strict` mode | All components are `.tsx` files |
| UI library | **React 19** | |
| Build tool and dev server | **Vite** | |
| Routing | **React Router** (data mode: `createBrowserRouter`, loaders) | Single-page application, rendered in the browser |
| Components | **shadcn/ui** (Radix + Tailwind) | Components are copied into `src/components/ui` |
| Styles | **Tailwind CSS v4** | The tokens of [005](005-ui-theme-navigation.md) become the shadcn theme variables |
| Server state | **TanStack Query** | Cache, invalidation after mutations, loading states |
| Forms | react-hook-form + zod | Used by the shadcn form components |
| Icons | lucide-react | Replaces the hand-copied SVGs |
| Toasts | sonner (shadcn component) | |
| Markdown | marked + **DOMPurify** | See [012](012-lesson-player.md) and [003](003-security.md) |
| Diagrams | mermaid, loaded on demand | |
| Unit tests | Vitest + Testing Library | |
| End-to-end tests | Playwright | |

The application is served as static files. In production, a reverse proxy sends `/api/*` to the
Go services following the table in [004](004-api-and-routing.md), and every other route to
`index.html`. In development, the Vite proxy does the same.

## Repository layout

```
pupitre2/
├── docs/specs/              # this folder
├── src/
│   ├── main.tsx             # entry point, providers (Query, Router, Theme, Toaster)
│   ├── router.tsx           # route table and guards
│   ├── api/                 # HTTP client, types, one function per route
│   ├── auth/                # session, role guard, OIDC callback
│   ├── components/ui/       # shadcn components
│   ├── components/          # shared components (top bar, sidebar, course card…)
│   ├── features/<domain>/   # pages and components per domain (catalogue, course, admin…)
│   ├── lib/                 # markdown, sanitization, formatting, utilities
│   └── styles/              # globals.css (tokens, theme)
├── public/                  # pioupitre.png, favicon
├── e2e/                     # Playwright tests
└── package.json
```

## Configuration

| Variable | Use | Development default |
| --- | --- | --- |
| `VITE_USER_SERVICE_URL` | Dev proxy target for user-service | `http://localhost:8081` |
| `VITE_COURSE_SERVICE_URL` | Dev proxy target for course-service | `http://localhost:8082` |

No secret may reach the browser: every `VITE_*` variable is public.

## Scripts

| Command | Effect |
| --- | --- |
| `pnpm dev` | Vite dev server with the `/api` proxy |
| `pnpm build` | Type check, then production build |
| `pnpm preview` | Serves the build |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest |
| `pnpm test:e2e` | Playwright |

## Git conventions

- Branches follow [Conventional Branch](https://conventional-branch.github.io/): `feature/…`,
  `bugfix/…`, `hotfix/…`, `release/…`, `chore/…`, lowercase with hyphens.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`,
  `docs:`, `chore:`, `refactor:`, `test:`, `ci:`, `style:`, `perf:`, with an optional scope
  (`feat(catalogue): …`).
- No direct commit on `main`: everything goes through a branch and a pull request.

## Acceptance criteria

- `pnpm install && pnpm build` passes on Node 22 without a version warning.
- `pnpm dev` shows the catalogue when the Go services run locally.
- No dependency is loaded from a CDN at runtime, fonts included (they are served by the
  application, see [003](003-security.md)).
