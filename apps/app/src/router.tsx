import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';

import { RequireAuth, RequireRole } from '@/components/RequireAuth';
import { Layout } from '@/routes/Layout';
import { AdminLayout } from '@/routes/AdminLayout';
import { ManagerLayout } from '@/routes/manager/ManagerLayout';
import { ManagerUsers } from '@/routes/manager/ManagerUsers';
import { ManagerGroups } from '@/routes/manager/ManagerGroups';
import { ManagerPaths } from '@/routes/manager/ManagerPaths';
import { Attendance } from '@/routes/Attendance';
import { Exports } from '@/routes/admin/Exports';
import { Dashboard } from '@/routes/admin/Dashboard';
import { Monitoring } from '@/routes/admin/Monitoring';
import { AdminLeaderboard } from '@/routes/admin/AdminLeaderboard';
import { AdminUsers } from '@/routes/admin/AdminUsers';
import { AdminCourses } from '@/routes/admin/AdminCourses';
import { AdminPaths } from '@/routes/admin/AdminPaths';
import { AdminGroups } from '@/routes/admin/AdminGroups';
import { Patterns } from '@/routes/admin/Patterns';
import { Settings } from '@/routes/admin/Settings';
import { Labs } from '@/routes/admin/Labs';
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
import { NotFound } from '@/routes/NotFound';

// Route table of docs/specs/002-roles-and-guards.md.

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
  { index: true, element: <Dashboard /> },
  { path: 'monitoring', element: <Monitoring /> },
  { path: 'leaderboard', element: <AdminLeaderboard /> },
  { path: 'users', element: <AdminUsers /> },
  { path: 'courses', element: <AdminCourses /> },
  { path: 'paths', element: <AdminPaths /> },
  { path: 'groups', element: <AdminGroups /> },
  { path: 'patterns', element: <Patterns /> },
  { path: 'settings', element: <Settings /> },
  { path: 'labs', element: <Labs /> },
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
          { path: 'users', element: <ManagerUsers /> },
          { path: 'groups', element: <ManagerGroups /> },
          { path: 'paths', element: <ManagerPaths /> },
        ],
      },

      // The attendance page has no admin sidebar, like the Astro page.
      {
        path: 'admin/courses/sessions/:slug/:sessionId',
        element: (
          <RequireRole roles={['admin', 'manager']}>
            <Attendance />
          </RequireRole>
        ),
      },

      {
        path: 'admin',
        element: (
          <RequireRole roles={['admin', 'manager']}>
            <AdminLayout />
          </RequireRole>
        ),
        children: [
          { path: 'exports', element: <Exports /> },
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
