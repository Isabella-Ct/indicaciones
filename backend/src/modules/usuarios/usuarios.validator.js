// Esquemas de entrada de usuarios (data-model.md: Usuario.tipo_documento, Usuario.numero_documento,
// Usuario.nombre_completo, Usuario.correo, Usuario.celular, Usuario.id_rol,
// Usuario.acepta_tratamiento_datos, Usuario.estado). Aceptan JSON o multipart (research R-04):
// en multipart todo llega como texto, por eso se convierten booleanos y números.
const { z } = require('zod');
const { camposPaginacion } = require('../../utils/paginacion');
const { TIPOS_DOCUMENTO } = require('../../config/constantes');
const r = require('./usuarios.reglas');

const NOMBRE_VALIDO = /^\p{L}[\p{L} '-]*$/u;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const booleano = (mensaje) =>
  z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean({ invalid_type_error: mensaje, required_error: mensaje })
  );

const tipoDocumento = z.enum(TIPOS_DOCUMENTO, {
  errorMap: () => ({ message: `Seleccione un tipo de documento válido (${TIPOS_DOCUMENTO.join(', ')}).` }),
});
const numeroDocumento = z.string({ required_error: 'Ingrese el número de documento.' });
const nombreCompleto = z.preprocess(
  (v) => (v === undefined ? v : r.normalizarNombre(v)),
  z
    .string({ required_error: 'Ingrese el nombre completo.' })
    .min(3, 'El nombre debe tener entre 3 y 100 caracteres.')
    .max(100, 'El nombre debe tener entre 3 y 100 caracteres.')
    .regex(NOMBRE_VALIDO, 'El nombre solo admite letras y espacios.')
);
const correo = z.preprocess(
  (v) => (v === undefined ? v : r.normalizarCorreo(v)),
  z
    .string({ required_error: 'Ingrese el correo.' })
    .max(120, 'El correo admite máximo 120 caracteres.')
    .regex(CORREO_VALIDO, 'Ingrese un correo válido.')
);
const celular = z.preprocess(
  (v) => (v === undefined ? v : r.normalizarCelular(v)),
  z
    .string({ required_error: 'Ingrese el celular.' })
    .regex(/^3\d{9}$/, 'El celular debe tener 10 dígitos y empezar por 3.')
);
const idRol = z.coerce
  .number({ required_error: 'Seleccione el rol.', invalid_type_error: 'Seleccione el rol.' })
  .int('Seleccione el rol.')
  .positive('Seleccione el rol.');

/** Normaliza el documento según su tipo y valida el formato (5–20; solo dígitos salvo PAS). */
function documentoValido(datos, ctx) {
  if (datos.numeroDocumento === undefined || !datos.tipoDocumento) return;
  datos.numeroDocumento = r.normalizarDocumento(datos.tipoDocumento, datos.numeroDocumento);
  const patron = datos.tipoDocumento === 'PAS' ? /^[A-Z0-9]{5,20}$/ : /^\d{5,20}$/;
  if (!patron.test(datos.numeroDocumento)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['numeroDocumento'],
      message:
        datos.tipoDocumento === 'PAS'
          ? 'El pasaporte debe tener entre 5 y 20 letras o dígitos.'
          : 'El documento debe tener entre 5 y 20 dígitos.',
    });
  }
}

const NO_PERMITIDOS = 'Hay campos que no se pueden enviar.';

/** POST /usuarios — HU-07. */
const usuarioEntrada = z
  .object({
    tipoDocumento,
    numeroDocumento,
    nombreCompleto,
    correo,
    celular,
    // Opcional solo para quien no tiene alcance total (Operador): el servidor asigna Cliente (research R-08).
    idRol: idRol.optional(),
    aceptaTratamientoDatos: booleano('Debe aceptar la autorización de tratamiento de datos.').refine((v) => v === true, {
      message: 'Debe aceptar la autorización de tratamiento de datos.',
    }),
  })
  .strict(NO_PERMITIDOS)
  .superRefine(documentoValido);

/** PUT /usuarios/:id — HU-09 (el código no se envía: RF-USR-02). */
const usuarioEdicion = z
  .object({
    tipoDocumento,
    numeroDocumento,
    nombreCompleto,
    correo,
    celular,
    idRol,
    quitarFoto: booleano('quitarFoto debe ser verdadero o falso.').optional(),
  })
  .strict(NO_PERMITIDOS)
  .superRefine(documentoValido);

/** PUT /usuarios/me — HU-11 (sin documento, código, rol ni estado: RF-USR-17). */
const perfilEntrada = z
  .object({
    nombreCompleto,
    correo,
    celular,
    quitarFoto: booleano('quitarFoto debe ser verdadero o falso.').optional(),
  })
  .strict('Solo puede cambiar su nombre, correo, celular y foto.');

const estado = z.enum(['activo', 'inactivo'], {
  errorMap: () => ({ message: 'El estado debe ser «activo» o «inactivo».' }),
});

const listar = z
  .object({
    ...camposPaginacion,
    rol: z.coerce.number({ invalid_type_error: 'El rol debe ser un id numérico.' }).int().positive().optional(),
    estado: estado.optional(),
  })
  .strict();

const params = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'El id debe ser un número.' })
    .int('El id debe ser un número entero.')
    .positive('El id debe ser mayor que cero.'),
});

const cambioEstado = z.object({ estado }).strict(NO_PERMITIDOS);

// Campos sueltos que reutiliza el autorregistro (spec 003).
const campos = { tipoDocumento, numeroDocumento, nombreCompleto, correo, celular, booleano, documentoValido };

module.exports = { usuarioEntrada, usuarioEdicion, perfilEntrada, listar, params, cambioEstado, campos };
