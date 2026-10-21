// Placeholder for the screens of later batches (docs/specs/099-migration-plan.md),
// so navigation already works end to end.

type ComingSoonPageProps = {
  title: string;
  spec: string;
  batch: number;
};

export function ComingSoon({ title, spec, batch }: ComingSoonPageProps) {
  return (
    <div className="forbidden-page">
      <div className="forbidden-content">
        <div className="forbidden-icon">🚧</div>
        <h2 className="forbidden-title">{title}</h2>
        <p className="text-soft text-sm forbidden-text">
          Cette page arrive au lot {batch} (spec {spec}).
        </p>
      </div>
    </div>
  );
}
