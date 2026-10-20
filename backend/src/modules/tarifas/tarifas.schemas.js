const { z } = require('zod');

const tipo = z.enum(['carro', 'moto'], {
  errorMap: () => ({ message: 'El tipo debe ser carro o moto.' }),
});
const pesos = (campo) =>
  z.coerce
    .number({ invalid_type_error: `${campo} debe ser un número.` })
    .min(0, `${campo} no puede ser negativo.`)
    .max(10000000, `${campo} es demasiado alto.`);
const minutos = (campo, min) =>
  z.coerce
    .number({ invalid_type_error: `${campo} debe ser un número.` })
    .int(`${campo} debe ser un número entero.`)
    .min(min, `${campo} debe ser al menos ${min}.`)
    .max(1440, `${campo} admite máximo 1440 minutos.`);

const valores = {
  valor_fraccion: pesos('El valor de la fracción'),
  minutos_fraccion: minutos('Los minutos de la fracción', 1),
  minutos_gracia: minutos('Los minutos de gracia', 0).default(0),
  valor_dia_maximo: pesos('El tope del día'),
};

const crear = z.object({ tipo_vehiculo: tipo, ...valores });

const simular = z.object({
  tipo_vehiculo: tipo,
  minutos: z.coerce
    .number()
    .int()
    .min(0, 'Minutos desde 0.')
    .max(60 * 24 * 60, 'Máximo 60 días.'),
  tarifa: z.object(valores).optional(),
});

const listar = z.object({
  historial: z.enum(['0', '1']).optional(),
  tipo_vehiculo: tipo.optional(),
});

module.exports = { crear, simular, listar };
