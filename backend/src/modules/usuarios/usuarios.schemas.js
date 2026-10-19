const { z } = require('zod');
const { TIPOS_DOCUMENTO } = require('../../config/constantes');
const { esquemaPaginacion } = require('../../utils/paginacion');

// Los formularios llegan como multipart: todos los valores son texto.
const textoObligatorio = (campo, max = 60) =>
  z
    .string({ required_error: `${campo} es obligatorio.` })
    .trim()
    .min(1, `${campo} es obligatorio.`)
    .max(max, `${campo} admite máximo ${max} caracteres.`);

const textoOpcional = (campo, max = 60) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(max, `${campo} admite máximo ${max} caracteres.`).nullable().optional()
  );

const booleano = z.preprocess(
  (v) => v === true || v === 'true' || v === '1' || v === 'on',
  z.boolean()
);

const tipoDocumento = z.enum(TIPOS_DOCUMENTO, {
  errorMap: () => ({ message: 'Selecciona un tipo de documento válido.' }),
});

const numeroDocumento = z
  .string({ required_error: 'El número de documento es obligatorio.' })
  .trim()
  .min(3, 'El número de documento es demasiado corto.')
  .max(20, 'El número de documento es demasiado largo.')
  .regex(/^[A-Za-z0-9]+$/, 'Solo letras y números, sin puntos ni espacios.')
  .transform((v) => v.toUpperCase());

const correo = z
  .string({ required_error: 'El correo es obligatorio.' })
  .trim()
  .toLowerCase()
  .max(120, 'El correo admite máximo 120 caracteres.')
  .email('Escribe un correo válido (ej. nombre@correo.com).');

const celular = z
  .string({ required_error: 'El celular es obligatorio.' })
  .transform((v) => v.replace(/[\s-]/g, ''))
  .pipe(
    z
      .string()
      .regex(/^3\d{9}$/, 'Celular colombiano de 10 dígitos que empieza por 3 (ej. 3001234567).')
  );

const nombres = {
  primer_nombre: textoObligatorio('El primer nombre'),
  segundo_nombre: textoOpcional('El segundo nombre'),
  primer_apellido: textoObligatorio('El primer apellido'),
  segundo_apellido: textoOpcional('El segundo apellido'),
};

const datosAdministrables = {
  tipo_documento: tipoDocumento,
  numero_documento: numeroDocumento,
  ...nombres,
  correo,
  celular,
  rol_id: z.coerce
    .number({ invalid_type_error: 'Selecciona un rol.' })
    .int()
    .positive('Selecciona un rol.'),
};

const crear = z.object({
  ...datosAdministrables,
  contrasena_temporal: z
    .string({ required_error: 'La contraseña temporal es obligatoria.' })
    .min(8, 'La contraseña temporal debe tener al menos 8 caracteres.')
    .max(72, 'La contraseña temporal admite máximo 72 caracteres.'),
});

const editar = z.object({ ...datosAdministrables, quitar_foto: booleano.optional() });

// REQ-USR-4: el usuario solo cambia nombres, correo, celular y foto (no rol ni estado).
const editarMiPerfil = z.object({ ...nombres, correo, celular, quitar_foto: booleano.optional() });

const cambiarEstado = z.object({
  estado: z.enum(['activo', 'inactivo'], {
    errorMap: () => ({ message: 'El estado debe ser activo o inactivo.' }),
  }),
});

const listar = z.object({
  ...esquemaPaginacion,
  q: z.string().trim().max(60).optional(),
  rol: z.enum(['administrador', 'operador', 'usuario']).optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
  orden: z.enum(['id', 'nombre', 'documento', 'rol', 'estado']).default('id'),
  dir: z.enum(['asc', 'desc']).default('asc'),
});

const buscar = z.object({
  documento: z
    .string({ required_error: 'Escribe un número de documento.' })
    .trim()
    .min(3, 'Escribe al menos 3 caracteres del documento.')
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, 'Solo letras y números.')
    .transform((v) => v.toUpperCase()),
});

const params = z.object({ id: z.coerce.number().int().positive('Identificador inválido.') });

module.exports = { crear, editar, editarMiPerfil, cambiarEstado, listar, buscar, params };
