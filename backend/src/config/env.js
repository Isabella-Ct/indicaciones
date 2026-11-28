// Carga y valida las variables de entorno una sola vez; el proceso falla si falta algo
// (constitución §III). Con NODE_ENV=test se lee backend/.env.test.
const path = require('node:path');
const dotenv = require('dotenv');
const { z } = require('zod');

const archivo = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.join(__dirname, '..', '..', archivo), quiet: true });

const esquema = z
  .object({
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
      .default('parqueaderodb'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
    JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'Use un formato como 8h o 30m').default('8h'),
    BCRYPT_COSTO: z.coerce.number().int().min(10).max(14).default(10),
    CORS_ORIGIN: z
      .string()
      .default('')
      .transform((v) => v.trim()),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    LOGIN_LIMITE_IP: z.coerce.number().int().positive().default(20),
    // Correo (spec 002 research R-01): smtp | archivo (.eml en backend/correos) | memoria (pruebas)
    CORREO_TRANSPORTE: z.enum(['smtp', 'archivo', 'memoria']).default('archivo'),
    CORREO_REMITENTE: z.string().min(3).default('Parking Lot ABC <no-responder@parqueaderoabc.co>'),
    SMTP_HOST: z.string().default(''),
    SMTP_PUERTO: z.coerce.number().int().positive().default(587),
    SMTP_SEGURO: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    SMTP_USUARIO: z.string().default(''),
    SMTP_CLAVE: z.string().default(''),
    // Base de los enlaces que viajan por correo (recuperación de contraseña, spec 003)
    URL_PUBLICA: z.string().url('URL_PUBLICA debe ser una URL (p. ej. http://localhost:3000)').optional(),
    // Reservas (spec 012, TBD-07): anticipación máxima en días y minutos de espera antes de vencer.
    RESERVA_ANTICIPACION_DIAS: z.coerce.number().int().min(1).max(60).default(7),
    RESERVA_MINUTOS_ESPERA: z.coerce.number().int().min(5).max(240).default(30),
  })
  .refine((e) => e.NODE_ENV !== 'test' || e.DB_NAME.endsWith('_test'), {
    message: 'Con NODE_ENV=test, DB_NAME debe terminar en _test (protege la base de desarrollo)',
    path: ['DB_NAME'],
  })
  .refine((e) => e.CORREO_TRANSPORTE !== 'smtp' || e.SMTP_HOST, {
    message: 'Con CORREO_TRANSPORTE=smtp, SMTP_HOST es obligatorio',
    path: ['SMTP_HOST'],
  });

const resultado = esquema.safeParse(process.env);
if (!resultado.success) {
  const detalle = resultado.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Variables de entorno inválidas (revisa backend/${archivo}):\n${detalle}`);
}

const env = Object.freeze({
  ...resultado.data,
  URL_PUBLICA: (resultado.data.URL_PUBLICA ?? `http://localhost:${resultado.data.PORT}`).replace(/\/$/, ''),
});
process.env.TZ = env.TZ;

module.exports = env;
