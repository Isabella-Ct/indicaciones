// Esquemas de reservas (data-model.md: Reserva.id_vehiculo, Reserva.id_celda, Reserva.fecha_hora_inicio,
// Reserva.estado). La hora es de Bogotá 'AAAA-MM-DDTHH:MM'; si es futura y está dentro de la anticipación lo
// revisa el servicio con el reloj del servidor.
const { z } = require('zod');
const { camposPaginacion } = require('../../utils/paginacion');

const NO_PERMITIDOS = 'Hay campos que no se pueden enviar.';
const HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

const id = (etiqueta) =>
  z.coerce
    .number({ required_error: `Indique ${etiqueta}.`, invalid_type_error: `${etiqueta} debe ser un número.` })
    .int(`${etiqueta} debe ser un número entero.`)
    .positive(`${etiqueta} debe ser mayor que cero.`);

/** 'AAAA-MM-DDTHH:MM' (Bogotá) → Date. */
const horaBogota = (etiqueta) =>
  z
    .string({ required_error: `Indique ${etiqueta}.`, invalid_type_error: `${etiqueta} debe ser texto.` })
    .regex(HORA, `${etiqueta} debe tener el formato AAAA-MM-DDTHH:MM.`)
    .transform((v, ctx) => {
      const fecha = new Date(`${v}:00-05:00`);
      const [a, m, d] = v.slice(0, 10).split('-').map(Number);
      if (Number.isNaN(fecha.getTime()) || new Date(Date.UTC(a, m - 1, d)).getUTCDate() !== d) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${etiqueta} no existe.` });
        return z.NEVER;
      }
      return fecha;
    });

const tipo = z.enum(['carro', 'moto'], { errorMap: () => ({ message: 'El tipo debe ser «carro» o «moto».' }) });
const estado = z.enum(['confirmada', 'cumplida', 'cancelada', 'vencida'], {
  errorMap: () => ({ message: 'El estado debe ser confirmada, cumplida, cancelada o vencida.' }),
});

/** HU-52: vehículo, hora de inicio y, opcionales, la celda o el parqueadero. */
const reserva = z
  .object({
    idVehiculo: id('el vehículo'),
    fechaHoraInicio: horaBogota('La hora de inicio'),
    idCelda: id('la celda').optional(),
    idParqueadero: id('el parqueadero').optional(),
  })
  .strict(NO_PERMITIDOS);

const disponibles = z.object({ fecha: horaBogota('La fecha'), tipo, idParqueadero: id('el parqueadero').optional() }).strict();

const listar = z
  .object({ ...camposPaginacion, fecha: z.string().regex(DIA, 'La fecha debe tener el formato AAAA-MM-DD.').optional(), estado: estado.optional() })
  .strict();

const mias = z.object({ ...camposPaginacion, estado: estado.optional() }).strict();

const params = z.object({ id: id('El id') });

module.exports = { reserva, disponibles, listar, mias, params };
