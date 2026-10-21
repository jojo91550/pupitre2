import { request } from './client';
import type { AuthorizeResponse, AuthResponse, PublicSettings, UserPublic } from './types';

// user-service authentication routes used with Keycloak (docs/specs/001).

export function getPublicSettings() {
  return request<PublicSettings>('/settings/public', { anonymous: true });
}

export function oidcAuthorize() {
  return request<AuthorizeResponse>('/auth/oidc/authorize', { anonymous: true });
}

export function oidcCallback(code: string, state: string) {
  return request<AuthResponse>('/auth/oidc/callback', {
    method: 'POST',
    body: { code, state },
    anonymous: true,
  });
}

export function getMe() {
  return request<UserPublic>('/auth/me');
}
