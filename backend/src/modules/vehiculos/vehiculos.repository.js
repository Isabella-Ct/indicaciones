// Acceso a datos de vehículos y de su historial de propietarios.
const { pool } = require('../../config/db');
const { escaparLike, nombreCompleto: NOMBRE } = require('../../utils/sql');

const COLUMNAS = `
  v.id, v.placa, v.tipo, v.color, v.marca, v.modelo, v.usuario_id, v.activo,
  v.created_at, v.updated_at,
  u.tipo_documento AS prop_tipo_documento, u.numero_documento AS prop_numero_documento,
  CONCAT_WS(' ', u.primer_nombre, u.segundo_nombre, u.primer_apellido, u.segundo_apellido) AS prop_nombre`;

const DESDE = 'FROM vehiculos v LEFT JOIN usuarios u ON u.id = v.usuario_id';

const ORDEN = {
  id: 'v.id',
  placa: 'v.placa',
  tipo: 'v.tipo',
  marca: 'v.marca',
  propietario: 'u.primer_apellido',
};


function filtros({ placa, tipo, propietario, usuario_id, q, activo }) {
  const condiciones = [];
  const valores = [];
  if (placa) {
    condiciones.push('v.placa LIKE ?');
    valores.push(`%${escaparLike(placa)}%`);
  }
  if (tipo) {
    condiciones.push('v.tipo = ?');
    valores.push(tipo);
  }
  if (propietario === 'con') condiciones.push('v.usuario_id IS NOT NULL');
  if (propietario === 'sin') condiciones.push('v.usuario_id IS NULL');
  if (usuario_id) {
    condiciones.push('v.usuario_id = ?');
    valores.push(usuario_id);
  }
  if (q) {
    const texto = escaparLike(q);
    condiciones.push(`(u.numero_documento LIKE ?
      OR CONCAT_WS(' ', u.primer_nombre, u.segundo_nombre, u.primer_apellido, u.segundo_apellido) LIKE ?)`);
    valores.push(`${texto}%`, `%${texto}%`);
  }
  if (activo !== undefined) {
    condiciones.push('v.activo = ?');
    valores.push(Number(activo));
  }
  return { where: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '', valores };
}

async function listar({ limit, offset, orden, dir, ...resto }) {
  const { where, valores } = filtros(resto);
  const direccion = dir === 'desc' ? 'DESC' : 'ASC';
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} ${DESDE} ${where}
      ORDER BY ${ORDEN[orden]} ${direccion}, v.id ASC
      LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${DESDE} ${where}`, valores);
  return { filas, total };
}

async function buscarPorId(id, conexion = pool) {
  const [filas] = await conexion.query(`SELECT ${COLUMNAS} ${DESDE} WHERE v.id = ?`, [id]);
  return filas[0] ?? null;
}

async function buscarPorPlaca(placa) {
  const [filas] = await pool.query(`SELECT ${COLUMNAS} ${DESDE} WHERE v.placa = ?`, [placa]);
  return filas[0] ?? null;
}

async function existePlaca(placa, excluirId = 0) {
  const [filas] = await pool.query('SELECT 1 FROM vehiculos WHERE placa = ? AND id <> ? LIMIT 1', [
    placa,
    excluirId,
  ]);
  return filas.length > 0;
}

async function listarPorUsuario(usuarioId) {
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} ${DESDE} WHERE v.usuario_id = ? AND v.activo = 1 ORDER BY v.placa`,
    [usuarioId]
  );
  return filas;
}

async function tieneEstadiaAbierta(vehiculoId) {
  const [filas] = await pool.query(
    "SELECT 1 FROM estadias WHERE vehiculo_id = ? AND estado = 'en_curso' LIMIT 1",
    [vehiculoId]
  );
  return filas.length > 0;
}

async function insertar(datos, conexion = pool) {
  const [resultado] = await conexion.query(
    `INSERT INTO vehiculos (placa, tipo, color, marca, modelo, usuario_id, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.placa,
      datos.tipo,
      datos.color,
      datos.marca,
      datos.modelo,
      datos.usuario_id ?? null,
      datos.creado_por,
    ]
  );
  return resultado.insertId;
}

async function actualizar(id, datos) {
  await pool.query(
    'UPDATE vehiculos SET placa = ?, tipo = ?, color = ?, marca = ?, modelo = ?, activo = ? WHERE id = ?',
    [datos.placa, datos.tipo, datos.color, datos.marca, datos.modelo, datos.activo ? 1 : 0, id]
  );
}

async function actualizarPropietario(id, usuarioId, conexion = pool) {
  await conexion.query('UPDATE vehiculos SET usuario_id = ? WHERE id = ?', [usuarioId, id]);
}

async function insertarHistorial(
  { vehiculo_id, usuario_anterior_id, usuario_nuevo_id, cambiado_por, motivo },
  conexion = pool
) {
  await conexion.query(
    `INSERT INTO vehiculos_historial_propietario
       (vehiculo_id, usuario_anterior_id, usuario_nuevo_id, cambiado_por, fecha, motivo)
     VALUES (?, ?, ?, ?, NOW(), ?)`,
    [vehiculo_id, usuario_anterior_id, usuario_nuevo_id, cambiado_por, motivo ?? null]
  );
}


async function listarHistorial(vehiculoId) {
  const [filas] = await pool.query(
    `SELECT h.id, h.fecha, h.motivo,
            h.usuario_anterior_id, ${NOMBRE('ua')} AS anterior_nombre,
            ua.tipo_documento AS anterior_tipo_documento, ua.numero_documento AS anterior_numero_documento,
            h.usuario_nuevo_id, ${NOMBRE('un')} AS nuevo_nombre,
            un.tipo_documento AS nuevo_tipo_documento, un.numero_documento AS nuevo_numero_documento,
            ${NOMBRE('uc')} AS cambiado_por_nombre
       FROM vehiculos_historial_propietario h
       LEFT JOIN usuarios ua ON ua.id = h.usuario_anterior_id
       LEFT JOIN usuarios un ON un.id = h.usuario_nuevo_id
       JOIN usuarios uc ON uc.id = h.cambiado_por
      WHERE h.vehiculo_id = ?
      ORDER BY h.fecha DESC, h.id DESC`,
    [vehiculoId]
  );
  return filas;
}

module.exports = {
  listar,
  buscarPorId,
  buscarPorPlaca,
  existePlaca,
  listarPorUsuario,
  tieneEstadiaAbierta,
  insertar,
  actualizar,
  actualizarPropietario,
  insertarHistorial,
  listarHistorial,
};
