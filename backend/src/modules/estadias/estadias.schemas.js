const { z } = require('zod');
const { esquemaPaginacion } = require('../../utils/paginacion');
const { normalizarPlaca } = require('../../utils/placas');

// La entrada llega como multipart (foto opcional): los valores son texto.
const booleano = z.preprocess(
  (v) => v === true || v === 'true' || v === '1' || v === 'on',
  z.boolean()
);
const idOpcional = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : v),
  z.coerce.number().int().positive().optional()
);
const placa = z
  .string({ required_error: 'La placa es obligatoria.' })
  .transform(normalizarPlaca)
  .pipe(
    z
      .string()
      .min(5, 'La placa está incompleta.')
      .max(7, 'La placa tiene demasiados caracteres.')
      .regex(
        /^[A-Z]{3}\d{2}[A-Z0-9]$/,
        'Placa inválida: 3 letras y 3 caracteres (ej. ABC123 o ABC12D).'
      )
  );
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato AAAA-MM-DD.');
const puertaId = z.coerce
  .number({ invalid_type_error: 'Selecciona la puerta.' })
  .int()
  .positive('Selecciona la puerta.');

// Nota: no se acepta fecha ni hora de entrada/salida: las pone el servidor.
const entrada = z.object({
  puerta_id: puertaId,
  placa,
  celda_id: idOpcional,
  requiere_accesible: booleano.default(false),
  confirmar_accesible: booleano.default(false),
  observaciones_entrada: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().max(500, 'Las observaciones admiten máximo 500 caracteres.').optional()
  ),
  deja_llaves: booleano.default(false),
});

const previsualizar = z.object({
  placa,
  requiere_accesible: z
    .enum(['0', '1'])
    .default('0')
    .transform((v) => v === '1'),
});

const salida = z
  .object({
    puerta_id: puertaId,
    placa: z.string().transform(normalizarPlaca).optional(),
    codigo_ticket: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^T-\d{6}$/, 'Ticket con formato T-000123.')
      .optional(),
  })
  .refine((d) => d.placa || d.codigo_ticket, {
    message: 'Indica la placa o el código del ticket.',
    path: ['placa'],
  });

const cerrar = z.object({ puerta_id: puertaId });

const historial = z.object({
  ...esquemaPaginacion,
  placa: z.string().transform(normalizarPlaca).optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  puerta_id: z.coerce.number().int().positive().optional(),
  estado: z.enum(['en_curso', 'finalizada']).optional(),
});

const ultimos = z.object({ limite: z.coerce.number().int().min(1).max(50).default(10) });

const denegados = z.object({
  ...esquemaPaginacion,
  placa: z.string().transform(normalizarPlaca).optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
});

const params = z.object({ id: z.coerce.number().int().positive('Identificador inválido.') });

module.exports = { entrada, previsualizar, salida, cerrar, historial, ultimos, denegados, params };
