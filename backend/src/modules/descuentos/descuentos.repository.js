// Único lugar con SQL de descuentos (spec 011). Acepta una conexión opcional para la transacción.
const { pool } = require('../../config/db');
const { escapeLike } = require('../../utils/sql');

const COLUMNAS = `d.id_descuento, d.nombre, d.tipo, d.valor, d.aplica_tipo_cliente, d.aplica_tipo_vehiculo, d.minutos_minimos,
  d.vigente_desde, d.vigente_hasta, d.estado,
  EXISTS (SELECT 1 FROM liquidacion l WHERE l.id_descuento = d.id_descuento) AS usado`;

const aDescuento = (f) =>
  f && {
    idDescuento: f.id_descuento,
    nombre: f.nombre,
    tipo: f.tipo,
    valor: Number(f.valor),
    aplicaTipoCliente: f.aplica_tipo_cliente,
    aplicaTipoVehiculo: f.aplica_tipo_vehiculo,
    minutosMinimos: f.minutos_minimos,
    vigenteDesde: f.vigente_desde,
    vigenteHasta: f.vigente_hasta,
    estado: f.estado,
    usado: Boolean(f.usado),
  };

/** Listado: los filtros de tipo incluyen los descuentos de «todos». */
async function listar({ q, estado, tipoVehiculo, tipoCliente, limit, offset }) {
  const condiciones = [];
  const valores = [];
  if (q) {
    condiciones.push('d.nombre LIKE ?');
    valores.push(`%${escapeLike(q)}%`);
  }
  if (estado) {
    condiciones.push('d.estado = ?');
    valores.push(estado);
  }
  if (tipoVehiculo) {
    condiciones.push("d.aplica_tipo_vehiculo IN ('todos', ?)");
    valores.push(tipoVehiculo);
  }
  if (tipoCliente) {
    condiciones.push("d.aplica_tipo_cliente IN ('todos', ?)");
    valores.push(tipoCliente);
  }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(`SELECT ${COLUMNAS} FROM descuento d ${donde} ORDER BY d.estado, d.vigente_desde DESC, d.id_descuento DESC LIMIT ? OFFSET ?`, [
    ...valores,
    limit,
    offset,
  ]);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM descuento d ${donde}`, valores);
  return { filas: filas.map(aDescuento), total: Number(total) };
}

async function obtenerPorId(id, { conexion = pool, bloquear = false } = {}) {
  if (bloquear) await conexion.query('SELECT id_descuento FROM descuento WHERE id_descuento = ? FOR UPDATE', [id]);
  const [[fila]] = await conexion.query(`SELECT ${COLUMNAS} FROM descuento d WHERE d.id_descuento = ?`, [id]);
  return aDescuento(fila) ?? null;
}

/** RF-DES-03 (R-02): activos y vigentes en `fecha` para el tipo de vehículo y de cliente (los minutos los filtra la regla). */
async function candidatos({ tipoVehiculo, tipoCliente, fecha }, { conexion = pool } = {}) {
  const [filas] = await conexion.query(
    `SELECT ${COLUMNAS} FROM descuento d
      WHERE d.estado = 'activo' AND ? BETWEEN d.vigente_desde AND d.vigente_hasta
        AND d.aplica_tipo_vehiculo IN ('todos', ?) AND d.aplica_tipo_cliente IN ('todos', ?)
      ORDER BY d.id_descuento`,
    [fecha, tipoVehiculo, tipoCliente]
  );
  return filas.map(aDescuento);
}

const CAMPOS_SQL = 'nombre = ?, tipo = ?, valor = ?, aplica_tipo_cliente = ?, aplica_tipo_vehiculo = ?, minutos_minimos = ?, vigente_desde = ?, vigente_hasta = ?';
const valoresDe = (d) => [d.nombre, d.tipo, d.valor, d.aplicaTipoCliente, d.aplicaTipoVehiculo, d.minutosMinimos, d.vigenteDesde, d.vigenteHasta];

async function insertar(d, { conexion }) {
  const [r] = await conexion.query(`INSERT INTO descuento SET ${CAMPOS_SQL}`, valoresDe(d));
  return r.insertId;
}

async function actualizar(id, d, { conexion }) {
  await conexion.query(`UPDATE descuento SET ${CAMPOS_SQL} WHERE id_descuento = ?`, [...valoresDe(d), id]);
}

async function cambiarEstado(id, estado, { conexion }) {
  await conexion.query('UPDATE descuento SET estado = ? WHERE id_descuento = ?', [estado, id]);
}

module.exports = { listar, obtenerPorId, candidatos, insertar, actualizar, cambiarEstado };
