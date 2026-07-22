import type { CSSProperties } from 'react';
import { type LogoVariant } from '../../../packages/design-system/logo';
import { LogoIcon } from './LogoIcon';
import { LogoWordmark } from './LogoWordmark';

export type LogoProps = {
  size?: number;
  variant?: LogoVariant;
  layout?: 'horizontal' | 'vertical' | 'icon';
  className?: string;
  showWordmark?: boolean;
  showBuilder?: boolean;
};

/**
 * Full Homilos Builder logo — mark + wordmark (inline SVG mark, HTML type).
 */
export function Logo({
  size = 28,
  variant = 'default',
  layout = 'horizontal',
  className,
  showWordmark = true,
  showBuilder = true,
}: LogoProps) {
  const isMono = variant === 'monochrome';

  if (layout === 'icon' || !showWordmark) {
    return <LogoIcon size={size} variant={variant} className={className} />;
  }

  const gap = Math.round(size * 0.35);
  const wrap: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    flexDirection: layout === 'vertical' ? 'column' : 'row',
    gap,
    color: isMono ? 'currentColor' : undefined,
  };

  const wordSize =
    layout === 'vertical' ? Math.round(size * 0.85) : Math.round(size * 0.72);

  return (
    <span className={className} style={wrap} role="img" aria-label="Homilos Builder">
      <LogoIcon size={size} variant={variant} aria-hidden />
      <LogoWordmark
        size={wordSize}
        variant={variant}
        layout={layout === 'vertical' ? 'vertical' : 'horizontal'}
        showBuilder={showBuilder}
      />
    </span>
  );
}

export default Logo;
