import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import { getPublicSettings, oidcAuthorize } from '@pupitre/core/lib/api';
import { DEMO_ACCOUNTS, withLoginHint } from '@/lib/demo-accounts';
import { rememberFlow } from '@/lib/oidc-flow';
import { landingPath } from '@pupitre/core/lib/auth-paths';
import { SiteNavigate } from '@pupitre/core/components/SiteLink';
import { useSession } from '@pupitre/core/lib/session';
import { safeExternalUrl, safeRedirect } from '@pupitre/ui/lib/security';

// /login (docs/specs/001), with the card of pupitre's pages/login.astro. Keycloak
// is the only sign-in method: the e-mail, LDAP and registration parts are gone.

// The Vite dev server against the local realm lists its test accounts. Mock mode
// has its own account picker (mocks/mock-keycloak-page.tsx).
const SHOW_DEMO_ACCOUNTS = import.meta.env.DEV && import.meta.env.MODE !== 'mock';

function SsoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4l3 3" />
    </svg>
  );
}

export function Login() {
  const session = useSession();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'), '');

  const settings = useQuery({ queryKey: ['settings', 'public'], queryFn: getPublicSettings });

  const signIn = useMutation({
    mutationFn: async (loginHint?: string) => {
      const { url, state } = await oidcAuthorize();
      const target = safeExternalUrl(url);
      if (!target) throw new Error("L'adresse de connexion renvoyée par le serveur est invalide.");
      return { target: SHOW_DEMO_ACCOUNTS && loginHint ? withLoginHint(target, loginHint) : target, state };
    },
    onSuccess: ({ target, state }) => {
      rememberFlow(state, redirect || null);
      window.location.assign(target);
    },
  });

  if (session) {
    return <SiteNavigate to={redirect || landingPath(session.user)} />;
  }

  const oidcEnabled = settings.data?.oidc_enabled === 'true';
  const error = signIn.error ?? settings.error;

  return (
    <div className="min-h-screen bg-fill flex items-start justify-center px-4 pt-10 pb-10 sm:items-center sm:pt-0">
      <div className="w-full max-w-[430px] bg-paper border-[1.5px] border-line rounded-[18px] px-5 pt-7 pb-6 flex flex-col gap-[18px] shadow-[0_20px_50px_-28px_rgba(30,60,120,.45)] sm:px-9 sm:pt-9 sm:pb-8">
        <div className="flex items-center justify-center gap-3">
          <img src="/pioupitre.png" alt="pioupitre" className="w-[60px] h-[60px] object-contain sm:w-12 sm:h-12" />
          <span className="brand-font text-[2.2rem] font-bold text-ink leading-none sm:text-[1.8rem]">pupitre</span>
        </div>

        {error && (
          <div className="bg-bad-soft border border-bad rounded-lg px-3.5 py-2.5 text-[.875rem] text-bad" role="alert">
            {error.message}
          </div>
        )}

        {settings.isPending ? (
          <div className="loading-state !py-4">
            <div className="spinner" />
          </div>
        ) : oidcEnabled ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="sso-btn"
              disabled={signIn.isPending}
              onClick={() => signIn.mutate(undefined)}
            >
              {signIn.isPending ? <span className="spinner" /> : <SsoIcon />}
              <span>Se connecter avec Keycloak</span>
            </button>
            {SHOW_DEMO_ACCOUNTS && (
              <>
                <div className="divider !my-1" />
                <p className="text-ink-soft text-[.78rem] text-center">
                  Comptes de démonstration (développement uniquement)
                </p>
                {DEMO_ACCOUNTS.map(({ username, password, description }) => (
                  <button
                    key={username}
                    type="button"
                    className="sso-btn !justify-start text-left"
                    disabled={signIn.isPending}
                    onClick={() => signIn.mutate(username)}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">{username}</span>
                      <span className="block text-[.78rem] text-ink-soft truncate">{description}</span>
                    </span>
                    <code className="text-[.78rem] text-ink-soft select-all">{password}</code>
                  </button>
                ))}
              </>
            )}
          </div>
        ) : (
          settings.isSuccess && (
            <div className="bg-fill border border-line rounded-lg px-3.5 py-2.5 text-[.875rem] text-ink-soft">
              La connexion n'est pas configurée. Contactez un administrateur.
            </div>
          )
        )}
      </div>
    </div>
  );
}
