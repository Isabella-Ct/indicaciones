// Esquemas de descuentos (data-model.md: Descuento.nombre, Descuento.tipo, Descuento.valor,
// Descuento.aplica_tipo_cliente, Descuento.aplica_tipo_vehiculo, Descuento.minutos_minimos, Descuento.vigente_desde,
// Descuento.vigente_hasta, Descuento.estado). Fechas de Bogotá; sin hora, desde 00:00:00 y hasta 23:59:59 (R-03).
const { z } = require('zod');
const { camposPaginacion } = require('../../utils/paginacion');

const NO_PERMITIDOS = 'Hay campos que no se pueden enviar.';
const FECHA = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

const tipo = z.enum(['porcentaje', 'valor_fijo'], { errorMap: () => ({ message: 'El tipo debe ser «porcentaje» o «valor_fijo».' }) });
const tipoCliente = z.enum(['todos', 'ocasional', 'registrado'], { errorMap: () => ({ message: 'El tipo de cliente debe ser todos, ocasional o registrado.' }) });
const tipoVehiculo = z.enum(['todos', 'carro', 'moto'], { errorMap: () => ({ message: 'El tipo de vehículo debe ser todos, carro o moto.' }) });
const estado = z.enum(['activo', 'inactivo'], { errorMap: () => ({ message: 'El estado debe ser «activo» o «inactivo».' }) });

/** 'AAAA-MM-DD' o 'AAAA-MM-DDTHH:MM' (Bogotá) → Date; sin hora, al inicio o al final del día. */
const fecha = (etiqueta, { finDelDia = false } = {}) =>
  z
    .string({ required_error: `Ingrese la fecha ${etiqueta}.`, invalid_type_error: `La fecha ${etiqueta} debe ser texto.` })
    .regex(FECHA, `La fecha ${etiqueta} debe tener el formato AAAA-MM-DD o AAAA-MM-DDTHH:MM.`)
    .transform((v, ctx) => {
      const hora = v.length === 10 ? (finDelDia ? 'T23:59:59' : 'T00:00:00') : `${v.slice(10)}:00`;
      const resultado = new Date(`${v.slice(0, 10)}${hora}-05:00`);
      const [a, m, d] = v.slice(0, 10).split('-').map(Number);
      if (Number.isNaN(resultado.getTime()) || new Date(Date.UTC(a, m - 1, d)).getUTCDate() !== d) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `La fecha ${etiqueta} no existe.` });
        return z.NEVER;
      }
      return resultado;
    });

const descuentoEntrada = z
  .object({
    nombre: z
      .string({ required_error: 'Ingrese el nombre.' })
      .trim()
      .min(3, 'El nombre debe tener entre 3 y 60 caracteres.')
      .max(60, 'El nombre debe tener entre 3 y 60 caracteres.'),
    tipo,
    valor: z
      .number({ required_error: 'Ingrese el valor.', invalid_type_error: 'El valor debe ser un número.' })
      .max(9999999999, 'El valor es demasiado alto.')
      .refine((v) => Math.round(v * 100) === v * 100, { message: 'Use máximo 2 decimales.' }),
    aplicaTipoCliente: tipoCliente.default('todos'),
    aplicaTipoVehiculo: tipoVehiculo.default('todos'),
    minutosMinimos: z
      .number({ invalid_type_error: 'Los minutos mínimos deben ser un número.' })
      .int('Los minutos mínimos deben ser un número entero.')
      .min(1, 'Los minutos mínimos van de 1 a 10.080.')
      .max(10080, 'Los minutos mínimos van de 1 a 10.080.')
      .nullish()
      .transform((v) => v ?? null),
    vigenteDesde: fecha('de inicio'),
    vigenteHasta: fecha('de fin', { finDelDia: true }),
  })
  .strict(NO_PERMITIDOS)
  // RF-DES-02: porcentaje de 1 a 100; valor fijo mayor que 0. Vigencia: fin después del inicio.
  .superRefine((d, ctx) => {
    if (d.tipo === 'porcentaje' && (d.valor < 1 || d.valor > 100)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['valor'], message: 'El porcentaje debe estar entre 1 y 100.' });
    }
    if (d.tipo === 'valor_fijo' && !(d.valor > 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['valor'], message: 'El valor fijo debe ser mayor que 0.' });
    }
    if (d.vigenteDesde && d.vigenteHasta && d.vigenteHasta <= d.vigenteDesde) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vigenteHasta'], message: 'La vigencia debe terminar después de su inicio.' });
    }
  });

const cambioEstado = z.object({ estado }).strict(NO_PERMITIDOS);

const listar = z
  .object({
    ...camposPaginacion,
    estado: estado.optional(),
    tipoVehiculo: z.enum(['carro', 'moto'], { errorMap: () => ({ message: 'El tipo de vehículo debe ser carro o moto.' }) }).optional(),
    tipoCliente: z.enum(['ocasional', 'registrado'], { errorMap: () => ({ message: 'El tipo de cliente debe ser ocasional o registrado.' }) }).optional(),
  })
  .strict();

const params = z.object({
  id: z.coerce.number({ invalid_type_error: 'El id debe ser un número.' }).int('El id debe ser un número entero.').positive('El id debe ser mayor que cero.'),
});

module.exports = { descuentoEntrada, cambioEstado, listar, params };
