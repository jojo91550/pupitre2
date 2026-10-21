import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { oidcCallback } from '@/api/auth';
import { rememberFlow } from '@/auth/oidc-flow';
import { endSession, getSession } from '@/auth/session';
import { MOCK_ACCOUNTS } from '@/mocks/data';
import { mockToken } from '@/mocks/jwt';

import { CallbackPage } from './callback-page';

vi.mock('@/api/auth', () => ({ oidcCallback: vi.fn() }));

const admin = MOCK_ACCOUNTS.find((a) => a.user.role === 'admin')!.user;
const student = MOCK_ACCOUNTS.find((a) => a.user.role === 'student')!.user;

function renderCallback(search: string) {
  const router = createMemoryRouter(
    [
      { path: '/auth/callback', element: <CallbackPage /> },
      { path: '*', element: <p>destination</p> },
    ],
    { initialEntries: [`/auth/callback${search}`] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('CallbackPage', () => {
  beforeEach(() => {
    vi.mocked(oidcCallback).mockReset();
    endSession('logout');
  });

  it('refuses a state this browser did not issue, without calling the API (M3)', async () => {
    rememberFlow('expected-state', null);
    renderCallback('?code=abc&state=forged-state');
    expect(await screen.findByText('Session de connexion invalide, recommencez.')).toBeInTheDocument();
    expect(oidcCallback).not.toHaveBeenCalled();
  });

  it('reports a cancelled sign-in', async () => {
    renderCallback('?error=access_denied');
    expect(await screen.findByText('Accès refusé : vous avez annulé la connexion.')).toBeInTheDocument();
  });

  it('opens the session and lands an admin on /admin', async () => {
    rememberFlow('s1', null);
    vi.mocked(oidcCallback).mockResolvedValue({ token: mockToken(admin.id, 'admin'), user: admin });
    const router = renderCallback('?code=abc&state=s1');
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'));
    expect(getSession()?.user.role).toBe('admin');
    expect(oidcCallback).toHaveBeenCalledTimes(1);
  });

  it('honours a stored relative redirect, admins included', async () => {
    rememberFlow('s2', '/courses/kubernetes-basics');
    vi.mocked(oidcCallback).mockResolvedValue({ token: mockToken(admin.id, 'admin'), user: admin });
    const router = renderCallback('?code=abc&state=s2');
    await waitFor(() => expect(router.state.location.pathname).toBe('/courses/kubernetes-basics'));
  });

  it('ignores a stored external redirect (#194)', async () => {
    rememberFlow('s3', 'https://evil.example.com');
    vi.mocked(oidcCallback).mockResolvedValue({ token: mockToken(student.id, 'student'), user: student });
    const router = renderCallback('?code=abc&state=s3');
    await waitFor(() => expect(router.state.location.pathname).toBe('/courses'));
  });
});
