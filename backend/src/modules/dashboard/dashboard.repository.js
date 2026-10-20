// Consultas del dashboard (cifras de hoy, ayer y la semana). Hora del servidor (Bogotá).
const { pool } = require('../../config/db');

const uno = async (texto, valores = []) => (await pool.query(texto, valores))[0][0];

/** Recaudo de hoy, de ayer completo y de ayer hasta esta misma hora. */
async function ingresos() {
  return uno(
    `SELECT
       COALESCE(SUM(CASE WHEN fecha_pago >= CURDATE() THEN total END), 0) AS hoy,
       COALESCE(SUM(CASE WHEN fecha_pago >= CURDATE() THEN 1 END), 0) AS facturas_hoy,
       COALESCE(SUM(CASE WHEN fecha_pago < CURDATE() THEN total END), 0) AS ayer,
       COALESCE(SUM(CASE WHEN fecha_pago < NOW() - INTERVAL 1 DAY THEN total END), 0) AS ayer_a_esta_hora
     FROM facturas WHERE fecha_pago >= CURDATE() - INTERVAL 1 DAY`
  );
}

/** Movimientos de hoy; con usuarioId, además los que registró esa persona. */
async function movimientosHoy(usuarioId = 0) {
  return uno(
    `SELECT
       (SELECT COUNT(*) FROM estadias WHERE fecha_hora_entrada >= CURDATE()) AS entradas,
       (SELECT COUNT(*) FROM estadias WHERE fecha_hora_salida >= CURDATE()) AS salidas,
       (SELECT COUNT(*) FROM estadias
         WHERE fecha_hora_entrada >= CURDATE() AND registrada_entrada_por = ?) AS mis_entradas,
       (SELECT COUNT(*) FROM estadias
         WHERE fecha_hora_salida >= CURDATE() AND registrada_salida_por = ?) AS mis_salidas,
       (SELECT COUNT(*) FROM estadias
         WHERE fecha_hora_entrada >= CURDATE() - INTERVAL 1 DAY
           AND fecha_hora_entrada < NOW() - INTERVAL 1 DAY) AS entradas_ayer_a_esta_hora,
       (SELECT COUNT(*) FROM accesos_denegados WHERE fecha_hora >= CURDATE()) AS denegados,
       (SELECT COUNT(*) FROM estadias WHERE estado = 'en_curso') AS dentro`,
    [usuarioId, usuarioId]
  );
}

async function incidenciasSemana() {
  const [filas] = await pool.query(
    `SELECT i.id, i.codigo, i.fecha_hora, t.nombre AS tipo, v.placa
       FROM incidencias i
       JOIN tipos_incidencia t ON t.id = i.tipo_incidencia_id
       JOIN vehiculos v ON v.id = i.vehiculo_id
      WHERE i.fecha_hora >= CURDATE() - INTERVAL 6 DAY
      ORDER BY i.fecha_hora DESC`
  );
  return filas;
}

async function membresiasPorVencer(dias) {
  const [filas] = await pool.query(
    `SELECT m.id, m.fecha_fin, DATEDIFF(m.fecha_fin, CURDATE()) AS dias_restantes, v.placa,
            CONCAT_WS(' ', u.primer_nombre, u.primer_apellido) AS titular, c.codigo AS celda
       FROM membresias m
       JOIN vehiculos v ON v.id = m.vehiculo_id
       JOIN usuarios u ON u.id = m.usuario_id
       LEFT JOIN celdas c ON c.id = m.celda_asignada_id
      WHERE m.estado = 'activa' AND m.fecha_fin BETWEEN CURDATE() AND CURDATE() + INTERVAL ? DAY
      ORDER BY m.fecha_fin`,
    [dias]
  );
  return filas;
}

/** Vehículos del cliente con su estadía en curso (si está dentro). */
async function vehiculosDelCliente(usuarioId) {
  const [filas] = await pool.query(
    `SELECT v.id, v.placa, v.tipo, v.marca, v.modelo, v.color,
            e.id AS estadia_id, e.fecha_hora_entrada, e.codigo_ticket, c.codigo AS celda,
            pi.nombre AS piso
       FROM vehiculos v
       LEFT JOIN estadias e ON e.vehiculo_id = v.id AND e.estado = 'en_curso'
       LEFT JOIN celdas c ON c.id = e.celda_id
       LEFT JOIN pisos pi ON pi.id = c.piso_id
      WHERE v.usuario_id = ? AND v.activo = 1
      ORDER BY v.placa`,
    [usuarioId]
  );
  return filas;
}

async function reservaActiva(usuarioId) {
  const [filas] = await pool.query(
    `SELECT r.id, r.estado, r.fecha_hora_reserva, r.fecha_hora_expiracion, v.placa,
            c.codigo AS celda
       FROM reservas r
       JOIN vehiculos v ON v.id = r.vehiculo_id
       JOIN celdas c ON c.id = r.celda_id
      WHERE r.usuario_id = ? AND r.estado IN ('pendiente', 'confirmada')
      ORDER BY r.fecha_hora_expiracion LIMIT 1`,
    [usuarioId]
  );
  return filas[0] ?? null;
}

module.exports = {
  ingresos,
  movimientosHoy,
  incidenciasSemana,
  membresiasPorVencer,
  vehiculosDelCliente,
  reservaActiva,
};
