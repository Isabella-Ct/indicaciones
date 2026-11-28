// Esquemas de planes (data-model.md: PlanMembresia.nombre, PlanMembresia.tipo_vehiculo, PlanMembresia.valor_mensual,
// PlanMembresia.dias_vigencia, PlanMembresia.beneficios, PlanMembresia.estado).
const { z } = require('zod');
const { camposPaginacion } = require('../../utils/paginacion');

const NO_PERMITIDOS = 'Hay campos que no se pueden enviar.';
const tipoVehiculo = z.enum(['carro', 'moto'], { errorMap: () => ({ message: 'El tipo de vehículo debe ser «carro» o «moto».' }) });
const estado = z.enum(['activo', 'inactivo'], { errorMap: () => ({ message: 'El estado debe ser «activo» o «inactivo».' }) });

const planEntrada = z
  .object({
    nombre: z
      .string({ required_error: 'Ingrese el nombre.' })
      .trim()
      .min(3, 'El nombre debe tener entre 3 y 60 caracteres.')
      .max(60, 'El nombre debe tener entre 3 y 60 caracteres.'),
    tipoVehiculo,
    valorMensual: z
      .number({ required_error: 'Ingrese el valor.', invalid_type_error: 'El valor debe ser un número.' })
      .positive('El valor debe ser mayor que 0.')
      .max(9999999999, 'El valor es demasiado alto.')
      .refine((v) => Math.round(v * 100) === v * 100, { message: 'Use máximo 2 decimales.' }),
    diasVigencia: z
      .number({ required_error: 'Ingrese los días de vigencia.', invalid_type_error: 'Los días deben ser un número.' })
      .int('Los días deben ser un número entero.')
      .min(1, 'Los días de vigencia van de 1 a 366.')
      .max(366, 'Los días de vigencia van de 1 a 366.'),
    beneficios: z
      .string({ invalid_type_error: 'Los beneficios deben ser texto.' })
      .trim()
      .max(300, 'Los beneficios admiten máximo 300 caracteres.')
      .nullish()
      .transform((v) => v || null),
  })
  .strict(NO_PERMITIDOS);

const cambioEstado = z.object({ estado }).strict(NO_PERMITIDOS);

const listar = z.object({ ...camposPaginacion, estado: estado.optional(), tipoVehiculo: tipoVehiculo.optional() }).strict();

const params = z.object({
  id: z.coerce.number({ invalid_type_error: 'El id debe ser un número.' }).int('El id debe ser un número entero.').positive('El id debe ser mayor que cero.'),
});

module.exports = { planEntrada, cambioEstado, listar, params };
