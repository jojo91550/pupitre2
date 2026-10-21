import { AdminIcon, BackArrowIcon } from '@pupitre/ui/components/icons';
import { Link, NavLink, Outlet } from 'react-router';

import { ADMIN_MENU } from '@/lib/navigation';
import { useCurrentUser } from '@/lib/session';

// The admin shell of layouts/Admin.astro, same markup and classes.

export function AdminLayout() {
  const user = useCurrentUser();
  // A manager reaches /admin/exports only, so only that entry is shown.
  const items = user?.role === 'admin' ? ADMIN_MENU : ADMIN_MENU.filter((item) => item.managerToo);

  return (
    <div className="shell-layout">
      <aside className="shell-sidebar">
        <div className="shell-sidebar-label">Administration</div>
        <nav className="shell-sidebar-nav">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <span className="sidebar-icon" style={{ color: item.color }}>
                  {typeof Icon === 'string' ? <AdminIcon name={Icon} /> : <Icon strokeWidth={1.5} />}
                </span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="shell-sidebar-bottom">
          <Link to="/courses" className="shell-back-btn">
            <BackArrowIcon className="shell-back-icon" />
            Retour au catalogue
          </Link>
        </div>
      </aside>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}
