// Acceso a datos de celdas. La consulta de detalle une el vehículo actual, la
// estadía abierta, la mensualidad con celda fija vigente y la reserva activa.
const { pool } = require('../../config/db');

// Las columnas generadas *_abierta / *_activa (únicas) garantizan 0 o 1 fila por celda.
const SELECT_DETALLE = `
  SELECT c.id, c.parqueadero_id, c.piso_id, p.nombre AS piso_nombre, p.orden AS piso_orden,
         c.codigo, c.area, c.tipo, c.es_accesible, c.fila_mapa, c.posicion, c.estado,
         c.vehiculo_actual_id, c.nota, c.activa,
         v.placa, v.marca, v.modelo, v.color,
         CONCAT_WS(' ', uo.primer_nombre, uo.primer_apellido) AS propietario_nombre,
         e.id AS estadia_id, e.codigo_ticket, e.fecha_hora_entrada, e.tipo_cliente,
         m.id AS membresia_id, m.fecha_fin AS membresia_fin, m.vehiculo_id AS membresia_vehiculo_id,
         vm.placa AS membresia_placa,
         CONCAT_WS(' ', ut.primer_nombre, ut.primer_apellido) AS titular_nombre,
         r.id AS reserva_id, r.fecha_hora_expiracion AS reserva_expira,
         r.vehiculo_id AS reserva_vehiculo_id, vr.placa AS reserva_placa
    FROM celdas c
    JOIN pisos p ON p.id = c.piso_id
    LEFT JOIN vehiculos v ON v.id = c.vehiculo_actual_id
    LEFT JOIN usuarios uo ON uo.id = v.usuario_id
    LEFT JOIN estadias e ON e.celda_estadia_abierta = c.id
    LEFT JOIN membresias m ON m.id = (
      SELECT m2.id FROM membresias m2
       WHERE m2.celda_asignada_id = c.id AND m2.estado = 'activa'
         AND CURDATE() BETWEEN m2.fecha_inicio AND m2.fecha_fin
       ORDER BY m2.fecha_fin DESC LIMIT 1)
    LEFT JOIN vehiculos vm ON vm.id = m.vehiculo_id
    LEFT JOIN usuarios ut ON ut.id = m.usuario_id
    LEFT JOIN reservas r ON r.celda_reserva_activa = c.id
    LEFT JOIN vehiculos vr ON vr.id = r.vehiculo_id`;

const ORDEN = 'ORDER BY p.orden, c.fila_mapa, c.posicion';

async function listar({
  id,
  piso_id,
  area,
  tipo,
  estado,
  accesible,
  incluirInactivas = false,
} = {}) {
  const condiciones = [];
  const valores = [];
  const agregar = (sql, valor) => {
    condiciones.push(sql);
    valores.push(valor);
  };
  if (id) agregar('c.id = ?', id);
  if (piso_id) agregar('c.piso_id = ?', piso_id);
  if (area) agregar('c.area = ?', area);
  if (tipo) agregar('c.tipo = ?', tipo);
  if (estado) agregar('c.estado = ?', estado);
  if (accesible !== undefined) agregar('c.es_accesible = ?', Number(accesible));
  if (!incluirInactivas) condiciones.push('c.activa = 1');
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(`${SELECT_DETALLE} ${where} ${ORDEN}`, valores);
  return filas;
}

async function buscarDetalle(id) {
  return (await listar({ id, incluirInactivas: true }))[0] ?? null;
}

/** Bloquea la celda para cambiar su estado dentro de una transacción. */
async function bloquear(id, conexion) {
  const [filas] = await conexion.query('SELECT * FROM celdas WHERE id = ? FOR UPDATE', [id]);
  return filas[0] ?? null;
}

async function tieneEstadiaAbierta(celdaId, conexion = pool) {
  const [filas] = await conexion.query(
    'SELECT id FROM estadias WHERE celda_estadia_abierta = ? LIMIT 1',
    [celdaId]
  );
  return filas.length > 0;
}

/** Mensualidad vigente con esta celda fija (o null). */
async function membresiaFija(celdaId, conexion = pool) {
  const [filas] = await conexion.query(
    `SELECT id, vehiculo_id FROM membresias
      WHERE celda_asignada_id = ? AND estado = 'activa'
        AND CURDATE() BETWEEN fecha_inicio AND fecha_fin
      ORDER BY fecha_fin DESC LIMIT 1`,
    [celdaId]
  );
  return filas[0] ?? null;
}

async function reservaActiva(celdaId, conexion = pool) {
  const [filas] = await conexion.query(
    'SELECT id, vehiculo_id FROM reservas WHERE celda_reserva_activa = ? LIMIT 1',
    [celdaId]
  );
  return filas[0] ?? null;
}

/** Celda donde está hoy un vehículo (o null). */
async function celdaDelVehiculo(vehiculoId, conexion = pool) {
  const [filas] = await conexion.query(
    'SELECT id, codigo FROM celdas WHERE vehiculo_actual_id = ? LIMIT 1',
    [vehiculoId]
  );
  return filas[0] ?? null;
}

async function actualizarEstado(id, { estado, vehiculo_actual_id, nota }, conexion = pool) {
  await conexion.query(
    'UPDATE celdas SET estado = ?, vehiculo_actual_id = ?, nota = ? WHERE id = ?',
    [estado, vehiculo_actual_id ?? null, nota ?? null, id]
  );
}

/** Filas mínimas para el resumen (solo celdas activas). */
async function filasResumen() {
  const [filas] = await pool.query(
    `SELECT c.estado, c.tipo, c.area, c.piso_id, p.nombre AS piso_nombre, p.orden AS piso_orden
       FROM celdas c JOIN pisos p ON p.id = c.piso_id
      WHERE c.activa = 1`
  );
  return filas;
}

async function obtenerPiso(id) {
  const [filas] = await pool.query('SELECT id, parqueadero_id, nombre FROM pisos WHERE id = ?', [
    id,
  ]);
  return filas[0] ?? null;
}

async function existeCodigo(parqueaderoId, codigo, excluirId = 0) {
  const [filas] = await pool.query(
    'SELECT 1 FROM celdas WHERE parqueadero_id = ? AND codigo = ? AND id <> ? LIMIT 1',
    [parqueaderoId, codigo, excluirId]
  );
  return filas.length > 0;
}

/** Código de la celda que ya ocupa esa posición del mapa (o null). */
async function celdaEnPosicion(pisoId, fila, posicion, excluirId = 0) {
  const [filas] = await pool.query(
    'SELECT codigo FROM celdas WHERE piso_id = ? AND fila_mapa = ? AND posicion = ? AND id <> ? LIMIT 1',
    [pisoId, fila, posicion, excluirId]
  );
  return filas[0]?.codigo ?? null;
}

async function insertar(datos) {
  const [resultado] = await pool.query(
    `INSERT INTO celdas
       (parqueadero_id, piso_id, codigo, area, tipo, es_accesible, fila_mapa, posicion, estado, nota)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.parqueadero_id,
      datos.piso_id,
      datos.codigo,
      datos.area,
      datos.tipo,
      datos.es_accesible ? 1 : 0,
      datos.fila_mapa,
      datos.posicion,
      datos.estado,
      datos.nota ?? null,
    ]
  );
  return resultado.insertId;
}

async function actualizar(id, datos) {
  await pool.query(
    `UPDATE celdas
        SET parqueadero_id = ?, piso_id = ?, codigo = ?, area = ?, tipo = ?, es_accesible = ?,
            fila_mapa = ?, posicion = ?
      WHERE id = ?`,
    [
      datos.parqueadero_id,
      datos.piso_id,
      datos.codigo,
      datos.area,
      datos.tipo,
      datos.es_accesible ? 1 : 0,
      datos.fila_mapa,
      datos.posicion,
      id,
    ]
  );
}

async function actualizarActiva(id, activa) {
  await pool.query('UPDATE celdas SET activa = ? WHERE id = ?', [activa ? 1 : 0, id]);
}

module.exports = {
  listar,
  buscarDetalle,
  bloquear,
  tieneEstadiaAbierta,
  membresiaFija,
  reservaActiva,
  celdaDelVehiculo,
  actualizarEstado,
  filasResumen,
  obtenerPiso,
  existeCodigo,
  celdaEnPosicion,
  insertar,
  actualizar,
  actualizarActiva,
};
