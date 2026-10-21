const { z } = require('zod');

const params = z.object({
  clave: z.string().regex(/^[a-z_]{3,80}$/, 'Parámetro inválido.'),
});

// El tipo concreto (entero, decimal, booleano, texto) lo valida el service según la clave.
const editar = z.object({
  valor: z
    .union([z.string(), z.number(), z.boolean()], {
      errorMap: () => ({ message: 'El valor es obligatorio.' }),
    })
    .refine((v) => String(v).length <= 255, 'El valor admite máximo 255 caracteres.'),
});

module.exports = { params, editar };
