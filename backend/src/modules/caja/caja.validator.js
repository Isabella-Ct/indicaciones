// Esquemas de caja (data-model.md: CierreCaja.efectivo_contado, CierreCaja.observaciones).
const { z } = require('zod');
const { camposPaginacion } = require('../../utils/paginacion');

const cierre = z
  .object({
    efectivoContado: z
      .number({ required_error: 'Ingrese el efectivo contado.', invalid_type_error: 'El efectivo contado debe ser un número.' })
      .min(0, 'El efectivo contado no puede ser negativo.'),
    observaciones: z.string().trim().max(200, 'Las observaciones admiten máximo 200 caracteres.').optional(),
  })
  .strict('Hay campos que no se pueden enviar.');

const listar = z.object({ page: camposPaginacion.page, limit: camposPaginacion.limit }).strict();

module.exports = { cierre, listar };
