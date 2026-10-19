const { z } = require('zod');

const datos = z.object({
  nombre: z
    .string({ required_error: 'El nombre es obligatorio.' })
    .trim()
    .min(2, 'El nombre es demasiado corto.')
    .max(40, 'El nombre admite máximo 40 caracteres.'),
  tipo: z.enum(['entrada', 'salida', 'mixta'], {
    errorMap: () => ({ message: 'El tipo es entrada, salida o mixta.' }),
  }),
});

const listar = z.object({ incluir_inactivas: z.enum(['0', '1']).optional() });
const cambiarActiva = z.object({
  activa: z.boolean({ required_error: 'Indica si queda activa.' }),
});
const params = z.object({ id: z.coerce.number().int().positive('Identificador inválido.') });

module.exports = { crear: datos, editar: datos, listar, cambiarActiva, params };
