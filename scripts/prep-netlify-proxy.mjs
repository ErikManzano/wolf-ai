/**
 * Añade public/_redirects con proxy /api/* → Railway (junto al [[redirects]] SPA del netlify.toml).
 * Netlify: NETLIFY_API_PROXY_TARGET=https://tu-api.up.railway.app y VITE_API_URL=/api
 */
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const out = join(publicDir, '_redirects');
const target = process.env.NETLIFY_API_PROXY_TARGET?.trim().replace(/\/+$/, '');

if (target) {
  mkdirSync(publicDir, { recursive: true });
  const body = `# generado por prep-netlify-proxy\n/api/*\t${target}/:splat\t200\n`;
  writeFileSync(out, body, 'utf8');
  console.log('[prep-netlify-proxy] wrote public/_redirects →', target);
} else if (existsSync(out)) {
  try {
    const prev = readFileSync(out, 'utf8');
    if (prev.includes('prep-netlify-proxy')) {
      unlinkSync(out);
      console.log('[prep-netlify-proxy] removed generated public/_redirects');
    }
  } catch {
    /* ignore */
  }
}
