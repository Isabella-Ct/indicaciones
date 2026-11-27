// Esquemas de pagos y facturas (data-model.md: Pago.metodo, Pago.valor_recibido, Pago.referencia,
// Factura.tercero_documento, Factura.tercero_nombre, Factura.estado, Factura.motivo_anulacion).
const { z } = require('zod');
const { camposPaginacion } = require('../../utils/paginacion');

const NO_PERMITIDOS = 'Hay campos que no se pueden enviar.';
const METODOS = ['efectivo', 'tarjeta', 'transferencia', 'qr'];

const id = (etiqueta) =>
  z.coerce
    .number({ required_error: `Indique ${etiqueta}.`, invalid_type_error: `${etiqueta} debe ser un número.` })
    .int(`${etiqueta} debe ser un número entero.`)
    .positive(`${etiqueta} debe ser mayor que cero.`);

const metodo = z.enum(METODOS, { errorMap: () => ({ message: 'El método de pago debe ser efectivo, tarjeta, transferencia o qr.' }) });

const tercero = z
  .object({
    documento: z.string({ required_error: 'Ingrese el NIT o documento del tercero.' }).trim().min(5, 'El documento debe tener entre 5 y 20 caracteres.').max(20, 'El documento debe tener entre 5 y 20 caracteres.'),
    nombre: z.string({ required_error: 'Ingrese la razón social o el nombre.' }).trim().min(3, 'La razón social debe tener entre 3 y 100 caracteres.').max(100, 'La razón social debe tener entre 3 y 100 caracteres.'),
  })
  .strict(NO_PERMITIDOS);

const pago = z
  .object({
    idMovimiento: id('el movimiento'),
    metodo,
    valorRecibido: z.number({ invalid_type_error: 'El valor recibido debe ser un número.' }).min(0, 'El valor recibido no puede ser negativo.').optional(),
    referencia: z.string({ invalid_type_error: 'La referencia debe ser texto.' }).trim().optional(),
    tercero: tercero.optional(),
  })
  .strict(NO_PERMITIDOS)
  .superRefine((d, ctx) => {
    // RF-FAC-07: referencia o autorización para tarjeta, transferencia y QR.
    if (d.metodo !== 'efectivo' && (!d.referencia || d.referencia.length < 4 || d.referencia.length > 40)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['referencia'], message: 'Ingrese el número de referencia o autorización (4 a 40 caracteres).' });
    }
    if (d.metodo === 'efectivo' && d.valorRecibido === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['valorRecibido'], message: 'Ingrese el valor recibido en efectivo.' });
    }
  });

const emision = z.object({ idFactura: id('la factura'), tercero: tercero.optional() }).strict(NO_PERMITIDOS);

const anulacion = z
  .object({
    motivo: z
      .string({ required_error: 'Escriba el motivo de la anulación.' })
      .trim()
      .min(10, 'El motivo debe tener entre 10 y 200 caracteres.')
      .max(200, 'El motivo debe tener entre 10 y 200 caracteres.'),
  })
  .strict(NO_PERMITIDOS);

const fecha = (etiqueta) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `La fecha ${etiqueta} debe tener el formato AAAA-MM-DD.`);

const listar = z
  .object({
    ...camposPaginacion,
    desde: fecha('desde').optional(),
    hasta: fecha('hasta').optional(),
    metodo: metodo.optional(),
    estado: z.enum(['emitida', 'anulada'], { errorMap: () => ({ message: 'El estado debe ser emitida o anulada.' }) }).optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.desde && d.hasta && d.hasta < d.desde) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hasta'], message: 'La fecha hasta debe ser igual o posterior a desde.' });
  });

const params = z.object({ id: id('El id') });

module.exports = { pago, emision, anulacion, listar, params };
