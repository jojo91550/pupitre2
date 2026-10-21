import { useState } from 'react';

import { isEmoji, safeUrl } from '@/lib/security';
import { cn } from 'cn';

type UserAvatarProps = {
  username: string;
  avatarUrl: string | null | undefined;
  className?: string;
};

/**
 * Renders an avatar from an untrusted `avatarUrl` (spec 003 S3): an https image,
 * a single emoji as text, or the username's initial. A value is never parsed
 * as HTML, which closes audit finding C4.
 */
export function UserAvatar({ username, avatarUrl, className }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const initial = (username.trim()[0] ?? '?').toUpperCase();
  const value = avatarUrl?.trim() ?? '';
  const imageUrl = value.startsWith('https://') ? safeUrl(value) : null;

  const base = cn(
    'inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-semibold text-accent-foreground select-none',
    className,
  );

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={cn(base, 'object-cover')}
        onError={() => setFailed(true)}
      />
    );
  }

  if (value && isEmoji(value)) {
    return (
      <span className={cn(base, 'text-lg')} aria-hidden="true">
        {value}
      </span>
    );
  }

  return (
    <span className={base} aria-hidden="true">
      {initial}
    </span>
  );
}
