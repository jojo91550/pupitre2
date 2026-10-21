import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';

import { RequireAuth, RequireRole } from '@/components/RequireAuth';
import { Layout } from '@/routes/Layout';
import { AdminLayout } from '@/routes/AdminLayout';
import { ManagerLayout } from '@/routes/manager/ManagerLayout';
import { AuthCallback } from '@/routes/AuthCallback';
import { Login } from '@/routes/Login';
import { Catalogue } from '@/routes/Catalogue';
import { CourseDetail } from '@/routes/CourseDetail';
import { Leaderboard } from '@/routes/Leaderboard';
import { PublicProfile } from '@/routes/PublicProfile';
import { MyCourses } from '@/routes/MyCourses';
import { MyPaths } from '@/routes/MyPaths';
import { MySkills } from '@/routes/MySkills';
import { SkillPage } from '@/routes/SkillPage';
import { MyBadges } from '@/routes/MyBadges';
import { MyXp } from '@/routes/MyXp';
import { MyGroups } from '@/routes/MyGroups';
import { Profile } from '@/routes/Profile';
import { Agenda } from '@/routes/Agenda';
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
  { path: 'skills/:slug', element: <SkillPage /> },
  { path: 'my-courses', element: <MyCourses /> },
  { path: 'my-paths', element: <MyPaths /> },
  { path: 'my-skills', element: <MySkills /> },
  { path: 'my-badges', element: <MyBadges /> },
  { path: 'my-xp', element: <MyXp /> },
  { path: 'my-groups', element: <MyGroups /> },
  { path: 'profile', element: <Profile /> },
  { path: 'agenda', element: <Agenda /> },
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
      { path: 'leaderboard', element: <Leaderboard /> },
      { path: 'users/:id', element: <PublicProfile /> },

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
