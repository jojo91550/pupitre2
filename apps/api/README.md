# apps/api

The Go backend of pupitre, imported without its history from
[`genesary/pupitre`](https://github.com/genesary/pupitre) at commit `3cdf7b2`
(user-service, course-service, checker-service and the shared `internal/` packages).
Only the module path changed, to `github.com/jojo91550/pupitre2/apps/api`.

It is being merged into one application: see the backend specs
[`100`-`199`](../../docs/specs/100-backend-scope-and-architecture.md) and the plan in
[`199`](../../docs/specs/199-backend-migration-plan.md). Until batch B1 lands, the three
services build and run separately, as before.

```sh
go build ./...
go vet ./...
golangci-lint run ./...
go test ./... -race
TEST_DATABASE_URL=postgres://pupitre:pupitre@localhost:5432/pupitre?sslmode=disable \
  go test -tags integration -p 1 ./...
```
