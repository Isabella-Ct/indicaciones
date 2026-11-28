// Esquemas de membresías (data-model.md: Membresia.id_plan, Membresia.id_vehiculo, Membresia.estado,
// Membresia.motivo_cancelacion). El pago reutiliza las reglas de la spec 009 (pagoAnidado).
const { z } = require('zod');
const { camposPaginacion } = require('../../utils/paginacion');
const { pagoAnidado } = require('../facturas/facturas.validator');

const NO_PERMITIDOS = 'Hay campos que no se pueden enviar.';

const id = (etiqueta) =>
  z.coerce
    .number({ required_error: `Indique ${etiqueta}.`, invalid_type_error: `${etiqueta} debe ser un número.` })
    .int(`${etiqueta} debe ser un número entero.`)
    .positive(`${etiqueta} debe ser mayor que cero.`);

/** HU-46: vehículo, plan y pago en la misma operación (RN-24). */
const suscripcion = z.object({ idVehiculo: id('el vehículo'), idPlan: id('el plan'), pago: pagoAnidado }).strict(NO_PERMITIDOS);

/** HU-47 E1: renovación con su pago. */
const renovacion = z.object({ pago: pagoAnidado }).strict(NO_PERMITIDOS);

/** HU-47 E2: motivo de 10 a 200 caracteres. */
const cancelacion = z
  .object({
    motivo: z
      .string({ required_error: 'Escriba el motivo de la cancelación.' })
      .trim()
      .min(10, 'El motivo debe tener entre 10 y 200 caracteres.')
      .max(200, 'El motivo debe tener entre 10 y 200 caracteres.'),
  })
  .strict(NO_PERMITIDOS);

const listar = z
  .object({
    ...camposPaginacion,
    estado: z.enum(['activa', 'vencida', 'cancelada'], { errorMap: () => ({ message: 'El estado debe ser activa, vencida o cancelada.' }) }).optional(),
  })
  .strict();

const params = z.object({ id: id('El id') });

module.exports = { suscripcion, renovacion, cancelacion, listar, params };
