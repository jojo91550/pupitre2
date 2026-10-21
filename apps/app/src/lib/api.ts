import { request } from '@/lib/api-client';
import type {
  AuthorizeResponse,
  AuthResponse,
  CheckResult,
  Course,
  EarnedBadge,
  MarkdownPattern,
  ModuleDetail,
  ModuleSummary,
  MyCourse,
  PublicSettings,
  QuizAnswer,
  QuizResult,
  SessionBooking,
  SkillLevel,
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

export const myBadges = () => request<{ badges: EarnedBadge[] }>('/my/badges');

export const mySessionBookings = () => request<{ bookings: SessionBooking[] }>('/my/session-bookings');

export const enroll = (slug: string) =>
  request<{ message: string }>(`/enrollments/${enc(slug)}`, { method: 'POST', body: {} });

export const bookSession = (slug: string, sessionId: string) =>
  request<{ message: string }>(`/session-bookings/${enc(slug)}/${enc(sessionId)}`, { method: 'POST' });

export const cancelBooking = (slug: string, sessionId: string) =>
  request<{ message: string }>(`/session-bookings/${enc(slug)}/${enc(sessionId)}`, { method: 'DELETE' });

/** Requires a signed-in user: the Astro frontend called it anonymously (defect A1). */
export const listPatterns = () => request<{ patterns: MarkdownPattern[] }>('/patterns');
