/** Homilos Builder — brand color tokens. Flat only; no gradients. */
export const colors = {
  primary: '#FF7A00',
  secondary: '#111111',
  white: '#FFFFFF',
  gray: '#6B7280',
} as const;

/** CSS custom properties wired in src/styles/theme.css */
export const colorVars = {
  markH: 'var(--brand-mark-h)',
  markWings: 'var(--brand-mark-wings)',
  wordmark: 'var(--brand-wordmark)',
  builder: 'var(--brand-builder)',
} as const;

export type BrandColor = (typeof colors)[keyof typeof colors];

export default colors;
