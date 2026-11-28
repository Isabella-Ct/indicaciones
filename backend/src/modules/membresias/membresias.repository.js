// Único lugar con SQL de membresías (spec 010). Las fechas DATE salen como 'AAAA-MM-DD' (DATE_FORMAT) para no
// depender de la zona horaria del driver. Acepta una conexión opcional para la transacción.
const { pool } = require('../../config/db');
const { escapeLike } = require('../../utils/sql');
const { aIsoBogota } = require('../../utils/fechas');

const COLUMNAS = `m.id_membresia, m.estado, m.id_vehiculo, m.id_cliente, m.motivo_cancelacion,
  DATE_FORMAT(m.fecha_inicio, '%Y-%m-%d') AS fecha_inicio, DATE_FORMAT(m.fecha_fin, '%Y-%m-%d') AS fecha_fin,
  p.id_plan, p.nombre AS plan_nombre, p.valor_mensual, p.dias_vigencia, p.estado AS plan_estado,
  u.nombre_completo AS cliente_nombre, u.tipo_documento, u.numero_documento,
  v.placa, v.tipo AS vehiculo_tipo`;

const DESDE = `FROM membresia m
  JOIN plan_membresia p ON p.id_plan = m.id_plan
  JOIN usuario u ON u.id_usuario = m.id_cliente
  JOIN vehiculo v ON v.id_vehiculo = m.id_vehiculo`;

const aMembresia = (f) =>
  f && {
    idMembresia: f.id_membresia,
    estado: f.estado,
    plan: { idPlan: f.id_plan, nombre: f.plan_nombre, valorMensual: Number(f.valor_mensual), diasVigencia: f.dias_vigencia, estado: f.plan_estado },
    cliente: { idUsuario: f.id_cliente, nombre: f.cliente_nombre, tipoDocumento: f.tipo_documento, numeroDocumento: f.numero_documento },
    vehiculo: { idVehiculo: f.id_vehiculo, placa: f.placa, tipo: f.vehiculo_tipo },
    fechaInicio: f.fecha_inicio,
    fechaFin: f.fecha_fin,
    motivoCancelacion: f.motivo_cancelacion,
  };

async function obtenerPorId(id, { conexion = pool, bloquear = false } = {}) {
  if (bloquear) await conexion.query('SELECT id_membresia FROM membresia WHERE id_membresia = ? FOR UPDATE', [id]);
  const [[fila]] = await conexion.query(`SELECT ${COLUMNAS} ${DESDE} WHERE m.id_membresia = ?`, [id]);
  return aMembresia(fila) ?? null;
}

/** RN-23: la membresía activa del vehículo (bloqueada), si existe. */
async function activaDelVehiculo(idVehiculo, { conexion = pool } = {}) {
  const [[fila]] = await conexion.query("SELECT id_membresia FROM membresia WHERE id_vehiculo = ? AND estado = 'activa' FOR UPDATE", [idVehiculo]);
  return fila ? obtenerPorId(fila.id_membresia, { conexion }) : null;
}

async function insertar({ idPlan, idCliente, idVehiculo, fechaInicio, fechaFin }, { conexion }) {
  const [r] = await conexion.query('INSERT INTO membresia (id_plan, id_cliente, id_vehiculo, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?, ?)', [
    idPlan,
    idCliente,
    idVehiculo,
    fechaInicio,
    fechaFin,
  ]);
  return r.insertId;
}

/** RF-MEM-06: nueva vigencia (vuelve a activa si estaba vencida). */
async function renovar(id, { fechaInicio, fechaFin }, { conexion }) {
  await conexion.query("UPDATE membresia SET fecha_inicio = ?, fecha_fin = ?, estado = 'activa' WHERE id_membresia = ?", [fechaInicio, fechaFin, id]);
}

/** RF-MEM-07. */
async function cancelar(id, motivo, { conexion }) {
  await conexion.query("UPDATE membresia SET estado = 'cancelada', motivo_cancelacion = ? WHERE id_membresia = ?", [motivo, id]);
}

/** RF-MEM-08: ids de las activas cuyo fin ya pasó (bloqueadas). */
async function vencidasPendientes(hoy, { conexion }) {
  const [filas] = await conexion.query("SELECT id_membresia, DATE_FORMAT(fecha_fin, '%Y-%m-%d') AS fecha_fin FROM membresia WHERE estado = 'activa' AND fecha_fin < ? FOR UPDATE", [hoy]);
  return filas.map((f) => ({ idMembresia: f.id_membresia, fechaFin: f.fecha_fin }));
}

async function marcarVencidas(ids, { conexion }) {
  if (!ids.length) return;
  await conexion.query("UPDATE membresia SET estado = 'vencida' WHERE id_membresia IN (?) AND estado = 'activa'", [ids]);
}

/** Listado del personal: búsqueda por placa, nombre o documento del cliente. */
async function listar({ q, estado, idCliente, limit, offset }) {
  const condiciones = [];
  const valores = [];
  if (q) {
    const patron = `%${escapeLike(q)}%`;
    condiciones.push('(v.placa LIKE ? OR u.nombre_completo LIKE ? OR u.numero_documento LIKE ?)');
    valores.push(patron, patron, patron);
  }
  if (estado) {
    condiciones.push('m.estado = ?');
    valores.push(estado);
  }
  if (idCliente) {
    condiciones.push('m.id_cliente = ?');
    valores.push(idCliente);
  }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} ${DESDE} ${donde} ORDER BY FIELD(m.estado, 'activa', 'vencida', 'cancelada'), m.fecha_fin DESC, m.id_membresia DESC LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${DESDE} ${donde}`, valores);
  return { filas: filas.map(aMembresia), total: Number(total) };
}

/** Todas las membresías del cliente (RF-MEM-09). */
async function delCliente(idCliente) {
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} ${DESDE} WHERE m.id_cliente = ? ORDER BY FIELD(m.estado, 'activa', 'vencida', 'cancelada'), m.fecha_fin DESC`,
    [idCliente]
  );
  return filas.map(aMembresia);
}

/** Facturas de las membresías indicadas, agrupadas por membresía (historial de pagos, RF-MEM-09). */
async function facturasDe(idsMembresia) {
  if (!idsMembresia.length) return new Map();
  const [filas] = await pool.query(
    'SELECT id_factura, id_membresia, numero, fecha_emision, total, estado FROM factura WHERE id_membresia IN (?) ORDER BY fecha_emision DESC, id_factura DESC',
    [idsMembresia]
  );
  const porMembresia = new Map();
  for (const f of filas) {
    if (!porMembresia.has(f.id_membresia)) porMembresia.set(f.id_membresia, []);
    porMembresia.get(f.id_membresia).push({ idFactura: f.id_factura, numero: f.numero, fecha: aIsoBogota(f.fecha_emision), total: Number(f.total), estado: f.estado });
  }
  return porMembresia;
}

module.exports = { obtenerPorId, activaDelVehiculo, insertar, renovar, cancelar, vencidasPendientes, marcarVencidas, listar, delCliente, facturasDe };
