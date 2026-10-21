import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, KeyRound, Loader2 } from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router';

import { getPublicSettings, oidcAuthorize } from '@/api/auth';
import { landingPath } from '@/auth/paths';
import { rememberFlow } from '@/auth/oidc-flow';
import { useSession } from '@/auth/session';
import { Brand } from '@/components/brand';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { safeExternalUrl, safeRedirect } from '@/lib/security';

// /login — a single Keycloak button (docs/specs/001). No local form, no
// registration, no GitHub or LDAP.

export function LoginPage() {
  const session = useSession();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'), '');

  const settings = useQuery({ queryKey: ['settings', 'public'], queryFn: getPublicSettings });

  const signIn = useMutation({
    mutationFn: async () => {
      const { url, state } = await oidcAuthorize();
      const target = safeExternalUrl(url);
      if (!target) throw new Error("L'adresse de connexion renvoyée par le serveur est invalide.");
      return { target, state };
    },
    onSuccess: ({ target, state }) => {
      rememberFlow(state, redirect || null);
      window.location.assign(target);
    },
  });

  if (session) {
    return <Navigate to={redirect || landingPath(session.user)} replace />;
  }

  const oidcEnabled = settings.data?.oidc_enabled === 'true';
  const error = signIn.error ?? settings.error;

  return (
    <main className="flex min-h-svh items-start justify-center bg-muted px-4 py-10 sm:items-center">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center gap-4 text-center">
          <Brand size="lg" className="justify-center" />
          <CardTitle className="text-xl">Connexion</CardTitle>
          <CardDescription>Connectez-vous avec votre compte de l'organisation.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {settings.isPending ? (
            <Skeleton className="h-11 w-full" />
          ) : oidcEnabled ? (
            <Button
              size="lg"
              className="h-11 w-full"
              disabled={signIn.isPending}
              onClick={() => signIn.mutate()}
            >
              {signIn.isPending ? <Loader2 className="animate-spin" /> : <KeyRound />}
              Se connecter avec Keycloak
            </Button>
          ) : (
            settings.isSuccess && (
              <Alert>
                <AlertCircle />
                <AlertDescription>
                  La connexion n'est pas configurée. Contactez un administrateur.
                </AlertDescription>
              </Alert>
            )
          )}
        </CardContent>
      </Card>
    </main>
  );
}
