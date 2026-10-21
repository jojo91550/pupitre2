import { LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router';

import { endSession, useSession } from '@/auth/session';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toggleTheme, useTheme } from '@/lib/theme';
import { cn } from 'cn';

import { SIDE_MENU } from './navigation';

export function SideMenu() {
  const [open, setOpen] = useState(false);
  const session = useSession();
  const theme = useTheme();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 p-0">
        <SheetHeader className="border-b">
          <SheetTitle>
            <Brand />
          </SheetTitle>
          <SheetDescription className="sr-only">Navigation principale</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3" aria-label="Menu">
          {SIDE_MENU.map((section) => (
            <div key={section.label} className="flex flex-col gap-1">
              <p className="px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {section.label}
              </p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted',
                      isActive && 'bg-accent font-semibold text-accent-foreground',
                    )
                  }
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
          <Separator />
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          </button>
          {session && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                endSession('logout');
              }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive-soft"
            >
              <LogOut className="size-4" />
              Déconnexion
            </button>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
