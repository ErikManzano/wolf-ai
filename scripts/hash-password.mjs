/**
 * Genera un hash bcrypt (10 rounds) para pegar en `src/data/users.json` → campo `passwordHash`.
 * Uso: npm run hash-password -- "TuClaveSegura123!"
 */
import bcrypt from 'bcryptjs';

const plain = process.argv[2];
if (!plain || plain.length < 8) {
  console.error('Uso: npm run hash-password -- "contraseña (mín. 8 caracteres)"');
  process.exit(1);
}
console.log(bcrypt.hashSync(plain, 10));
