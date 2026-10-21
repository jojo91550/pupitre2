// API types, written from the Go response structs (docs/specs/004-api-and-routing.md).
// JSON field names are the `json:"…"` tags; each type names its source handler.

export type Role = 'student' | 'manager' | 'admin';

/** user-service/internal/handlers/auth.go — userPublicRow */
export type UserPublic = {
  id: string;
  username: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  bio: string | null;
  isActive: boolean;
  authProvider: string;
  createdAt: string;
};

/** user-service/internal/handlers/auth.go — authResponse */
export type AuthResponse = {
  token: string;
  user: UserPublic;
};

/** user-service/internal/handlers/settings.go — PublicSettings. Every value is a string. */
export type PublicSettings = {
  registration_enabled: string;
  sso_local_login_enabled: string;
  password_min_length: string;
  password_require_uppercase: string;
  password_require_number: string;
  oidc_enabled: string;
  ldap_enabled: string;
};

/** user-service/internal/handlers/oidc.go — OIDCAuthorize */
export type AuthorizeResponse = {
  url: string;
  state: string;
};

/** Error envelope written by internal/httperr. */
export type ApiErrorBody = {
  error: string;
  [key: string]: unknown;
};
