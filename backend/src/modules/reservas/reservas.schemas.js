const { z } = require('zod');
const { esquemaPaginacion } = require('../../utils/paginacion');
const { normalizarPlaca } = require('../../utils/placas');

const id = (mensaje) => z.coerce.number({ invalid_type_error: mensaje }).int().positive(mensaje);
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato AAAA-MM-DD.');

const crear = z.object({
  vehiculo_id: id('Elige el vehículo.'),
  celda_id: id('Elige la celda.'),
  requiere_accesible: z
    .boolean({ invalid_type_error: 'Indica si necesita celda accesible.' })
    .default(false),
});

const listar = z.object({
  ...esquemaPaginacion,
  estado: z.enum(['pendiente', 'confirmada', 'cumplida', 'cancelada', 'expirada']).optional(),
  activas: z
    .enum(['0', '1'])
    .optional()
    .transform((v) => v === '1'),
  placa: z.string().transform(normalizarPlaca).optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
});

const params = z.object({ id: id('Identificador inválido.') });

module.exports = { crear, listar, params };
