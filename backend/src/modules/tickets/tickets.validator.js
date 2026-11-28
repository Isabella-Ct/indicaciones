// Esquemas de tickets (data-model.md: Ticket.codigo). El código se acepta en minúsculas (lector o
// digitado) y se busca en mayúsculas.
const { z } = require('zod');

const params = z.object({
  codigo: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(/^T-\d{1,10}$/, 'El código del ticket tiene la forma T-000123.')),
});

module.exports = { params };
