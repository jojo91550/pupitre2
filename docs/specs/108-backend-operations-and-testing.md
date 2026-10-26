# 108 - Backend: operations, tooling and tests

How the monolith is built, run, tested and deployed, next to the frontend in this repository.

## Repository

- `apps/api` is a Go module of its own (`go.mod`, `go.sum`, `.golangci.yml`), with no
  `package.json`: pnpm ignores it, so a frontend contributor needs no Go toolchain.
- Root scripts call it through `scripts/api.mjs`:

  | Script | Runs, in `apps/api` |
  | --- | --- |
  | `pnpm api:up` / `pnpm api:down` | `docker compose up -d --wait` / `down` |
  | `pnpm api:dev` | Builds `bin/pupitre-api` and runs it, on `http://localhost:8080`; creates `.env` from `.env.example` the first time |
  | `pnpm api:test` | `go test -race ./...` |
  | `pnpm api:lint` | `golangci-lint run ./...` |
  | `pnpm api:build` | `go build ./...` and `go vet ./...` |

  `api:dev` runs a built binary rather than `go run`, whose program outlives it on Windows when
  it is stopped. The frontend scripts (`dev`, `test`, `build`…) do not change.
- `apps/api/Makefile` has the same targets for a shell (`build`, `test`, `test-integration`,
  `test-e2e`, `lint`, `run`, `image`, `up`, `down`).
- Go version: the one of `genesary/pupitre` (1.26); dependencies keep their versions at `3cdf7b2`
  and are updated later on purpose, not during the move.
- `.golangci.yml` is kept as is; `golangci-lint run ./...` passes in `apps/api`.

## Local development

| Command | Effect |
| --- | --- |
| `pnpm api:up` | PostgreSQL 18 on 5432 and Keycloak 26 on 8180, from `apps/api/compose.yaml` |
| `pnpm api:dev` | The API on `http://localhost:8080`, configured by `apps/api/.env` |
| `pnpm dev` | The two frontend apps, proxying `/api` and `/uploads` to the API |
| `pnpm dev:mock` | Unchanged: no backend at all ([006](006-mock-mode.md)) |

- **Keycloak** imports the test realm `apps/api/infra/keycloak/pupitre-realm.json`: client
  `pupitre` (redirects to `http://localhost:3000/*`), groups `pupitre-admins`,
  `pupitre-managers`, `pupitre-students`, and three accounts, `alice`, `marc.manager` and
  `admin.kc`, whose passwords are in the file. They are **local test values**, never deployed. A
  one-shot `keycloak-setup` container then adds the `groups` client scope that the API asks for
  (`oidc_scopes`): importing it with the realm would replace Keycloak's built-in scopes.
- The API runs on the host, not in compose, so the browser and the API reach Keycloak at the same
  address and no split-horizon setting is needed.
- `apps/api/.env.example` holds the development settings matching compose. `pupitre-api` loads
  a `.env` of its working directory without overriding the environment.
- Roles: `OIDC_GROUP_ADMINS` is not set; `pupitre-admins` is mapped to `admin` in
  `/admin/groups` and a manager is made by hand in `/admin/users`
  ([105](105-backend-authentication.md)). The Playwright backend suite does both.

The frontend's dev proxy (`apps/app/vite.config.ts`) sends `/api` and `/uploads` to **one**
target, `VITE_API_URL` (default `http://localhost:8080`). `VITE_USER_SERVICE_URL` and
`VITE_COURSE_SERVICE_URL` are gone ([004](004-api-and-routing.md)).

## Image

- One `apps/api/Dockerfile`, built from `apps/api`: build stage on `golang:1.26.7-alpine` with
  module and build caches, `CGO_ENABLED=0`, `-ldflags="-s -w"`; runtime stage `FROM scratch`
  with the CA certificates, user `1000:1000`, `EXPOSE 8080`, no `ENV` defaults (they live in the
  code, [101](101-backend-configuration.md)). About 46 MB.
- The deployment mounts the writable paths: `/tmp` (git cache) and `UPLOADS_DIR`.
- Image name `pupitre-api`. It replaces `user-service`, `course-service` and `checker-service`.
- The frontend image (the two apps behind one static server) is a separate deliverable, specified
  with the deployment batch of [199](199-backend-migration-plan.md).

## Deployment

- The Helm chart stays in its own repository (`pupitre-helm`). Its update is part of batch B4 of
  [199](199-backend-migration-plan.md): one Deployment and one Service for the API, one ConfigMap
  merging the three, `/api` and `/uploads` routed to the API by one prefix rule, the internal
  secret and the service URLs removed.
- Probes: `/health` for liveness and readiness. Graceful shutdown in 15 s on `SIGTERM`.
- Uploads (`UPLOADS_DIR`): the chart sets `/data/uploads` but mounts no volume there, on a read-only
  root filesystem ([190](190-backend-defects.md) B22). The API's chart mounts a volume at
  `/data/uploads` (a `PersistentVolumeClaim`, `ReadWriteMany` when the API has several replicas).
- `apps/api/infra/kind` and `infra/manifests` (local kind cluster) stay as they were: they install
  the chart, which still deploys three services until B4. The kind and Helm targets of the
  `Makefile` come back in B4, with one image.

## Tests

| Suite | Where | Runs |
| --- | --- | --- |
| Unit and handler tests of the domains | `apps/api/internal/**` | `go test ./... -race` |
| Performance invariants (`scaling_test.go`) | users and courses domains | same, counting queries and calls |
| Wire contract (`wire_contract_test.go`) | users domain | same |
| Route inventory and guards | `internal/server/router_test.go` | same: every route of [103](103-backend-http-api.md), no other |
| Cross-domain wiring | `internal/server/wiring_test.go` | same: a learner flow across domains on fakes, failure semantics, lab check limit |
| Merged configuration | `internal/platform/config` | same |
| Schema and start-up | `internal/server/*_integration_test.go`, tag `integration` | needs PostgreSQL: same schema as the two services ([102](102-backend-data-and-migrations.md)); `Run` serves, then stops on `SIGTERM` |
| Repository and migration tests | `internal/*/repository`, `internal/*/db`, tag `integration` | needs PostgreSQL |
| Go end-to-end tests | `apps/api/e2e`, tag `e2e` | against a running binary at `API_URL`; also checks the lab check routes need a token and the service routes are gone |
| Frontend Playwright, mock | `e2e/*.spec.ts`, `pnpm test:e2e` | against the mock mode, as before |
| Frontend Playwright, backend | `e2e/backend/`, `pnpm test:e2e:backend` | against both apps, `pupitre-api`, and compose's PostgreSQL and Keycloak: real Keycloak sign-in of each role, every page of each role, a learner taking a course to the badge. Written to pass again on the data of an earlier run |

The handler tests of each domain used `httptest` servers standing in for the other services. They
keep them: each domain's `standalone_test.go` holds, for the tests only, the old service's router
(with its internal routes, as shims over the in-process methods) and its HTTP clients of the other
services ([104](104-backend-in-process-calls.md)). Production has none of them.

## Continuous integration

Three workflows, in `.github/workflows`:

- `api.yaml`, on changes under `apps/api`: `golangci-lint`; `go build`, `go vet`, `go test -race`
  with coverage; integration tests against PostgreSQL 18; then the binary is started and the Go
  e2e suite runs against it.
- `web.yaml`, on changes outside `apps/api` and the docs: `typecheck`, `lint`, `test`, `build`,
  and Playwright against the mock mode.
- `fullstack.yaml`, on every change: `pnpm api:up`, then Playwright against the real backend.
- Image build and release are specified with batch B4.

## Acceptance criteria

- On a clean clone: `pnpm install`, `pnpm api:test`, `pnpm test`, `pnpm build` pass; `pnpm api:up`,
  `pnpm api:dev` and `pnpm dev` sign in through Keycloak and show the catalogue.
- `pnpm test:e2e:backend` passes on an empty database and again on the data it left.
- `docker build apps/api` produces an image under 50 MB that answers `/health`.

## Sources

`Makefile`, `*/Dockerfile`, `infra/`, `e2e/`, `.github/workflows/` and `.golangci.yml` of
`genesary/pupitre`; `apps/app/vite.config.ts` of this repository.
