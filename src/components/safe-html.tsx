import { sanitizeHtml } from '@/lib/security';

type SafeHtmlProps = {
  html: string;
  className?: string;
};

/**
 * The only component allowed to render raw HTML (spec 003 S1). It sanitizes
 * its input itself, so a caller cannot forget to.
 */
export function SafeHtml({ html, className }: SafeHtmlProps) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
