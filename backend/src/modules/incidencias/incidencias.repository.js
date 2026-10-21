const { pool } = require('../../config/db');
const { escaparLike, nombreCompleto: nombre } = require('../../utils/sql');


// ---------------------------------------------------------------- tipos
async function listarTipos({ soloActivos }) {
  const [filas] = await pool.query(
    `SELECT t.id, t.nombre, t.descripcion, t.activo,
            (SELECT COUNT(*) FROM incidencias i WHERE i.tipo_incidencia_id = t.id) AS usos
       FROM tipos_incidencia t
      ${soloActivos ? 'WHERE t.activo = 1' : ''}
      ORDER BY t.nombre`
  );
  return filas;
}

async function buscarTipo(id, conexion = pool) {
  const [filas] = await conexion.query(
    'SELECT id, nombre, descripcion, activo, 0 AS usos FROM tipos_incidencia WHERE id = ?',
    [id]
  );
  return filas[0] ?? null;
}

async function existeNombreTipo(nombreTipo, excluirId = 0) {
  const [filas] = await pool.query(
    'SELECT 1 FROM tipos_incidencia WHERE nombre = ? AND id <> ? LIMIT 1',
    [nombreTipo, excluirId]
  );
  return filas.length > 0;
}

async function insertarTipo({ nombre: n, descripcion }) {
  const [r] = await pool.query('INSERT INTO tipos_incidencia (nombre, descripcion) VALUES (?, ?)', [
    n,
    descripcion ?? null,
  ]);
  return r.insertId;
}

async function actualizarTipo(id, { nombre: n, descripcion }) {
  await pool.query('UPDATE tipos_incidencia SET nombre = ?, descripcion = ? WHERE id = ?', [
    n,
    descripcion ?? null,
    id,
  ]);
}

async function actualizarActivoTipo(id, activo) {
  await pool.query('UPDATE tipos_incidencia SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
}

// ---------------------------------------------------------------- apoyo
async function vehiculoPorPlaca(placa, conexion = pool) {
  const [filas] = await conexion.query(
    `SELECT v.id, v.placa, v.tipo, v.usuario_id, v.activo
       FROM vehiculos v WHERE v.placa = ?`,
    [placa]
  );
  return filas[0] ?? null;
}

async function celda(id, conexion = pool) {
  const [filas] = await conexion.query('SELECT id, codigo, activa FROM celdas WHERE id = ?', [id]);
  return filas[0] ?? null;
}

async function estadiaAbierta(vehiculoId, conexion = pool) {
  const [filas] = await conexion.query(
    "SELECT id, celda_id FROM estadias WHERE vehiculo_id = ? AND estado = 'en_curso' LIMIT 1",
    [vehiculoId]
  );
  return filas[0] ?? null;
}

/**
 * Siguiente código del día: INC-AAAAMMDD-0001. Usa `consecutivos` (fila por día) con
 * bloqueo FOR UPDATE: dos registros simultáneos nunca obtienen el mismo número.
 * Si la fila del día no existe se inicia con el mayor sufijo ya usado ese día.
 */
async function siguienteCodigo(conexion) {
  // Fecha y hora del servidor en una sola lectura: el código y fecha_hora siempre coinciden.
  const [[{ dia, ahora }]] = await conexion.query(
    "SELECT DATE_FORMAT(NOW(), '%Y%m%d') AS dia, NOW() AS ahora"
  );
  const clave = `incidencia-${dia}`;
  // Lectura sin bloqueo del mayor sufijo del día (INSERT … SELECT bloquearía incidencias
  // y dos registros simultáneos chocarían en un deadlock); el orden lo da FOR UPDATE.
  const [[{ maximo }]] = await conexion.query(
    'SELECT COALESCE(MAX(CAST(SUBSTRING(codigo, 14) AS UNSIGNED)), 0) AS maximo FROM incidencias WHERE codigo LIKE ?',
    [`INC-${dia}-%`]
  );
  await conexion.query(
    'INSERT INTO consecutivos (nombre, ultimo) VALUES (?, ?) ON DUPLICATE KEY UPDATE nombre = nombre',
    [clave, maximo]
  );
  const [[fila]] = await conexion.query(
    'SELECT ultimo FROM consecutivos WHERE nombre = ? FOR UPDATE',
    [clave]
  );
  const siguiente = fila.ultimo + 1;
  await conexion.query('UPDATE consecutivos SET ultimo = ? WHERE nombre = ?', [siguiente, clave]);
  return { codigo: `INC-${dia}-${String(siguiente).padStart(4, '0')}`, ahora };
}

async function insertar(d, conexion) {
  const [r] = await conexion.query(
    `INSERT INTO incidencias
       (codigo, tipo_incidencia_id, vehiculo_id, celda_id, estadia_id, descripcion, fecha_hora, registrada_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.codigo,
      d.tipo_incidencia_id,
      d.vehiculo_id,
      d.celda_id ?? null,
      d.estadia_id ?? null,
      d.descripcion,
      d.fecha_hora,
      d.registrada_por,
    ]
  );
  return r.insertId;
}

// ---------------------------------------------------------------- consultas
const SELECT = `
  SELECT i.id, i.codigo, i.descripcion, i.fecha_hora, i.estadia_id,
         t.id AS tipo_id, t.nombre AS tipo_nombre,
         v.id AS vehiculo_id, v.placa, v.tipo AS tipo_vehiculo, v.marca, v.modelo, v.color,
         p.id AS propietario_id, ${nombre('p')} AS propietario_nombre,
         c.id AS celda_id, c.codigo AS celda_codigo, pi.nombre AS piso_nombre,
         r.id AS registrada_por_id, ${nombre('r')} AS registrada_por_nombre
    FROM incidencias i
    JOIN tipos_incidencia t ON t.id = i.tipo_incidencia_id
    JOIN vehiculos v ON v.id = i.vehiculo_id
    LEFT JOIN usuarios p ON p.id = v.usuario_id
    LEFT JOIN celdas c ON c.id = i.celda_id
    LEFT JOIN pisos pi ON pi.id = c.piso_id
    JOIN usuarios r ON r.id = i.registrada_por`;

function filtros({ tipo_id, placa, desde, hasta, propietario_id }) {
  const condiciones = [];
  const valores = [];
  if (tipo_id) {
    condiciones.push('i.tipo_incidencia_id = ?');
    valores.push(tipo_id);
  }
  if (placa) {
    condiciones.push('v.placa LIKE ?');
    valores.push(`%${escaparLike(placa)}%`);
  }
  if (desde) {
    condiciones.push('i.fecha_hora >= ?');
    valores.push(`${desde} 00:00:00`);
  }
  if (hasta) {
    condiciones.push('i.fecha_hora <= ?');
    valores.push(`${hasta} 23:59:59`);
  }
  if (propietario_id) {
    condiciones.push('v.usuario_id = ?');
    valores.push(propietario_id);
  }
  return { where: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '', valores };
}

async function listar(consulta, { limit, offset }) {
  const { where, valores } = filtros(consulta);
  const [filas] = await pool.query(
    `${SELECT} ${where} ORDER BY i.fecha_hora DESC, i.id DESC LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM incidencias i JOIN vehiculos v ON v.id = i.vehiculo_id ${where}`,
    valores
  );
  return { filas, total };
}

async function buscarDetalle(id) {
  const [filas] = await pool.query(`${SELECT} WHERE i.id = ?`, [id]);
  return filas[0] ?? null;
}

module.exports = {
  listarTipos,
  buscarTipo,
  existeNombreTipo,
  insertarTipo,
  actualizarTipo,
  actualizarActivoTipo,
  vehiculoPorPlaca,
  celda,
  estadiaAbierta,
  siguienteCodigo,
  insertar,
  listar,
  buscarDetalle,
};
