// Latin subsets only: they cover French, and keep other alphabets out of the build.
import '@fontsource/caveat/latin-700.css';
import '@fontsource/hanken-grotesk/latin-400.css';
import '@fontsource/hanken-grotesk/latin-500.css';
import '@fontsource/hanken-grotesk/latin-600.css';
import '@fontsource/hanken-grotesk/latin-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import './styles/globals.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, type RouteObject } from 'react-router';
import { toast } from 'sonner';

import { getMe } from '@/api/auth';
import { ApiError, configureClient } from '@/api/client';
import { loginPath } from '@/auth/paths';
import { endSession, getSession, getToken, setSessionEndHandler, updateUser } from '@/auth/session';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { createRouter } from '@/router';

const isMock = import.meta.env.MODE === 'mock';

async function start() {
  const extraRoutes: RouteObject[] = [];

  if (isMock) {
    // Mock mode (`pnpm dev:mock`): MSW answers /api/* in the browser and a fake
    // Keycloak page stands in for the real one. Nothing of it ships otherwise.
    const [{ worker }, { MockKeycloakPage }] = await Promise.all([
      import('./mocks/browser'),
      import('./mocks/mock-keycloak-page'),
    ]);
    await worker.start({ onUnhandledFrame: 'bypass', quiet: true });
    extraRoutes.push({ path: '/mock-keycloak', element: <MockKeycloakPage /> });
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Client errors (4xx) will not fix themselves on retry.
        retry: (count, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
      },
    },
  });

  const router = createRouter(extraRoutes);

  configureClient({
    getToken,
    onUnauthorized: () => endSession('unauthorized'),
  });

  setSessionEndHandler((reason) => {
    queryClient.clear();
    if (reason === 'logout') {
      void router.navigate('/login');
      return;
    }
    toast.error('Session expirée, reconnectez-vous.');
    void router.navigate(loginPath(window.location));
  });

  // Refresh role, avatar and username of a restored session (spec 001). A 401
  // ends the session through the client's handler.
  if (getSession()) {
    getMe().then(updateUser).catch(() => {});
  }

  const container = document.getElementById('root');
  if (!container) throw new Error('#root element missing from index.html');

  createRoot(container).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster richColors closeButton />
        </TooltipProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void start();
