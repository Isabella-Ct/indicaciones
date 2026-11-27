// Ayudas para SQL. Solo fragmentos fijos: los valores van siempre como parámetros `?` (RNF-SEG-06).

/** Escapa los comodines de LIKE (% _ \) en un texto que se buscará con `LIKE ?`. */
const escapeLike = (texto) => String(texto).replace(/[\\%_]/g, (c) => `\\${c}`);

/** 'nombre_completo' → 'nombreCompleto' */
const aCamelClave = (clave) => clave.replace(/_([a-z])/g, (_, l) => l.toUpperCase());

/** Fila de MySQL (snake_case) → objeto camelCase. Convierte TINYINT(1) solo si se indica. */
function aCamel(fila, booleanos = []) {
  if (!fila) return fila;
  const salida = {};
  for (const [clave, valor] of Object.entries(fila)) {
    const nueva = aCamelClave(clave);
    salida[nueva] = booleanos.includes(clave) ? Boolean(valor) : valor;
  }
  return salida;
}

module.exports = { escapeLike, aCamel, aCamelClave };
