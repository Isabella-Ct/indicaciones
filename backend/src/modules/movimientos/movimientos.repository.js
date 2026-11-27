// Único lugar con SQL de movimientos, tickets e intentos rechazados. Acepta una conexión opcional
// para la transacción. Las fechas llegan del reloj del servidor (RN-16).
const { pool } = require('../../config/db');
const { escapeLike } = require('../../utils/sql');
const { aIsoBogota } = require('../../utils/fechas');

const COLUMNAS = `m.id_movimiento, m.estado, m.fecha_hora_entrada, m.fecha_hora_salida, m.minutos_estadia,
  m.motivo_anulacion, m.fecha_anulacion, m.id_vehiculo, m.id_celda,
  v.placa, v.tipo, v.id_propietario,
  c.codigo AS celda_codigo, c.piso AS celda_piso, c.id_parqueadero, p.nombre AS parqueadero,
  m.id_puerta_entrada, pe.nombre AS puerta_entrada, m.id_puerta_salida, ps.nombre AS puerta_salida,
  m.id_operador_entrada, ue.nombre_completo AS operador_entrada,
  m.id_operador_salida, us.nombre_completo AS operador_salida,
  ua.nombre_completo AS usuario_anulacion,
  t.codigo AS ticket, t.valido AS ticket_valido, t.extraviado AS ticket_extraviado`;

const DESDE = `FROM movimiento m
  JOIN vehiculo v ON v.id_vehiculo = m.id_vehiculo
  JOIN celda c ON c.id_celda = m.id_celda
  JOIN parqueadero p ON p.id_parqueadero = c.id_parqueadero
  JOIN puerta_acceso pe ON pe.id_puerta = m.id_puerta_entrada
  LEFT JOIN puerta_acceso ps ON ps.id_puerta = m.id_puerta_salida
  JOIN usuario ue ON ue.id_usuario = m.id_operador_entrada
  LEFT JOIN usuario us ON us.id_usuario = m.id_operador_salida
  LEFT JOIN usuario ua ON ua.id_usuario = m.id_usuario_anulacion
  LEFT JOIN ticket t ON t.id_movimiento = m.id_movimiento`;

const ref = (idValor, nombre, clave = 'idPuerta') => (idValor ? { [clave]: idValor, nombre } : null);

const aMovimiento = (f) =>
  f && {
    idMovimiento: f.id_movimiento,
    estado: f.estado,
    vehiculo: { idVehiculo: f.id_vehiculo, placa: f.placa, tipo: f.tipo, ocasional: f.id_propietario === null },
    parqueadero: { idParqueadero: f.id_parqueadero, nombre: f.parqueadero },
    celda: { idCelda: f.id_celda, codigo: f.celda_codigo, piso: f.celda_piso },
    puertaEntrada: ref(f.id_puerta_entrada, f.puerta_entrada),
    fechaHoraEntrada: aIsoBogota(f.fecha_hora_entrada),
    operadorEntrada: ref(f.id_operador_entrada, f.operador_entrada, 'idUsuario'),
    puertaSalida: ref(f.id_puerta_salida, f.puerta_salida),
    fechaHoraSalida: aIsoBogota(f.fecha_hora_salida),
    operadorSalida: ref(f.id_operador_salida, f.operador_salida, 'idUsuario'),
    minutosEstadia: f.minutos_estadia,
    ticket: f.ticket ? { codigo: f.ticket, valido: Boolean(f.ticket_valido), extraviado: Boolean(f.ticket_extraviado) } : null,
    anulacion: f.estado === 'anulado' ? { motivo: f.motivo_anulacion, usuario: f.usuario_anulacion, fecha: aIsoBogota(f.fecha_anulacion) } : null,
    // Interno: la fecha de entrada como Date para calcular minutos.
    _entrada: f.fecha_hora_entrada,
  };

async function obtenerPorId(id, { conexion = pool, bloquear = false } = {}) {
  if (bloquear) await conexion.query('SELECT id_movimiento FROM movimiento WHERE id_movimiento = ? FOR UPDATE', [id]);
  const [[fila]] = await conexion.query(`SELECT ${COLUMNAS} ${DESDE} WHERE m.id_movimiento = ?`, [id]);
  return aMovimiento(fila) ?? null;
}

/** Movimiento abierto del vehículo (RN-15), o null. */
async function abiertoDeVehiculo(idVehiculo, { conexion = pool } = {}) {
  const [[fila]] = await conexion.query(`SELECT ${COLUMNAS} ${DESDE} WHERE m.vehiculo_abierto = ?`, [idVehiculo]);
  return aMovimiento(fila) ?? null;
}

async function obtenerPorTicket(codigo) {
  const [[fila]] = await pool.query(`SELECT ${COLUMNAS} ${DESDE} WHERE t.codigo = ?`, [codigo]);
  return aMovimiento(fila) ?? null;
}

/** RF-MOV-13: abiertos del más antiguo al más reciente; cerrados y anulados, del más reciente. */
async function listar({ estado, placa, q, limit, offset }) {
  const condiciones = ['m.estado = ?'];
  const valores = [estado];
  if (placa) {
    condiciones.push('v.placa = ?');
    valores.push(placa);
  }
  if (q) {
    condiciones.push('v.placa LIKE ?');
    valores.push(`%${escapeLike(q.toUpperCase().replace(/[\s.-]/g, ''))}%`);
  }
  const donde = `WHERE ${condiciones.join(' AND ')}`;
  const orden = estado === 'abierto' ? 'm.fecha_hora_entrada ASC, m.id_movimiento ASC' : 'm.fecha_hora_entrada DESC, m.id_movimiento DESC';
  const [filas] = await pool.query(`SELECT ${COLUMNAS} ${DESDE} ${donde} ORDER BY ${orden} LIMIT ? OFFSET ?`, [...valores, limit, offset]);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM movimiento m JOIN vehiculo v ON v.id_vehiculo = m.id_vehiculo ${donde}`, valores);
  return { filas: filas.map(aMovimiento), total: Number(total) };
}

async function insertar({ idVehiculo, idCelda, idPuerta, entrada, idOperador }, { conexion }) {
  const [r] = await conexion.query(
    `INSERT INTO movimiento (id_vehiculo, id_celda, id_puerta_entrada, fecha_hora_entrada, id_operador_entrada)
     VALUES (?, ?, ?, ?, ?)`,
    [idVehiculo, idCelda, idPuerta, entrada, idOperador]
  );
  return r.insertId;
}

async function insertarTicket(idMovimiento, codigo, fecha, { conexion }) {
  await conexion.query('INSERT INTO ticket (id_movimiento, codigo, fecha_emision) VALUES (?, ?, ?)', [idMovimiento, codigo, fecha]);
}

async function cerrar(id, { idPuerta, salida, minutos, idOperador, ticketExtraviado }, { conexion }) {
  await conexion.query(
    `UPDATE movimiento SET estado = 'cerrado', id_puerta_salida = ?, fecha_hora_salida = ?, minutos_estadia = ?, id_operador_salida = ?
      WHERE id_movimiento = ?`,
    [idPuerta, salida, minutos, idOperador, id]
  );
  if (ticketExtraviado) await conexion.query('UPDATE ticket SET extraviado = TRUE WHERE id_movimiento = ?', [id]);
}

async function anular(id, { motivo, idUsuario, fecha }, { conexion }) {
  await conexion.query(
    `UPDATE movimiento SET estado = 'anulado', motivo_anulacion = ?, id_usuario_anulacion = ?, fecha_anulacion = ?
      WHERE id_movimiento = ?`,
    [motivo, idUsuario, fecha, id]
  );
  await conexion.query('UPDATE ticket SET valido = FALSE WHERE id_movimiento = ?', [id]);
}

/** R-04: intento de entrada negado por pico y placa (su propia transacción). */
async function insertarRechazo({ placa, tipo, idVehiculo, idPuerta, fecha, motivo, idOperador }) {
  await pool.query(
    `INSERT INTO ingreso_rechazado (placa, tipo_vehiculo, id_vehiculo, id_puerta, fecha_hora, motivo, id_operador)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [placa, tipo, idVehiculo ?? null, idPuerta, fecha, motivo.slice(0, 200), idOperador]
  );
}

module.exports = { obtenerPorId, abiertoDeVehiculo, obtenerPorTicket, listar, insertar, insertarTicket, cerrar, anular, insertarRechazo };
