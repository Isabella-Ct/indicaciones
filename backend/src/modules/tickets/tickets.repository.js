// Único lugar con SQL de tickets (spec 007). Lee el ticket, su parqueadero y el correo del propietario
// (el correo solo se usa para enviar; nunca se devuelve, RNF-PRI-02).
const { pool } = require('../../config/db');
const { aIsoBogota } = require('../../utils/fechas');

async function obtenerPorCodigo(codigo) {
  const [[fila]] = await pool.query(
    `SELECT t.id_ticket, t.id_movimiento, t.codigo, t.fecha_emision, t.valido, t.extraviado,
            p.nombre AS parqueadero, p.direccion, u.correo, u.nombre_completo AS propietario
       FROM ticket t
       JOIN movimiento m ON m.id_movimiento = t.id_movimiento
       JOIN celda c ON c.id_celda = m.id_celda
       JOIN parqueadero p ON p.id_parqueadero = c.id_parqueadero
       JOIN vehiculo v ON v.id_vehiculo = m.id_vehiculo
       LEFT JOIN usuario u ON u.id_usuario = v.id_propietario
      WHERE t.codigo = ?`,
    [codigo]
  );
  return fila
    ? {
        idMovimiento: fila.id_movimiento,
        codigo: fila.codigo,
        fechaEmision: aIsoBogota(fila.fecha_emision),
        valido: Boolean(fila.valido),
        extraviado: Boolean(fila.extraviado),
        parqueadero: { nombre: fila.parqueadero, direccion: fila.direccion },
        _correo: fila.correo ?? null,
        _propietario: fila.propietario ?? null,
      }
    : null;
}

module.exports = { obtenerPorCodigo };
