const { z } = require('zod');

const tipo = z.enum(['carro', 'moto'], {
  errorMap: () => ({ message: 'El tipo debe ser carro o moto.' }),
});

const nota = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.string().trim().max(255, 'La nota admite máximo 255 caracteres.').nullable().optional()
);

const listar = z.object({
  piso_id: z.coerce.number().int().positive().optional(),
  area: z.string().trim().toUpperCase().max(5).optional(),
  tipo: tipo.optional(),
  estado: z.enum(['disponible', 'ocupada', 'reservada', 'fuera_servicio']).optional(),
  accesible: z.enum(['0', '1']).optional(),
  incluir_inactivas: z.enum(['0', '1']).optional(),
});

/** REQ-CLD-03. `reservada` la ponen las mensualidades y las reservas, no se elige a mano. */
const cambiarEstado = z
  .object({
    estado: z.enum(['disponible', 'ocupada', 'reservada', 'fuera_servicio'], {
      errorMap: () => ({ message: 'Estado inválido.' }),
    }),
    vehiculo_id: z.coerce.number().int().positive('Vehículo inválido.').optional(),
    nota,
  })
  .superRefine((d, ctx) => {
    if (d.estado === 'reservada') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['estado'],
        message: 'Una celda queda reservada desde Membresías o Reservas, no manualmente.',
      });
    }
    if (d.estado === 'ocupada' && !d.vehiculo_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['vehiculo_id'],
        message: 'Indica el vehículo que ocupa la celda.',
      });
    }
    if (d.estado === 'fuera_servicio' && !d.nota) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nota'],
        message: 'Escribe el motivo por el que la celda queda fuera de servicio.',
      });
    }
  });

const datosCelda = {
  codigo: z
    .string({ required_error: 'El código es obligatorio.' })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{1,3}-\d{1,3}$/, 'Formato del código: letras-número (ej. A-01, M-12).'),
  piso_id: z.coerce
    .number({ invalid_type_error: 'Selecciona el piso.' })
    .int()
    .positive('Selecciona el piso.'),
  area: z
    .string({ required_error: 'El área es obligatoria.' })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{1,5}$/, 'El área es la fila de letras (ej. A, B, M).'),
  tipo,
  es_accesible: z.boolean().default(false),
  fila_mapa: z.enum(['superior', 'inferior'], {
    errorMap: () => ({ message: 'La fila del mapa es superior o inferior.' }),
  }),
  posicion: z.coerce
    .number({ invalid_type_error: 'La posición es un número.' })
    .int()
    .min(1, 'La posición empieza en 1.')
    .max(99, 'La posición máxima es 99.'),
};

const crear = z
  .object({
    ...datosCelda,
    estado: z.enum(['disponible', 'fuera_servicio']).default('disponible'),
    nota,
  })
  .superRefine((d, ctx) => {
    if (d.estado === 'fuera_servicio' && !d.nota) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nota'],
        message: 'Escribe el motivo por el que la celda queda fuera de servicio.',
      });
    }
  });

const editar = z.object(datosCelda);

const cambiarActiva = z.object({
  activa: z.boolean({ required_error: 'Indica si la celda queda activa.' }),
});

const params = z.object({ id: z.coerce.number().int().positive('Identificador inválido.') });

module.exports = { listar, cambiarEstado, crear, editar, cambiarActiva, params };
