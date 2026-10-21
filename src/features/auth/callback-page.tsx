import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { oidcCallback } from '@/api/auth';
import { landingPath } from '@/auth/paths';
import { clearFlow, recallFlow } from '@/auth/oidc-flow';
import { openSession } from '@/auth/session';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { safeRedirect } from '@/lib/security';

// /auth/callback — Keycloak comes back here (docs/specs/001). The route must not
// change: it is the redirect URI registered in Keycloak.

function errorMessage(error: string): string {
  return error === 'access_denied'
    ? 'Accès refusé : vous avez annulé la connexion.'
    : `Erreur de connexion : ${error}`;
}

/** Checks done before any network call; null when the callback can proceed. */
function validate(params: URLSearchParams, expectedState: string | null): string | null {
  const providerError = params.get('error');
  if (providerError) return errorMessage(providerError);
  if (!params.get('code') || !params.get('state')) {
    return 'Paramètres de connexion manquants. Veuillez réessayer.';
  }
  // Refuse a callback this browser did not start (login CSRF, audit finding M3).
  if (!expectedState || expectedState !== params.get('state')) {
    return 'Session de connexion invalide, recommencez.';
  }
  return null;
}

export function CallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(() => validate(params, recallFlow().state));
  // The authorization code is single-use, and React runs effects twice in
  // development: exchange it exactly once.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const flow = recallFlow();
    const code = params.get('code');
    const state = params.get('state');
    if (error || !code || !state) {
      clearFlow();
      return;
    }

    oidcCallback(code, state)
      .then((auth) => {
        clearFlow();
        openSession(auth);
        navigate(safeRedirect(flow.redirect, landingPath(auth.user)), { replace: true });
      })
      .catch((err: Error) => {
        clearFlow();
        setError(err.message || 'La connexion a échoué. Veuillez réessayer.');
      });
  }, [error, navigate, params]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center gap-4">
          <Brand className="justify-center" />
          {error ? (
            <>
              <AlertCircle className="mx-auto size-10 text-destructive" />
              <CardTitle className="text-destructive">Connexion échouée</CardTitle>
              <CardDescription>{error}</CardDescription>
            </>
          ) : (
            <>
              <Loader2 className="mx-auto size-10 animate-spin text-primary" />
              <CardTitle>Finalisation de la connexion…</CardTitle>
              <CardDescription>
                Veuillez patienter pendant la vérification de votre identité.
              </CardDescription>
            </>
          )}
        </CardHeader>
        {error && (
          <CardContent>
            <Button asChild>
              <Link to="/login">Retour à la connexion</Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </main>
  );
}
