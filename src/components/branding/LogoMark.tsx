import type { SVGProps } from 'react';
import {
  markPathsCompact,
  markWingsPath,
  logoVariants,
  type LogoVariant,
} from '../../../packages/design-system/logo';

export type LogoMarkProps = {
  size?: number;
  variant?: LogoVariant | 'onPrimary';
  className?: string;
  title?: string;
} & Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'viewBox'>;

const onPrimaryFills = { h: '#111111', wings: '#FFFFFF' } as const;

/**
 * Brand isotype (winged H). Same geometry as LogoIcon; kept as a named export
 * for design-system consumers that expect a "mark" primitive.
 */
export function LogoMark({
  size = 24,
  variant = 'default',
  className,
  title = 'Homilos Builder',
  ...rest
}: LogoMarkProps) {
  const fills =
    variant === 'onPrimary'
      ? onPrimaryFills
      : logoVariants[variant];
  const isMono = variant === 'monochrome';
  const classes = ['hb-logo-icon', className].filter(Boolean).join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={classes}
      role="img"
      aria-label={title}
      {...rest}
    >
      <path
        className="hb-logo-icon__wings"
        d={markWingsPath}
        fill={isMono ? 'currentColor' : fills.wings}
      />
      <path
        className="hb-logo-icon__h"
        d={markPathsCompact.h}
        fill={isMono ? 'currentColor' : fills.h}
      />
    </svg>
  );
}

/** Orange squircle app icon with centered mark. */
export function AppIconMark({
  size = 48,
  className,
  ...rest
}: Omit<LogoMarkProps, 'variant'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Homilos Builder"
      {...rest}
    >
      <rect width="64" height="64" rx="14" fill="#FF7A00" />
      <g transform="translate(11.52 11.52) scale(0.64)">
        <path d={markWingsPath} fill="#FFFFFF" />
        <path d={markPathsCompact.h} fill="#111111" />
      </g>
    </svg>
  );
}

export default LogoMark;
