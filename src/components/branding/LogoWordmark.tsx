import type { CSSProperties } from 'react';
import {
  markPathsCompact,
  markWingsPath,
  logoVariants,
  type LogoVariant,
} from '../../../packages/design-system/logo';
import { typography } from '../../../packages/design-system/typography';
import './branding.css';

export type LogoWordmarkProps = {
  size?: number;
  variant?: LogoVariant;
  layout?: 'horizontal' | 'vertical';
  className?: string;
  showBuilder?: boolean;
};

/**
 * HOMILOS / BUILDER wordmark — Manrope, all caps, wide tracking.
 * Renders as accessible HTML (not an image) so typography stays crisp.
 */
export function LogoWordmark({
  size = 24,
  variant = 'default',
  layout = 'horizontal',
  className,
  showBuilder = true,
}: LogoWordmarkProps) {
  const colors = logoVariants[variant];
  const isMono = variant === 'monochrome';
  const nameColor = isMono ? 'currentColor' : colors.wordmark;
  const builderColor = isMono ? 'currentColor' : colors.builder;

  const nameStyle: CSSProperties = {
    fontFamily: typography.fontFamily.brand,
    fontWeight: typography.wordmark.homilos.weight,
    letterSpacing: typography.wordmark.homilos.tracking,
    textTransform: 'uppercase',
    color: nameColor,
    fontSize: size,
    lineHeight: 1,
    margin: 0,
  };

  const builderStyle: CSSProperties = {
    fontFamily: typography.fontFamily.brand,
    fontWeight: typography.wordmark.builder.weight,
    letterSpacing: typography.wordmark.builder.tracking,
    textTransform: 'uppercase',
    color: builderColor,
    fontSize: Math.max(10, Math.round(size * 0.42)),
    lineHeight: 1,
    margin: 0,
  };

  if (layout === 'vertical') {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: Math.round(size * 0.28),
        }}
      >
        <span style={nameStyle}>Homilos</span>
        {showBuilder ? (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: Math.round(size * 0.35),
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <span
              aria-hidden
              style={{
                flex: 1,
                maxWidth: size * 1.1,
                height: 1.5,
                background: builderColor,
              }}
            />
            <span style={builderStyle}>Builder</span>
            <span
              aria-hidden
              style={{
                flex: 1,
                maxWidth: size * 1.1,
                height: 1.5,
                background: builderColor,
              }}
            />
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: Math.round(size * 0.2),
      }}
    >
      <span style={nameStyle}>Homilos</span>
      {showBuilder ? <span style={builderStyle}>Builder</span> : null}
    </div>
  );
}

/** Inline SVG wordmark for exports / places that need a single SVG node. */
export function LogoWordmarkSvg({
  variant = 'default',
  layout = 'horizontal',
  className,
}: Pick<LogoWordmarkProps, 'variant' | 'layout' | 'className'>) {
  const colors = logoVariants[variant];
  const isMono = variant === 'monochrome';
  const h = isMono ? 'currentColor' : colors.h;
  const wings = isMono ? 'currentColor' : colors.wings;
  const name = isMono ? 'currentColor' : colors.wordmark;
  const builder = isMono ? 'currentColor' : colors.builder;

  if (layout === 'vertical') {
    return (
      <svg
        className={className}
        viewBox="0 0 320 240"
        width={320}
        height={240}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Homilos Builder"
      >
        <g transform="translate(112 24) scale(1.5)">
          <path d={markWingsPath} fill={wings} />
          <path d={markPathsCompact.h} fill={h} />
        </g>
        <text
          x="160"
          y="168"
          textAnchor="middle"
          fontFamily="Manrope, system-ui, sans-serif"
          fontWeight={800}
          fontSize={36}
          letterSpacing="0.14em"
          fill={name}
        >
          HOMILOS
        </text>
        <line x1="56" y1="196" x2="112" y2="196" stroke={builder} strokeWidth={2} />
        <text
          x="160"
          y="202"
          textAnchor="middle"
          fontFamily="Manrope, system-ui, sans-serif"
          fontWeight={600}
          fontSize={14}
          letterSpacing="0.32em"
          fill={builder}
        >
          BUILDER
        </text>
        <line x1="208" y1="196" x2="264" y2="196" stroke={builder} strokeWidth={2} />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 360 112"
      width={360}
      height={112}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Homilos Builder"
    >
      <g transform="translate(16 24) scale(1.25)">
        <path d={markWingsPath} fill={wings} />
        <path d={markPathsCompact.h} fill={h} />
      </g>
      <text
        x="112"
        y="52"
        fontFamily="Manrope, system-ui, sans-serif"
        fontWeight={800}
        fontSize={28}
        letterSpacing="0.12em"
        fill={name}
      >
        HOMILOS
      </text>
      <text
        x="112"
        y="78"
        fontFamily="Manrope, system-ui, sans-serif"
        fontWeight={600}
        fontSize={12}
        letterSpacing="0.3em"
        fill={builder}
      >
        BUILDER
      </text>
    </svg>
  );
}

export default LogoWordmark;
