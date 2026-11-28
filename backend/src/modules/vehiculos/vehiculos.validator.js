// Esquemas de vehículos (data-model.md: Vehiculo.placa, Vehiculo.tipo, Vehiculo.color, Vehiculo.marca,
// Vehiculo.modelo, Vehiculo.id_propietario). La placa se normaliza antes de validar su formato (R-02).
const { z } = require('zod');
const { camposPaginacion } = require('../../utils/paginacion');
const { TIPOS_DOCUMENTO } = require('../../config/constantes');
const { anioActualBogota } = require('../../utils/fechas');
const { normalizarPlaca, placaValida, mensajeFormato, modeloValido, MODELO_MINIMO } = require('./vehiculos.reglas');

const NO_PERMITIDOS = 'Hay campos que no se pueden enviar.';

const idPositivo = (etiqueta) =>
  z.coerce
    .number({ invalid_type_error: `${etiqueta} debe ser un número.` })
    .int(`${etiqueta} debe ser un número entero.`)
    .positive(`${etiqueta} debe ser mayor que cero.`);

const texto = (etiqueta, min, max) =>
  z
    .string({ required_error: `Ingrese ${etiqueta}.`, invalid_type_error: `${etiqueta} debe ser texto.` })
    .trim()
    .min(min, `${etiqueta[0].toUpperCase()}${etiqueta.slice(1)} debe tener entre ${min} y ${max} caracteres.`)
    .max(max, `${etiqueta[0].toUpperCase()}${etiqueta.slice(1)} debe tener entre ${min} y ${max} caracteres.`);

const vehiculoEntrada = z
  .object({
    placa: z.preprocess(
      (v) => (typeof v === 'string' ? normalizarPlaca(v) : v),
      z.string({ required_error: 'Ingrese la placa.', invalid_type_error: 'La placa debe ser texto.' }).min(1, 'Ingrese la placa.')
    ),
    tipo: z.enum(['carro', 'moto'], { errorMap: () => ({ message: 'El tipo de vehículo debe ser «carro» o «moto».' }) }),
    color: texto('el color', 2, 30),
    marca: texto('la marca', 2, 40),
    modelo: z.coerce
      .number({ required_error: 'Ingrese el modelo.', invalid_type_error: 'El modelo debe ser un año.' })
      .int('El modelo debe ser un año.'),
    idPropietario: idPositivo('El propietario').nullable().optional(),
  })
  .strict(NO_PERMITIDOS)
  .superRefine((datos, ctx) => {
    // RN-11: el formato depende del tipo.
    if (datos.placa && !placaValida(datos.placa, datos.tipo)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['placa'], message: mensajeFormato(datos.tipo) });
    }
    const anio = anioActualBogota();
    if (!modeloValido(datos.modelo, anio)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['modelo'],
        message: `El modelo debe estar entre ${MODELO_MINIMO} y ${anio + 1}.`,
      });
    }
  });

/** PATCH /:id/propietario: { idUsuario } o { tipoDocumento, numeroDocumento } (research R-06). */
const propietario = z
  .object({
    idUsuario: idPositivo('El usuario').nullable().optional(),
    tipoDocumento: z
      .enum(TIPOS_DOCUMENTO, { errorMap: () => ({ message: `Seleccione un tipo de documento válido (${TIPOS_DOCUMENTO.join(', ')}).` }) })
      .optional(),
    numeroDocumento: z.string({ invalid_type_error: 'El documento debe ser texto.' }).trim().min(1, 'Ingrese el número de documento.').max(20).optional(),
  })
  .strict(NO_PERMITIDOS)
  .superRefine((datos, ctx) => {
    const porId = datos.idUsuario !== undefined;
    const porDocumento = datos.tipoDocumento !== undefined || datos.numeroDocumento !== undefined;
    if (porId === porDocumento) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['idUsuario'], message: 'Indique el usuario por id o por documento (uno de los dos).' });
    } else if (porDocumento && (!datos.tipoDocumento || !datos.numeroDocumento)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [datos.tipoDocumento ? 'numeroDocumento' : 'tipoDocumento'],
        message: 'Indique el tipo y el número de documento.',
      });
    }
  });

const listar = z
  .object({
    ...camposPaginacion,
    tipo: z.enum(['carro', 'moto'], { errorMap: () => ({ message: 'El tipo debe ser «carro» o «moto».' }) }).optional(),
    propietario: z
      .union([z.literal('ninguno'), idPositivo('El propietario')], {
        errorMap: () => ({ message: 'El propietario debe ser un id o «ninguno».' }),
      })
      .optional(),
    dentro: z
      .enum(['true', 'false'], { errorMap: () => ({ message: 'dentro debe ser true o false.' }) })
      .transform((v) => v === 'true')
      .optional(),
  })
  .strict();

const params = z.object({ id: idPositivo('El id') });

module.exports = { vehiculoEntrada, propietario, listar, params };
