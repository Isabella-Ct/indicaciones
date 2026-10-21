const { pool } = require('../../config/db');

const ACTIVAS = "('pendiente', 'confirmada')";
const escaparLike = (texto) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

const SELECT = `
  SELECT r.id, r.usuario_id, r.vehiculo_id, r.celda_id, r.estado, r.fecha_hora_reserva,
         r.fecha_hora_expiracion, r.created_at, r.updated_at,
         r.estado IN ${ACTIVAS} AS activa,
         GREATEST(TIMESTAMPDIFF(SECOND, NOW(), r.fecha_hora_expiracion), 0) AS segundos_restantes,
         v.placa, v.tipo AS tipo_vehiculo, v.marca, v.modelo, v.color,
         c.codigo AS celda_codigo, c.es_accesible, p.nombre AS piso_nombre,
         CONCAT_WS(' ', u.primer_nombre, u.primer_apellido) AS titular,
         u.tipo_documento, u.numero_documento,
         e.id AS estadia_id, e.codigo_ticket
    FROM reservas r
    JOIN vehiculos v ON v.id = r.vehiculo_id
    JOIN celdas c ON c.id = r.celda_id
    JOIN pisos p ON p.id = c.piso_id
    JOIN usuarios u ON u.id = r.usuario_id
    LEFT JOIN estadias e ON e.reserva_id = r.id`;

async function buscar(id, conexion = pool, bloquear = false) {
  const [filas] = await conexion.query(
    bloquear ? 'SELECT * FROM reservas WHERE id = ? FOR UPDATE' : `${SELECT} WHERE r.id = ?`,
    [id]
  );
  return filas[0] ?? null;
}

async function vehiculo(id, conexion = pool) {
  const [filas] = await conexion.query(
    'SELECT id, placa, tipo, usuario_id, activo FROM vehiculos WHERE id = ?',
    [id]
  );
  return filas[0] ?? null;
}

async function celdaBloqueada(id, conexion) {
  const [filas] = await conexion.query(
    'SELECT id, codigo, tipo, estado, activa, es_accesible FROM celdas WHERE id = ? FOR UPDATE',
    [id]
  );
  return filas[0] ?? null;
}

async function tieneEstadiaAbierta(vehiculoId, conexion = pool) {
  const [filas] = await conexion.query(
    'SELECT 1 FROM estadias WHERE vehiculo_estadia_abierta = ? LIMIT 1',
    [vehiculoId]
  );
  return filas.length > 0;
}

async function reservaActivaDe(vehiculoId, conexion = pool) {
  const [filas] = await conexion.query(
    'SELECT id FROM reservas WHERE vehiculo_reserva_activa = ? LIMIT 1',
    [vehiculoId]
  );
  return filas[0] ?? null;
}

async function membresiaConCeldaFija(vehiculoId, conexion = pool) {
  const [filas] = await conexion.query(
    `SELECT m.id, c.codigo FROM membresias m JOIN celdas c ON c.id = m.celda_asignada_id
      WHERE m.vehiculo_id = ? AND m.estado = 'activa'
        AND CURDATE() BETWEEN m.fecha_inicio AND m.fecha_fin LIMIT 1`,
    [vehiculoId]
  );
  return filas[0] ?? null;
}

async function minutosExpiracion() {
  const [filas] = await pool.query(
    "SELECT valor FROM configuracion WHERE clave = 'reserva_minutos_expiracion'"
  );
  return Number(filas[0]?.valor) || 30;
}

async function insertar({ usuario_id, vehiculo_id, celda_id, minutos }, conexion) {
  const [r] = await conexion.query(
    `INSERT INTO reservas (usuario_id, vehiculo_id, celda_id, fecha_hora_reserva, fecha_hora_expiracion, estado)
     VALUES (?, ?, ?, NOW(), NOW() + INTERVAL ? MINUTE, 'confirmada')`,
    [usuario_id, vehiculo_id, celda_id, minutos]
  );
  return r.insertId;
}

async function cambiarEstado(id, estado, conexion) {
  await conexion.query('UPDATE reservas SET estado = ? WHERE id = ?', [estado, id]);
}

async function reservarCelda(celdaId, conexion) {
  await conexion.query("UPDATE celdas SET estado = 'reservada' WHERE id = ?", [celdaId]);
}

/** Reservas activas cuyo plazo ya pasó (las bloquea para expirarlas). */
async function vencidas(conexion) {
  const [filas] = await conexion.query(
    `SELECT r.id, r.usuario_id, r.celda_id, v.placa, c.codigo AS celda_codigo
       FROM reservas r JOIN vehiculos v ON v.id = r.vehiculo_id JOIN celdas c ON c.id = r.celda_id
      WHERE r.estado IN ${ACTIVAS} AND r.fecha_hora_expiracion <= NOW()
      FOR UPDATE`
  );
  return filas;
}

async function listar({ estado, placa, desde, hasta, usuario_id, activas }, { limit, offset }) {
  const condiciones = [];
  const valores = [];
  if (activas) condiciones.push(`r.estado IN ${ACTIVAS}`);
  if (estado) {
    condiciones.push('r.estado = ?');
    valores.push(estado);
  }
  if (placa) {
    condiciones.push('v.placa LIKE ?');
    valores.push(`%${escaparLike(placa)}%`);
  }
  if (desde) {
    condiciones.push('r.fecha_hora_reserva >= ?');
    valores.push(`${desde} 00:00:00`);
  }
  if (hasta) {
    condiciones.push('r.fecha_hora_reserva < ? + INTERVAL 1 DAY');
    valores.push(hasta);
  }
  if (usuario_id) {
    condiciones.push('r.usuario_id = ?');
    valores.push(usuario_id);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `${SELECT} ${where}
      ORDER BY r.estado IN ${ACTIVAS} DESC, r.fecha_hora_reserva DESC, r.id DESC
      LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM reservas r JOIN vehiculos v ON v.id = r.vehiculo_id ${where}`,
    valores
  );
  return { filas, total };
}

module.exports = {
  buscar,
  vehiculo,
  celdaBloqueada,
  tieneEstadiaAbierta,
  reservaActivaDe,
  membresiaConCeldaFija,
  minutosExpiracion,
  insertar,
  cambiarEstado,
  reservarCelda,
  vencidas,
  listar,
};
