// Acceso a datos de membresías (mensualidades/anualidades) — REQ-MEM-1.
const { pool } = require('../../config/db');

const escaparLike = (texto) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);
const NOMBRE = (a) =>
  `CONCAT_WS(' ', ${a}.primer_nombre, ${a}.segundo_nombre, ${a}.primer_apellido, ${a}.segundo_apellido)`;

const SELECT_DETALLE = `
  SELECT m.id, m.usuario_id, m.vehiculo_id, m.celda_asignada_id, m.tipo, m.valor, m.fecha_inicio, m.fecha_fin,
         m.estado, m.created_at,
         (m.estado = 'activa' AND CURDATE() BETWEEN m.fecha_inicio AND m.fecha_fin) AS vigente,
         DATEDIFF(m.fecha_fin, CURDATE()) AS dias_restantes,
         ${NOMBRE('u')} AS titular, u.tipo_documento, u.numero_documento,
         v.placa, v.tipo AS tipo_vehiculo, v.marca, v.modelo, v.color,
         c.codigo AS celda_codigo,
         f.id AS factura_id, f.numero AS factura_numero
    FROM membresias m
    JOIN usuarios u ON u.id = m.usuario_id
    JOIN vehiculos v ON v.id = m.vehiculo_id
    LEFT JOIN celdas c ON c.id = m.celda_asignada_id
    LEFT JOIN facturas f ON f.membresia_id = m.id`;

function filtros({ estado, usuario_id, placa, q }) {
  const condiciones = [];
  const valores = [];
  if (estado) {
    condiciones.push('m.estado = ?');
    valores.push(estado);
  }
  if (usuario_id) {
    condiciones.push('m.usuario_id = ?');
    valores.push(usuario_id);
  }
  if (placa) {
    condiciones.push('v.placa LIKE ?');
    valores.push(`%${escaparLike(placa)}%`);
  }
  if (q) {
    condiciones.push(`(u.numero_documento LIKE ? OR ${NOMBRE('u')} LIKE ?)`);
    valores.push(`${escaparLike(q)}%`, `%${escaparLike(q)}%`);
  }
  return { where: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '', valores };
}

async function listar(f, { limit, offset }) {
  const { where, valores } = filtros(f);
  const [filas] = await pool.query(
    `${SELECT_DETALLE} ${where} ORDER BY m.estado = 'activa' DESC, m.fecha_fin DESC, m.id DESC LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM membresias m JOIN usuarios u ON u.id = m.usuario_id
       JOIN vehiculos v ON v.id = m.vehiculo_id ${where}`,
    valores
  );
  return { filas, total };
}

async function buscarDetalle(id, conexion = pool) {
  const [filas] = await conexion.query(`${SELECT_DETALLE} WHERE m.id = ?`, [id]);
  return filas[0] ?? null;
}

async function deUsuario(usuarioId) {
  const [filas] = await pool.query(
    `${SELECT_DETALLE} WHERE m.usuario_id = ? ORDER BY m.fecha_fin DESC`,
    [usuarioId]
  );
  return filas;
}

/** Fecha fin = inicio + 1 mes / 1 año (aritmética de MySQL: 31 ene + 1 mes = 28/29 feb). */
async function calcularFin(inicio, tipo) {
  const [[r]] = await pool.query(
    `SELECT DATE_FORMAT(DATE_ADD(?, INTERVAL 1 ${tipo === 'anual' ? 'YEAR' : 'MONTH'}), '%Y-%m-%d') AS fin`,
    [inicio]
  );
  return r.fin;
}

/** Membresías activas que se cruzan con [inicio, fin] para el vehículo o la celda. */
async function traslapadas({ vehiculo_id, celda_id, inicio, fin }, conexion = pool) {
  const [filas] = await conexion.query(
    `SELECT m.id, m.fecha_inicio, m.fecha_fin, v.placa, c.codigo AS celda_codigo
       FROM membresias m JOIN vehiculos v ON v.id = m.vehiculo_id LEFT JOIN celdas c ON c.id = m.celda_asignada_id
      WHERE m.estado = 'activa' AND m.fecha_inicio <= ? AND m.fecha_fin >= ?
        AND ${vehiculo_id ? 'm.vehiculo_id = ?' : 'm.celda_asignada_id = ?'}`,
    [fin, inicio, vehiculo_id ?? celda_id]
  );
  return filas;
}

async function vehiculo(id) {
  const [filas] = await pool.query(
    'SELECT id, placa, tipo, activo, usuario_id FROM vehiculos WHERE id = ?',
    [id]
  );
  return filas[0] ?? null;
}

async function celda(id, conexion = pool, bloquear = false) {
  const [filas] = await conexion.query(
    `SELECT id, codigo, tipo, estado, activa FROM celdas WHERE id = ? ${bloquear ? 'FOR UPDATE' : ''}`,
    [id]
  );
  return filas[0] ?? null;
}

async function valorConfiguracion(clave) {
  const [filas] = await pool.query('SELECT valor FROM configuracion WHERE clave = ?', [clave]);
  return filas[0]?.valor ?? null;
}

async function insertar(d, conexion) {
  const [r] = await conexion.query(
    `INSERT INTO membresias (usuario_id, vehiculo_id, celda_asignada_id, tipo, valor, fecha_inicio, fecha_fin, estado, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'activa', ?)`,
    [
      d.usuario_id,
      d.vehiculo_id,
      d.celda_asignada_id ?? null,
      d.tipo,
      d.valor,
      d.fecha_inicio,
      d.fecha_fin,
      d.creado_por,
    ]
  );
  return r.insertId;
}

async function actualizarEstado(id, estado, conexion = pool) {
  await conexion.query('UPDATE membresias SET estado = ? WHERE id = ?', [estado, id]);
}

async function cambiarEstadoCelda(celdaId, estado, conexion = pool) {
  await conexion.query('UPDATE celdas SET estado = ? WHERE id = ?', [estado, celdaId]);
}

// ---------------------------------------------------------------- tarea programada
async function activasVencidas() {
  const [filas] = await pool.query(
    "SELECT id, celda_asignada_id FROM membresias WHERE estado = 'activa' AND fecha_fin < CURDATE()"
  );
  return filas;
}

/** Celdas fijas de membresías vigentes que todavía figuran como disponibles (inicio programado). */
async function celdasFijasPorReservar() {
  const [filas] = await pool.query(
    `SELECT m.id, c.id AS celda_id FROM membresias m JOIN celdas c ON c.id = m.celda_asignada_id
      WHERE m.estado = 'activa' AND CURDATE() BETWEEN m.fecha_inicio AND m.fecha_fin
        AND c.estado = 'disponible' AND c.activa = 1`
  );
  return filas;
}

/** Vigentes que vencen dentro de `dias` y todavía no tienen su aviso (la llave es el enlace). */
async function porVencerSinAviso(dias) {
  const [filas] = await pool.query(
    `SELECT m.id, m.usuario_id, m.fecha_fin, DATEDIFF(m.fecha_fin, CURDATE()) AS dias_restantes, v.placa
       FROM membresias m JOIN vehiculos v ON v.id = m.vehiculo_id
      WHERE m.estado = 'activa' AND m.fecha_fin BETWEEN CURDATE() AND CURDATE() + INTERVAL ? DAY
        AND NOT EXISTS (
          SELECT 1 FROM notificaciones n
           WHERE n.tipo = 'membresia_por_vencer' AND n.enlace = CONCAT('/app/mi-cuenta.html?membresia=', m.id)
        )`,
    [dias]
  );
  return filas;
}

module.exports = {
  listar,
  buscarDetalle,
  deUsuario,
  calcularFin,
  traslapadas,
  vehiculo,
  celda,
  valorConfiguracion,
  insertar,
  actualizarEstado,
  cambiarEstadoCelda,
  activasVencidas,
  celdasFijasPorReservar,
  porVencerSinAviso,
};
