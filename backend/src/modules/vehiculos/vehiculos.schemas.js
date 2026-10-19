const { z } = require('zod');
const { esquemaPaginacion } = require('../../utils/paginacion');
const { normalizarPlaca, esPlacaValida, mensajePlacaInvalida } = require('../../utils/placas');

const tipo = z.enum(['carro', 'moto'], {
  errorMap: () => ({ message: 'El tipo de vehículo debe ser carro o moto.' }),
});

const placa = z
  .string({ required_error: 'La placa es obligatoria.' })
  .transform(normalizarPlaca)
  .pipe(z.string().min(1, 'La placa es obligatoria.'));

const texto = (campo, max) =>
  z
    .string({ required_error: `${campo} es obligatorio.` })
    .trim()
    .min(1, `${campo} es obligatorio.`)
    .max(max, `${campo} admite máximo ${max} caracteres.`);

const usuarioId = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.coerce.number().int().positive('Propietario inválido.').nullable()
);

/** La placa debe cumplir el formato del tipo (CLAUDE.md §4). */
function validarPlacaSegunTipo(datos, ctx) {
  if (datos.placa && datos.tipo && !esPlacaValida(datos.placa, datos.tipo)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['placa'],
      message: mensajePlacaInvalida(datos.tipo),
    });
  }
}

const datosVehiculo = {
  placa,
  tipo,
  color: texto('El color', 30),
  marca: texto('La marca', 40),
  modelo: texto('El modelo', 40),
};

const crear = z
  .object({ ...datosVehiculo, usuario_id: usuarioId.optional() })
  .superRefine(validarPlacaSegunTipo);

const editar = z
  .object({
    ...datosVehiculo,
    activo: z.boolean({ invalid_type_error: 'Activo debe ser sí o no.' }).default(true),
  })
  .superRefine(validarPlacaSegunTipo);

const cambiarPropietario = z.object({
  usuario_id: usuarioId,
  motivo: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(255, 'El motivo admite máximo 255 caracteres.').nullable().optional()
  ),
});

const listar = z.object({
  ...esquemaPaginacion,
  placa: z.string().transform(normalizarPlaca).optional(),
  tipo: tipo.optional(),
  propietario: z.enum(['con', 'sin']).optional(),
  usuario_id: z.coerce.number().int().positive().optional(),
  q: z.string().trim().max(60).optional(),
  activo: z.enum(['1', '0']).optional(),
  orden: z.enum(['placa', 'tipo', 'marca', 'propietario', 'id']).default('placa'),
  dir: z.enum(['asc', 'desc']).default('asc'),
});

const params = z.object({ id: z.coerce.number().int().positive('Identificador inválido.') });
const paramsPlaca = z.object({ placa });

module.exports = { crear, editar, cambiarPropietario, listar, params, paramsPlaca };
