// Carga y valida las variables de entorno una sola vez (fallar rápido si falta algo).
const path = require('node:path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  TZ: z.string().default('America/Bogota'),
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z
    .string()
    .regex(/^[A-Za-z0-9_]+$/, 'DB_NAME solo admite letras, números y guion bajo')
    .default('parking_lot_abc'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  // Proxies inversos de confianza delante de Express (0 = ninguno). Detrás de un proxy HTTPS
  // (Nginx, IIS, Caddy) vale 1: así el rate limit usa la IP real del cliente.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

const resultado = esquema.safeParse(process.env);
if (!resultado.success) {
  const detalle = resultado.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Variables de entorno inválidas (revisa backend/.env):\n${detalle}`);
}

const env = Object.freeze(resultado.data);
process.env.TZ = env.TZ;

module.exports = env;
