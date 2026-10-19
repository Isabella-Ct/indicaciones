// Paginación estándar de listados: ?pagina=1&limite=20 (CLAUDE.md §4).
const { z } = require('zod');

const LIMITE_MAXIMO = 100;

const esquemaPaginacion = {
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(20),
};

/** { limit, offset } para el repository. */
function aLimites({ pagina, limite }) {
  return { limit: limite, offset: (pagina - 1) * limite };
}

/** Bloque `meta` de la respuesta. */
function meta({ pagina, limite }, total) {
  return { pagina, limite, total, total_paginas: Math.max(1, Math.ceil(total / limite)) };
}

module.exports = { esquemaPaginacion, aLimites, meta, LIMITE_MAXIMO };
