// Esquemas de entrada de autenticación (contracts/openapi.yaml › LoginEntrada).
const { z } = require('zod');
const { TIPOS_DOCUMENTO } = require('../../config/constantes');

const login = z
  .object({
    tipoDocumento: z.enum(TIPOS_DOCUMENTO, {
      errorMap: () => ({ message: `Seleccione un tipo de documento válido (${TIPOS_DOCUMENTO.join(', ')}).` }),
    }),
    numeroDocumento: z
      .string({ required_error: 'Ingrese el número de documento.' })
      .trim()
      .min(3, 'El documento debe tener entre 3 y 20 caracteres.')
      .max(20, 'El documento debe tener entre 3 y 20 caracteres.'),
    contrasena: z
      .string({ required_error: 'Ingrese la contraseña.' })
      .min(1, 'Ingrese la contraseña.')
      .max(72, 'La contraseña es demasiado larga.'),
  })
  .strict();

module.exports = { login };
