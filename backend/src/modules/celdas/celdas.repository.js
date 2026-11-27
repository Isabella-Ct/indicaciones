// Único lugar con SQL de celdas. El ocupante (placa y hora de entrada) sale de vehiculo y del movimiento
// abierto de la celda (research R-07). Acepta una conexión opcional para la transacción.
const { pool } = require('../../config/db');
const { escapeLike } = require('../../utils/sql');
const { aIsoBogota } = require('../../utils/fechas');

const COLUMNAS = `c.id_celda, c.id_parqueadero, p.nombre AS parqueadero, p.estado AS parqueadero_estado, p.pisos,
  c.codigo, c.tipo_vehiculo, c.piso, c.area, c.estado, c.motivo_inhabilitacion, c.id_vehiculo_actual,
  v.placa AS ocupante_placa, v.tipo AS ocupante_tipo, m.fecha_hora_entrada AS ocupante_entrada`;

const DESDE = `FROM celda c
  JOIN parqueadero p ON p.id_parqueadero = c.id_parqueadero
  LEFT JOIN vehiculo v ON v.id_vehiculo = c.id_vehiculo_actual
  LEFT JOIN movimiento m ON m.id_celda = c.id_celda AND m.estado = 'abierto'`;

function aCelda(f) {
  return {
    idCelda: f.id_celda,
    idParqueadero: f.id_parqueadero,
    parqueadero: f.parqueadero,
    codigo: f.codigo,
    tipoVehiculo: f.tipo_vehiculo,
    piso: f.piso,
    area: f.area,
    estado: f.estado,
    motivoInhabilitacion: f.motivo_inhabilitacion,
    // Datos internos (el servicio decide si se muestran, RF-CLD-18).
    _ocupante: f.ocupante_placa
      ? { placa: f.ocupante_placa, tipo: f.ocupante_tipo, fechaHoraEntrada: aIsoBogota(f.ocupante_entrada) }
      : null,
    _parqueaderoEstado: f.parqueadero_estado,
    _pisos: f.pisos,
    _idVehiculoActual: f.id_vehiculo_actual,
  };
}

/** RF-CLD-16/17: celdas filtradas, ordenadas por piso, área y código. */
async function listar({ idParqueadero, piso, tipo, estado, q, limit, offset }) {
  const condiciones = [];
  const valores = [];
  const agregar = (sql, valor) => {
    condiciones.push(sql);
    valores.push(valor);
  };
  if (idParqueadero) agregar('c.id_parqueadero = ?', idParqueadero);
  if (piso) agregar('c.piso = ?', piso);
  if (tipo) agregar('c.tipo_vehiculo = ?', tipo);
  if (estado) agregar('c.estado = ?', estado);
  if (q) agregar('c.codigo LIKE ?', `%${escapeLike(q.toUpperCase())}%`);
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} ${DESDE} ${donde} ORDER BY p.nombre, c.piso, c.area, c.codigo LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM celda c ${donde}`, valores);
  return { celdas: filas.map(aCelda), total: Number(total) };
}

async function obtenerPorId(id, { conexion = pool, bloquear = false } = {}) {
  if (bloquear) await conexion.query('SELECT id_celda FROM celda WHERE id_celda = ? FOR UPDATE', [id]);
  const [filas] = await conexion.query(`SELECT ${COLUMNAS} ${DESDE} WHERE c.id_celda = ?`, [id]);
  return filas[0] ? aCelda(filas[0]) : null;
}

/** Datos del parqueadero que se necesitan al crear celdas (bloqueado: no cambia de pisos o estado mientras tanto). */
async function parqueaderoParaCeldas(idParqueadero, { conexion }) {
  const [filas] = await conexion.query(
    'SELECT id_parqueadero, pisos, estado FROM parqueadero WHERE id_parqueadero = ? FOR UPDATE',
    [idParqueadero]
  );
  return filas[0] ?? null;
}

async function insertar({ idParqueadero, codigo, tipoVehiculo, piso, area }, { conexion }) {
  const [r] = await conexion.query(
    "INSERT INTO celda (id_parqueadero, codigo, tipo_vehiculo, piso, area, estado) VALUES (?, ?, ?, ?, ?, 'disponible')",
    [idParqueadero, codigo, tipoVehiculo, piso, area]
  );
  return r.insertId;
}

/** Códigos que ya existen en el parqueadero (para el lote). */
async function codigosExistentes(idParqueadero, codigos, { conexion }) {
  if (codigos.length === 0) return [];
  const [filas] = await conexion.query('SELECT codigo FROM celda WHERE id_parqueadero = ? AND codigo IN (?)', [idParqueadero, codigos]);
  return filas.map((f) => f.codigo.toUpperCase());
}

async function insertarVarias(idParqueadero, codigos, { tipoVehiculo, piso, area }, { conexion }) {
  if (codigos.length === 0) return;
  await conexion.query('INSERT INTO celda (id_parqueadero, codigo, tipo_vehiculo, piso, area, estado) VALUES ?', [
    codigos.map((codigo) => [idParqueadero, codigo, tipoVehiculo, piso, area, 'disponible']),
  ]);
}

async function actualizar(id, { codigo, tipoVehiculo, piso, area }, { conexion }) {
  await conexion.query('UPDATE celda SET codigo = ?, tipo_vehiculo = ?, piso = ?, area = ? WHERE id_celda = ?', [
    codigo,
    tipoVehiculo,
    piso,
    area,
    id,
  ]);
}

async function cambiarEstado(id, estado, motivo, { conexion }) {
  await conexion.query('UPDATE celda SET estado = ?, motivo_inhabilitacion = ? WHERE id_celda = ?', [estado, motivo, id]);
}

/** RF-CLD-19: ocupa la celda con el vehículo (la validación previa es del servicio). */
async function ocupar(id, idVehiculo, { conexion }) {
  await conexion.query(
    "UPDATE celda SET estado = 'ocupada', id_vehiculo_actual = ?, motivo_inhabilitacion = NULL WHERE id_celda = ?",
    [idVehiculo, id]
  );
}

/** RF-CLD-20: deja la celda disponible y sin vehículo. */
async function liberar(id, { conexion }) {
  await conexion.query("UPDATE celda SET estado = 'disponible', id_vehiculo_actual = NULL WHERE id_celda = ?", [id]);
}

/** RF-MOV-04 (para la spec 007): celda disponible de menor código del tipo, sin esperar a filas bloqueadas. */
async function primeraDisponible(idParqueadero, tipoVehiculo, { conexion }) {
  const [filas] = await conexion.query(
    `SELECT c.id_celda FROM celda c JOIN parqueadero p ON p.id_parqueadero = c.id_parqueadero
      WHERE c.id_parqueadero = ? AND c.tipo_vehiculo = ? AND c.estado = 'disponible' AND p.estado = 'activo'
      ORDER BY c.codigo LIMIT 1 FOR UPDATE SKIP LOCKED`,
    [idParqueadero, tipoVehiculo]
  );
  return filas[0]?.id_celda ?? null;
}

module.exports = {
  listar,
  obtenerPorId,
  parqueaderoParaCeldas,
  insertar,
  codigosExistentes,
  insertarVarias,
  actualizar,
  cambiarEstado,
  ocupar,
  liberar,
  primeraDisponible,
};
