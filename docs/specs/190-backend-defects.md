# 190 - Backend: known defects

Defects of the Go backend at `3cdf7b2`, found while writing the frontend ([090](090-gaps-and-defects.md))
or listed by the security audit of `genesary/pupitre` (`docs/audit-pupitre.html`, issue
genesary/pupitre#194). Per invariant 5 of [100](100-backend-scope-and-architecture.md), **the move
keeps each one as it is**. Each fix is a separate change after the move (batch B3 of
[199](199-backend-migration-plan.md)), with its own test, and updates this table.

## Resolved by the move itself

| Audit | Defect | Why it disappears |
| --- | --- | --- |
| H6 | `/internal/*` is served on the public port, protected only by a shared secret with a public default | No internal route is left ([103](103-backend-http-api.md)) |
| C1 (part) | Default `INTERNAL_SERVICE_SECRET` | The secret is removed ([101](101-backend-configuration.md)) |

## To fix after the move

| # | Source | Defect | Where | Proposed fix |
| --- | --- | --- | --- | --- |
| B1 | 090 | A manager who creates a subgroup is not made a member of it, so it leaves their scope | users `ManagerCreateSubgroup` | Add the creator as manager of the new subgroup, in the same transaction |
| B2 | 090 A22 | `PathEnrollmentRow` and `GroupRow` have no json tags: fields are sent as `Slug`, `EnrolledAt`… | users `repository/path_enrollment.go`, `repository/group.go` | Add camelCase tags **and** update `api-types.ts` and the mocks in the same change |
| B3 | 090 A23 | No route recomputes progress; `/api/admin/sync-progress` marks one lesson for one user | users `admin.go` | Specify the need first; keep the route as is |
| B4 | Audit C1 | Default `JWT_SECRET` accepted: anyone can mint an admin token | `platform/config` | Refuse to start with a default or short secret unless `PUPITRE_ENV=development` |
| B5 | - | Without `ADMIN_PASSWORD`, the bootstrap admin gets `Admin@1234` | users `db/seed.go` | Same rule as B4: refuse outside development, or generate and log a one-time password |
| B6 | Audit H2 | Managers act outside their groups: add any user to their group, export or mark attendance beyond their scope | users `manager.go`, `exports.go`, `sessions.go` | Check the target user and session against the manager's groups |
| B7 | Audit H3 | No revocation: the role is read from the token (8 h) and the database is never checked | `platform/auth` | Short-lived token plus a per-user token version checked on each request |
| B8 | Audit M4 | CSV formula injection (`=`, `+`, `-`, `@`) | users `repository/export.go` | Prefix such cells with `'` |
| B9 | checker | The lab check limit (20 per 60 s) applies to **all learners together**, and its `429` reaches the learner as `502` | `checker`, courses `check.go` | Limit per learner, answer `429` with `Retry-After`; the frontend handles it ([014](014-labs.md)) |
| B10 | Audit M1 | `/api/batch/courses` is public and returns private courses | courses `batch.go` | Filter the public route like `GET /api/courses/{slug}`; the in-process `Catalog` keeps full access |
| B11 | Audit M2 | The GitLab project checked is derived from the editable username: a learner can validate someone else's lab | courses `check.go` | Use the identity provider's `preferred_username`, not the profile username |
| B12 | Audit H4, H7 | `RealIP` trusts any `X-Forwarded-For`: the sign-in rate limit is bypassed | `internal/server` | Trust forwarding headers from configured proxies only; add a per-email limit |
| B13 | Audit M3 | The OAuth `state` is a JWT not bound to the browser (login CSRF) | users `oauth.go`, `oidc.go` | Bind it to a cookie or PKCE verifier |
| B14 | Audit M6 | Account enumeration through sign-in and registration messages | users `auth.go`, `oauth.go` | Generic messages |
| B15 | Audit M7 | No security headers; `/metrics` is public | `internal/server` | Header middleware; `/metrics` on a separate port or behind a guard |
| B16 | Audit L1, L2 | OIDC client secret and LDAP bind password stored in clear; `oidc_insecure_skip_verify` available in production | users settings | Encrypt at rest; allow the skip only in development |
| B17 | Audit L3, L4 | No email verification at registration (bypasses the domain allowlist); the quiz returns `correctAnswer` after submission | users `auth.go`, courses `modules.go` | Verification mail; decide on `correctAnswer` with [013](013-quizzes.md) |
| B18 | 090 A2, A18 | No course `thumbnail`; `GET /api/my/paths` does not return `level` | courses models, users `paths.go` | Add the fields, then show them in the frontend |

Audit findings C2, C3, C4 and H5 were in the Astro frontend and are covered by
[003](003-security.md) and [001](001-keycloak-authentication.md).

## Rules

- A fix that changes a response (B2, B9, B10, B17, B18) updates the frontend types, the mock mode
  and the specs 000-099 in the same change.
- A fix never weakens a test of the move: it adds a test that failed before.
