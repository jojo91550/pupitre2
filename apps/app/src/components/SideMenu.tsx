import { Dialog } from 'radix-ui';
import { NavLink } from 'react-router';

import { endSession, useSession } from '@/lib/session';
import { CloseIcon } from '@pupitre/ui/components/icons';
import { toggleTheme, useTheme } from '@pupitre/ui/lib/theme';

import { SIDE_MENU } from '@/lib/navigation';

// The side drawer of layouts/App.astro, same markup and classes. Radix Dialog
// brings focus trapping, Escape and the backdrop click; the look stays pupitre's.

type SideMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SideMenu({ open, onOpenChange }: SideMenuProps) {
  const session = useSession();
  const theme = useTheme();
  const close = () => onOpenChange(false);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="nav-drawer-overlay open" />
        <Dialog.Content className="nav-drawer open" aria-describedby={undefined}>
          <div className="nav-drawer-header">
            <Dialog.Title className="brand-font text-2xl font-bold brand-logo-text">pupitre</Dialog.Title>
            <Dialog.Close className="nav-drawer-close" aria-label="Fermer">
              <CloseIcon />
            </Dialog.Close>
          </div>
          <div className="nav-drawer-body">
            {SIDE_MENU.map((section) => (
              <div key={section.label} className="nav-drawer-section">
                <div className="nav-drawer-label">{section.label}</div>
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={close}
                    className={({ isActive }) => `nav-drawer-link${isActive ? ' active' : ''}`}
                  >
                    <span className="nav-drawer-icon">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
            <div className="nav-drawer-section">
              <button type="button" className="nav-drawer-link w-full text-left" onClick={toggleTheme}>
                <span className="nav-drawer-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
                <span>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
              </button>
              {session && (
                <button
                  type="button"
                  className="nav-drawer-link w-full text-left text-bad"
                  onClick={() => {
                    close();
                    endSession('logout');
                  }}
                >
                  <span className="nav-drawer-icon">🚪</span>
                  Déconnexion
                </button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
