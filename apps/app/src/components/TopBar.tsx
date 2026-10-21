import { useState } from 'react';
import { Link, NavLink } from 'react-router';

import { endSession, useSession } from '@/lib/session';
import { Brand } from '@pupitre/ui/components/brand';
import { HamburgerIcon, MoonIcon, SunIcon } from '@pupitre/ui/components/icons';
import { UserAvatar } from '@pupitre/ui/components/user-avatar';
import { toggleTheme, useTheme } from '@pupitre/ui/lib/theme';

import { SideMenu } from '@/components/SideMenu';

// The top bar of layouts/App.astro, same markup and classes.

export function TopBar() {
  const session = useSession();
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = session?.user;

  return (
    <>
      <nav className="topnav">
        <button className="nav-hamburger" aria-label="Menu" onClick={() => setMenuOpen(true)}>
          <HamburgerIcon />
        </button>
        <Link to="/courses" className="brand">
          <Brand />
        </Link>
        <NavLink to="/courses" end className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}>
          Catalogue
        </NavLink>
        <NavLink to="/my-courses" className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}>
          Mes cours
        </NavLink>
        {user?.role === 'manager' && (
          <NavLink
            to="/manager/users"
            id="nav-manager"
            className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}
          >
            Mon espace
          </NavLink>
        )}
        <div className="nav-spacer" />
        <button
          className="nav-hamburger"
          aria-label="Basculer le thème"
          title="Mode sombre / clair"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/profile" className="flex items-center gap-2 no-underline text-inherit" title={user.username}>
                <UserAvatar username={user.username} avatarUrl={user.avatarUrl} />
                <span className="text-[.875rem] font-medium text-ink-soft max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap hidden sm:inline">
                  {user.username}
                </span>
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="btn btn-sm btn-admin-nav">
                  ⚙ Admin
                </Link>
              )}
              <button id="nav-logout" className="btn btn-ghost btn-sm" onClick={() => endSession('logout')}>
                Déconnexion
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-secondary btn-sm">
              Se connecter
            </Link>
          )}
        </div>
      </nav>
      <SideMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
