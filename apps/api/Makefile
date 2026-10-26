# ─────────────────────────────────────────────────────────────────────────────
# pupitre-api — build, test and local dependencies
# (docs/specs/108-backend-operations-and-testing.md)
#
# The same commands exist as `pnpm api:*` scripts at the repository root.
# The kind cluster and Helm targets come back with the chart of one API
# (batch B4 of docs/specs/199-backend-migration-plan.md); infra/kind keeps
# their configuration until then.
# ─────────────────────────────────────────────────────────────────────────────

# Local overrides (git-ignored), e.g. DOCKER=podman.
-include local.mk

DOCKER ?= docker
IMAGE  ?= pupitre-api:local
TEST_DATABASE_URL ?= postgres://pupitre:pupitre@localhost:5432/pupitre?sslmode=disable

.PHONY: build
build:
	go build ./...
	go vet ./...

.PHONY: test
test:
	go test -race ./...

# Needs PostgreSQL: `make up` starts it.
.PHONY: test-integration
test-integration:
	TEST_DATABASE_URL="$(TEST_DATABASE_URL)" go test -race -p 1 -tags integration ./...

# Needs a running API: `make up`, then `go run ./cmd/pupitre-api` (ADMIN_PASSWORD from .env).
.PHONY: test-e2e
test-e2e:
	go test -count=1 -tags e2e ./e2e/

.PHONY: lint
lint:
	golangci-lint run ./...

.PHONY: run
run:
	go run ./cmd/pupitre-api

.PHONY: image
image:
	$(DOCKER) build -t $(IMAGE) .

.PHONY: up
up:
	$(DOCKER) compose up -d --wait

.PHONY: down
down:
	$(DOCKER) compose down
