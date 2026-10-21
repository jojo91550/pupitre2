import { SearchX } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <SearchX className="size-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-bold">Page introuvable</h1>
      <p className="text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p>
      <Button asChild>
        <Link to="/courses">Retour au catalogue</Link>
      </Button>
    </section>
  );
}
