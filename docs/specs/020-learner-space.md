# 020 - Learner space

Features: F052 (My courses), F103-F105 (XP, levels, My XP), F106-F109 (badges, My badges,
leaderboard, badge statistics), F110-F114 (skills, skill page, levels, My skills), F123 (My
learning paths), F136 (My groups), F037 (public profile).

Every `/my-*` page and `/skills/:slug` require a signed-in user ([002](002-roles-and-guards.md)).
`/leaderboard` and `/users/:id` are public.

## My courses - `/my-courses`

- Data: `GET /api/my/courses` → `courses[]` (`slug`, `title`, `description`, `category`,
  `difficulty`, `labCount`, `completedLabs`, `totalScore`, `lastActivity`, `completed`).
- Four statistics: enrolled courses, completed courses (`completed`), completed modules, overall
  rate (capped at 100 %).
- Search field (title and description) and « N cours » counter.
- Grid of cards: thumbnail, title (two lines at most), progress, link to the course.
- Empty state: « Vous n'êtes inscrit à aucun cours », with a button to the catalogue.

## My learning paths - `/my-paths`

- Data: `GET /api/my/paths` → enrolled paths: `slug`, `title`, `description`, `kind` (`course` or
  `skill`), `level`, `enrolledAt`, `courses[] {slug, status}` or `skills[]`.
- Subtitle: « N parcours en cours ».
- List on the left (title, level badge: « Niveau 1 · Débutant », « Niveau 2 · Intermédiaire »,
  « Niveau 3 · Avancé »), details of the selected path on the right.
- Details: an SVG **progress map** linking the steps of the path, with three states and their
  colours (light / dark):
  - `completed` « Terminé »: green;
  - `available` « Disponible »: blue;
  - `locked` « Verrouillé »: grey.
- Opening a course from a path stores the way back (`sessionStorage`
  `pupitre.courseReturnTo = /my-paths`), used at the end of the course
  ([012](012-lesson-player.md)).
- Empty state: « Vous n'êtes inscrit à aucun parcours. »

## My skills - `/my-skills`

- Data: `GET /api/my/skills` → `skills[] {skill, level, completedCourses, totalCourses}`, plus
  `GET /api/my/courses` and `GET /api/courses` for the skills in progress.
- One card per skill: name, level, « X/Y cours » with a bar. The card links to `/skills/:slug`.
- Level: the one returned by the server (`level`). The current frontend **recomputes** it from
  the ratio (≥ 100 % « Maître », ≥ 60 % « Avancé », ≥ 30 % « Intermédiaire », otherwise
  « Débutant »); pupitre2 uses the server value and keeps this computation only as a fallback
  when `level` is missing.
- The « Maître » level has a gold style.
- Second section « En cours »: the skills of enrolled courses that have no completed course yet.

## Skill page - `/skills/:slug`

- Data: `GET /api/my/skills/{slug}` (modules of the skill with their `status`), `GET /api/courses`
  and `GET /api/my/courses`.
- One card per course that teaches the skill: title, description, difficulty,
  « N module(s) sur cette compétence ».
  - Completed: « ✓ Terminé », « Revoir → ».
  - Enrolled: « En cours », « X/Y modules » bar, « Continuer → ».
  - Otherwise: the plain card.
- A « Voir les cours de ce niveau » link to `/courses?skill=:slug`.

## My badges - `/my-badges`

- Data: `GET /api/my/badges` and `GET /api/courses` (the possible badges are the courses'
  `badge`).
- Three statistics: badges earned, badges to unlock, percentage.
- « Obtenus (N) » section: icon, name, course, date.
- « À débloquer (N) » section: greyed-out icon, « 🔒 Non obtenu », link to the course.
- Clicking a badge **may** show its statistics (`GET /api/badges/{slug}`: number of holders).

## My XP - `/my-xp`

- Data: `GET /api/my/xp` → `{ total, level, levelName, history[] }`, plus `GET /api/my/courses`
  and `GET /api/courses` (course titles).
- Header: total (« N points accumulés »), « Niveau L - Name » chip.
- Bar towards the next level: « N XP jusqu'au niveau L (Name) », or « Niveau maximum atteint 🏆 ».
- Levels:

  | Level | Name | Icon | Threshold |
  | --- | --- | --- | --- |
  | 1 | Novice | 🌱 | 0 |
  | 2 | Apprenant | 📘 | 200 |
  | 3 | Confirmé | ⚙️ | 600 |
  | 4 | Expert | 🔥 | 1,500 |
  | 5 | Maître | 🏆 | 3,500 |

  These thresholds are duplicated in the frontend; they must stay identical to the backend ones
  ([090](090-gaps-and-defects.md)).
- « En cours » section: courses started but not completed, with « Compléter pour +200 XP ».
- History: `+N XP`, source (`lesson` « Leçon », `module` « Module », `course` « Cours »), course
  title, date. Empty: « Aucun XP gagné pour l'instant. Complète des leçons, modules et cours pour
  en gagner ! »

## My groups - `/my-groups`

- Data: `GET /api/my/groups` →
  `groups[] {id, name, source, parentId, depth, mappedRole, courseSlugs}`, and `GET /api/courses`
  for the titles.
- Counter, then one card per group: name, role badge when `mappedRole` is set (« Admin »,
  « Manager », « Étudiant »), and the « Cours du groupe » list (links).
- Empty state: « Vous n'appartenez à aucun groupe. Un administrateur peut vous ajouter à un
  groupe. »

## Leaderboard - `/leaderboard`

- Data: `GET /api/leaderboard` → `rank`, `userId`, `username`, `avatarUrl`, `count` (badges),
  `icons[]`.
- Podium for the top three (🥇 🥈 🥉), then a `#N` list. Each row: avatar
  ([003](003-security.md) S3), username, up to 10 badge icons and « +N » beyond, number of badges.
  Each row links to `/users/:userId`.

## Public profile - `/users/:id`

- Data: `GET /api/users/{id}` (`id`, `username`, `avatarUrl`) and `GET /api/users/{id}/badges`.
- Avatar, username, subtitle (« N badge(s) obtenu(s) »), « Badges obtenus » grid.
- Unknown user: « Profil introuvable ».

## Acceptance criteria

- Each page shows its loading, empty and error states ([005](005-ui-theme-navigation.md)).
- The leaderboard runs no code from a malicious username or avatar ([003](003-security.md)).
- `/my-xp` with 650 XP shows « Niveau 3 - Confirmé » and « 850 XP jusqu'au niveau 4 (Expert) ».

## Sources

`frontend/src/pages/my-courses.astro`, `my-paths.astro`, `my-skills.astro`, `skills/[slug].astro`,
`my-badges.astro`, `my-xp.astro`, `my-groups.astro`, `leaderboard.astro`, `users/[id].astro`;
`user-service/internal/handlers/enrollments.go`, `paths.go`, `skills.go`, `badges.go`, `xp.go`,
`my_groups.go`.
