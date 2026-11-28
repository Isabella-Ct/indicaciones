// Esquemas de entradas y salidas (data-model.md: Movimiento.id_puerta_entrada, Movimiento.id_celda,
// Movimiento.id_puerta_salida, Movimiento.motivo_anulacion, Ticket.extraviado). La placa se normaliza
// como en la spec 005; su formato se valida en el servicio, cuando ya se conoce el tipo.
const { z } = require('zod');
const { camposPaginacion } = require('../../utils/paginacion');
const { normalizarPlaca } = require('../vehiculos/vehiculos.reglas');

const NO_PERMITIDOS = 'Hay campos que no se pueden enviar.';

const id = (etiqueta) =>
  z.coerce
    .number({ required_error: `Indique ${etiqueta}.`, invalid_type_error: `${etiqueta} debe ser un número.` })
    .int(`${etiqueta} debe ser un número entero.`)
    .positive(`${etiqueta} debe ser mayor que cero.`);

const placa = z.preprocess(
  (v) => (typeof v === 'string' ? normalizarPlaca(v) : v),
  z.string({ required_error: 'Ingrese la placa.', invalid_type_error: 'La placa debe ser texto.' }).min(1, 'Ingrese la placa.').max(7, 'La placa tiene máximo 7 caracteres.')
);

const tipo = z.enum(['carro', 'moto'], { errorMap: () => ({ message: 'El tipo de vehículo debe ser «carro» o «moto».' }) });

const entrada = z
  .object({
    placa,
    idPuerta: id('la puerta'),
    tipo: tipo.optional(),
    idCelda: id('la celda').optional(),
    // Solo para una placa nueva (vehículo ocasional, RF-MOV-05).
    color: z.string().trim().min(2, 'El color debe tener entre 2 y 30 caracteres.').max(30, 'El color debe tener entre 2 y 30 caracteres.').optional(),
    marca: z.string().trim().min(2, 'La marca debe tener entre 2 y 40 caracteres.').max(40, 'La marca debe tener entre 2 y 40 caracteres.').optional(),
    modelo: z.coerce.number({ invalid_type_error: 'El modelo debe ser un año.' }).int('El modelo debe ser un año.').min(1950, 'El modelo debe ser desde 1950.').optional(),
  })
  .strict(NO_PERMITIDOS);

const salida = z
  .object({
    idPuerta: id('la puerta'),
    ticketExtraviado: z.boolean({ invalid_type_error: 'ticketExtraviado debe ser verdadero o falso.' }).default(false),
  })
  .strict(NO_PERMITIDOS);

const anulacion = z
  .object({
    motivo: z
      .string({ required_error: 'Escriba el motivo de la anulación.', invalid_type_error: 'El motivo debe ser texto.' })
      .trim()
      .min(10, 'El motivo debe tener entre 10 y 200 caracteres.')
      .max(200, 'El motivo debe tener entre 10 y 200 caracteres.'),
  })
  .strict(NO_PERMITIDOS);

const listar = z
  .object({
    ...camposPaginacion,
    estado: z
      .enum(['abierto', 'cerrado', 'anulado'], { errorMap: () => ({ message: 'El estado debe ser abierto, cerrado o anulado.' }) })
      .default('abierto'),
    placa: z
      .string()
      .transform((v) => normalizarPlaca(v))
      .optional(),
  })
  .strict();

const params = z.object({ id: id('El id') });

module.exports = { entrada, salida, anulacion, listar, params };
