import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { toggleTheme, useTheme } from '@/lib/theme';

export function ThemeToggle() {
  const theme = useTheme();
  const label = theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre';
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={label} title={label}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}
