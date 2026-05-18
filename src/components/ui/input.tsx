import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-11 w-full min-h-[44px] rounded-xl border border-wolf-border/70 bg-wolf-panel/90 px-3.5 py-2',
      'text-sm text-wolf-text tabular-nums placeholder:text-wolf-muted',
      'transition-colors duration-150',
      'hover:border-wolf-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wolf-accent/40 focus-visible:border-wolf-accent/50',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
