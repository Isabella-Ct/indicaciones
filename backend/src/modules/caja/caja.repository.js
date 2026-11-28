// Único lugar con SQL de caja (spec 009, research R-09). El turno abierto de un operador son sus pagos sin
// cierre (`pago.id_cierre` NULL). Acepta una conexión opcional para la transacción.
const { pool } = require('../../config/db');
const { aIsoBogota } = require('../../utils/fechas');

const numero = (v) => (v === null || v === undefined ? null : Number(v));

const COLUMNAS_PAGO = `pg.id_pago, pg.metodo, pg.valor, pg.fecha, f.id_factura, f.numero, f.estado, f.total, v.placa`;
const DESDE_PAGO = `FROM pago pg
  JOIN factura f ON f.id_factura = pg.id_factura
  LEFT JOIN liquidacion l ON l.id_liquidacion = f.id_liquidacion
  LEFT JOIN movimiento m ON m.id_movimiento = l.id_movimiento
  LEFT JOIN vehiculo v ON v.id_vehiculo = m.id_vehiculo`;

const aPago = (f) => ({
  idPago: f.id_pago,
  metodo: f.metodo,
  valor: numero(f.valor),
  fecha: f.fecha,
  idFactura: f.id_factura,
  numero: f.numero,
  estado: f.estado,
  total: numero(f.total),
  placa: f.placa ?? null,
});

/** Pagos del turno abierto del operador; con `bloquear` toma las filas (cierre). */
async function pagosAbiertos(idOperador, { conexion = pool, bloquear = false } = {}) {
  const [filas] = await conexion.query(
    `SELECT ${COLUMNAS_PAGO} ${DESDE_PAGO} WHERE pg.id_operador = ? AND pg.id_cierre IS NULL ORDER BY pg.fecha, pg.id_pago ${bloquear ? 'FOR UPDATE' : ''}`,
    [idOperador]
  );
  return filas.map(aPago);
}

async function insertarCierre({ idOperador, inicio, fin, totales, efectivoContado, diferencia, observaciones }, { conexion }) {
  const [r] = await conexion.query(
    `INSERT INTO cierre_caja (id_operador, inicio_turno, fin_turno, total_sistema_por_metodo, efectivo_contado, diferencia, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [idOperador, inicio, fin, JSON.stringify(totales), efectivoContado, diferencia, observaciones ?? null]
  );
  return r.insertId;
}

async function asignarCierre(idsPago, idCierre, { conexion }) {
  await conexion.query('UPDATE pago SET id_cierre = ? WHERE id_pago IN (?)', [idCierre, idsPago]);
}

/** RF-FAC-19: cierres (de todos o de un operador) con sus facturas. */
async function listarCierres({ idOperador, limit, offset }) {
  const donde = idOperador ? 'WHERE cc.id_operador = ?' : '';
  const valores = idOperador ? [idOperador] : [];
  const [filas] = await pool.query(
    `SELECT cc.id_cierre, cc.id_operador, u.nombre_completo AS operador, cc.inicio_turno, cc.fin_turno, cc.total_sistema_por_metodo,
            cc.efectivo_contado, cc.diferencia, cc.observaciones
       FROM cierre_caja cc JOIN usuario u ON u.id_usuario = cc.id_operador ${donde}
      ORDER BY cc.fin_turno DESC, cc.id_cierre DESC LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM cierre_caja cc ${donde}`, valores);
  const ids = filas.map((f) => f.id_cierre);
  const [pagos] = ids.length
    ? await pool.query(`SELECT pg.id_cierre, ${COLUMNAS_PAGO} ${DESDE_PAGO} WHERE pg.id_cierre IN (?) ORDER BY pg.fecha`, [ids])
    : [[]];
  return {
    total: Number(total),
    filas: filas.map((f) => {
      const totales = typeof f.total_sistema_por_metodo === 'string' ? JSON.parse(f.total_sistema_por_metodo) : f.total_sistema_por_metodo;
      return {
        idCierre: f.id_cierre,
        operador: { idUsuario: f.id_operador, nombre: f.operador },
        inicioTurno: aIsoBogota(f.inicio_turno),
        finTurno: aIsoBogota(f.fin_turno),
        totalesPorMetodo: totales,
        efectivoEsperado: numero(totales.efectivo ?? 0),
        efectivoContado: numero(f.efectivo_contado),
        diferencia: numero(f.diferencia),
        observaciones: f.observaciones,
        facturas: pagos
          .filter((p) => p.id_cierre === f.id_cierre)
          .map(aPago)
          .map((p) => ({ idFactura: p.idFactura, numero: p.numero, placa: p.placa, metodo: p.metodo, total: p.total, estado: p.estado })),
      };
    }),
  };
}

module.exports = { pagosAbiertos, insertarCierre, asignarCierre, listarCierres };
