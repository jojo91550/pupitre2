import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';

import { RequireAuth, RequireRole } from '@/components/RequireAuth';
import { Layout } from '@/routes/Layout';
import { AdminLayout } from '@/routes/AdminLayout';
import { ManagerLayout } from '@/routes/manager/ManagerLayout';
import { AuthCallback } from '@/routes/AuthCallback';
import { Login } from '@/routes/Login';
import { Catalogue } from '@/routes/Catalogue';
import { CourseDetail } from '@/routes/CourseDetail';
import { ComingSoon } from '@/components/ComingSoon';
import { NotFound } from '@/routes/NotFound';

// Route table of docs/specs/002-roles-and-guards.md. Screens of later batches
// render <ComingSoon> behind their final guards.

const soon = (title: string, spec: string, batch: number) => (
  <ComingSoon title={title} spec={spec} batch={batch} />
);

const learnerRoutes: RouteObject[] = [
  // Loaded on demand: the lesson player and the quiz bring the markdown
  // pipeline, which the catalogue does not need.
  {
    path: 'courses/:slug/lessons/:index',
    lazy: async () => ({ Component: (await import('@/routes/LessonPage')).LessonPage }),
  },
  {
    path: 'courses/:slug/quiz/:index',
    lazy: async () => ({ Component: (await import('@/routes/QuizPage')).QuizPage }),
  },
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
  { path: '/login', element: <Login /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  { path: '/register', element: <Navigate to="/login" replace /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/courses" replace /> },
      { path: 'dashboard', element: <Navigate to="/courses" replace /> },

      // Public pages.
      { path: 'courses', element: <Catalogue /> },
      { path: 'courses/:slug', element: <CourseDetail /> },
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

      { path: '*', element: <NotFound /> },
    ],
  },
];

export function createRouter(extraRoutes: RouteObject[] = []) {
  return createBrowserRouter([...extraRoutes, ...routes]);
}
