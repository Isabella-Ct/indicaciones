const { z } = require('zod');
const { esquemaPaginacion } = require('../../utils/paginacion');
const { normalizarPlaca } = require('../../utils/placas');

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato AAAA-MM-DD.');
const id = z.coerce.number().int().positive('Identificador inválido.');

const crear = z.object({
  tipo_incidencia_id: z.coerce
    .number({ invalid_type_error: 'Elige el tipo de incidencia.' })
    .int()
    .positive('Elige el tipo de incidencia.'),
  placa: z
    .string({ required_error: 'Escribe la placa del vehículo afectado.' })
    .transform(normalizarPlaca)
    .pipe(z.string().min(5, 'Escribe la placa del vehículo afectado.').max(7, 'Placa inválida.')),
  celda_id: z.preprocess((v) => (v === '' || v === undefined ? null : v), id.nullable()),
  descripcion: z
    .string({ required_error: 'Describe lo ocurrido.' })
    .trim()
    .min(10, 'Describe lo ocurrido (mínimo 10 caracteres).')
    .max(2000, 'Máximo 2000 caracteres.'),
});

const listar = z.object({
  ...esquemaPaginacion,
  tipo_id: z.coerce.number().int().positive().optional(),
  placa: z.string().transform(normalizarPlaca).optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
});

const tipo = z.object({
  nombre: z
    .string({ required_error: 'Escribe el nombre.' })
    .trim()
    .min(3, 'Mínimo 3 caracteres.')
    .max(60, 'Máximo 60 caracteres.'),
  descripcion: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(255, 'Máximo 255 caracteres.').nullable().optional()
  ),
});

const listarTipos = z.object({ activos: z.enum(['0', '1']).optional() });
const activo = z.object({ activo: z.boolean({ required_error: 'Indica si queda activo.' }) });
const params = z.object({ id });

module.exports = { crear, listar, tipo, listarTipos, activo, params };
