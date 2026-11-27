// Esquemas de entrada de roles (data-model.md: Rol.nombre, Rol.descripcion, Rol.estado;
// contracts/openapi.yaml › RolEntrada). Errores → 422 con detalle por campo.
const { z } = require('zod');
const { camposPaginacion } = require('../../utils/paginacion');

const MENSAJE_SIN_PERMISOS = 'El rol debe tener al menos un permiso.';
const estado = z.enum(['activo', 'inactivo'], {
  errorMap: () => ({ message: 'El estado debe ser «activo» o «inactivo».' }),
});

const params = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'El id debe ser un número.' })
    .int('El id debe ser un número entero.')
    .positive('El id debe ser mayor que cero.'),
});

const listar = z.object({ ...camposPaginacion, estado: estado.optional() }).strict();

const rolEntrada = z
  .object({
    nombre: z
      .string({ required_error: 'Ingrese el nombre del rol.', invalid_type_error: 'El nombre debe ser texto.' })
      .trim()
      .min(3, 'El nombre debe tener entre 3 y 40 caracteres.')
      .max(40, 'El nombre debe tener entre 3 y 40 caracteres.'),
    descripcion: z
      .string({ invalid_type_error: 'La descripción debe ser texto.' })
      .trim()
      .max(150, 'La descripción admite máximo 150 caracteres.')
      .nullish()
      .transform((v) => (v ? v : null)),
    permisos: z
      .array(
        z.number({ invalid_type_error: 'Cada permiso debe ser un id numérico.' }).int().positive(),
        { required_error: MENSAJE_SIN_PERMISOS, invalid_type_error: 'Los permisos deben ser una lista de ids.' }
      )
      .min(1, MENSAJE_SIN_PERMISOS)
      // Los repetidos se guardan una sola vez (spec › Edge Cases).
      .transform((ids) => [...new Set(ids)]),
  })
  .strict('Hay campos que no se pueden enviar.');

const cambioEstado = z.object({ estado }).strict('Hay campos que no se pueden enviar.');

module.exports = { params, listar, rolEntrada, cambioEstado };
