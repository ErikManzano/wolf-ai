#!/usr/bin/env node
/**
 * Print a JWT_SECRET suitable for production (48 random bytes, base64).
 * Paste into Railway / Render → Environment variables. Do not commit.
 *
 *   npm run generate-jwt-secret
 */
import { randomBytes } from 'node:crypto';

const secret = randomBytes(48).toString('base64');
console.log(secret);
console.error('\nAdd to Railway (or Render) → Variables:');
console.error('  JWT_SECRET = (value above, 32+ characters)\n');
