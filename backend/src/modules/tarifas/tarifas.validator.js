// Esquemas de tarifas (data-model.md: Tarifa.nombre, Tarifa.tipo_vehiculo, Tarifa.tipo_cliente,
// Tarifa.valor_primera_hora, Tarifa.minutos_fraccion, Tarifa.valor_fraccion, Tarifa.tope_diario,
// Tarifa.minutos_gracia, Tarifa.vigente_desde, Tarifa.vigente_hasta, Tarifa.estado). Las fechas son de Bogotá.
const { z } = require('zod');
const { camposPaginacion } = require('../../utils/paginacion');

const NO_PERMITIDOS = 'Hay campos que no se pueden enviar.';
const FECHA = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

const tipoVehiculo = z.enum(['carro', 'moto'], { errorMap: () => ({ message: 'El tipo de vehículo debe ser «carro» o «moto».' }) });
const tipoCliente = z.enum(['ocasional', 'registrado'], { errorMap: () => ({ message: 'El tipo de cliente debe ser «ocasional» o «registrado».' }) });
const estado = z.enum(['activo', 'inactivo'], { errorMap: () => ({ message: 'El estado debe ser «activo» o «inactivo».' }) });

/** Pesos ≥ 0 con hasta 2 decimales. */
const pesos = (etiqueta) =>
  z
    .number({ required_error: `Ingrese ${etiqueta}.`, invalid_type_error: `${etiqueta[0].toUpperCase()}${etiqueta.slice(1)} debe ser un número.` })
    .min(0, `${etiqueta[0].toUpperCase()}${etiqueta.slice(1)} no puede ser negativo.`)
    .max(9999999999, `${etiqueta[0].toUpperCase()}${etiqueta.slice(1)} es demasiado alto.`)
    .refine((v) => Math.round(v * 100) === v * 100, { message: 'Use máximo 2 decimales.' });

const entero = (etiqueta, min, max) =>
  z
    .number({ required_error: `Ingrese ${etiqueta}.`, invalid_type_error: `${etiqueta} debe ser un número.` })
    .int(`${etiqueta} debe ser un número entero.`)
    .min(min, `${etiqueta} va de ${min} a ${max}.`)
    .max(max, `${etiqueta} va de ${min} a ${max}.`);

/** 'AAAA-MM-DD' (00:00) o 'AAAA-MM-DDTHH:MM' en hora de Bogotá → Date. */
const fecha = (etiqueta) =>
  z
    .string({ required_error: `Ingrese la fecha ${etiqueta}.`, invalid_type_error: `La fecha ${etiqueta} debe ser texto.` })
    .regex(FECHA, `La fecha ${etiqueta} debe tener el formato AAAA-MM-DD o AAAA-MM-DDTHH:MM.`)
    .transform((v, ctx) => {
      const iso = v.length === 10 ? `${v}T00:00:00-05:00` : `${v}:00-05:00`;
      const resultado = new Date(iso);
      const [a, m, d] = v.slice(0, 10).split('-').map(Number);
      const valida = !Number.isNaN(resultado.getTime()) && new Date(Date.UTC(a, m - 1, d)).getUTCDate() === d;
      if (!valida) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `La fecha ${etiqueta} no existe.` });
        return z.NEVER;
      }
      return resultado;
    });

const campos = {
  nombre: z.string({ required_error: 'Ingrese el nombre.' }).trim().min(3, 'El nombre debe tener entre 3 y 60 caracteres.').max(60, 'El nombre debe tener entre 3 y 60 caracteres.'),
  tipoVehiculo,
  tipoCliente,
  valorPrimeraHora: pesos('el valor de la primera hora').refine((v) => v > 0, { message: 'El valor de la primera hora debe ser mayor que 0.' }),
  minutosFraccion: entero('Los minutos de la fracción', 1, 60),
  valorFraccion: pesos('el valor de la fracción'),
  topeDiario: pesos('el tope diario').nullable().optional(),
  minutosGracia: entero('Los minutos de gracia', 0, 30).default(0),
  vigenteDesde: fecha('de inicio'),
  vigenteHasta: fecha('de fin').nullable().optional(),
};

/** RF-TAR-02: tope ≥ primera hora y vigencia hasta > desde. */
function coherencia(d, ctx) {
  if (d.topeDiario !== null && d.topeDiario !== undefined && d.valorPrimeraHora && d.topeDiario < d.valorPrimeraHora) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['topeDiario'], message: 'El tope diario debe ser mayor o igual que el valor de la primera hora.' });
  }
  if (d.vigenteHasta && d.vigenteDesde && d.vigenteHasta <= d.vigenteDesde) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vigenteHasta'], message: 'La vigencia debe terminar después de su inicio.' });
  }
}

const tarifaEntrada = z
  .object({ ...campos, cerrarAnterior: z.boolean({ invalid_type_error: 'cerrarAnterior debe ser verdadero o falso.' }).default(false) })
  .strict(NO_PERMITIDOS)
  .superRefine(coherencia);

const tarifaEdicion = z.object(campos).strict(NO_PERMITIDOS).superRefine(coherencia);

const cambioEstado = z
  .object({ estado, confirmar: z.boolean({ invalid_type_error: 'confirmar debe ser verdadero o falso.' }).default(false) })
  .strict(NO_PERMITIDOS);

const listar = z
  .object({
    ...camposPaginacion,
    vigentes: z.enum(['true', 'false'], { errorMap: () => ({ message: 'vigentes debe ser true o false.' }) }).optional(),
    tipoVehiculo: tipoVehiculo.optional(),
    tipoCliente: tipoCliente.optional(),
    estado: estado.optional(),
  })
  .strict();

const params = z.object({ id: z.coerce.number({ invalid_type_error: 'El id debe ser un número.' }).int().positive('El id debe ser mayor que cero.') });

module.exports = { tarifaEntrada, tarifaEdicion, cambioEstado, listar, params };
