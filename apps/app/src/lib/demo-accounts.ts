// Test accounts of the local Keycloak realm (apps/api/infra/keycloak/pupitre-realm.json),
// shown on /login by the Vite dev server only (docs/specs/001). Referenced behind
// `import.meta.env.DEV`, so production builds drop them.

export interface DemoAccount {
  username: string;
  password: string;
  description: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: 'alice', password: 'alice-test-pw', description: 'Apprenante' },
  { username: 'marc.manager', password: 'marc-test-pw', description: 'Manager (à promouvoir dans /admin/users)' },
  { username: 'admin.kc', password: 'admin-test-pw', description: 'Administrateur (groupe pupitre-admins)' },
];

/** Adds Keycloak's `login_hint`, which pre-fills the username on its sign-in page. */
export function withLoginHint(url: string, username: string): string {
  const target = new URL(url);
  target.searchParams.set('login_hint', username);
  return target.toString();
}
