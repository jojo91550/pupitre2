import { Link, NavLink, Outlet } from 'react-router';

import { MANAGER_MENU } from '@/lib/navigation';

// The manager shell of layouts/Manager.astro, same markup and classes.

export function ManagerLayout() {
  return (
    <div className="shell-layout">
      <aside className="shell-sidebar">
        <div className="shell-sidebar-label">Mon espace</div>
        <nav className="shell-sidebar-nav">
          {MANAGER_MENU.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="shell-sidebar-bottom">
          <Link to="/courses" className="sidebar-link text-ink-soft text-[.82rem]">
            ← Retour au catalogue
          </Link>
        </div>
      </aside>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}
