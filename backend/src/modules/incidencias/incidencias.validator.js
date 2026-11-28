// Esquemas de incidencias (data-model.md: Incidencia.tipo, Incidencia.fecha_hora_evento, Incidencia.descripcion,
// Incidencia.id_celda, Incidencia.solucion, SeguimientoIncidencia.nota). El registro llega en JSON o en
// multipart/form-data (campos de texto), por eso los números se convierten. La hora es de Bogotá.
const { z } = require('zod');
const { camposPaginacion } = require('../../utils/paginacion');
const { normalizarPlaca } = require('../vehiculos/vehiculos.reglas');

const NO_PERMITIDOS = 'Hay campos que no se pueden enviar.';
const HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

const tipo = z.enum(['rayon', 'choque', 'atropellamiento', 'golpe_muro'], {
  errorMap: (issue, ctx) => ({ message: issue.code === 'invalid_type' && ctx.data === undefined ? 'Seleccione el tipo de incidencia.' : 'El tipo debe ser rayón, choque, atropellamiento o golpe contra muro.' }),
});
const estado = z.enum(['abierta', 'en_seguimiento', 'cerrada'], { errorMap: () => ({ message: 'El estado debe ser abierta, en_seguimiento o cerrada.' }) });

const texto = (etiqueta, min, max, requerido) =>
  z
    .string({ required_error: requerido, invalid_type_error: `${etiqueta} debe ser texto.` })
    .trim()
    .min(min, `${etiqueta} debe tener entre ${min} y ${max} caracteres.`)
    .max(max, `${etiqueta} debe tener entre ${min} y ${max} caracteres.`);

/** 'AAAA-MM-DDTHH:MM' (Bogotá) → Date. */
const fechaHora = z
  .string({ required_error: 'Indique la fecha y hora del evento.', invalid_type_error: 'La fecha y hora del evento debe ser texto.' })
  .regex(HORA, 'La fecha y hora del evento debe tener el formato AAAA-MM-DDTHH:MM.')
  .transform((v, ctx) => {
    const fecha = new Date(`${v}:00-05:00`);
    const [a, m, d] = v.slice(0, 10).split('-').map(Number);
    if (Number.isNaN(fecha.getTime()) || new Date(Date.UTC(a, m - 1, d)).getUTCDate() !== d) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La fecha del evento no existe.' });
      return z.NEVER;
    }
    return fecha;
  });

/** HU-56: tipo, placa (registrada u ocasional), celda opcional, fecha y hora del evento y descripción. */
const registro = z
  .object({
    tipo,
    placa: z
      .string({ required_error: 'Ingrese la placa del vehículo afectado.', invalid_type_error: 'La placa debe ser texto.' })
      .transform(normalizarPlaca)
      .pipe(z.string().min(5, 'Ingrese la placa del vehículo afectado.').max(8, 'La placa no es válida.')),
    tipoVehiculo: z.enum(['carro', 'moto'], { errorMap: () => ({ message: 'El tipo de vehículo debe ser «carro» o «moto».' }) }).optional(),
    idCelda: z.coerce.number({ invalid_type_error: 'La celda debe ser un número.' }).int().positive('La celda debe ser mayor que cero.').optional(),
    fechaHoraEvento: fechaHora,
    descripcion: texto('La descripción', 10, 500, 'Describa lo ocurrido.'),
  })
  .strict(NO_PERMITIDOS);

const seguimiento = z.object({ nota: texto('La nota', 5, 500, 'Escriba la nota de seguimiento.') }).strict(NO_PERMITIDOS);

const cierre = z.object({ solucion: texto('La solución', 10, 500, 'Escriba la solución para cerrar la incidencia.') }).strict(NO_PERMITIDOS);

const fecha = (etiqueta) => z.string().regex(DIA, `La fecha ${etiqueta} debe tener el formato AAAA-MM-DD.`);

const listar = z
  .object({ ...camposPaginacion, tipo: tipo.optional(), estado: estado.optional(), desde: fecha('desde').optional(), hasta: fecha('hasta').optional() })
  .strict()
  .superRefine((d, ctx) => {
    if (d.desde && d.hasta && d.hasta < d.desde) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hasta'], message: 'La fecha hasta debe ser igual o posterior a desde.' });
  });

const params = z.object({
  id: z.coerce.number({ invalid_type_error: 'El id debe ser un número.' }).int('El id debe ser un número entero.').positive('El id debe ser mayor que cero.'),
});

module.exports = { registro, seguimiento, cierre, listar, params };
