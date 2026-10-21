import { LogOut, Settings } from 'lucide-react';
import { Link, NavLink } from 'react-router';

import { endSession, useSession } from '@/auth/session';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { cn } from 'cn';

import { SideMenu } from './side-menu';
import { ThemeToggle } from './theme-toggle';

function TopLink({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/courses'}
      className={({ isActive }) =>
        cn(
          'hidden rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex',
          isActive && 'bg-accent text-accent-foreground',
        )
      }
    >
      {children}
    </NavLink>
  );
}

export function TopBar() {
  const session = useSession();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
        <SideMenu />
        <Link to="/courses" className="mr-2" aria-label="pupitre, retour au catalogue">
          <Brand />
        </Link>
        <TopLink to="/courses">Catalogue</TopLink>
        <TopLink to="/my-courses">Mes cours</TopLink>
        {user?.role === 'manager' && <TopLink to="/manager/users">Mon espace</TopLink>}

        <div className="flex-1" />

        <ThemeToggle />
        {user ? (
          <>
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted"
              title={user.username}
            >
              <UserAvatar username={user.username} avatarUrl={user.avatarUrl} />
              <span className="hidden max-w-32 truncate text-sm font-medium text-muted-foreground sm:inline">
                {user.username}
              </span>
            </Link>
            {user.role === 'admin' && (
              <Button asChild size="sm" variant="outline">
                <Link to="/admin">
                  <Settings />
                  Admin
                </Link>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => endSession('logout')}
              aria-label="Déconnexion"
            >
              <LogOut />
              <span className="hidden md:inline">Déconnexion</span>
            </Button>
          </>
        ) : (
          <Button asChild size="sm" variant="secondary">
            <Link to="/login">Se connecter</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
