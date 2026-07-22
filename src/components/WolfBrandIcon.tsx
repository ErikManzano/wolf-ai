import React from 'react';
import { LogoIcon } from './branding/LogoIcon';

/** @deprecated Prefer LogoIcon from ./branding — kept for existing imports. */
export const WOLF_SHIELD_PATH =
  'M12 22C12 22 5 18 3 11C2 8 3 4 3 4L8 7L12 2L16 7L21 4C21 4 22 8 21 11C19 18 12 22 12 22Z';

export const WolfAngryEyes: React.FC = () => null;

type WolfBrandIconProps = {
  size?: number;
  className?: string;
};

/** Bridges legacy Wolf mark call sites to Homilos Builder isotype. */
export const WolfBrandIcon: React.FC<WolfBrandIconProps> = ({ size = 24, className = '' }) => (
  <LogoIcon size={size} className={className} variant="default" />
);
