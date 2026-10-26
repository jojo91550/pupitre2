# apps/api

The Go backend of pupitre, imported without its history from
[`genesary/pupitre`](https://github.com/genesary/pupitre) at commit `3cdf7b2`, and merged into one
application: `cmd/pupitre-api` serves every route of user-service, course-service and
checker-service on one port, with the domains calling each other in-process. See the backend specs
[`100`-`199`](../../docs/specs/100-backend-scope-and-architecture.md) and the plan in
[`199`](../../docs/specs/199-backend-migration-plan.md).

| Path | Content |
| --- | --- |
| `cmd/pupitre-api` | The entry point |
| `internal/server` | Wiring: migrations, router, in-process adapters, start-up |
| `internal/users`, `internal/courses`, `internal/checker` | The three domains, as they were in their services |
| `internal/platform` | Shared plumbing: merged configuration, JWT guards, HTTP helpers, metrics |
| `user-service`, `course-service`, `checker-service` | The old entry points, kept until batch B2 |

```sh
go run ./cmd/pupitre-api          # http://localhost:8080, needs DATABASE_URL
go build ./...
go vet ./...
golangci-lint run ./...
go test ./... -race
TEST_DATABASE_URL=postgres://pupitre:pupitre@localhost:5432/pupitre?sslmode=disable \
  go test -tags integration -p 1 ./...
```
