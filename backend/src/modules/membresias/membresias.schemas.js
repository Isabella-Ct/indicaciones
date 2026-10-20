const { z } = require('zod');
const { esquemaPaginacion } = require('../../utils/paginacion');
const { normalizarPlaca } = require('../../utils/placas');

const fecha = z
  .string({ required_error: 'La fecha de inicio es obligatoria.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato AAAA-MM-DD.');
const id = (mensaje) => z.coerce.number({ invalid_type_error: mensaje }).int().positive(mensaje);
const tipo = z.enum(['mensual', 'anual'], {
  errorMap: () => ({ message: 'El tipo es mensual o anual.' }),
});

const crear = z.object({
  usuario_id: id('Elige el cliente.'),
  vehiculo_id: id('Elige el vehículo.'),
  tipo,
  fecha_inicio: fecha,
  celda_asignada_id: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    id('Celda inválida.').nullable()
  ),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia'], {
    errorMap: () => ({ message: 'Elige el método de pago.' }),
  }),
});

const cotizar = z.object({ vehiculo_id: id('Elige el vehículo.'), tipo, fecha_inicio: fecha });

const listar = z.object({
  ...esquemaPaginacion,
  estado: z.enum(['activa', 'vencida', 'cancelada']).optional(),
  usuario_id: z.coerce.number().int().positive().optional(),
  placa: z.string().transform(normalizarPlaca).optional(),
  q: z.string().trim().max(60).optional(),
});

const params = z.object({ id: id('Identificador inválido.') });

module.exports = { crear, cotizar, listar, params };
