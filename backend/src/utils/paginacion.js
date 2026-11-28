// Paginación y búsqueda de listados: ?page&limit&q (constitución §II, research R-07).
const { z } = require('zod');
const { LIMITE_POR_DEFECTO, LIMITE_MAXIMO } = require('../config/constantes');

/** Campos zod para el esquema `query` de cualquier listado. */
const camposPaginacion = {
  page: z.coerce
    .number({ invalid_type_error: 'Debe ser un número.' })
    .int('Debe ser un número entero.')
    .min(1, 'Debe ser mínimo 1.')
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: 'Debe ser un número.' })
    .int('Debe ser un número entero.')
    .min(1, 'Debe ser mínimo 1.')
    .max(LIMITE_MAXIMO, `Debe ser máximo ${LIMITE_MAXIMO}.`)
    .default(LIMITE_POR_DEFECTO),
  q: z
    .string()
    .trim()
    .max(60, 'Máximo 60 caracteres.')
    .optional()
    .transform((v) => (v ? v : undefined)),
};

/** { page, limit } → { limit, offset } para el repositorio. */
function aLimites({ page, limit }) {
  return { limit, offset: (page - 1) * limit };
}

/** Bloque `meta` de la respuesta. */
function meta({ page, limit }, total) {
  return { page, limit, total };
}

module.exports = { camposPaginacion, aLimites, meta };
