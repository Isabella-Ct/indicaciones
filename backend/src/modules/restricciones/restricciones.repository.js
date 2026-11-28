// Único lugar con SQL de pico y placa. Acepta una conexión opcional para la transacción.
const { pool } = require('../../config/db');
const { nombreDia } = require('../../utils/fechas');
const { digitosATexto, textoADigitos } = require('./restricciones.reglas');

const COLUMNAS = `id_restriccion, dia_semana, tipo_vehiculo, digitos, posicion_digito,
  TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio, TIME_FORMAT(hora_fin, '%H:%i') AS hora_fin,
  DATE_FORMAT(vigente_desde, '%Y-%m-%d') AS vigente_desde, DATE_FORMAT(vigente_hasta, '%Y-%m-%d') AS vigente_hasta, estado`;

const aRestriccion = (f) =>
  f && {
    idRestriccion: f.id_restriccion,
    diaSemana: f.dia_semana,
    nombreDia: nombreDia(f.dia_semana),
    tipoVehiculo: f.tipo_vehiculo,
    digitos: textoADigitos(f.digitos),
    posicionDigito: f.posicion_digito,
    horaInicio: f.hora_inicio,
    horaFin: f.hora_fin,
    vigenteDesde: f.vigente_desde,
    vigenteHasta: f.vigente_hasta ?? null,
    estado: f.estado,
  };

/** RF-PYP-01: listado para la tabla semanal (por día y tipo). */
async function listar({ tipo, dia, estado, limit, offset }) {
  const condiciones = [];
  const valores = [];
  if (tipo) {
    condiciones.push('tipo_vehiculo = ?');
    valores.push(tipo);
  }
  if (dia) {
    condiciones.push('dia_semana = ?');
    valores.push(dia);
  }
  if (estado) {
    condiciones.push('estado = ?');
    valores.push(estado);
  }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} FROM restriccion_placa ${donde}
      ORDER BY dia_semana, tipo_vehiculo, vigente_desde, id_restriccion LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM restriccion_placa ${donde}`, valores);
  return { filas: filas.map(aRestriccion), total: Number(total) };
}

async function obtenerPorId(id, { conexion = pool, bloquear = false } = {}) {
  const [[fila]] = await conexion.query(
    `SELECT ${COLUMNAS} FROM restriccion_placa WHERE id_restriccion = ? ${bloquear ? 'FOR UPDATE' : ''}`,
    [id]
  );
  return aRestriccion(fila) ?? null;
}

/** Restricciones activas de un día y tipo; con `bloquear` toma las filas (superposición, R-04). */
async function activasDelDia(diaSemana, tipoVehiculo, { conexion = pool, bloquear = false } = {}) {
  const [filas] = await conexion.query(
    `SELECT ${COLUMNAS} FROM restriccion_placa
      WHERE dia_semana = ? AND tipo_vehiculo = ? AND estado = 'activo' ${bloquear ? 'FOR UPDATE' : ''}`,
    [diaSemana, tipoVehiculo]
  );
  return filas.map(aRestriccion);
}

/** Restricciones activas de un día (ambos tipos), para la consulta de hoy y la evaluación. */
async function activasDeDia(diaSemana, { conexion = pool } = {}) {
  const [filas] = await conexion.query(
    `SELECT ${COLUMNAS} FROM restriccion_placa WHERE dia_semana = ? AND estado = 'activo' ORDER BY vigente_desde`,
    [diaSemana]
  );
  return filas.map(aRestriccion);
}

const aFila = (d) => [
  d.diaSemana,
  d.tipoVehiculo,
  digitosATexto(d.digitos),
  d.posicionDigito,
  d.horaInicio,
  d.horaFin,
  d.vigenteDesde,
  d.vigenteHasta ?? null,
];

async function insertar(datos, { conexion }) {
  const [r] = await conexion.query(
    `INSERT INTO restriccion_placa (dia_semana, tipo_vehiculo, digitos, posicion_digito, hora_inicio, hora_fin, vigente_desde, vigente_hasta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    aFila(datos)
  );
  return r.insertId;
}

async function actualizar(id, datos, { conexion }) {
  await conexion.query(
    `UPDATE restriccion_placa SET dia_semana = ?, tipo_vehiculo = ?, digitos = ?, posicion_digito = ?, hora_inicio = ?,
            hora_fin = ?, vigente_desde = ?, vigente_hasta = ?, estado = ? WHERE id_restriccion = ?`,
    [...aFila(datos), datos.estado, id]
  );
}

module.exports = { listar, obtenerPorId, activasDelDia, activasDeDia, insertar, actualizar };
