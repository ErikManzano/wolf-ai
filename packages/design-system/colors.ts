/** Homilos Builder — brand color tokens. Flat only; no gradients. */
export const colors = {
  primary: '#e06048',
  secondary: '#111111',
  white: '#FFFFFF',
  gray: '#6B7280',
  coralDeep: '#9a3828',
  coral: '#c84838',
  coralMid: '#e06048',
  coralWarm: '#f07858',
  coralLight: '#ff9668',
} as const;

/** CSS custom properties wired in src/styles/theme.css */
export const colorVars = {
  markH: 'var(--brand-mark-h)',
  markWings: 'var(--brand-mark-wings)',
  wordmark: 'var(--brand-wordmark)',
  builder: 'var(--brand-builder)',
  chromeGradient: 'var(--brand-chrome-gradient)',
  accentGradient: 'var(--color-accent-gradient)',
} as const;

export type BrandColor = (typeof colors)[keyof typeof colors];

export default colors;
