const { pool } = require('../../config/db');

const COLUMNAS = `id, tipo_vehiculo, dia_semana, digito, TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio,
  TIME_FORMAT(hora_fin, '%H:%i') AS hora_fin, activa, created_at, updated_at`;

async function listar({ tipo_vehiculo, dia_semana, activa } = {}) {
  const condiciones = [];
  const valores = [];
  if (tipo_vehiculo) {
    condiciones.push('tipo_vehiculo = ?');
    valores.push(tipo_vehiculo);
  }
  if (dia_semana) {
    condiciones.push('dia_semana = ?');
    valores.push(dia_semana);
  }
  if (activa !== undefined) {
    condiciones.push('activa = ?');
    valores.push(Number(activa));
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} FROM pico_placa ${where} ORDER BY dia_semana, tipo_vehiculo, digito, hora_inicio`,
    valores
  );
  return filas;
}

async function listarActivas() {
  return listar({ activa: 1 });
}

async function buscarPorId(id) {
  const [filas] = await pool.query(`SELECT ${COLUMNAS} FROM pico_placa WHERE id = ?`, [id]);
  return filas[0] ?? null;
}

/** Reglas del mismo tipo, día y dígito cuyo horario se cruza con el dado. */
async function buscarSolapadas(
  { tipo_vehiculo, dia_semana, digito, hora_inicio, hora_fin },
  excluirId = 0
) {
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} FROM pico_placa
      WHERE tipo_vehiculo = ? AND dia_semana = ? AND digito = ? AND id <> ?
        AND hora_inicio < ? AND hora_fin > ?`,
    [tipo_vehiculo, dia_semana, digito, excluirId, hora_fin, hora_inicio]
  );
  return filas;
}

async function insertar(datos, creadoPor) {
  const [r] = await pool.query(
    `INSERT INTO pico_placa (tipo_vehiculo, dia_semana, digito, hora_inicio, hora_fin, activa, creado_por)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [
      datos.tipo_vehiculo,
      datos.dia_semana,
      datos.digito,
      datos.hora_inicio,
      datos.hora_fin,
      creadoPor,
    ]
  );
  return r.insertId;
}

async function actualizar(id, datos) {
  await pool.query(
    'UPDATE pico_placa SET tipo_vehiculo = ?, dia_semana = ?, digito = ?, hora_inicio = ?, hora_fin = ? WHERE id = ?',
    [datos.tipo_vehiculo, datos.dia_semana, datos.digito, datos.hora_inicio, datos.hora_fin, id]
  );
}

async function actualizarActiva(id, activa) {
  await pool.query('UPDATE pico_placa SET activa = ? WHERE id = ?', [activa ? 1 : 0, id]);
}

module.exports = {
  listar,
  listarActivas,
  buscarPorId,
  buscarSolapadas,
  insertar,
  actualizar,
  actualizarActiva,
};
