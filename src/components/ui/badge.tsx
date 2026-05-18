import * as React from 'react';
import { cn } from '../../lib/utils';

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'accent' | 'muted' | 'warmup' }) {
  const variants = {
    default: 'bg-wolf-elevated text-wolf-subtle border-wolf-border/60',
    accent: 'bg-wolf-accent-soft text-orange-300 border-orange-500/20',
    muted: 'bg-wolf-panel text-wolf-muted border-wolf-border/40',
    warmup: 'bg-amber-500/10 text-amber-200/90 border-amber-500/25',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
