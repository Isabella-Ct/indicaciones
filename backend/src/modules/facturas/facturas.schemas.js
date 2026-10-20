const { z } = require('zod');
const { esquemaPaginacion } = require('../../utils/paginacion');
const { normalizarPlaca } = require('../../utils/placas');

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato AAAA-MM-DD.');

const listar = z.object({
  ...esquemaPaginacion,
  desde: fecha.optional(),
  hasta: fecha.optional(),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia']).optional(),
  concepto: z.enum(['estadia', 'membresia']).optional(),
  placa: z.string().transform(normalizarPlaca).optional(),
});

const params = z.object({ id: z.coerce.number().int().positive('Identificador inválido.') });

module.exports = { listar, params };
