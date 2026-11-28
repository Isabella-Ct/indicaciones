// Esquemas de celdas (data-model.md: Celda.codigo, Celda.tipo_vehiculo, Celda.piso, Celda.area,
// Celda.estado, Celda.motivo_inhabilitacion). El código se valida después de normalizarlo (RF-CLD-10).
const { z } = require('zod');
const { camposPaginacion } = require('../../utils/paginacion');
const { normalizarCodigo, CODIGO_VALIDO } = require('./celdas.reglas');

const entero = (etiqueta) =>
  z.coerce
    .number({ required_error: `Ingrese ${etiqueta}.`, invalid_type_error: `${etiqueta} debe ser un número.` })
    .int(`${etiqueta} debe ser un número entero.`);

const idPositivo = (etiqueta) => entero(etiqueta).positive(`${etiqueta} debe ser mayor que cero.`);

const tipoVehiculo = z.enum(['carro', 'moto'], {
  errorMap: () => ({ message: 'El tipo de vehículo debe ser «carro» o «moto».' }),
});

const codigo = z.preprocess(
  (v) => (v === undefined ? v : normalizarCodigo(v)),
  z
    .string({ required_error: 'Ingrese el código de la celda.' })
    .regex(CODIGO_VALIDO, 'El código admite de 1 a 10 letras, dígitos o guiones.')
);

const area = z
  .string({ invalid_type_error: 'El área debe ser texto.' })
  .trim()
  .max(20, 'El área admite máximo 20 caracteres.')
  .nullish()
  .transform((v) => (v ? v.toUpperCase() : null));

const estado = z.enum(['disponible', 'ocupada', 'reservada', 'inhabilitada'], {
  errorMap: () => ({ message: 'El estado debe ser disponible, ocupada, reservada o inhabilitada.' }),
});

const NO_PERMITIDOS = 'Hay campos que no se pueden enviar.';

const celdaEntrada = z
  .object({ idParqueadero: idPositivo('el parqueadero'), codigo, tipoVehiculo, piso: idPositivo('el piso'), area })
  .strict(NO_PERMITIDOS);

const celdaEdicion = z.object({ codigo, tipoVehiculo, piso: idPositivo('el piso'), area }).strict(NO_PERMITIDOS);

const lote = z
  .object({
    idParqueadero: idPositivo('el parqueadero'),
    prefijo: z
      .string({ required_error: 'Ingrese el prefijo.' })
      .trim()
      .max(8, 'El prefijo admite máximo 8 caracteres.'),
    desde: entero('el número inicial').min(0, 'El número inicial no puede ser negativo.'),
    hasta: entero('el número final').min(0, 'El número final no puede ser negativo.'),
    tipoVehiculo,
    piso: idPositivo('el piso'),
    area,
  })
  .strict(NO_PERMITIDOS);

const cambioEstado = z
  .object({
    estado,
    motivo: z.string({ invalid_type_error: 'El motivo debe ser texto.' }).trim().max(200, 'El motivo admite máximo 200 caracteres.').optional(),
  })
  .strict(NO_PERMITIDOS)
  .superRefine((datos, ctx) => {
    // RF-CLD-14: inhabilitar exige un motivo.
    if (datos.estado === 'inhabilitada' && (!datos.motivo || datos.motivo.length < 3)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['motivo'], message: 'Indique el motivo (mínimo 3 caracteres).' });
    }
  });

const listar = z
  .object({
    ...camposPaginacion,
    parqueadero: idPositivo('el parqueadero').optional(),
    piso: idPositivo('el piso').optional(),
    tipo: tipoVehiculo.optional(),
    estado: estado.optional(),
  })
  .strict();

const params = z.object({ id: idPositivo('El id') });

module.exports = { celdaEntrada, celdaEdicion, lote, cambioEstado, listar, params };
