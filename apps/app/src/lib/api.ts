import { request, requestBlob } from '@/lib/api-client';
import type {
  AuthorizeResponse,
  AuthResponse,
  CheckResult,
  Course,
  EarnedBadge,
  EnrollmentRow,
  ExportCategory,
  ExportPreview,
  ExportRequest,
  MarkdownPattern,
  ModuleDetail,
  ModuleSummary,
  LeaderboardEntry,
  LearningPath,
  ManagerGroup,
  MyCourse,
  MyGroup,
  MyPath,
  MyXp,
  PublicSettings,
  PathEnrolledUser,
  PathEnrollmentRow,
  PublicUser,
  ScopeGroup,
  ScopeUser,
  SessionParticipant,
  QuizAnswer,
  QuizResult,
  SessionBooking,
  SessionInput,
  SkillLevel,
  SkillModuleStatus,
  UserPublic,
} from '@/lib/api-types';

// One typed function per Go route used by the frontend (docs/specs/004-api-and-routing.md),
// on top of the HTTP client of api-client.ts.

const enc = encodeURIComponent;

// ── Authentication (user-service, Keycloak only: docs/specs/001) ────────────

export const getPublicSettings = () => request<PublicSettings>('/settings/public', { anonymous: true });

export const oidcAuthorize = () => request<AuthorizeResponse>('/auth/oidc/authorize', { anonymous: true });

export const oidcCallback = (code: string, state: string) =>
  request<AuthResponse>('/auth/oidc/callback', { method: 'POST', body: { code, state }, anonymous: true });

export const getMe = () => request<UserPublic>('/auth/me');

/** Bio or emoji avatar only: username and avatar URLs are not offered (docs/specs/021). */
export const updateProfile = (body: { bio: string } | { avatarUrl: string }) =>
  request<UserPublic>('/auth/profile', { method: 'PUT', body });

// ── course-service ──────────────────────────────────────────────────────────

export const listCourses = () => request<{ courses: Course[]; total: number }>('/courses');

export const getCourse = (slug: string) => request<Course>(`/courses/${enc(slug)}`);

export const listModules = (slug: string) =>
  request<{ modules: ModuleSummary[] }>(`/courses/${enc(slug)}/modules`);

export const getModule = (slug: string, index: number) =>
  request<ModuleDetail>(`/courses/${enc(slug)}/modules/${index}`);

export const submitQuiz = (slug: string, index: number, answers: Record<string, QuizAnswer>) =>
  request<QuizResult>(`/courses/${enc(slug)}/modules/${index}/submit`, {
    method: 'POST',
    body: { answers },
  });

export const completeLesson = (slug: string, moduleSlug: string) =>
  request<{ message: string }>(`/courses/${enc(slug)}/lessons/${enc(moduleSlug)}/complete`, {
    method: 'POST',
    body: {},
  });

export const checkModule = (slug: string, index: number) =>
  request<CheckResult>(`/courses/${enc(slug)}/modules/${index}/check`, { method: 'POST', body: {} });

export const checkStep = (slug: string, index: number, step: number) =>
  request<CheckResult>(`/courses/${enc(slug)}/modules/${index}/steps/${step}/check`, {
    method: 'POST',
    body: {},
  });

/** Stores a check run by the desktop app; the server keeps it as not verified. */
export const recordLocalCheck = (slug: string, index: number, result: CheckResult) =>
  request<CheckResult>(`/courses/${enc(slug)}/modules/${index}/record`, {
    method: 'POST',
    body: result,
  });

// ── user-service ────────────────────────────────────────────────────────────

export const myCourses = () => request<{ courses: MyCourse[] }>('/my/courses');

export const mySkills = () => request<{ skills: SkillLevel[] }>('/my/skills');

export const mySkillModules = (skill: string) =>
  request<{ skill: string; modules: SkillModuleStatus[] }>(`/my/skills/${enc(skill)}`);

export const myPaths = () => request<{ paths: MyPath[] }>('/my/paths');

export const myXp = () => request<MyXp>('/my/xp');

export const myGroups = () => request<{ groups: MyGroup[]; total: number }>('/my/groups');

export const myBadges = () => request<{ badges: EarnedBadge[] }>('/my/badges');

export const mySessionBookings = () => request<{ bookings: SessionBooking[] }>('/my/session-bookings');

// Public routes: sent without the token.

export const leaderboard = () => request<{ leaderboard: LeaderboardEntry[] }>('/leaderboard', { anonymous: true });

export const getPublicUser = (id: string) => request<PublicUser>(`/users/${enc(id)}`, { anonymous: true });

export const userBadges = (id: string) =>
  request<{ badges: EarnedBadge[] }>(`/users/${enc(id)}/badges`, { anonymous: true });

export const enroll = (slug: string) =>
  request<{ message: string }>(`/enrollments/${enc(slug)}`, { method: 'POST', body: {} });

/** 204 No Content; 409 when the session is full. */
export const bookSession = (slug: string, sessionId: string) =>
  request<void>(`/session-bookings/${enc(slug)}/${enc(sessionId)}`, { method: 'POST' });

export const cancelBooking = (slug: string, sessionId: string) =>
  request<void>(`/session-bookings/${enc(slug)}/${enc(sessionId)}`, { method: 'DELETE' });

export const listPaths = () => request<{ paths: LearningPath[] }>('/paths');

// Course sessions: admin or manager (docs/specs/022).

export const createSession = (slug: string, body: SessionInput) =>
  request<unknown>(`/admin/courses/${enc(slug)}/sessions`, { method: 'POST', body });

export const updateSession = (slug: string, sessionId: string, body: SessionInput) =>
  request<unknown>(`/admin/courses/${enc(slug)}/sessions/${enc(sessionId)}`, { method: 'PUT', body });

export const deleteSession = (slug: string, sessionId: string) =>
  request<unknown>(`/admin/courses/${enc(slug)}/sessions/${enc(sessionId)}`, { method: 'DELETE' });

/** Requires a signed-in user: the Astro frontend called it anonymously (defect A1). */
export const listPatterns = () => request<{ patterns: MarkdownPattern[] }>('/patterns');

// ── Manager space (docs/specs/030) ──────────────────────────────────────────

export const managerUsers = () =>
  request<{ users: ScopeUser[] | null; total: number; groups: ScopeGroup[] }>('/manager/users');

export const managerUserEnrollments = (userId: string) =>
  request<{ enrollments: EnrollmentRow[] | null }>(`/manager/users/${enc(userId)}/enrollments`);

export const managerUserPathEnrollments = (userId: string) =>
  request<{ pathEnrollments: PathEnrollmentRow[] }>(`/manager/users/${enc(userId)}/path-enrollments`);

export const managerEnroll = (slug: string, userId: string) =>
  request<{ message: string }>(`/manager/enrollments/${enc(slug)}`, { method: 'POST', body: { userId } });

export const managerUnenroll = (slug: string, userId: string) =>
  request<{ message: string }>(`/manager/enrollments/${enc(slug)}/users/${enc(userId)}`, { method: 'DELETE' });

export const managerGroups = () => request<{ groups: ManagerGroup[] }>('/manager/groups');

export const managerCreateGroup = (name: string) =>
  request<{ id: string }>('/manager/groups', { method: 'POST', body: { name } });

export const managerCreateSubgroup = (groupId: string, name: string) =>
  request<{ id: string }>(`/manager/groups/${enc(groupId)}/subgroups`, { method: 'POST', body: { name } });

export const managerDeleteGroup = (groupId: string) =>
  request<{ message: string }>(`/manager/groups/${enc(groupId)}`, { method: 'DELETE' });

export const managerGroupMembers = (groupId: string) =>
  request<{ members: ScopeUser[] | null }>(`/manager/groups/${enc(groupId)}/members`);

export const managerAddGroupMember = (groupId: string, userId: string) =>
  request<{ message: string }>(`/manager/groups/${enc(groupId)}/members`, { method: 'POST', body: { userId } });

export const managerRemoveGroupMember = (groupId: string, userId: string) =>
  request<{ message: string }>(`/manager/groups/${enc(groupId)}/members/${enc(userId)}`, { method: 'DELETE' });

export const managerPathEnrollments = (slug: string) =>
  request<{ users: PathEnrolledUser[] | null }>(`/manager/paths/${enc(slug)}/enrollments`);

export const managerEnrollPath = (slug: string, userId: string) =>
  request<{ message: string }>(`/manager/paths/${enc(slug)}/enrollments`, { method: 'POST', body: { userId } });

export const managerUnenrollPath = (slug: string, userId: string) =>
  request<{ message: string }>(`/manager/paths/${enc(slug)}/enrollments/${enc(userId)}`, { method: 'DELETE' });

// ── Attendance (docs/specs/022): /api/admin/… for an admin, /api/manager/… for a manager ──

type TrainerRole = 'admin' | 'manager';

export const sessionParticipants = (role: TrainerRole, slug: string, sessionId: string) =>
  request<{ participants: SessionParticipant[] | null }>(`/${role}/session-bookings/${enc(slug)}/${enc(sessionId)}`);

export const markPresence = (role: TrainerRole, slug: string, sessionId: string, userId: string, present: boolean) =>
  request<{ ok: boolean }>(`/${role}/session-bookings/${enc(slug)}/${enc(sessionId)}/${enc(userId)}/presence`, {
    method: 'PATCH',
    body: { present },
  });

// ── CSV exports (docs/specs/047): user-service and course-service lab checks ──

export type ExportSource = '/admin/exports' | '/admin/exports/lab-checks';

export const exportCategories = (source: ExportSource) =>
  request<{ categories: ExportCategory[] }>(`${source}/categories`);

export const exportPreview = (source: ExportSource, body: ExportRequest) =>
  request<ExportPreview>(`${source}/preview`, { method: 'POST', body });

export const exportDownload = (source: ExportSource, body: ExportRequest) =>
  requestBlob(`${source}/download`, { method: 'POST', body });
