// Bitácora de auditoría (RNF-SEG-07). Se escribe con la conexión de la transacción del cambio,
// así un rollback también descarta la entrada (research R-10). Nunca guarda contraseñas.

const CAMPOS_PROHIBIDOS = ['contrasena', 'contrasenaHash', 'contrasena_hash', 'token', 'tokenHash'];

function limpiar(valor) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== 'object') return valor;
  if (Array.isArray(valor)) return valor.map(limpiar);
  const salida = {};
  for (const [clave, v] of Object.entries(valor)) {
    if (!CAMPOS_PROHIBIDOS.includes(clave)) salida[clave] = limpiar(v);
  }
  return salida;
}

/**
 * @param {import('mysql2/promise').PoolConnection} conexion conexión de la transacción
 * @param {{ idUsuario: number|null, accion: string, entidad: string, idRegistro: number,
 *           anterior?: object|null, nuevo?: object|null, ip?: string|null }} entrada
 */
async function registrarBitacora(conexion, { idUsuario, accion, entidad, idRegistro, anterior, nuevo, ip }) {
  const json = (v) => (v === null || v === undefined ? null : JSON.stringify(limpiar(v)));
  await conexion.query(
    `INSERT INTO bitacora (id_usuario, fecha, accion, entidad, id_registro, valor_anterior, valor_nuevo, ip)
     VALUES (?, NOW(), ?, ?, ?, ?, ?, ?)`,
    [idUsuario ?? null, accion, entidad, idRegistro, json(anterior), json(nuevo), ip ?? null]
  );
}

module.exports = { registrarBitacora, limpiar };
