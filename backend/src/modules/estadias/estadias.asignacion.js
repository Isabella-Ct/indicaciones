// Elección de celda para una entrada (función pura). CLAUDE.md §7 — Celdas:
// las accesibles se asignan primero a quien las requiere; los demás solo las usan
// si no queda otra celda libre del tipo y el operador lo confirma.
const { AppError } = require('../../utils/errores');

/**
 * @param {{
 *   libres: Array<{ id: number, codigo: string, es_accesible: boolean|number }>,  // del tipo, en orden del mapa
 *   solicitadaId?: number|null,       // celda elegida por el operador
 *   requiereAccesible?: boolean,
 *   confirmarAccesible?: boolean,     // el operador aceptó usar una accesible
 * }} opciones
 * @returns {object} la celda elegida
 * @throws {AppError} SIN_CUPO, CELDA_NO_DISPONIBLE, CELDA_ACCESIBLE, CONFIRMAR_ACCESIBLE
 */
function elegirCelda({
  libres,
  solicitadaId = null,
  requiereAccesible = false,
  confirmarAccesible = false,
}) {
  const accesibles = libres.filter((c) => c.es_accesible);
  const normales = libres.filter((c) => !c.es_accesible);

  const pedirConfirmacion = (celda) =>
    new AppError(
      409,
      'CONFIRMAR_ACCESIBLE',
      `Solo queda libre la celda accesible ${celda.codigo}. Confirma para asignarla a un vehículo que no la requiere.`,
      [
        {
          campo: 'celda_id',
          mensaje: 'Confirmación requerida',
          celda_id: celda.id,
          codigo: celda.codigo,
        },
      ]
    );

  if (solicitadaId) {
    const celda = libres.find((c) => c.id === solicitadaId);
    if (!celda) {
      throw new AppError(
        409,
        'CELDA_NO_DISPONIBLE',
        'La celda elegida ya no está libre o no es del tipo del vehículo.',
        [{ campo: 'celda_id', mensaje: 'Celda no disponible.' }]
      );
    }
    if (celda.es_accesible && !requiereAccesible) {
      if (normales.length) {
        throw new AppError(
          409,
          'CELDA_ACCESIBLE',
          `La celda ${celda.codigo} es accesible: queda para quien la requiere mientras haya otras libres (ej. ${normales[0].codigo}).`,
          [{ campo: 'celda_id', mensaje: 'Celda accesible reservada para quien la requiere.' }]
        );
      }
      if (!confirmarAccesible) throw pedirConfirmacion(celda);
    }
    return celda;
  }

  if (requiereAccesible && accesibles.length) return accesibles[0];
  if (normales.length) return normales[0];
  if (accesibles.length) {
    if (requiereAccesible || confirmarAccesible) return accesibles[0];
    throw pedirConfirmacion(accesibles[0]);
  }
  throw new AppError(409, 'SIN_CUPO', 'No hay celdas libres para este tipo de vehículo.');
}

module.exports = { elegirCelda };
