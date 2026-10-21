// API types, written from the Go response structs (docs/specs/004-api-and-routing.md).
// JSON field names are the `json:"…"` tags; each type names its source handler.

export type Role = 'student' | 'manager' | 'admin';

/** user-service/internal/handlers/auth.go — userPublicRow */
export type UserPublic = {
  id: string;
  username: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  bio: string | null;
  isActive: boolean;
  authProvider: string;
  createdAt: string;
};

/** user-service/internal/handlers/auth.go — authResponse */
export type AuthResponse = {
  token: string;
  user: UserPublic;
};

/** user-service/internal/handlers/settings.go — PublicSettings. Every value is a string. */
export type PublicSettings = {
  registration_enabled: string;
  sso_local_login_enabled: string;
  password_min_length: string;
  password_require_uppercase: string;
  password_require_number: string;
  oidc_enabled: string;
  ldap_enabled: string;
};

/** user-service/internal/handlers/oidc.go — OIDCAuthorize */
export type AuthorizeResponse = {
  url: string;
  state: string;
};

/** Error envelope written by internal/httperr. */
export type ApiErrorBody = {
  error: string;
  [key: string]: unknown;
};

// ── Courses (course-service) ────────────────────────────────────────────────

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

/** course-service/internal/content/types.go — Badge */
export type Badge = { name: string; icon?: string };

/** course-service/internal/content/types.go — Session */
export type CourseSession = {
  id: string;
  title: string;
  /** ISO 8601 */
  date: string;
  location?: string;
  /** 0 or absent: unlimited */
  capacity?: number;
};

/** course-service/internal/handlers/courses.go — prerequisiteResponse */
export type CoursePrerequisite = { course: string; minScore?: number; modules?: string[] };

/** course-service/internal/handlers/courses.go — courseResponse */
export type Course = {
  slug: string;
  /** Same value as slug. */
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty | string;
  isPublic: boolean;
  moduleCount: number;
  /** Actually the number of modules (defect A17). */
  labCount: number;
  enrollmentCount: number;
  scope?: string;
  prerequisites?: CoursePrerequisite[];
  skills?: string[];
  badge?: Badge;
  inPerson?: boolean;
  sessions?: CourseSession[];
  xpRequired?: number;
};

/** user-service/internal/handlers/enrollments.go — myCourse */
export type MyCourse = {
  slug: string;
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  isPublic: boolean;
  /** Number of modules of the course. */
  labCount: number;
  enrollmentCount: number;
  /** Number of completed lessons (defect A17). */
  completedLabs: number;
  totalScore: number;
  lastActivity: string | null;
  completed: boolean;
};

/** user-service/internal/repository/skill_level.go — SkillLevelRow */
export type SkillLevel = {
  skill: string;
  level: string;
  completedCourses: number;
  totalCourses: number;
};

/** user-service/internal/handlers/badges.go — badgeDetail */
export type EarnedBadge = {
  courseSlug: string;
  courseTitle: string;
  name: string;
  icon?: string;
  earnedAt: string;
  earnedBy: number;
};

/** user-service/internal/repository/session_booking.go — booking row */
export type SessionBooking = { courseSlug: string; sessionId: string; bookedAt: string };

// ── Modules (course-service/internal/handlers/modules.go) ──────────────────

export type ModuleType = 'text' | 'video' | 'image' | 'quiz' | 'lab' | 'modules';

export type CheckStep = { title: string; checkType: string; checkParams?: Record<string, unknown> };

/** quizConfig */
export type QuizConfig = {
  passingScore: number;
  cooldown?: { strategy: string; baseSeconds: number; multiplier: number; maxSeconds: number };
  maxAttemptsPerQuestion?: number;
  lockOnMaxAttempts: boolean;
};

/** cooldownState */
export type Cooldown = { remainingSeconds: number; attempts: number; locked: boolean };

export type SourceRef = { course: string; module: string; anchor: string; priority?: number };

/** publicQuestion — `correct` is only sent to admins. */
export type QuizQuestion = {
  id: string;
  type: 'single' | 'multiple' | 'boolean' | 'order';
  difficulty?: string;
  points: number;
  question: string;
  answers?: { id: string; text: string; correct?: boolean }[];
  items?: { id: string; text: string }[];
  sourceRefs?: SourceRef[];
};

/** inlineQuizResponse */
export type InlineQuiz = {
  index: number;
  name: string;
  slug: string;
  questions?: QuizQuestion[];
  questionCount: number;
  passingScore: number;
  bestScore?: number;
  maxScore?: number;
  passed: boolean;
  attempts?: number;
  quizConfig?: QuizConfig;
};

/** moduleResponse, as listed by GET /api/courses/{slug}/modules */
export type ModuleSummary = {
  index: number;
  name: string;
  slug: string;
  type: ModuleType;
  viewed: boolean;
  hidden: boolean;
  locked: boolean;
  inline?: boolean;
  prerequisites?: string[];
  bestScore?: number;
  maxScore?: number;
  passed?: boolean;
  attempts?: number;
  skills?: string[];
  hasCheck?: boolean;
  labUrl?: string;
  checkProvider?: 'local' | 'gitlab';
  src?: string;
  ref?: string;
  path?: string;
};

/** moduleResponse, as returned by GET /api/courses/{slug}/modules/{index} */
export type ModuleDetail = ModuleSummary & {
  content?: string;
  questionCount?: number;
  questions?: QuizQuestion[];
  quizConfig?: QuizConfig;
  cooldowns?: Record<string, Cooldown>;
  inlineQuiz?: InlineQuiz;
  checkType?: string;
  checkParams?: Record<string, unknown>;
  steps?: CheckStep[];
};

/** content.SubmitRequest answers, per question id */
export type QuizAnswer =
  | { single: string | null }
  | { multiple: string[] }
  | { boolean: boolean | null }
  | { order: string[] };

/** questionResultAPI */
export type QuestionResult = {
  questionId: string;
  type: string;
  isCorrect: boolean;
  pointsEarned: number;
  pointsMax: number;
  correctAnswer?: unknown;
  feedback?: string;
  sourceRefs?: SourceRef[];
};

/** submitResponse */
export type QuizResult = {
  totalScore: number;
  maxScore: number;
  passed: boolean;
  questionResults: QuestionResult[];
  cooldowns?: Record<string, Cooldown>;
};

/** checker-service result, relayed by check.go */
export type CheckResult = { allow: boolean; violations?: string[] | null };

/** user-service/internal/handlers/patterns.go — MarkdownPattern */
export type MarkdownPattern = {
  id: string;
  name: string;
  label: string;
  description: string;
  parameter: string;
  html: string;
  css: string;
  /** Never executed (spec 003 S2). */
  js: string;
  scope: string;
  fromConfig: boolean;
  createdAt: string;
  updatedAt: string;
};
