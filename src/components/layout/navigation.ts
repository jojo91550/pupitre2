// Navigation entries of docs/specs/005-ui-theme-navigation.md.

export type NavItem = { to: string; label: string; icon: string };
export type NavSection = { label: string; items: NavItem[] };

export const SIDE_MENU: NavSection[] = [
  {
    label: 'Mon apprentissage',
    items: [
      { to: '/courses', label: 'Catalogue', icon: '📚' },
      { to: '/my-courses', label: 'Mes cours', icon: '🎓' },
      { to: '/my-paths', label: 'Mes parcours', icon: '🗺️' },
      { to: '/my-groups', label: 'Mes groupes', icon: '👥' },
    ],
  },
  {
    label: 'Progression & Gamification',
    items: [
      { to: '/my-badges', label: 'Mes badges', icon: '🏅' },
      { to: '/my-xp', label: 'Mon XP', icon: '⚡' },
      { to: '/leaderboard', label: 'Classement', icon: '🏆' },
    ],
  },
  {
    label: 'Compétences & Planning',
    items: [
      { to: '/my-skills', label: 'Mes compétences', icon: '🎯' },
      { to: '/agenda', label: 'Agenda', icon: '📅' },
    ],
  },
];

/** One list for every admin page (the Astro frontend had two, see defect A4). */
export const ADMIN_MENU: (NavItem & { managerToo?: boolean })[] = [
  { to: '/admin', label: 'Tableau de bord', icon: '📊' },
  { to: '/admin/users', label: 'Utilisateurs', icon: '👥' },
  { to: '/admin/courses', label: 'Cours', icon: '📚' },
  { to: '/admin/paths', label: 'Parcours', icon: '🗺️' },
  { to: '/admin/groups', label: 'Groupes', icon: '🏷️' },
  { to: '/admin/patterns', label: 'Patterns', icon: '🔶' },
  { to: '/admin/settings', label: 'Paramètres', icon: '⚙️' },
  { to: '/admin/leaderboard', label: 'Classement', icon: '🏆' },
  { to: '/admin/labs', label: 'Labs', icon: '🧪' },
  { to: '/admin/exports', label: 'Exports CSV', icon: '⬇️', managerToo: true },
  { to: '/admin/monitoring', label: 'Monitoring', icon: '📈' },
];

export const MANAGER_MENU: NavItem[] = [
  { to: '/manager/users', label: 'Mes membres', icon: '👥' },
  { to: '/manager/groups', label: 'Mes groupes', icon: '🏷️' },
  { to: '/manager/paths', label: 'Parcours', icon: '🗺️' },
];
