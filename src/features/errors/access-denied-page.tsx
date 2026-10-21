import { ShieldX } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

export function AccessDeniedPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <ShieldX className="size-12 text-destructive" aria-hidden="true" />
      <h1 className="text-2xl font-bold">Accès refusé</h1>
      <p className="text-muted-foreground">Vous n'avez pas les droits nécessaires pour ouvrir cette page.</p>
      <Button asChild>
        <Link to="/courses">Retour au catalogue</Link>
      </Button>
    </section>
  );
}
