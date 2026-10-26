# 105 - Backend: authentication and authorization

Authentication lived in user-service; course-service only verified tokens. In the monolith the
`users` domain keeps every sign-in method and token minting, and the shared `platform/auth`
package verifies tokens for every domain. Nothing changes for a client: a token issued by
user-service at `3cdf7b2` is accepted by the monolith, and the reverse.

The new frontend signs in through Keycloak only ([001](001-keycloak-authentication.md)). The
backend keeps **every** method below anyway: they are configured by settings, other clients may
use them, and dropping one would lose behaviour. Disabling one is a setting, not a code change.

## Session token

| Property | Value |
| --- | --- |
| Format | JWT, `HS256` only (any other `alg` is refused before the signature is checked) |
| Secret | `JWT_SECRET` ([101](101-backend-configuration.md)) |
| Lifetime | `JWT_EXPIRY_HOURS`, 8 h by default |
| Claims | `sub` (user id), `email`, `role`, `preferred_username`, `iss`, `aud`, `exp`, `iat` |
| Issuer | `user-service`: **kept**, though the service is gone, so live tokens stay valid |
| Audience | `pupitre-api`, required on parse |
| Transport | `Authorization: Bearer <token>`; the frontend keeps it in `sessionStorage` ([003](003-security.md)) |

Guards, one implementation for every route:

| Guard | Allows | Refusals |
| --- | --- | --- |
| `Auth` | any valid token with a subject | `401 Missing Authorization header`, `401 Invalid token`, `401 Invalid token: missing user ID` |
| `Admin` | role `admin` | as `Auth`, then `403` |
| `Manager` | role `manager` | as `Auth`, then `403` |
| `ManagerOrAdmin` | role `manager` or `admin` | as `Auth`, then `403` |

Roles are `student`, `manager` and `admin`. Group roles (manager of a group) are checked by the
handlers, not by the guards.

## Sign-in methods

All the routes are in [103](103-backend-http-api.md), under `/api/auth`.

### Dedicated OIDC (Keycloak)

The full-featured single provider, used by the frontend.

- Settings `oidc_enabled`, `oidc_provider_url`, `oidc_issuer_url`, `oidc_client_id`,
  `oidc_client_secret`, `oidc_scopes` (default `openid email profile groups`), `oidc_group_claim`
  (default `groups`), `oidc_group_admins`, `oidc_redirect_base`, `oidc_browser_base_url`,
  `oidc_insecure_skip_verify`. They can be edited in `/admin/settings` and are **seeded at
  start-up** from the `OIDC_*` variables ([101](101-backend-configuration.md)).
- `GET /api/auth/oidc/authorize` redirects to the provider with a signed `state`
  (`OAUTH_STATE_SECRET`); `POST /api/auth/oidc/callback` exchanges the code and returns a token.
- **Split horizon**: discovery uses the internal URL, browser redirects use
  `oidc_browser_base_url`, and the token's issuer is checked against `oidc_issuer_url`.
- **Group to role**: the groups of `oidc_group_claim` are synced as platform groups; a group
  listed in `oidc_group_admins` or mapped in `group_role_mappings` grants its role. The highest
  role wins (`admin` > `manager` > `student`).
- `authProvider` stored on the user: `oidc`.

### OAuth providers (`sso.providers`)

- Several providers at once, declared in the configuration file (`providers[]`), secrets from
  `SSO_<ID>_CLIENT_SECRET[_FILE]`.
- `GET /api/auth/oauth/{id}/authorize`, `POST /api/auth/oauth/callback`.
- `github` uses OAuth2 directly; any other id uses OIDC discovery on its `issuerUrl`. Scopes are
  fixed (`openid email profile`).
- **No group to role mapping**: users get the default group and role. `authProvider` is the
  provider id, so the id must never change.

### LDAP / Active Directory

- Settings `ldap_enabled`, `ldap_server_url`, `ldap_bind_dn`, `ldap_bind_password`,
  `ldap_user_base_dn`, `ldap_user_filter` (`%s` is the email), `ldap_group_base_dn`,
  `ldap_group_filter` (`%s` is the user DN).
- `POST /api/auth/ldap/login`: bind with the service account (or anonymously), search the user by
  email, bind again as the user with the given password, sync groups if `ldap_group_base_dn` is
  set (role mappings apply), issue a token.

### Local accounts

- `POST /api/auth/register` (when `registration_enabled` is true and the email domain matches
  `registration_email_whitelist`, if set), `POST /api/auth/login`.
- Password policy from settings: `password_min_length` (default 8),
  `password_require_uppercase`, `password_require_number`. Passwords are hashed with bcrypt.
- Password change refused for SSO-managed accounts. Username change allowed unless
  `profile_allow_username_change` is `false`.
- The bootstrap `admin` account is described in [102](102-backend-data-and-migrations.md).

### Profile sync on SSO sign-in

Avatar always updated from the provider; bio filled on first sign-in only, never overwritten
afterwards; display name set at creation only (`name`, then `preferred_username`, then email).
For OIDC, UserInfo claims win over ID token claims.

## Rate limits

`register`, `login`, `oauth/callback`, `oidc/callback` and `ldap/login` are limited per client IP
(after `RealIP`): `AUTH_RATE_LIMIT_REQUESTS` per `AUTH_RATE_LIMIT_WINDOW_SECONDS`, 10 per 60 s
by default, `429` beyond. The limiter is in memory, per replica, as before.

## Acceptance criteria

- A token minted by the `3cdf7b2` user-service with the same secret is accepted by every guarded
  route of the monolith; a token with `alg: none`, without `aud`, or expired is refused with the
  messages above.
- The existing tests of `internal/middleware`, `handlers/auth*`, `oidc*`, `oauth*` and `ldap*`
  pass unchanged apart from import paths.
- The Playwright sign-in through Keycloak works against the monolith ([108](108-backend-operations-and-testing.md)).

## Sources

`internal/middleware/auth.go`; `user-service/internal/handlers/auth.go`, `oidc.go`, `oauth.go`,
`ldap.go`, `settings.go`; `user-service/internal/db/seed.go`; `docs/SSO.md`, `docs/ARCHITECTURE.md`
("JWT").
