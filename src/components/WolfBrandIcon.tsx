import React from 'react';

export const WOLF_SHIELD_PATH =
  'M12 22C12 22 5 18 3 11C2 8 3 4 3 4L8 7L12 2L16 7L21 4C21 4 22 8 21 11C19 18 12 22 12 22Z';

const EYE_FILL = 'var(--wolf-brand-eye, var(--color-bg-main, #0a0c10))';

export const WolfAngryEyes: React.FC = () => (
  <g fill={EYE_FILL}>
    <path d="M7.4 9.4 L10.5 10.5 L9.9 11.4 L6.8 10.3 Z" />
    <path d="M16.6 9.4 L13.5 10.5 L14.1 11.4 L17.2 10.3 Z" />
    <ellipse cx="9" cy="12.5" rx="1.45" ry="0.78" transform="rotate(-18 9 12.5)" />
    <ellipse cx="15" cy="12.5" rx="1.45" ry="0.78" transform="rotate(18 15 12.5)" />
  </g>
);

type WolfBrandIconProps = {
  size?: number;
  className?: string;
};

export const WolfBrandIcon: React.FC<WolfBrandIconProps> = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d={WOLF_SHIELD_PATH} />
    <WolfAngryEyes />
  </svg>
);
