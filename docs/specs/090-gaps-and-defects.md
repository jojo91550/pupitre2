# 090 - Differences from the reference and defects of the current frontend

## What these specs add compared with the `ebuildy/pupitre2` reference

The reference describes a full rewrite (TypeScript backend, two separate React applications,
server-side sessions). pupitre2 only rewrites the frontend. The specs therefore add:

| Topic | Reference | pupitre2 |
| --- | --- | --- |
| Backend | Rewritten in TypeScript (routes `/api/me`, `/api/sessions`…) | **Unchanged**: the specs call the existing Go routes ([004](004-api-and-routing.md)) |
| Applications | Two applications (learner and admin) | **One** application, admin included |
| Authentication | Local login, OAuth, OIDC, LDAP | **Keycloak OIDC only** ([001](001-keycloak-authentication.md)), plus the backend settings to turn off (H7) |
| Session | Server-side session cookie | The backend JWT, isolated in one module so it can move to a cookie later |
| Security | Fixes built into the new backend | Explicit frontend requirements from the audit ([003](003-security.md)): sanitization, avatar, redirects, CSP |
| Desktop app | Out of scope | Tauri local check kept and compatible ([014](014-labs.md)) |
| Languages | French and English | French only, with strings grouped for a future translation |
| API contract | Generated OpenAPI | Types written by hand from the Go structs, as the current OpenAPI is incomplete |

The reference features that belong to its backend (admin account bootstrap, demo data,
server-side performance invariants, health and metrics, rate limiting) do not apply to a frontend
and are not carried over.

## Defects of the current frontend

Found while reading `genesary/pupitre/frontend` (commit `3cdf7b2`). Each one is fixed by the spec
indicated.

| # | Defect | Where | Fix |
| --- | --- | --- | --- |
| A1 | Patterns never apply in lessons: `GET /api/patterns` is called **without a token**, while the route requires a signed-in user (401) | `lessons/[index].astro`, `quiz/[index].astro` | Call through the authenticated client ([012](012-lesson-player.md)) |
| A2 | The course `thumbnail` field is read everywhere, but the API does not return it | `courses/index.astro`, `courses/[slug]/index.astro`, `my-courses.astro` | Icon thumbnail ([010](010-catalogue.md)); a real thumbnail needs a backend field |
| A3 | The `total_labs`, `total_submissions` and `success_rate` statistics are always 0 (hard-coded in `AdminStats`) | `admin/index.astro` | Not shown ([040](040-admin-dashboard.md)) |
| A4 | Two different admin sidebars (`Admin.astro` without Patterns, Settings or Monitoring; the old dashboard without Paths, Labs or Exports) | `layouts/Admin.astro`, `admin/[...slug].astro` | A single list ([005](005-ui-theme-navigation.md)) |
| A5 | The « Quiz ref » field of the module editor does not exist in the definition: what is entered is lost | `admin/courses/index.astro` | Removed ([042](042-admin-courses.md)) |
| A6 | The client `role` type does not know `manager`; some lab types and one route no longer exist in the API | `lib/api.ts` | Types rebuilt from the Go structs ([004](004-api-and-routing.md)) |
| A7 | 401 is handled in three ways: redirect to `/`, redirect to `/login`, and `localStorage.clear()`, which also wipes the theme | every page | A single handling ([001](001-keycloak-authentication.md)) |
| A8 | An enrollment failure is ignored, then the page reloads | `courses/[slug]/index.astro` | Error toast ([011](011-course-page-and-enrollment.md)) |
| A9 | A lesson's breadcrumb shows the course slug instead of its title | `lessons/[index].astro` | Title ([012](012-lesson-player.md)) |
| A10 | A skill's level is recomputed in the frontend, while the server returns it | `my-skills.astro` | Server value ([020](020-learner-space.md)) |
| A11 | The 200 XP per course and the level thresholds are hard-coded in the frontend | `courses/index.astro`, `courses/[slug]/index.astro`, `my-xp.astro` | Kept, but centralized in one constant until the API exposes them |
| A12 | `courseReturnTo` stays in `localStorage` if the learner leaves the course: it can hijack the end of another course | `my-paths.astro`, `lessons/[index].astro` | `sessionStorage`, cleared once used ([012](012-lesson-player.md)) |
| A13 | The pattern form says the JS is "executed after rendering", but it is executed nowhere | `admin/patterns/index.astro` | Label « non exécuté » ([045](045-admin-patterns.md)) |
| A14 | After an SSO callback, the `redirect` parameter is lost; after a local login, it is ignored for an admin | `auth/callback.astro`, `login.astro` | Destination stored and validated for every role ([001](001-keycloak-authentication.md)) |
| A15 | A `/admin/[...slug]` route catches every unknown admin URL and shows an old dashboard | `admin/[...slug].astro` | 404 page ([002](002-roles-and-guards.md)) |
| A16 | The code that marked a lab as done when it was opened (`a[data-lab-slug]`) never runs: no link carries this attribute | `courses/[slug]/index.astro` | Not carried over |
| A17 | The names `labCount` and `completedLabs` actually mean the number of modules and of completed lessons | API, several pages | Names kept in the types, with a comment |

## Security

Audit findings C2, C3, C4 and H5 (issue genesary/pupitre#194) come from the current frontend.
They are covered by [003](003-security.md) and [001](001-keycloak-authentication.md).
