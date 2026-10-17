const { z } = require('zod');
const { TIPOS_DOCUMENTO } = require('../../config/constantes');

const login = z.object({
  tipo_documento: z.enum(TIPOS_DOCUMENTO, {
    errorMap: () => ({ message: 'Selecciona un tipo de documento válido.' }),
  }),
  numero_documento: z
    .string({ required_error: 'El número de documento es obligatorio.' })
    .trim()
    .min(3, 'El número de documento es demasiado corto.')
    .max(20, 'El número de documento es demasiado largo.')
    .regex(/^[A-Za-z0-9]+$/, 'El número de documento solo admite letras y números.')
    .transform((v) => v.toUpperCase()),
  contrasena: z
    .string({ required_error: 'La contraseña es obligatoria.' })
    .min(1, 'La contraseña es obligatoria.')
    .max(72, 'La contraseña no puede tener más de 72 caracteres.'),
});

const cambiarContrasena = z.object({
  contrasena_actual: z
    .string({ required_error: 'La contraseña actual es obligatoria.' })
    .min(1, 'La contraseña actual es obligatoria.')
    .max(72, 'La contraseña no puede tener más de 72 caracteres.'),
  contrasena_nueva: z
    .string({ required_error: 'La nueva contraseña es obligatoria.' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(72, 'La contraseña no puede tener más de 72 caracteres.'),
});

module.exports = { login, cambiarContrasena };
