function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function AthleteAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`wl-athletes-avatar wl-athletes-avatar--${size}`} aria-hidden>
      {initials(name)}
    </span>
  );
}
