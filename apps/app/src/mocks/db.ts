import type { SessionBooking } from '@/lib/api-types';
import { readItem, writeItem } from '@pupitre/ui/lib/storage';

// Learner state of the mock backend: what user-service and course-service keep
// in PostgreSQL. Stored in sessionStorage, so it survives the page reloads of
// the sign-in flow and resets with the tab (docs/specs/006-mock-mode.md).

const STORAGE_KEY = 'pupitre.mock.db';

export type QuizProgress = { bestScore: number; maxScore: number; passed: boolean; attempts: number };
export type QuestionAttempt = { attempts: number; until: number; locked: boolean };

type MockDb = {
  /** userId → course slug → enrolledAt */
  enrollments: Record<string, Record<string, string>>;
  /** userId → course slug → viewed module slugs */
  viewed: Record<string, Record<string, string[]>>;
  /** userId → course slug → module index → quiz progress */
  quizzes: Record<string, Record<string, Record<number, QuizProgress>>>;
  /** "userId|slug|index" → question id → attempt state */
  attempts: Record<string, Record<string, QuestionAttempt>>;
  /** userId → bookings */
  bookings: Record<string, SessionBooking[]>;
  /** userId → course slug → earnedAt */
  badges: Record<string, Record<string, string>>;
  /** userId → course slug → last activity */
  activity: Record<string, Record<string, string>>;
};

const ALICE = '7a1c3e52-5f0b-4c2e-9d61-0b8f1a2c3d41';
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

/** alice starts with two courses in progress and one badge, so every screen has content. */
function seed(): MockDb {
  return {
    enrollments: {
      [ALICE]: { 'kubernetes-basics': daysAgo(12), 'pupitre-demo': daysAgo(2), 'linux-intro': daysAgo(30) },
    },
    viewed: {
      [ALICE]: { 'kubernetes-basics': ['concepts-fondamentaux'], 'pupitre-demo': [] },
    },
    quizzes: {},
    attempts: {},
    bookings: {},
    badges: { [ALICE]: { 'linux-intro': daysAgo(20) } },
    activity: { [ALICE]: { 'kubernetes-basics': daysAgo(1) } },
  };
}

let cache: MockDb | null = null;

export function db(): MockDb {
  if (cache) return cache;
  try {
    const raw = readItem('session', STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as MockDb) : seed();
  } catch {
    cache = seed();
  }
  return cache;
}

export function save() {
  if (cache) writeItem('session', STORAGE_KEY, JSON.stringify(cache));
}

/** Test helper: back to the seeded state. */
export function resetDb() {
  cache = seed();
  save();
}

export function bucket<T>(map: Record<string, Record<string, T>>, key: string): Record<string, T> {
  map[key] ??= {};
  return map[key];
}
