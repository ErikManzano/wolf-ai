import { colors } from './colors';
import { spacing, GRID } from './spacing';
import { typography } from './typography';
import {
  LOGO_VIEWBOX,
  LOGO_VIEWBOX_NUM,
  markPaths,
  markPathsCompact,
  markWingsPath,
  logoVariants,
  logoSizes,
} from './logo';

/** Homilos Builder brand identity package. */
export const brand = {
  name: 'Homilos Builder',
  nameShort: 'Homilos',
  tagline: 'Built for performance',
  colors,
  spacing,
  GRID,
  typography,
  logo: {
    viewBox: LOGO_VIEWBOX,
    viewBoxSize: LOGO_VIEWBOX_NUM,
    paths: markPathsCompact,
    pathsDetailed: markPaths,
    wingsPath: markWingsPath,
    variants: logoVariants,
    sizes: logoSizes,
  },
} as const;

export {
  colors,
  spacing,
  GRID,
  typography,
  LOGO_VIEWBOX,
  LOGO_VIEWBOX_NUM,
  markPaths,
  markPathsCompact,
  markWingsPath,
  logoVariants,
  logoSizes,
};

export type { BrandColor } from './colors';
export type { LogoVariant, LogoSize } from './logo';

export default brand;
