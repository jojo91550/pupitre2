# 108 - Backend: operations, tooling and tests

How the monolith is built, run, tested and deployed, next to the frontend in this repository.

## Repository

- `apps/api` is a Go module of its own (`go.mod`, `go.sum`, `.golangci.yml`), with no
  `package.json`: pnpm ignores it, so a frontend contributor needs no Go toolchain.
- Root scripts call it for convenience: `pnpm api:dev` (`go run ./cmd/pupitre-api`),
  `pnpm api:test` (`go test ./... -race`), `pnpm api:lint` (`golangci-lint run ./...`),
  `pnpm api:build` (`go build ./...`). The frontend scripts (`dev`, `test`, `build`…) do not
  change.
- Go version: the one of `genesary/pupitre` (1.26); dependencies keep their versions at `3cdf7b2`
  and are updated later on purpose, not during the move.
- `.golangci.yml` is kept as is; `golangci-lint run ./...` passes in `apps/api`.

## Local development

| Command | Effect |
| --- | --- |
| `docker compose -f apps/api/compose.yaml up -d` | PostgreSQL 18 on 5432 (and, optionally, Keycloak for the real sign-in) |
| `pnpm api:dev` | The API on `http://localhost:8080`, `LOG_FORMAT=text`, `SEED_DEV_COURSES=true` |
| `pnpm dev` | The two frontend apps, proxying `/api` and `/uploads` to the API |
| `pnpm dev:mock` | Unchanged: no backend at all ([006](006-mock-mode.md)) |

The frontend's dev proxy (`apps/app/vite.config.ts`) loses its split between user-service and
course-service: `/api` and `/uploads` go to **one** target, `VITE_API_URL`
(default `http://localhost:8080`). `VITE_USER_SERVICE_URL` and `VITE_COURSE_SERVICE_URL` are
removed, and [004](004-api-and-routing.md) is updated in the same change.

## Image

- One `apps/api/Dockerfile`: build stage on `golang:1.26-alpine` with module and build caches,
  `CGO_ENABLED=0`, `-ldflags="-s -w"`; runtime stage `FROM scratch` with the CA certificates,
  user `1000:1000`, `EXPOSE 8080`, no `ENV` defaults (they live in the code, [101](101-backend-configuration.md)).
- Image name `pupitre-api`. It replaces `user-service`, `course-service` and `checker-service`.
- The frontend image (the two apps behind one static server) is a separate deliverable, specified
  with the deployment batch of [199](199-backend-migration-plan.md).

## Deployment

- The Helm chart stays in its own repository (`pupitre-helm`). Its update is part of batch B4 of
  [199](199-backend-migration-plan.md): one Deployment and one Service for the API, one ConfigMap
  merging the three, `/api` and `/uploads` routed to the API by one prefix rule, the internal
  secret and the service URLs removed.
- Probes: `/health` for liveness and readiness. Graceful shutdown in 15 s on `SIGTERM`.
- Uploads (`UPLOADS_DIR`) stay on the volume course-service used.
- `infra/kind` and `infra/manifests` (local kind cluster, PostgreSQL manifest) move to
  `apps/api/infra` and build one image instead of three. The `Makefile` keeps its targets with one
  image (`docker-build`, `kind-load`, `helm-install`, `dev`, `logs`, `status`); targets of the
  Astro frontend are dropped.

## Tests

| Suite | Where | Runs |
| --- | --- | --- |
| Unit and handler tests of both services and the checker | `apps/api/internal/**` | `go test ./... -race` |
| Performance invariants (`scaling_test.go`) | users and courses domains | same, counting queries and interface calls |
| Wire contract (`wire_contract_test.go`) | users domain | same |
| Route inventory test | `internal/server` | same: every route of [103](103-backend-http-api.md), guards and limits, no duplicate pair |
| Schema test | `internal/platform/db` | same, needs PostgreSQL: empty database and a database migrated by `3cdf7b2` ([102](102-backend-data-and-migrations.md)) |
| Go end-to-end tests | `apps/api/e2e`, build tag `e2e` | against a running binary: `API_URL` replaces `USER_SERVICE_URL`, `COURSE_SERVICE_URL` and `CHECKER_SERVICE_URL`; the checker cases that called `/evaluate` and `/check-step` go through the public check routes |
| Frontend Playwright tests | `e2e/` | against the mock mode, as today; a second project runs them against the monolith with a seeded database |

Tests that needed an `httptest` server standing in for another service use a fake of the
in-process interface instead ([104](104-backend-in-process-calls.md)). The integration tests that
started a service (`run_integration_test.go`, `main_integration_test.go`) start the monolith.

## Continuous integration

No CI exists in this repository yet. The first workflows, in `.github/workflows`:

- `api.yaml`, on changes under `apps/api`: lint, `go test -race` with coverage, build, Go e2e
  against PostgreSQL 18.
- `web.yaml`, on changes outside it: `typecheck`, `lint`, `test`, `build`, Playwright.
- Image build and release are specified with batch B4.

## Acceptance criteria

- On a clean clone: `pnpm install`, `pnpm api:test`, `pnpm test`, `pnpm build` pass; `pnpm dev`
  with `pnpm api:dev` signs in through Keycloak and shows the catalogue.
- `docker build apps/api` produces an image under 50 MB that answers `/health`.

## Sources

`Makefile`, `*/Dockerfile`, `infra/`, `e2e/`, `.github/workflows/` and `.golangci.yml` of
`genesary/pupitre`; `apps/app/vite.config.ts` of this repository.
