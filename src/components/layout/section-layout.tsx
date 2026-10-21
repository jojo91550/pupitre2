import { ArrowLeft } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router';

import { useCurrentUser } from '@/auth/session';
import { cn } from 'cn';

import { ADMIN_MENU, MANAGER_MENU, type NavItem } from './navigation';

// Sidebar shells of the administration and the manager space
// (docs/specs/005-ui-theme-navigation.md).

function Sidebar({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <aside className="lg:w-60 lg:shrink-0">
      <nav
        aria-label={title}
        className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-2 lg:sticky lg:top-20 lg:flex-col"
      >
        <p className="hidden px-3 pt-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:block">
          {title}
        </p>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            className={({ isActive }) =>
              cn(
                'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-muted',
                isActive && 'bg-accent font-semibold text-accent-foreground',
              )
            }
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        <Link
          to="/courses"
          className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap text-muted-foreground hover:bg-muted lg:mt-2"
        >
          <ArrowLeft className="size-4" />
          Retour au catalogue
        </Link>
      </nav>
    </aside>
  );
}

function Shell({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
      <Sidebar title={title} items={items} />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

export function AdminLayout() {
  const user = useCurrentUser();
  // A manager reaches /admin/exports only, so only that entry is shown.
  const items = user?.role === 'admin' ? ADMIN_MENU : ADMIN_MENU.filter((item) => item.managerToo);
  return <Shell title="Administration" items={items} />;
}

export function ManagerLayout() {
  return <Shell title="Mon espace" items={MANAGER_MENU} />;
}
