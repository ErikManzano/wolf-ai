import type { SVGProps } from 'react';
import {
  LOGO_VIEWBOX,
  markPathsCompact,
  markWingsPath,
  logoVariants,
  type LogoVariant,
} from '../../../packages/design-system/logo';
import './branding.css';

export type LogoIconProps = {
  size?: number;
  /**
   * `default` follows --brand-mark-* (light/dark theme).
   * Use `dark` / `light` to force a surface; `monochrome` uses currentColor.
   */
  variant?: LogoVariant;
  className?: string;
  title?: string;
} & Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'viewBox'>;

/**
 * Homilos winged-H isotype (inline SVG).
 * Default variant is theme-aware so the H stays visible on dark and light chrome.
 */
export function LogoIcon({
  size = 24,
  variant = 'default',
  className,
  title = 'Homilos Builder',
  ...rest
}: LogoIconProps) {
  const colors = logoVariants[variant];
  const isMono = variant === 'monochrome';
  const hidden = rest['aria-hidden'] === true || rest['aria-hidden'] === 'true';
  const classes = ['hb-logo-icon', className].filter(Boolean).join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox={LOGO_VIEWBOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={classes}
      role={hidden ? undefined : 'img'}
      aria-label={hidden ? undefined : title}
      {...rest}
    >
      <path
        className="hb-logo-icon__wings"
        d={markWingsPath}
        fill={isMono ? 'currentColor' : colors.wings}
      />
      <path
        className="hb-logo-icon__h"
        d={markPathsCompact.h}
        fill={isMono ? 'currentColor' : colors.h}
      />
    </svg>
  );
}

export default LogoIcon;
