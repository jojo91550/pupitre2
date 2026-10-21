import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';

import type { Role } from '@/api/types';
import { AccessDeniedPage } from '@/features/errors/access-denied-page';

import { loginPath } from './paths';
import { useSession } from './session';

// Route guards of docs/specs/002-roles-and-guards.md. They guide the user; the
// backend remains the only authority over data.

export function RequireAuth({ children }: { children?: ReactNode }) {
  const session = useSession();
  const location = useLocation();
  if (!session) return <Navigate to={loginPath(location)} replace />;
  return children ?? <Outlet />;
}

export function RequireRole({ roles, children }: { roles: Role[]; children?: ReactNode }) {
  const session = useSession();
  const location = useLocation();
  if (!session) return <Navigate to={loginPath(location)} replace />;
  if (!roles.includes(session.user.role)) return <AccessDeniedPage />;
  return children ?? <Outlet />;
}
