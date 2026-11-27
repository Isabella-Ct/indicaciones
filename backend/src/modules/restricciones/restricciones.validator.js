// Esquemas de pico y placa (data-model.md: RestriccionPlaca.dia_semana, RestriccionPlaca.tipo_vehiculo,
// RestriccionPlaca.digitos, RestriccionPlaca.posicion_digito, RestriccionPlaca.hora_inicio,
// RestriccionPlaca.hora_fin, RestriccionPlaca.vigente_desde, RestriccionPlaca.vigente_hasta, RestriccionPlaca.estado).
const { z } = require('zod');
const { camposPaginacion } = require('../../utils/paginacion');

const NO_PERMITIDOS = 'Hay campos que no se pueden enviar.';
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const entero = (etiqueta) =>
  z.coerce
    .number({ required_error: `Ingrese ${etiqueta}.`, invalid_type_error: `${etiqueta} debe ser un número.` })
    .int(`${etiqueta} debe ser un número entero.`);

const diaSemana = entero('el día de la semana').min(1, 'El día va de 1 (lunes) a 7 (domingo).').max(7, 'El día va de 1 (lunes) a 7 (domingo).');
const tipoVehiculo = z.enum(['carro', 'moto'], { errorMap: () => ({ message: 'El tipo de vehículo debe ser «carro» o «moto».' }) });
const estado = z.enum(['activo', 'inactivo'], { errorMap: () => ({ message: 'El estado debe ser «activo» o «inactivo».' }) });

const hora = (etiqueta) => z.string({ required_error: `Ingrese la hora ${etiqueta}.` }).regex(HORA, `La hora ${etiqueta} debe tener el formato HH:MM (24 h).`);

const fecha = (etiqueta) =>
  z
    .string({ invalid_type_error: `La fecha ${etiqueta} debe ser texto AAAA-MM-DD.` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `La fecha ${etiqueta} debe tener el formato AAAA-MM-DD.`)
    .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), {
      message: `La fecha ${etiqueta} no existe.`,
    });

const campos = {
  diaSemana,
  tipoVehiculo,
  digitos: z
    .array(z.number({ invalid_type_error: 'Cada dígito debe ser un número.' }).int('Cada dígito debe ser entero.').min(0, 'Los dígitos van de 0 a 9.').max(9, 'Los dígitos van de 0 a 9.'), {
      required_error: 'Elija al menos un dígito.',
      invalid_type_error: 'Los dígitos deben ser una lista.',
    })
    .min(1, 'Elija al menos un dígito.')
    .max(5, 'Elija máximo 5 dígitos.')
    .refine((d) => new Set(d).size === d.length, { message: 'Los dígitos no se pueden repetir.' }),
  posicionDigito: z.enum(['ultimo', 'primero'], { errorMap: () => ({ message: 'La posición debe ser «ultimo» o «primero».' }) }).optional(),
  horaInicio: hora('de inicio'),
  horaFin: hora('de fin'),
  vigenteDesde: fecha('de inicio de la vigencia').optional(),
  vigenteHasta: fecha('de fin de la vigencia').nullable().optional(),
};

/** RF-PYP-02: hora fin > inicio y vigencia hasta ≥ desde; posición por defecto según el tipo. */
function reglas(datos, ctx) {
  if (datos.horaInicio && datos.horaFin && datos.horaFin <= datos.horaInicio) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['horaFin'], message: 'La hora de fin debe ser posterior a la de inicio.' });
  }
  if (datos.vigenteDesde && datos.vigenteHasta && datos.vigenteHasta < datos.vigenteDesde) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vigenteHasta'], message: 'La vigencia debe terminar en la fecha de inicio o después.' });
  }
}
const conPosicion = (d) => ({ ...d, posicionDigito: d.posicionDigito ?? (d.tipoVehiculo === 'moto' ? 'primero' : 'ultimo') });

const restriccionEntrada = z.object(campos).strict(NO_PERMITIDOS).superRefine(reglas).transform(conPosicion);
const restriccionEdicion = z.object({ ...campos, estado: estado.optional() }).strict(NO_PERMITIDOS).superRefine(reglas).transform(conPosicion);

const listar = z
  .object({ ...camposPaginacion, tipo: tipoVehiculo.optional(), dia: diaSemana.optional(), estado: estado.optional() })
  .strict();

const params = z.object({ id: entero('El id').positive('El id debe ser mayor que cero.') });

module.exports = { restriccionEntrada, restriccionEdicion, listar, params };
