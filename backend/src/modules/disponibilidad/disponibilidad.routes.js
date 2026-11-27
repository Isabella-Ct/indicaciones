// GET /api/v1/disponibilidad — HU-24 · RF-CLD-22, RF-CLD-23. Público (RNF-SEG-03), sin caché.
const { Router } = require('express');
const { z } = require('zod');
const servicio = require('./disponibilidad.service');
const { validate } = require('../../middlewares/validate');
const { ok } = require('../../utils/respuesta');

const consulta = z
  .object({
    parqueadero: z.coerce
      .number({ invalid_type_error: 'El parqueadero debe ser un número.' })
      .int('El parqueadero debe ser un número entero.')
      .positive('El parqueadero debe ser mayor que cero.')
      .optional(),
  })
  .strict();

const router = Router();

router.get('/', validate({ query: consulta }), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  return ok(res, await servicio.consultar(req.validado.query));
});

module.exports = router;
