import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

const variantClass: Record<NonNullable<ButtonProps['variant']>, string> = {
  default:
    'bg-wolf-accent text-white shadow-[0_1px_0_rgba(255,255,255,0.08)_inset] hover:bg-orange-400 active:scale-[0.98]',
  secondary: 'bg-wolf-elevated text-wolf-text hover:bg-wolf-hover border border-wolf-border/80',
  ghost: 'text-wolf-subtle hover:text-wolf-text hover:bg-wolf-hover/80',
  outline: 'border border-wolf-border/80 text-wolf-subtle hover:text-wolf-text hover:border-wolf-muted/60 hover:bg-wolf-hover/50',
  danger: 'text-wolf-danger hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30',
};

const sizeClass: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-5 text-sm rounded-xl gap-2 min-w-[44px]',
  icon: 'h-10 w-10 p-0 rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wolf-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-wolf-bg',
        'disabled:pointer-events-none disabled:opacity-40',
        'touch-manipulation select-none',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
