const { pool } = require('../../config/db');

const COLUMNAS = `t.id, t.tipo_vehiculo, t.valor_fraccion, t.minutos_fraccion, t.minutos_gracia,
  t.valor_dia_maximo, t.vigente_desde, t.activa, t.created_at,
  CONCAT_WS(' ', u.primer_nombre, u.primer_apellido) AS creado_por`;

/** Tarifa vigente de un tipo: activa y con la vigencia más reciente ya iniciada. */
async function vigente(tipo, conexion = pool) {
  const [filas] = await conexion.query(
    `SELECT ${COLUMNAS} FROM tarifas t LEFT JOIN usuarios u ON u.id = t.creado_por
      WHERE t.tipo_vehiculo = ? AND t.activa = 1 AND t.vigente_desde <= NOW()
      ORDER BY t.vigente_desde DESC, t.id DESC LIMIT 1`,
    [tipo]
  );
  return filas[0] ?? null;
}

async function historial(tipo) {
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} FROM tarifas t LEFT JOIN usuarios u ON u.id = t.creado_por
      ${tipo ? 'WHERE t.tipo_vehiculo = ?' : ''}
      ORDER BY t.tipo_vehiculo, t.vigente_desde DESC, t.id DESC`,
    tipo ? [tipo] : []
  );
  return filas;
}

async function buscarPorId(id) {
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} FROM tarifas t LEFT JOIN usuarios u ON u.id = t.creado_por WHERE t.id = ?`,
    [id]
  );
  return filas[0] ?? null;
}

async function desactivarTipo(tipo, conexion) {
  await conexion.query('UPDATE tarifas SET activa = 0 WHERE tipo_vehiculo = ? AND activa = 1', [
    tipo,
  ]);
}

// vigente_desde = NOW() de MySQL: un Date de JS con milisegundos se redondea en DATETIME y
// podía quedar un segundo en el futuro, dejando un instante sin tarifa vigente.
async function insertar(d, conexion) {
  const [r] = await conexion.query(
    `INSERT INTO tarifas
       (tipo_vehiculo, valor_fraccion, minutos_fraccion, minutos_gracia, valor_dia_maximo, vigente_desde, activa, creado_por)
     VALUES (?, ?, ?, ?, ?, NOW(), 1, ?)`,
    [
      d.tipo_vehiculo,
      d.valor_fraccion,
      d.minutos_fraccion,
      d.minutos_gracia,
      d.valor_dia_maximo,
      d.creado_por,
    ]
  );
  return r.insertId;
}

module.exports = { vigente, historial, buscarPorId, desactivarTipo, insertar };
