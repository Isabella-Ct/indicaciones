// Único lugar con SQL de liquidaciones (spec 009). Lee el movimiento con su vehículo, la liquidación guardada,
// la membresía que cubre la estadía y escribe la alerta «sin tarifa» (spec 014). Acepta una conexión opcional.
const { pool } = require('../../config/db');

const numero = (v) => (v === null || v === undefined ? null : Number(v));

/** Datos del movimiento necesarios para liquidar (con bloqueo opcional). */
async function movimientoParaLiquidar(idMovimiento, { conexion = pool, bloquear = false } = {}) {
  const [[fila]] = await conexion.query(
    `SELECT m.id_movimiento, m.estado, m.fecha_hora_entrada, m.fecha_hora_salida, m.minutos_estadia, m.id_vehiculo,
            v.tipo, v.placa, v.id_propietario
       FROM movimiento m JOIN vehiculo v ON v.id_vehiculo = m.id_vehiculo
      WHERE m.id_movimiento = ? ${bloquear ? 'FOR UPDATE' : ''}`,
    [idMovimiento]
  );
  return fila
    ? {
        idMovimiento: fila.id_movimiento,
        estado: fila.estado,
        entrada: fila.fecha_hora_entrada,
        salida: fila.fecha_hora_salida,
        minutosEstadia: fila.minutos_estadia,
        idVehiculo: fila.id_vehiculo,
        tipoVehiculo: fila.tipo,
        placa: fila.placa,
        idPropietario: fila.id_propietario,
      }
    : null;
}

/** Liquidación guardada del movimiento, con su factura (si la hay). */
async function porMovimiento(idMovimiento, { conexion = pool, bloquear = false } = {}) {
  const [[fila]] = await conexion.query(
    `SELECT l.id_liquidacion, l.id_movimiento, l.id_tarifa, l.minutos_cobrados, l.valor_bruto, l.id_descuento, l.valor_descuento,
            l.cubierto_por_membresia, l.valor_total, f.id_factura
       FROM liquidacion l LEFT JOIN factura f ON f.id_liquidacion = l.id_liquidacion
      WHERE l.id_movimiento = ? ${bloquear ? 'FOR UPDATE' : ''}`,
    [idMovimiento]
  );
  return fila
    ? {
        idLiquidacion: fila.id_liquidacion,
        idMovimiento: fila.id_movimiento,
        idTarifa: fila.id_tarifa,
        minutos: fila.minutos_cobrados,
        valorBruto: numero(fila.valor_bruto),
        idDescuento: fila.id_descuento,
        valorDescuento: numero(fila.valor_descuento),
        cubiertoPorMembresia: Boolean(fila.cubierto_por_membresia),
        total: numero(fila.valor_total),
        idFactura: fila.id_factura ?? null,
      }
    : null;
}

async function insertar({ idMovimiento, idTarifa, idDescuento = null, minutos, valorBruto, valorDescuento, cubiertoPorMembresia, total }, { conexion }) {
  const [r] = await conexion.query(
    `INSERT INTO liquidacion (id_movimiento, id_tarifa, id_descuento, minutos_cobrados, valor_bruto, valor_descuento, cubierto_por_membresia, valor_total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [idMovimiento, idTarifa, idDescuento, minutos, valorBruto, valorDescuento, cubiertoPorMembresia, total]
  );
  return r.insertId;
}

/** RN-21: membresía activa del vehículo cuya vigencia incluye la fecha (de entrada). */
async function membresiaQueCubre(idVehiculo, fecha, { conexion = pool } = {}) {
  const [[fila]] = await conexion.query(
    `SELECT id_membresia FROM membresia
      WHERE id_vehiculo = ? AND estado = 'activa' AND DATE(?) BETWEEN fecha_inicio AND fecha_fin LIMIT 1`,
    [idVehiculo, fecha]
  );
  return fila?.id_membresia ?? null;
}

/** RF-FAC-04: alerta «sin tarifa» para el Administrador (una sola sin leer por movimiento). */
async function alertarSinTarifa({ idMovimiento, mensaje, fecha }) {
  const referencia = `movimiento:${idMovimiento}`;
  const [[existe]] = await pool.query("SELECT id_alerta FROM alerta WHERE tipo = 'sin_tarifa' AND referencia = ? AND leida = FALSE", [referencia]);
  if (existe) return;
  await pool.query("INSERT INTO alerta (tipo, mensaje, referencia, fecha) VALUES ('sin_tarifa', ?, ?, ?)", [mensaje.slice(0, 200), referencia, fecha]);
}

module.exports = { movimientoParaLiquidar, porMovimiento, insertar, membresiaQueCubre, alertarSinTarifa };
