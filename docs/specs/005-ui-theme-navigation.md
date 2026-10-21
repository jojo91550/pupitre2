# 005 - Theme, navigation, toasts, page states and accessibility

Features: F010 (light / dark theme), F011 (navigation shell), F012 (toasts), F018 (language).

## Colour tokens

The tokens of the current frontend (`styles/tokens.css`) become the CSS variables of the shadcn
theme, declared in `src/styles/globals.css` (`:root` and `.dark`).

| Current token | Light | Dark | shadcn variable |
| --- | --- | --- | --- |
| `ink` | `#2b2f36` | `#dde1ea` | `--foreground` |
| `ink-soft` | `#6b7280` | `#8b92a0` | `--muted-foreground` |
| `line` | `#e2e6ef` | `#252830` | `--border`, `--input` |
| `fill` | `#f3f5f9` | `#1a1d24` | `--muted`, `--secondary` |
| `paper` | `#ffffff` | `#1e2128` | `--card`, `--popover` |
| `page` | `#fefefe` | `#16181f` | `--background` |
| `blue` | `#1b86f2` | `#1b86f2` | `--primary`, `--ring` |
| `blue-deep` | `#1466c4` | - | hover of the primary button |
| `blue-soft` | `#e2f0fd` | `#162336` | `--accent` |
| `orange` / `orange-soft` | `#ff9d18` / `#fff3e0` | - / `#271a08` | `--warning` (added) |
| `good` / `good-soft` | `#3bb273` / `#dcf2e6` | - / `#0d2218` | `--success` (added) |
| `bad` / `bad-soft` | `#e5534b` / `#fde8e7` | - / `#270f0e` | `--destructive` |
| `purple` / `purple-soft` | `#7c3aed` / `#f3e8ff` | - / `#1a0e38` | skill badges |

- Radius: `--radius: 10px` (cards: 16 px).
- Fonts: Hanken Grotesk (text), Caveat (the "pupitre" logo), JetBrains Mono (code), served locally
  (see [003](003-security.md) S6).
- The logo is `public/pioupitre.png`, next to the word "pupitre" in Caveat.

## Light / dark mode

- The preference is stored in `localStorage.theme` (`light` or `dark`). Without a preference, the
  app follows `prefers-color-scheme`.
- The `dark` class is set on `<html>` **before the first render** (a small script loaded in the
  head, not inline) to avoid a flash.
- Toggle in the top bar (sun / moon icon) and in the side menu (« Mode sombre » / « Mode clair »).
- Mermaid diagrams are redrawn when the theme changes ([012](012-lesson-player.md)).

## Top bar (learner space)

From left to right:

1. Menu button (mobile and desktop), which opens the side menu.
2. Logo and "pupitre", link to `/courses`.
3. Links « Catalogue » (`/courses`) and « Mes cours » (`/my-courses`), with the active state.
4. « Mon espace » (`/manager/users`), for a manager only.
5. Theme toggle.
6. When signed in: avatar ([003](003-security.md) S3) and username (hidden on mobile), link to
   `/profile`; « Admin » button for an admin; « Déconnexion » button.
   Otherwise: « Se connecter » button to `/login`.

## Side menu

shadcn `Sheet` component, closed by a click on a link or on the backdrop.

| Section | Entries |
| --- | --- |
| « Mon apprentissage » | 📚 Catalogue · 🎓 Mes cours · 🗺️ Mes parcours · 👥 Mes groupes |
| « Progression & Gamification » | 🏅 Mes badges · ⚡ Mon XP · 🏆 Classement |
| « Compétences & Planning » | 🎯 Mes compétences · 📅 Agenda |
| - | Theme toggle · 🚪 Déconnexion (in red) |

The entry of the current page is highlighted (same path or sub-path).

## Admin sidebar

A **single** list, used by every admin page (today `Admin.astro` and the old dashboard do not have
the same entries):

Tableau de bord · Utilisateurs · Cours · Parcours · Groupes · Patterns · Paramètres · Classement ·
Labs · Exports CSV · Monitoring, then « ← Retour au catalogue ».

A manager who opens `/admin/exports` sees only « Exports CSV » and the link back to the catalogue.

## Manager sidebar

👥 Mes membres (`/manager/users`) · 🏷️ Mes groupes (`/manager/groups`) · 🗺️ Parcours
(`/manager/paths`) · ← Retour au catalogue.

## Toasts

- `Toaster` component (sonner) mounted once. API: `toast.success`, `toast.error`, `toast.info`,
  `toast.warning`.
- Duration: 4 s. Position: bottom right on desktop, top on mobile.
- Messages are plain text (never HTML, see [003](003-security.md) S1).
- The `alert()` calls of the current frontend (agenda, session booking) become error toasts.

## Page states

Every page that loads data has three states, with shared components:

- **loading**: skeletons (`Skeleton`) in place of the cards or rows;
- **empty**: an illustration (emoji), a message and, when useful, an action (« Explorer le
  catalogue »);
- **error**: the API message and a « Réessayer » button.

## Language and formats

- The interface is in French. UI strings are grouped per domain in `src/features/*/messages.ts`
  so they can be translated later (English is not required).
- Dates and numbers: `Intl.DateTimeFormat('fr-FR')` and `Intl.NumberFormat('fr-FR')`.
- Levels: `beginner` → « Débutant », `intermediate` → « Intermédiaire », `advanced` → « Avancé ».

## Responsive design and accessibility

- Default Tailwind breakpoints; no page scrolls horizontally at 360 px.
- Every icon button has an `aria-label`.
- Full keyboard navigation, visible focus (`--ring`).
- AA contrast on text, in light and dark mode.
- Dialogs (`Dialog`, `AlertDialog`) manage focus and close with Escape.
- Every deletion goes through a confirmation `AlertDialog`.

## Sources

`frontend/src/styles/tokens.css`, `styles/*.css`, `layouts/Base.astro`, `layouts/App.astro`,
`layouts/Admin.astro`, `layouts/Manager.astro`, `pages/admin/[...slug].astro`.
