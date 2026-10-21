import { cn } from 'cn';

/** The pupitre logo: the pioupitre bird and the word "pupitre" in Caveat. */
export function Brand({ className, size = 'md' }: { className?: string; size?: 'md' | 'lg' }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <img
        src="/pioupitre.png"
        alt=""
        className={size === 'lg' ? 'size-14 object-contain' : 'size-8 object-contain'}
      />
      <span
        className={cn(
          'font-brand leading-none font-bold text-foreground',
          size === 'lg' ? 'text-4xl' : 'text-2xl',
        )}
      >
        pupitre
      </span>
    </span>
  );
}
