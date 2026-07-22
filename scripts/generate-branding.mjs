/**
 * Homilos Builder — brand asset generator
 * Builds optimized SVGs + PNG raster set into /branding and syncs public favicons.
 */
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { optimize } from 'svgo';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'branding');
const publicDir = path.join(root, 'public');

const C = {
  primary: '#FF7A00',
  secondary: '#111111',
  white: '#FFFFFF',
  gray: '#6B7280',
};

/** Compact winged-H — 8px grid, min tip 4px */
const H = 'M20 16H28V28H36V16H44V48H36V36H28V48H20V16Z';
const WINGS = [
  'M4 16H16V24L6 24Z',
  'M6 28H16V36L10 36Z',
  'M10 40H16V48L12 48Z',
  'M48 16H60L58 24H48Z',
  'M48 28H58L54 36H48Z',
  'M48 40H54L52 48H48Z',
].join('');

function markGroup(hFill, wingFill) {
  return `<g><path fill="${wingFill}" d="${WINGS}"/><path fill="${hFill}" d="${H}"/></g>`;
}

function svgDoc(body, { w = 64, h = 64, viewBox = '0 0 64 64', attrs = '' } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox}" fill="none" ${attrs}>
${body}
</svg>`;
}

function wordmarkVertical(hFill, wingFill, nameFill, builderFill, { pad = 24 } = {}) {
  // viewBox 320×280 — mark 96 centered, type below
  const markX = (320 - 96) / 2;
  return svgDoc(
    `
  <g transform="translate(${markX} 24) scale(1.5)">${markGroup(hFill, wingFill)}</g>
  <text x="160" y="168" text-anchor="middle" font-family="Manrope" font-weight="800" font-size="36" letter-spacing="0.14em" fill="${nameFill}">HOMILOS</text>
  <line x1="56" y1="196" x2="112" y2="196" stroke="${builderFill}" stroke-width="2"/>
  <text x="160" y="202" text-anchor="middle" font-family="Manrope" font-weight="600" font-size="14" letter-spacing="0.32em" fill="${builderFill}">BUILDER</text>
  <line x1="208" y1="196" x2="264" y2="196" stroke="${builderFill}" stroke-width="2"/>
`,
    { w: 320, h: 240, viewBox: '0 0 320 240' },
  );
}

function wordmarkHorizontal(hFill, wingFill, nameFill, builderFill) {
  return svgDoc(
    `
  <g transform="translate(16 24) scale(1.25)">${markGroup(hFill, wingFill)}</g>
  <text x="112" y="52" font-family="Manrope" font-weight="800" font-size="28" letter-spacing="0.12em" fill="${nameFill}">HOMILOS</text>
  <text x="112" y="78" font-family="Manrope" font-weight="600" font-size="12" letter-spacing="0.3em" fill="${builderFill}">BUILDER</text>
`,
    { w: 360, h: 112, viewBox: '0 0 360 112' },
  );
}

function iconOnly(hFill, wingFill, bg = null, size = 64, radius = 0, insetRatio = 0.18) {
  const bgRect = bg
    ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>`
    : '';
  const inset = bg ? size * insetRatio : 0;
  const inner = size - inset * 2;
  const s = inner / 64;
  const t = inset;
  return svgDoc(
    `${bgRect}<g transform="translate(${t} ${t}) scale(${s})">${markGroup(hFill, wingFill)}</g>`,
    { w: size, h: size, viewBox: `0 0 ${size} ${size}` },
  );
}

function optimizeSvg(raw) {
  const result = optimize(raw, {
    multipass: true,
    plugins: ['preset-default'],
  });
  return result.data;
}

async function writeSvg(name, raw) {
  const optimized = optimizeSvg(raw);
  const file = path.join(outDir, name);
  await writeFile(file, optimized, 'utf8');
  console.log('svg', name);
  return optimized;
}

function rasterize(svg, width) {
  const fontDir = path.join(outDir, 'fonts');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: {
      fontFiles: [
        path.join(fontDir, 'Manrope-ExtraBold.ttf'),
        path.join(fontDir, 'Manrope-SemiBold.ttf'),
      ],
      loadSystemFonts: true,
      defaultFontFamily: 'Manrope',
    },
  });
  return resvg.render().asPng();
}

async function writePng(name, svg, width) {
  const buf = rasterize(svg, width);
  await writeFile(path.join(outDir, name), buf);
  console.log('png', name, width);
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const iconDefault = iconOnly(C.secondary, C.primary);
  const iconMono = iconOnly('currentColor', 'currentColor');
  const iconDark = iconOnly(C.white, C.primary);
  const iconLight = iconOnly(C.secondary, C.primary);
  // Favicon: dark plate + larger mark (less padding) for tab readability
  const favicon = iconOnly(C.white, C.primary, C.secondary, 32, 8, 0.1);
  const appIcon = iconOnly(C.secondary, C.white, C.primary, 512, 96);
  const appIconSvg = iconOnly(C.secondary, C.white, C.primary, 512, 112);

  const vertical = wordmarkVertical(C.secondary, C.primary, C.secondary, C.primary);
  const verticalDark = wordmarkVertical(C.white, C.primary, C.white, C.primary);
  const verticalLight = wordmarkVertical(C.secondary, C.primary, C.secondary, C.primary);
  const horizontal = wordmarkHorizontal(C.secondary, C.primary, C.secondary, C.primary);
  const monoFull = wordmarkVertical('currentColor', 'currentColor', 'currentColor', 'currentColor');

  // OG 1200×630
  const og = svgDoc(
    `
  <rect width="1200" height="630" fill="${C.secondary}"/>
  <g transform="translate(420 120) scale(5.5)">${markGroup(C.white, C.primary)}</g>
  <text x="600" y="470" text-anchor="middle" font-family="Manrope" font-weight="800" font-size="56" letter-spacing="0.16em" fill="${C.white}">HOMILOS</text>
  <line x1="360" y1="510" x2="470" y2="510" stroke="${C.primary}" stroke-width="2"/>
  <text x="600" y="518" text-anchor="middle" font-family="Manrope" font-weight="600" font-size="20" letter-spacing="0.36em" fill="${C.primary}">BUILDER</text>
  <line x1="730" y1="510" x2="840" y2="510" stroke="${C.primary}" stroke-width="2"/>
`,
    { w: 1200, h: 630, viewBox: '0 0 1200 630' },
  );

  const files = {
    'logo.svg': vertical,
    'logo-dark.svg': verticalDark,
    'logo-light.svg': verticalLight,
    'logo-monochrome.svg': monoFull,
    'logo-horizontal.svg': horizontal,
    'logo-vertical.svg': vertical,
    'logo-icon.svg': iconDefault,
    'logo-icon-dark.svg': iconDark,
    'logo-icon-light.svg': iconLight,
    'favicon.svg': favicon,
    'app-icon.svg': appIconSvg,
  };

  const optimizedMap = {};
  for (const [name, raw] of Object.entries(files)) {
    optimizedMap[name] = await writeSvg(name, raw);
  }

  // PNGs
  await writePng('favicon-16.png', optimizedMap['favicon.svg'], 16);
  await writePng('favicon-32.png', optimizedMap['favicon.svg'], 32);
  await writePng('apple-touch-icon.png', iconOnly(C.white, C.primary, C.secondary, 180, 40, 0.12), 180);
  await writePng('android-chrome-192.png', appIcon, 192);
  await writePng('android-chrome-512.png', appIcon, 512);
  await writePng('og-image.png', og, 1200);

  // Sync public favicons
  await copyFile(path.join(outDir, 'favicon.svg'), path.join(publicDir, 'favicon.svg'));
  await copyFile(path.join(outDir, 'favicon-16.png'), path.join(publicDir, 'favicon-16.png'));
  await copyFile(path.join(outDir, 'favicon-32.png'), path.join(publicDir, 'favicon-32.png'));
  await copyFile(path.join(outDir, 'apple-touch-icon.png'), path.join(publicDir, 'apple-touch-icon.png'));
  await copyFile(path.join(outDir, 'android-chrome-192.png'), path.join(publicDir, 'android-chrome-192.png'));
  await copyFile(path.join(outDir, 'android-chrome-512.png'), path.join(publicDir, 'android-chrome-512.png'));
  await copyFile(path.join(outDir, 'og-image.png'), path.join(publicDir, 'og-image.png'));
  await copyFile(path.join(outDir, 'app-icon.svg'), path.join(publicDir, 'app-icon.svg'));

  console.log('Done. Assets in branding/ and public/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
