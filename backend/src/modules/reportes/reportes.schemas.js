const { z } = require('zod');
const { esquemaPaginacion } = require('../../utils/paginacion');
const { normalizarPlaca } = require('../../utils/placas');
const { enBogota, sumarDias, diasEntre } = require('../../utils/fechas');

const MAX_DIAS = 366;
const DIAS_POR_DEFECTO = 30;

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato AAAA-MM-DD.')
  .refine((f) => sumarDias(f, 0) === f, 'La fecha no existe.');
const formato = z.enum(['json', 'csv']).default('json');
const tipoVehiculo = z.enum(['carro', 'moto']).optional();
const limite = (porDefecto) => z.coerce.number().int().min(1).max(50).default(porDefecto);

/**
 * Rango desde/hasta (inclusive). Sin fechas: los últimos 30 días hasta hoy.
 * Máximo 366 días; desde ≤ hasta.
 */
function conRango(campos = {}) {
  return z
    .object({ desde: fecha.optional(), hasta: fecha.optional(), formato, ...campos })
    .transform((q) => {
      const hasta = q.hasta ?? enBogota().fecha;
      const desde = q.desde ?? sumarDias(hasta, -(DIAS_POR_DEFECTO - 1));
      return { ...q, desde, hasta };
    })
    .superRefine((q, ctx) => {
      if (q.desde > q.hasta) {
        ctx.addIssue({
          code: 'custom',
          path: ['desde'],
          message: '"Desde" debe ser anterior a "hasta".',
        });
      } else if (diasEntre(q.desde, q.hasta) + 1 > MAX_DIAS) {
        ctx.addIssue({
          code: 'custom',
          path: ['hasta'],
          message: `El rango admite máximo ${MAX_DIAS} días.`,
        });
      }
    });
}

const unDia = z
  .object({ fecha: fecha.optional(), formato })
  .transform((q) => ({ ...q, fecha: q.fecha ?? enBogota().fecha }));

module.exports = {
  MAX_DIAS,
  usuarios: z.object({
    ...esquemaPaginacion,
    formato,
    rol: z.enum(['administrador', 'operador', 'usuario']).optional(),
    estado: z.enum(['activo', 'inactivo']).optional(),
  }),
  vehiculos: z.object({
    ...esquemaPaginacion,
    formato,
    tipo: tipoVehiculo,
    propietario: z.enum(['con', 'sin']).optional(),
  }),
  entradas: conRango({
    ...esquemaPaginacion,
    tipo: tipoVehiculo,
    puerta_id: z.coerce.number().int().positive().optional(),
    placa: z.string().transform(normalizarPlaca).optional(),
  }),
  salidas: conRango({
    ...esquemaPaginacion,
    tipo: tipoVehiculo,
    puerta_id: z.coerce.number().int().positive().optional(),
    placa: z.string().transform(normalizarPlaca).optional(),
  }),
  incidencias: conRango({
    ...esquemaPaginacion,
    tipo: z.coerce.number().int().positive().optional(),
  }),
  picoPlaca: unDia,
  celdasOcupadas: unDia,
  celdasMasUsadas: conRango({ limite: limite(10), tipo: tipoVehiculo }),
  vehiculosFrecuentes: conRango({ limite: limite(10), tipo: tipoVehiculo }),
  ocupacion: conRango(),
  financiero: conRango({ agrupar: z.enum(['dia', 'semana', 'mes']).default('dia') }),
};
