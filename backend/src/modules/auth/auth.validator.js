// Esquemas de entrada de acceso (contracts/openapi.yaml de las specs 001 y 003). Reglas de la contraseña
// nueva: 8–64 caracteres, al menos una letra y un número, y confirmación igual (spec 003 research R-03).
const { z } = require('zod');
const { TIPOS_DOCUMENTO } = require('../../config/constantes');
const { campos } = require('../usuarios/usuarios.validator');
const { normalizarDocumento } = require('../usuarios/usuarios.reglas');

const tipoDocumento = z.enum(TIPOS_DOCUMENTO, {
  errorMap: () => ({ message: `Seleccione un tipo de documento válido (${TIPOS_DOCUMENTO.join(', ')}).` }),
});

/** Documento del inicio de sesión y la recuperación, normalizado como se guarda (spec 002 R-07). */
const documento = z
  .object({
    tipoDocumento,
    numeroDocumento: z
      .string({ required_error: 'Ingrese el número de documento.' })
      .trim()
      .min(3, 'El documento debe tener entre 3 y 20 caracteres.')
      .max(20, 'El documento debe tener entre 3 y 20 caracteres.'),
  })
  .transform((d) => ({ ...d, numeroDocumento: normalizarDocumento(d.tipoDocumento, d.numeroDocumento) }));

const contrasenaNueva = (campo = 'contrasena') =>
  z
    .string({ required_error: 'Ingrese la contraseña.' })
    .min(8, 'La contraseña debe tener entre 8 y 64 caracteres.')
    .max(64, 'La contraseña debe tener entre 8 y 64 caracteres.')
    .regex(/\p{L}/u, 'La contraseña debe tener al menos una letra.')
    .regex(/\d/, 'La contraseña debe tener al menos un número.')
    .describe(campo);

const confirmacion = z.string({ required_error: 'Confirme la contraseña.' });

/** La confirmación debe coincidir con `campo`. */
const coincide = (campo) => (datos, ctx) => {
  if (datos.confirmacion !== undefined && datos[campo] !== undefined && datos.confirmacion !== datos[campo]) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmacion'], message: 'La confirmación no coincide.' });
  }
};

const NO_PERMITIDOS = 'Hay campos que no se pueden enviar.';

const login = z
  .object({
    tipoDocumento,
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
  .strict()
  .transform((d) => ({ ...d, numeroDocumento: normalizarDocumento(d.tipoDocumento, d.numeroDocumento) }));

/** PUT /auth/contrasena — HU-12 E4/E5. */
const cambioContrasena = z
  .object({
    contrasenaActual: z.string({ required_error: 'Ingrese su contraseña actual.' }).min(1, 'Ingrese su contraseña actual.').max(72),
    contrasenaNueva: contrasenaNueva('contrasenaNueva'),
    confirmacion,
  })
  .strict(NO_PERMITIDOS)
  .superRefine(coincide('contrasenaNueva'));

/** POST /auth/registro — HU-14 (rol siempre Cliente: no se acepta idRol). */
const registro = z
  .object({
    tipoDocumento: campos.tipoDocumento,
    numeroDocumento: campos.numeroDocumento,
    nombreCompleto: campos.nombreCompleto,
    correo: campos.correo,
    celular: campos.celular,
    contrasena: contrasenaNueva('contrasena'),
    confirmacion,
    aceptaTratamientoDatos: campos
      .booleano('Debe aceptar la autorización de tratamiento de datos.')
      .refine((v) => v === true, { message: 'Debe aceptar la autorización de tratamiento de datos.' }),
  })
  .strict(NO_PERMITIDOS)
  .superRefine(campos.documentoValido)
  .superRefine(coincide('contrasena'));

/** POST /auth/recuperar — HU-15 E1/E2. */
const recuperar = documento.innerType().strict(NO_PERMITIDOS).transform((d) => ({
  ...d,
  numeroDocumento: normalizarDocumento(d.tipoDocumento, d.numeroDocumento),
}));

/** POST /auth/restablecer — HU-15 E3/E4. */
const restablecer = z
  .object({
    token: z.string({ required_error: 'Falta el enlace de recuperación.' }).regex(/^[0-9a-f]{64}$/, 'El enlace no es válido.'),
    contrasenaNueva: contrasenaNueva('contrasenaNueva'),
    confirmacion,
  })
  .strict(NO_PERMITIDOS)
  .superRefine(coincide('contrasenaNueva'));

module.exports = { login, cambioContrasena, registro, recuperar, restablecer };
