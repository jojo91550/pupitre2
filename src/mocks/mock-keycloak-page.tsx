import { FlaskConical } from 'lucide-react';
import { useSearchParams } from 'react-router';

import { Brand } from '@/components/brand';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/user-avatar';

import { MOCK_ACCOUNTS } from './data';

// Stand-in for the Keycloak sign-in page, mounted only by `pnpm dev:mock`. It
// returns to /auth/callback exactly like Keycloak would, so the real callback
// code (state check included) is exercised.

function callbackUrl(params: Record<string, string>) {
  return `/auth/callback?${new URLSearchParams(params).toString()}`;
}

export function MockKeycloakPage() {
  const [params] = useSearchParams();
  const state = params.get('state') ?? '';

  return (
    <main className="flex min-h-svh items-start justify-center bg-muted px-4 py-10 sm:items-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="gap-3">
          <Brand />
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="size-5 text-warning" />
            Keycloak simulé
          </CardTitle>
          <CardDescription>Mode mock : choisissez le compte avec lequel vous connecter.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {!state && (
            <Alert variant="destructive">
              <AlertDescription>Paramètre « state » manquant : repartez de la page de connexion.</AlertDescription>
            </Alert>
          )}
          {MOCK_ACCOUNTS.map(({ user, description }) => (
            <button
              key={user.id}
              type="button"
              disabled={!state}
              onClick={() => window.location.assign(callbackUrl({ code: user.id, state }))}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 text-left hover:bg-muted disabled:opacity-50"
            >
              <UserAvatar username={user.username} avatarUrl={user.avatarUrl} className="size-10" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{user.username}</span>
                <span className="block truncate text-sm text-muted-foreground">{user.email}</span>
              </span>
              <Badge variant="secondary">{description}</Badge>
            </button>
          ))}
          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => window.location.assign(callbackUrl({ error: 'access_denied' }))}
          >
            Annuler la connexion
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
