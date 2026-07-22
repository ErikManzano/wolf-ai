/** Homilos Builder — typography tokens (Manrope). */
export const typography = {
  fontFamily: {
    brand: '"Manrope", system-ui, -apple-system, sans-serif',
    sans: '"Manrope", system-ui, -apple-system, sans-serif',
  },
  wordmark: {
    homilos: {
      weight: 800,
      tracking: '0.14em',
      transform: 'uppercase' as const,
    },
    builder: {
      weight: 600,
      tracking: '0.28em',
      transform: 'uppercase' as const,
    },
  },
  scale: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
  },
} as const;

export default typography;
