// Único lugar con SQL de vehículos y de su historial de propietarios. Acepta una conexión opcional
// para la transacción. «dentro» = movimiento abierto (research R-07).
const { pool } = require('../../config/db');
const { escapeLike } = require('../../utils/sql');
const { aIsoBogota } = require('../../utils/fechas');
const { normalizarPlaca } = require('./vehiculos.reglas');

const COLUMNAS = `v.id_vehiculo, v.placa, v.tipo, v.color, v.marca, v.modelo, v.estado, v.id_propietario,
  v.created_at, v.updated_at,
  u.nombre_completo AS propietario_nombre, u.tipo_documento AS propietario_tipo_documento,
  u.numero_documento AS propietario_numero_documento, u.estado AS propietario_estado,
  m.id_movimiento AS movimiento_abierto, c.codigo AS celda_actual`;

const DESDE = `FROM vehiculo v
  LEFT JOIN usuario u ON u.id_usuario = v.id_propietario
  LEFT JOIN movimiento m ON m.vehiculo_abierto = v.id_vehiculo
  LEFT JOIN celda c ON c.id_celda = m.id_celda`;

const aVehiculo = (f) =>
  f && {
    idVehiculo: f.id_vehiculo,
    placa: f.placa,
    tipo: f.tipo,
    color: f.color,
    marca: f.marca,
    modelo: f.modelo,
    estado: f.estado,
    dentro: f.movimiento_abierto !== null,
    celdaActual: f.celda_actual ?? null,
    propietario: f.id_propietario
      ? {
          idUsuario: f.id_propietario,
          nombre: f.propietario_nombre,
          tipoDocumento: f.propietario_tipo_documento,
          numeroDocumento: f.propietario_numero_documento,
          estado: f.propietario_estado,
        }
      : null,
    createdAt: aIsoBogota(f.created_at),
    updatedAt: aIsoBogota(f.updated_at),
  };

/** RF-VEH-10: página de vehículos con búsqueda por placa o propietario y filtros (R-08). */
async function listar({ q, tipo, propietario, dentro, idPropietarioSesion, limit, offset }) {
  const condiciones = [];
  const valores = [];
  if (q) {
    const placa = normalizarPlaca(q);
    condiciones.push('(v.placa LIKE ? OR u.nombre_completo LIKE ? OR u.numero_documento LIKE ?)');
    valores.push(`%${escapeLike(placa || q)}%`, `%${escapeLike(q)}%`, `${escapeLike(q)}%`);
  }
  if (tipo) {
    condiciones.push('v.tipo = ?');
    valores.push(tipo);
  }
  if (propietario === 'ninguno') condiciones.push('v.id_propietario IS NULL');
  else if (propietario) {
    condiciones.push('v.id_propietario = ?');
    valores.push(propietario);
  }
  if (idPropietarioSesion) {
    condiciones.push('v.id_propietario = ?');
    valores.push(idPropietarioSesion);
  }
  if (dentro !== undefined) condiciones.push(dentro ? 'm.id_movimiento IS NOT NULL' : 'm.id_movimiento IS NULL');
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(`SELECT ${COLUMNAS} ${DESDE} ${donde} ORDER BY v.placa LIMIT ? OFFSET ?`, [
    ...valores,
    limit,
    offset,
  ]);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${DESDE} ${donde}`, valores);
  return { filas: filas.map(aVehiculo), total: Number(total) };
}

/** Vehículo con propietario y presencia; `bloquear` toma la fila con FOR UPDATE. */
async function obtenerPorId(id, { conexion = pool, bloquear = false } = {}) {
  if (bloquear) await conexion.query('SELECT id_vehiculo FROM vehiculo WHERE id_vehiculo = ? FOR UPDATE', [id]);
  const [[fila]] = await conexion.query(`SELECT ${COLUMNAS} ${DESDE} WHERE v.id_vehiculo = ?`, [id]);
  return aVehiculo(fila) ?? null;
}

/** Vehículo por placa (normalizada); `bloquear` toma la fila con FOR UPDATE (entrada de la spec 007). */
async function obtenerPorPlaca(placa, { conexion = pool, bloquear = false } = {}) {
  const [[fila]] = await conexion.query(`SELECT id_vehiculo FROM vehiculo WHERE placa = ? ${bloquear ? 'FOR UPDATE' : ''}`, [placa]);
  return fila ? obtenerPorId(fila.id_vehiculo, { conexion }) : null;
}

async function insertar({ placa, tipo, color, marca, modelo }, { conexion = pool } = {}) {
  const [r] = await conexion.query('INSERT INTO vehiculo (placa, tipo, color, marca, modelo) VALUES (?, ?, ?, ?, ?)', [
    placa,
    tipo,
    color,
    marca,
    modelo,
  ]);
  return r.insertId;
}

async function actualizar(id, { placa, tipo, color, marca, modelo }, { conexion = pool } = {}) {
  await conexion.query('UPDATE vehiculo SET placa = ?, tipo = ?, color = ?, marca = ?, modelo = ? WHERE id_vehiculo = ?', [
    placa,
    tipo,
    color,
    marca,
    modelo,
    id,
  ]);
}

/** Cambia el propietario: cierra el periodo abierto y, si hay nuevo propietario, abre otro (R-05). */
async function cambiarPropietario(id, idUsuario, idRegistro, { conexion }) {
  await conexion.query('UPDATE historial_propietario SET fecha_hasta = NOW() WHERE id_vehiculo = ? AND fecha_hasta IS NULL', [id]);
  await conexion.query('UPDATE vehiculo SET id_propietario = ? WHERE id_vehiculo = ?', [idUsuario, id]);
  if (idUsuario) {
    await conexion.query(
      'INSERT INTO historial_propietario (id_vehiculo, id_usuario, fecha_desde, id_usuario_registro) VALUES (?, ?, NOW(), ?)',
      [id, idUsuario, idRegistro ?? null]
    );
  }
}

/** Usuario por id o por documento (para asociar), con su estado. */
async function buscarUsuario({ idUsuario, tipoDocumento, numeroDocumento }, { conexion = pool } = {}) {
  const [[fila]] = idUsuario
    ? await conexion.query('SELECT id_usuario, nombre_completo, estado FROM usuario WHERE id_usuario = ?', [idUsuario])
    : await conexion.query(
        'SELECT id_usuario, nombre_completo, estado FROM usuario WHERE tipo_documento = ? AND numero_documento = ?',
        [tipoDocumento, numeroDocumento]
      );
  return fila ? { idUsuario: fila.id_usuario, nombre: fila.nombre_completo, estado: fila.estado } : null;
}

/** RF-VEH-08: periodos de propiedad, el más reciente primero. */
async function historial(id) {
  const [filas] = await pool.query(
    `SELECT h.id_usuario, u.nombre_completo, h.fecha_desde, h.fecha_hasta
       FROM historial_propietario h JOIN usuario u ON u.id_usuario = h.id_usuario
      WHERE h.id_vehiculo = ? ORDER BY h.fecha_desde DESC, h.id_historial DESC`,
    [id]
  );
  return filas.map((f) => ({
    idUsuario: f.id_usuario,
    nombre: f.nombre_completo,
    desde: aIsoBogota(f.fecha_desde),
    hasta: aIsoBogota(f.fecha_hasta),
  }));
}

/** RF-VEH-11: últimos 10 movimientos. */
async function ultimosMovimientos(id) {
  const [filas] = await pool.query(
    `SELECT m.id_movimiento, m.fecha_hora_entrada, m.fecha_hora_salida, m.minutos_estadia, m.estado, c.codigo
       FROM movimiento m JOIN celda c ON c.id_celda = m.id_celda
      WHERE m.id_vehiculo = ? ORDER BY m.fecha_hora_entrada DESC, m.id_movimiento DESC LIMIT 10`,
    [id]
  );
  return filas.map((f) => ({
    idMovimiento: f.id_movimiento,
    fechaHoraEntrada: aIsoBogota(f.fecha_hora_entrada),
    fechaHoraSalida: aIsoBogota(f.fecha_hora_salida),
    minutosEstadia: f.minutos_estadia,
    celda: f.codigo,
    estado: f.estado,
  }));
}

module.exports = {
  listar,
  obtenerPorId,
  obtenerPorPlaca,
  insertar,
  actualizar,
  cambiarPropietario,
  buscarUsuario,
  historial,
  ultimosMovimientos,
};
