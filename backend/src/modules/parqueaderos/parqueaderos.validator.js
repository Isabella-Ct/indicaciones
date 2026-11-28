// Esquemas de parqueaderos y puertas (data-model.md: Parqueadero.nombre, Parqueadero.direccion,
// Parqueadero.pisos, Parqueadero.horario, Parqueadero.estado; PuertaAcceso.nombre, PuertaAcceso.tipo,
// PuertaAcceso.estado).
const { z } = require('zod');
const { camposPaginacion } = require('../../utils/paginacion');

const texto = (min, max, etiqueta) =>
  z
    .string({ required_error: `Ingrese ${etiqueta}.`, invalid_type_error: `${etiqueta} debe ser texto.` })
    .trim()
    .min(min, `${etiqueta[0].toUpperCase()}${etiqueta.slice(1)} debe tener entre ${min} y ${max} caracteres.`)
    .max(max, `${etiqueta[0].toUpperCase()}${etiqueta.slice(1)} debe tener entre ${min} y ${max} caracteres.`);

const estado = z.enum(['activo', 'inactivo'], {
  errorMap: () => ({ message: 'El estado debe ser «activo» o «inactivo».' }),
});

const id = z.coerce
  .number({ invalid_type_error: 'El id debe ser un número.' })
  .int('El id debe ser un número entero.')
  .positive('El id debe ser mayor que cero.');

const NO_PERMITIDOS = 'Hay campos que no se pueden enviar.';

const camposParqueadero = {
  nombre: texto(3, 60, 'el nombre'),
  direccion: texto(5, 120, 'la dirección'),
  pisos: z.coerce
    .number({ required_error: 'Ingrese el número de pisos.', invalid_type_error: 'Los pisos deben ser un número.' })
    .int('Los pisos deben ser un número entero.')
    .min(1, 'El parqueadero debe tener entre 1 y 20 pisos.')
    .max(20, 'El parqueadero debe tener entre 1 y 20 pisos.'),
  horario: z
    .string({ invalid_type_error: 'El horario debe ser texto.' })
    .trim()
    .max(60, 'El horario admite máximo 60 caracteres.')
    .optional()
    .transform((v) => v || '24 horas'),
};

const parqueaderoEntrada = z.object(camposParqueadero).strict(NO_PERMITIDOS);
const parqueaderoEdicion = z.object({ ...camposParqueadero, estado: estado.optional() }).strict(NO_PERMITIDOS);

const listar = z.object({ ...camposPaginacion, estado: estado.optional() }).strict();
const params = z.object({ id });

const camposPuerta = {
  nombre: texto(2, 40, 'el nombre'),
  tipo: z.enum(['entrada', 'salida', 'mixta'], {
    errorMap: () => ({ message: 'El tipo debe ser «entrada», «salida» o «mixta».' }),
  }),
};
const puertaEntrada = z.object(camposPuerta).strict(NO_PERMITIDOS);
const puertaEdicion = z.object({ ...camposPuerta, estado: estado.optional() }).strict(NO_PERMITIDOS);
const listarPuertas = z
  .object({
    uso: z.enum(['entrada', 'salida'], { errorMap: () => ({ message: 'El uso debe ser «entrada» o «salida».' }) }).optional(),
    estado: estado.optional(),
  })
  .strict();

module.exports = { parqueaderoEntrada, parqueaderoEdicion, listar, params, puertaEntrada, puertaEdicion, listarPuertas };
