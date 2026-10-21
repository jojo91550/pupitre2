import { Construction } from 'lucide-react';

// Placeholder for the screens planned in later batches of
// docs/specs/099-migration-plan.md, so navigation already works end to end.

type ComingSoonPageProps = {
  title: string;
  spec: string;
  batch: number;
};

export function ComingSoonPage({ title, spec, batch }: ComingSoonPageProps) {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      <Construction className="size-12 text-warning" aria-hidden="true" />
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground">
        Cette page arrive au lot {batch} (spec {spec}).
      </p>
    </section>
  );
}
