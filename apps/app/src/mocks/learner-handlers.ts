import { http, HttpResponse } from 'msw';

import type { CheckResult, QuizAnswer, SkillLevel, UserPublic } from '@/lib/api-types';

import {
  canSeeCourse,
  COURSES,
  findCourse,
  isEnrolled,
  listModules,
  markViewed,
  moduleDetail,
  myCourses,
  scoreQuiz,
  toCourseResponse,
  visibleModules,
} from '@/mocks/course-logic';
import { bucket, db, save } from '@/mocks/db';
import { MOCK_PATTERNS } from '@/mocks/fixtures/patterns';
import { apiError, currentAccount } from '@/mocks/http';
import type { CourseDefinition } from '@/mocks/model';

// Routes of the learner flow (batch 1), mirroring course-service and
// user-service. Every write is saved to the mock state.

const XP_PER_COURSE = 200;

function userXp(user: UserPublic): number {
  return Object.keys(db().badges[user.id] ?? {}).length * XP_PER_COURSE;
}

/** modules.go — ensureModuleAccess: auto-enrolment in public courses, prerequisites. */
function moduleAccess(course: CourseDefinition, user: UserPublic): Response | null {
  if (user.role === 'admin') return null;
  if (!isEnrolled(user.id, course.slug)) {
    if (!course.spec.public) return apiError(403, 'Enroll in this course to access it');
    bucket(db().enrollments, user.id)[course.slug] = new Date().toISOString();
    save();
  }
  const unmet = (course.spec.prerequisites ?? []).some((prereq) => !db().badges[user.id]?.[prereq.course]);
  return unmet ? apiError(403, 'Complete prerequisite courses first') : null;
}

type Resolved = { course: CourseDefinition; user: UserPublic } | { error: Response };

/** Signed-in user and visible course of a /courses/:slug/… route. */
function resolve(request: Request, slug: string | readonly string[] | undefined): Resolved {
  const account = currentAccount(request);
  if (!account) return { error: apiError(401, 'Missing Authorization header') };
  const course = findCourse(String(slug));
  if (!course || !canSeeCourse(course, account.user)) {
    return { error: apiError(404, 'Course not found') };
  }
  return { course, user: account.user };
}

// Deterministic lab checks: a step fails on its first check, then passes, so
// both outcomes can be seen.
const stepChecks = new Map<string, number>();

function labCheck(key: string, label: string): CheckResult {
  const count = (stepChecks.get(key) ?? 0) + 1;
  stepChecks.set(key, count);
  return count === 1
    ? { allow: false, violations: [`${label} : pas encore trouvé (le mock réussit au 2e essai).`] }
    : { allow: true, violations: [] };
}

export const learnerHandlers = [
  // ── course-service ────────────────────────────────────────────────────────
  http.get('/api/courses', ({ request }) => {
    const user = currentAccount(request)?.user ?? null;
    const courses = COURSES.filter((course) => canSeeCourse(course, user)).map(toCourseResponse);
    return HttpResponse.json({ courses, total: courses.length });
  }),

  http.get('/api/courses/:slug', ({ request, params }) => {
    const user = currentAccount(request)?.user ?? null;
    const course = findCourse(String(params.slug));
    if (!course || !canSeeCourse(course, user)) return apiError(404, 'Course not found');
    return HttpResponse.json(toCourseResponse(course));
  }),

  http.get('/api/courses/:slug/modules', ({ request, params }) => {
    const resolved = resolve(request, params.slug);
    if ('error' in resolved) return resolved.error;
    const denied = moduleAccess(resolved.course, resolved.user);
    if (denied) return denied;
    return HttpResponse.json({ modules: listModules(resolved.course, resolved.user) });
  }),

  http.get('/api/courses/:slug/modules/:index', ({ request, params }) => {
    const resolved = resolve(request, params.slug);
    if ('error' in resolved) return resolved.error;
    const denied = moduleAccess(resolved.course, resolved.user);
    if (denied) return denied;
    const detail = moduleDetail(resolved.course, Number(params.index), resolved.user);
    return detail ? HttpResponse.json(detail) : apiError(404, 'Module not found');
  }),

  http.post('/api/courses/:slug/modules/:index/submit', async ({ request, params }) => {
    const resolved = resolve(request, params.slug);
    if ('error' in resolved) return resolved.error;
    const denied = moduleAccess(resolved.course, resolved.user);
    if (denied) return denied;
    const index = Number(params.index);
    const module = visibleModules(resolved.course, resolved.user.role === 'admin')[index];
    if (!module) return apiError(404, 'Module not found');
    if (module.type !== 'quiz') return apiError(400, 'Module is not a quiz');
    const body = (await request.json()) as { answers?: Record<string, QuizAnswer> };
    const result = scoreQuiz(resolved.course, index, resolved.user, body.answers ?? {});
    save();
    return HttpResponse.json(result.body as Record<string, unknown>, { status: result.status });
  }),

  http.post('/api/courses/:slug/lessons/:lessonSlug/complete', ({ request, params }) => {
    const resolved = resolve(request, params.slug);
    if ('error' in resolved) return resolved.error;
    const denied = moduleAccess(resolved.course, resolved.user);
    if (denied) return denied;
    markViewed(resolved.course, String(params.lessonSlug), resolved.user);
    save();
    return HttpResponse.json({ message: 'Lesson marked as complete' });
  }),

  http.post('/api/courses/:slug/modules/:index/check', ({ request, params }) => {
    const resolved = resolve(request, params.slug);
    if ('error' in resolved) return resolved.error;
    return HttpResponse.json(labCheck(`${resolved.user.id}|${params.slug}|${params.index}`, 'Le travail'));
  }),

  http.post('/api/courses/:slug/modules/:index/steps/:step/check', ({ request, params }) => {
    const resolved = resolve(request, params.slug);
    if ('error' in resolved) return resolved.error;
    const module = visibleModules(resolved.course, false)[Number(params.index)];
    const step = module?.steps?.[Number(params.step)];
    if (!step) return apiError(404, 'Step not found');
    return HttpResponse.json(
      labCheck(`${resolved.user.id}|${params.slug}|${params.index}|${params.step}`, step.title),
    );
  }),

  http.post('/api/courses/:slug/modules/:index/record', async ({ request, params }) => {
    const resolved = resolve(request, params.slug);
    if ('error' in resolved) return resolved.error;
    return HttpResponse.json(await request.json());
  }),

  // ── user-service ──────────────────────────────────────────────────────────
  http.get('/api/my/courses', ({ request }) => {
    const account = currentAccount(request);
    if (!account) return apiError(401, 'Missing Authorization header');
    return HttpResponse.json({ courses: myCourses(account.user) });
  }),

  http.get('/api/my/skills', ({ request }) => {
    const account = currentAccount(request);
    if (!account) return apiError(401, 'Missing Authorization header');
    const mine = myCourses(account.user);
    const skills = new Map<string, SkillLevel>();
    for (const course of mine) {
      for (const skill of toCourseResponse(findCourse(course.slug)!).skills ?? []) {
        const entry = skills.get(skill) ?? { skill, level: 'beginner', completedCourses: 0, totalCourses: 0 };
        entry.totalCourses += 1;
        if (course.completed) entry.completedCourses += 1;
        skills.set(skill, entry);
      }
    }
    for (const entry of skills.values()) {
      const ratio = entry.completedCourses / entry.totalCourses;
      entry.level = ratio >= 0.6 ? 'advanced' : ratio >= 0.3 ? 'intermediate' : 'beginner';
    }
    return HttpResponse.json({ skills: [...skills.values()] });
  }),

  http.get('/api/my/badges', ({ request }) => {
    const account = currentAccount(request);
    if (!account) return apiError(401, 'Missing Authorization header');
    const earned = db().badges[account.user.id] ?? {};
    const badges = Object.entries(earned).flatMap(([slug, earnedAt]) => {
      const course = findCourse(slug);
      if (!course?.spec.badge) return [];
      return [{ courseSlug: slug, courseTitle: course.spec.title, name: course.spec.badge.name, icon: course.spec.badge.icon, earnedAt, earnedBy: 1 }];
    });
    return HttpResponse.json({ badges });
  }),

  http.get('/api/my/session-bookings', ({ request }) => {
    const account = currentAccount(request);
    if (!account) return apiError(401, 'Missing Authorization header');
    return HttpResponse.json({ bookings: db().bookings[account.user.id] ?? [] });
  }),

  http.post('/api/enrollments/:slug', ({ request, params }) => {
    const account = currentAccount(request);
    if (!account) return apiError(401, 'Missing Authorization header');
    const course = findCourse(String(params.slug));
    if (!course || !course.spec.public) return apiError(404, 'Course not found');
    const required = course.spec.xpRequired ?? 0;
    if (userXp(account.user) < required) {
      return apiError(403, `Ce cours demande ${required} XP. Terminez d'autres cours pour en gagner.`);
    }
    bucket(db().enrollments, account.user.id)[course.slug] ??= new Date().toISOString();
    save();
    return HttpResponse.json({ message: 'Enrolled' }, { status: 201 });
  }),

  http.delete('/api/enrollments/:slug', ({ request, params }) => {
    const account = currentAccount(request);
    if (!account) return apiError(401, 'Missing Authorization header');
    delete db().enrollments[account.user.id]?.[String(params.slug)];
    save();
    return HttpResponse.json({ message: 'Unenrolled' });
  }),

  http.post('/api/session-bookings/:slug/:sessionId', ({ request, params }) => {
    const account = currentAccount(request);
    if (!account) return apiError(401, 'Missing Authorization header');
    const list = (db().bookings[account.user.id] ??= []);
    if (!list.some((b) => b.courseSlug === params.slug && b.sessionId === params.sessionId)) {
      list.push({ courseSlug: String(params.slug), sessionId: String(params.sessionId), bookedAt: new Date().toISOString() });
    }
    save();
    return HttpResponse.json({ message: 'Booked' }, { status: 201 });
  }),

  http.delete('/api/session-bookings/:slug/:sessionId', ({ request, params }) => {
    const account = currentAccount(request);
    if (!account) return apiError(401, 'Missing Authorization header');
    db().bookings[account.user.id] = (db().bookings[account.user.id] ?? []).filter(
      (b) => !(b.courseSlug === params.slug && b.sessionId === params.sessionId),
    );
    save();
    return HttpResponse.json({ message: 'Unbooked' });
  }),

  http.get('/api/patterns', ({ request }) => {
    if (!currentAccount(request)) return apiError(401, 'Missing Authorization header');
    return HttpResponse.json({ patterns: MOCK_PATTERNS });
  }),
];
