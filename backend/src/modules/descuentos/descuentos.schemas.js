const { z } = require('zod');

const datos = z.object({
  nombre: z
    .string({ required_error: 'El nombre es obligatorio.' })
    .trim()
    .min(3, 'El nombre es demasiado corto.')
    .max(60, 'El nombre admite máximo 60 caracteres.'),
  descripcion: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(255, 'La descripción admite máximo 255 caracteres.').nullable().optional()
  ),
  porcentaje: z.coerce
    .number({ invalid_type_error: 'El porcentaje debe ser un número.' })
    .min(0, 'El porcentaje va de 0 a 100.')
    .max(100, 'El porcentaje va de 0 a 100.'),
});

const listar = z.object({ activos: z.enum(['0', '1']).optional() });
const cambiarActivo = z.object({
  activo: z.boolean({ required_error: 'Indica si queda activo.' }),
});
const params = z.object({ id: z.coerce.number().int().positive('Identificador inválido.') });

module.exports = { crear: datos, editar: datos, listar, cambiarActivo, params };
