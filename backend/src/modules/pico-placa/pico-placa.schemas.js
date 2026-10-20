const { z } = require('zod');

const hora = (campo) =>
  z
    .string({ required_error: `${campo} es obligatoria.` })
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, `${campo} debe tener el formato HH:MM.`)
    .transform((v) => v.slice(0, 5));

const datos = z
  .object({
    tipo_vehiculo: z.enum(['carro', 'moto'], {
      errorMap: () => ({ message: 'El tipo debe ser carro o moto.' }),
    }),
    dia_semana: z.coerce
      .number({ invalid_type_error: 'Selecciona el día.' })
      .int()
      .min(1, 'Día entre 1 (lunes) y 7 (domingo).')
      .max(7, 'Día entre 1 (lunes) y 7 (domingo).'),
    digito: z.coerce
      .number({ invalid_type_error: 'Selecciona el dígito.' })
      .int()
      .min(0, 'Dígito entre 0 y 9.')
      .max(9, 'Dígito entre 0 y 9.'),
    hora_inicio: hora('La hora de inicio'),
    hora_fin: hora('La hora de fin'),
  })
  .superRefine((d, ctx) => {
    if (d.hora_inicio >= d.hora_fin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hora_fin'],
        message: 'La hora de fin debe ser posterior a la de inicio.',
      });
    }
  });

const listar = z.object({
  tipo_vehiculo: z.enum(['carro', 'moto']).optional(),
  dia_semana: z.coerce.number().int().min(1).max(7).optional(),
  activa: z.enum(['0', '1']).optional(),
});

const cambiarActiva = z.object({
  activa: z.boolean({ required_error: 'Indica si la regla queda activa.' }),
});
const params = z.object({ id: z.coerce.number().int().positive('Identificador inválido.') });

module.exports = { crear: datos, editar: datos, listar, cambiarActiva, params };
