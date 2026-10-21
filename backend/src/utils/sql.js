// Ayudas para armar SQL (solo fragmentos fijos: los valores siempre van como parámetros ?).

/** Escapa los comodines de LIKE (% _ \) en un texto que se buscará con LIKE ?. */
const escaparLike = (texto) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Nombre completo de un usuario a partir del alias de la tabla (u → u.primer_nombre…). */
const nombreCompleto = (alias) =>
  `CONCAT_WS(' ', ${alias}.primer_nombre, ${alias}.segundo_nombre, ${alias}.primer_apellido, ${alias}.segundo_apellido)`;

module.exports = { escaparLike, nombreCompleto };
