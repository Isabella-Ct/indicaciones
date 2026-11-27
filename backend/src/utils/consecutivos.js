// Consecutivos sin huecos (RN-22): T-000123, FV-000245, INC-000031, R-000007.
// Debe llamarse dentro de withTransaction: la fila queda bloqueada hasta el commit y, si la
// transacción se revierte, el número no se consume.

/**
 * @param {import('mysql2/promise').PoolConnection} conexion conexión de la transacción
 * @param {'ticket'|'factura'|'incidencia'|'reserva'} clave
 * @returns {Promise<string>} p. ej. 'T-000001'
 */
async function siguienteConsecutivo(conexion, clave) {
  const [filas] = await conexion.query(
    'SELECT prefijo, siguiente, longitud FROM consecutivo WHERE clave = ? FOR UPDATE',
    [clave]
  );
  if (filas.length === 0) throw new Error(`Consecutivo no configurado: ${clave}`);
  const { prefijo, siguiente, longitud } = filas[0];
  await conexion.query('UPDATE consecutivo SET siguiente = siguiente + 1 WHERE clave = ?', [clave]);
  return `${prefijo}${String(siguiente).padStart(longitud, '0')}`;
}

module.exports = { siguienteConsecutivo };
