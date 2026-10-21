import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';

import { RequireAuth, RequireRole } from '@/auth/guards';
import { AppLayout } from '@/components/layout/app-layout';
import { AdminLayout, ManagerLayout } from '@/components/layout/section-layout';
import { CallbackPage } from '@/features/auth/callback-page';
import { LoginPage } from '@/features/auth/login-page';
import { ComingSoonPage } from '@/features/errors/coming-soon-page';
import { NotFoundPage } from '@/features/errors/not-found-page';

// Route table of docs/specs/002-roles-and-guards.md. Screens of later batches
// render <ComingSoonPage> behind their final guards.

const soon = (title: string, spec: string, batch: number) => (
  <ComingSoonPage title={title} spec={spec} batch={batch} />
);

const learnerRoutes: RouteObject[] = [
  { path: 'courses/:slug/lessons/:index', element: soon('Leçon', '012', 1) },
  { path: 'courses/:slug/quiz/:index', element: soon('Quiz', '013', 1) },
  { path: 'skills/:slug', element: soon('Compétence', '020', 2) },
  { path: 'my-courses', element: soon('Mes cours', '020', 2) },
  { path: 'my-paths', element: soon('Mes parcours', '020', 2) },
  { path: 'my-skills', element: soon('Mes compétences', '020', 2) },
  { path: 'my-badges', element: soon('Mes badges', '020', 2) },
  { path: 'my-xp', element: soon('Mon XP', '020', 2) },
  { path: 'my-groups', element: soon('Mes groupes', '020', 2) },
  { path: 'profile', element: soon('Mon profil', '021', 2) },
  { path: 'agenda', element: soon('Agenda', '022', 2) },
];

const adminOnlyRoutes: RouteObject[] = [
  { index: true, element: soon('Tableau de bord', '040', 4) },
  { path: 'monitoring', element: soon('Monitoring', '040', 4) },
  { path: 'leaderboard', element: soon('Classement', '040', 4) },
  { path: 'users', element: soon('Utilisateurs', '041', 4) },
  { path: 'courses', element: soon('Cours', '042', 4) },
  { path: 'paths', element: soon('Parcours', '043', 4) },
  { path: 'groups', element: soon('Groupes', '044', 4) },
  { path: 'patterns', element: soon('Patterns markdown', '045', 4) },
  { path: 'settings', element: soon('Paramètres', '046', 4) },
  { path: 'labs', element: soon('Suivi des labs', '047', 4) },
];

const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/auth/callback', element: <CallbackPage /> },
  { path: '/register', element: <Navigate to="/login" replace /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/courses" replace /> },
      { path: 'dashboard', element: <Navigate to="/courses" replace /> },

      // Public pages.
      { path: 'courses', element: soon('Catalogue', '010', 1) },
      { path: 'courses/:slug', element: soon('Cours', '011', 1) },
      { path: 'leaderboard', element: soon('Classement', '020', 2) },
      { path: 'users/:id', element: soon('Profil public', '020', 2) },

      { element: <RequireAuth />, children: learnerRoutes },

      {
        path: 'manager',
        element: (
          <RequireRole roles={['manager']}>
            <ManagerLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: <Navigate to="/manager/users" replace /> },
          { path: 'users', element: soon('Mes membres', '030', 3) },
          { path: 'groups', element: soon('Mes groupes', '030', 3) },
          { path: 'paths', element: soon('Parcours', '030', 3) },
        ],
      },

      {
        path: 'admin',
        element: (
          <RequireRole roles={['admin', 'manager']}>
            <AdminLayout />
          </RequireRole>
        ),
        children: [
          { path: 'exports', element: soon('Exports CSV', '047', 3) },
          {
            path: 'courses/sessions/:slug/:sessionId',
            element: soon('Présence', '022', 3),
          },
          { element: <RequireRole roles={['admin']} />, children: adminOnlyRoutes },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export function createRouter(extraRoutes: RouteObject[] = []) {
  return createBrowserRouter([...extraRoutes, ...routes]);
}
