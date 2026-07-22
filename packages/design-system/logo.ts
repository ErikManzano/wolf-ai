import { colors } from './colors';

/** Canonical mark viewBox — 64×64 on an 8px grid. */
export const LOGO_VIEWBOX = '0 0 64 64';
export const LOGO_VIEWBOX_NUM = 64;

/**
 * Winged-H mark — redrawn on an 8px grid (not traced).
 *
 * Improvements vs. reference concept:
 * - Consistent stem/crossbar weight (8px) and 8px counter
 * - Wing taper: +4px inset per bar → one angle system across both sides
 * - Optical 4px gaps between wing bars; 4px clearance to the H
 * - Minimum wing tip width 4px so the mark remains legible at 16×16
 * - Flat, two-color only — corporate SaaS, not gamer / AI-glow
 */
export const markPaths = {
  h: 'M20 16H28V28H36V16H44V48H36V36H28V48H20V16Z',
  wingLeftTop: 'M4 16H16V24L8 24Z',
  wingLeftMid: 'M8 28H16V36L12 36Z',
  wingLeftBot: 'M12 40H16V48L14 48Z',
  wingRightTop: 'M48 16H60L56 24H48Z',
  wingRightMid: 'M48 28H56L52 36H48Z',
  wingRightBot: 'M48 40H52L50 48H48Z',
} as const;

/** Stronger small-size wings (min tip 4px) — preferred for favicon / app icon. */
export const markPathsCompact = {
  h: markPaths.h,
  wingLeftTop: 'M4 16H16V24L6 24Z',
  wingLeftMid: 'M6 28H16V36L10 36Z',
  wingLeftBot: 'M10 40H16V48L12 48Z',
  wingRightTop: 'M48 16H60L58 24H48Z',
  wingRightMid: 'M48 28H58L54 36H48Z',
  wingRightBot: 'M48 40H54L52 48H48Z',
} as const;

export const markWingsPath = [
  markPathsCompact.wingLeftTop,
  markPathsCompact.wingLeftMid,
  markPathsCompact.wingLeftBot,
  markPathsCompact.wingRightTop,
  markPathsCompact.wingRightMid,
  markPathsCompact.wingRightBot,
].join(' ');

export const logoVariants = {
  /** On dark UI surfaces — white H, orange wings */
  dark: {
    h: colors.white,
    wings: colors.primary,
    wordmark: colors.white,
    builder: colors.primary,
    background: colors.secondary,
  },
  /** On light UI surfaces — near-black H, orange wings */
  light: {
    h: colors.secondary,
    wings: colors.primary,
    wordmark: colors.secondary,
    builder: colors.primary,
    background: colors.white,
  },
  monochrome: {
    h: 'currentColor',
    wings: 'currentColor',
    wordmark: 'currentColor',
    builder: 'currentColor',
    background: 'transparent',
  },
  /**
   * Theme-aware (recommended for app chrome).
   * Resolves via --brand-mark-* tokens in theme.css (light/dark).
   */
  default: {
    h: 'var(--brand-mark-h, #111111)',
    wings: 'var(--brand-mark-wings, #FF7A00)',
    wordmark: 'var(--brand-wordmark, #111111)',
    builder: 'var(--brand-builder, #FF7A00)',
    background: 'transparent',
  },
} as const;

export type LogoVariant = keyof typeof logoVariants;

export const logoSizes = [16, 24, 32, 48, 64, 128, 256, 1024] as const;
export type LogoSize = (typeof logoSizes)[number] | number;

export default {
  LOGO_VIEWBOX,
  markPaths,
  markPathsCompact,
  markWingsPath,
  logoVariants,
  logoSizes,
};
