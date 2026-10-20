// Consultas de los reportes REQ-REP-01…11. Solo lectura y siempre parametrizadas.
// Los rangos llegan como [inicio, fin) en 'AAAA-MM-DD HH:MM:SS' (hora de Bogotá).
const { pool } = require('../../config/db');

const escaparLike = (texto) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);
const nombre = (a) =>
  `CONCAT_WS(' ', ${a}.primer_nombre, ${a}.segundo_nombre, ${a}.primer_apellido, ${a}.segundo_apellido)`;
const paginar = (limites) => (limites ? 'LIMIT ? OFFSET ?' : '');
const valoresPagina = (limites) => (limites ? [limites.limit, limites.offset] : []);

/** Ejecuta la consulta paginada (o completa, para CSV) y su conteo. */
async function paginada(select, desde, where, valores, orden, limites) {
  const [filas] = await pool.query(
    `${select} ${desde} ${where} ORDER BY ${orden} ${paginar(limites)}`,
    [...valores, ...valoresPagina(limites)]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${desde} ${where}`, valores);
  return { filas, total };
}

function condiciones(lista) {
  const activas = lista.filter(([, activa]) => activa);
  return {
    where: activas.length ? `WHERE ${activas.map(([c]) => c).join(' AND ')}` : '',
    valores: activas.flatMap(([, , v]) => v),
  };
}

// ---------------------------------------------------------------- REP-01 usuarios
async function usuarios({ rol, estado }, limites) {
  const { where, valores } = condiciones([
    ['r.nombre = ?', rol, [rol]],
    ['u.estado = ?', estado, [estado]],
  ]);
  return paginada(
    `SELECT u.id, u.tipo_documento, u.numero_documento, u.primer_nombre, u.segundo_nombre,
            u.primer_apellido, u.segundo_apellido, ${nombre('u')} AS nombre_completo, u.correo,
            u.celular, r.nombre AS rol, u.estado, u.debe_cambiar_contrasena, u.ultimo_acceso,
            u.created_at, (SELECT COUNT(*) FROM vehiculos v WHERE v.usuario_id = u.id) AS vehiculos`,
    'FROM usuarios u JOIN roles r ON r.id = u.rol_id',
    where,
    valores,
    'u.id',
    limites
  );
}

// ---------------------------------------------------------------- REP-02 vehículos
async function vehiculos({ tipo, propietario }, limites) {
  const { where, valores } = condiciones([
    ['v.tipo = ?', tipo, [tipo]],
    ['v.usuario_id IS NOT NULL', propietario === 'con', []],
    ['v.usuario_id IS NULL', propietario === 'sin', []],
  ]);
  return paginada(
    `SELECT v.id, v.placa, v.tipo, v.marca, v.modelo, v.color, v.activo, v.created_at,
            u.id AS propietario_id, ${nombre('u')} AS propietario, u.tipo_documento,
            u.numero_documento, (SELECT COUNT(*) FROM estadias e WHERE e.vehiculo_id = v.id) AS visitas`,
    'FROM vehiculos v LEFT JOIN usuarios u ON u.id = v.usuario_id',
    where,
    valores,
    'v.placa',
    limites
  );
}

// ---------------------------------------------------------------- REP-03 / REP-04 movimientos
const DESDE_MOVIMIENTOS = `FROM estadias e
  JOIN vehiculos v ON v.id = e.vehiculo_id
  JOIN celdas c ON c.id = e.celda_id
  JOIN pisos pi ON pi.id = c.piso_id
  JOIN puertas pe ON pe.id = e.puerta_entrada_id
  LEFT JOIN puertas ps ON ps.id = e.puerta_salida_id
  LEFT JOIN facturas f ON f.estadia_id = e.id
  LEFT JOIN usuarios ue ON ue.id = e.registrada_entrada_por
  LEFT JOIN usuarios us ON us.id = e.registrada_salida_por`;

function filtrosMovimiento(columnaFecha, { inicio, fin, tipo, puerta_id, placa }, columnaPuerta) {
  return condiciones([
    [`e.${columnaFecha} >= ?`, true, [inicio]],
    [`e.${columnaFecha} < ?`, true, [fin]],
    ['v.tipo = ?', tipo, [tipo]],
    [`e.${columnaPuerta} = ?`, puerta_id, [puerta_id]],
    ['v.placa LIKE ?', placa, [`%${escaparLike(placa ?? '')}%`]],
  ]);
}

async function entradas(filtros, limites) {
  const { where, valores } = filtrosMovimiento('fecha_hora_entrada', filtros, 'puerta_entrada_id');
  return paginada(
    `SELECT e.id, e.codigo_ticket, e.fecha_hora_entrada, e.tipo_cliente, e.estado,
            v.placa, v.tipo, v.marca, v.modelo, pe.nombre AS puerta, c.codigo AS celda,
            pi.nombre AS piso, CONCAT_WS(' ', ue.primer_nombre, ue.primer_apellido) AS registro`,
    DESDE_MOVIMIENTOS,
    where,
    valores,
    'e.fecha_hora_entrada DESC, e.id DESC',
    limites
  );
}

async function salidas(filtros, limites) {
  const { where, valores } = filtrosMovimiento('fecha_hora_salida', filtros, 'puerta_salida_id');
  const resultado = await paginada(
    `SELECT e.id, e.codigo_ticket, e.fecha_hora_entrada, e.fecha_hora_salida, e.minutos_estadia,
            e.tipo_cliente, v.placa, v.tipo, ps.nombre AS puerta, c.codigo AS celda,
            pi.nombre AS piso, f.numero AS factura, f.total AS valor, f.metodo_pago,
            CONCAT_WS(' ', us.primer_nombre, us.primer_apellido) AS registro`,
    DESDE_MOVIMIENTOS,
    where,
    valores,
    'e.fecha_hora_salida DESC, e.id DESC',
    limites
  );
  const [[sumas]] = await pool.query(
    `SELECT COALESCE(SUM(f.total), 0) AS recaudado, COALESCE(AVG(e.minutos_estadia), 0) AS promedio
     ${DESDE_MOVIMIENTOS} ${where}`,
    valores
  );
  return { ...resultado, recaudado: Number(sumas.recaudado), promedio: Number(sumas.promedio) };
}

// ---------------------------------------------------------------- REP-06 pico y placa
/** Vehículos activos cuya placa coincide con una regla activa de ese día de la semana. */
async function vehiculosRestringidos(diaSemana) {
  const [filas] = await pool.query(
    `SELECT v.id, v.placa, v.tipo, v.marca, v.modelo, v.color, ${nombre('u')} AS propietario,
            MIN(r.digito) AS digito,
            GROUP_CONCAT(CONCAT(TIME_FORMAT(r.hora_inicio, '%H:%i'), '–', TIME_FORMAT(r.hora_fin, '%H:%i'))
                         ORDER BY r.hora_inicio SEPARATOR ', ') AS horario
       FROM vehiculos v
       JOIN pico_placa r
         ON r.activa = 1 AND r.dia_semana = ? AND r.tipo_vehiculo = v.tipo
        AND r.digito = CAST(IF(v.tipo = 'carro', SUBSTRING(v.placa, 6, 1), SUBSTRING(v.placa, 4, 1)) AS UNSIGNED)
       LEFT JOIN usuarios u ON u.id = v.usuario_id
      WHERE v.activo = 1
      GROUP BY v.id
      ORDER BY v.tipo, v.placa`,
    [diaSemana]
  );
  return filas;
}

async function reglasDelDia(diaSemana) {
  const [filas] = await pool.query(
    `SELECT tipo_vehiculo, digito, TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio,
            TIME_FORMAT(hora_fin, '%H:%i') AS hora_fin
       FROM pico_placa WHERE activa = 1 AND dia_semana = ? ORDER BY tipo_vehiculo, digito`,
    [diaSemana]
  );
  return filas;
}

async function vehiculosActivosPorTipo() {
  const [filas] = await pool.query(
    'SELECT tipo, COUNT(*) AS total FROM vehiculos WHERE activo = 1 GROUP BY tipo'
  );
  return Object.fromEntries(filas.map((f) => [f.tipo, f.total]));
}

async function denegadosDelDia(inicio, fin) {
  const [filas] = await pool.query(
    `SELECT ad.id, ad.placa, ad.tipo_vehiculo, ad.fecha_hora, ad.motivo, p.nombre AS puerta,
            (SELECT 1 FROM vehiculos v WHERE v.placa = ad.placa) AS registrado
       FROM accesos_denegados ad JOIN puertas p ON p.id = ad.puerta_id
      WHERE ad.fecha_hora >= ? AND ad.fecha_hora < ?
      ORDER BY ad.fecha_hora`,
    [inicio, fin]
  );
  return filas;
}

// ---------------------------------------------------------------- REP-07 celdas ocupadas
const SOLAPA = 'e.fecha_hora_entrada < ? AND COALESCE(e.fecha_hora_salida, NOW()) > ?';

async function celdasOcupadasDelDia(inicio, fin) {
  const [filas] = await pool.query(
    `SELECT c.id, c.codigo, c.tipo, pi.nombre AS piso, COUNT(*) AS estadias,
            SUM(TIMESTAMPDIFF(MINUTE, GREATEST(e.fecha_hora_entrada, ?),
                LEAST(COALESCE(e.fecha_hora_salida, NOW()), ?))) AS minutos
       FROM estadias e JOIN celdas c ON c.id = e.celda_id JOIN pisos pi ON pi.id = c.piso_id
      WHERE ${SOLAPA}
      GROUP BY c.id
      ORDER BY pi.orden, c.codigo`,
    [inicio, fin, fin, inicio]
  );
  return filas;
}

/** Máximo de estadías simultáneas en [inicio, fin) y el momento en que ocurrió (barrido). */
async function maximoSimultaneo(inicio, fin) {
  const [[fila]] = await pool.query(
    `WITH s AS (
       SELECT CAST(GREATEST(e.fecha_hora_entrada, ?) AS DATETIME) AS ini,
              CAST(LEAST(COALESCE(e.fecha_hora_salida, NOW()), ?) AS DATETIME) AS fin
         FROM estadias e WHERE ${SOLAPA}
     ),
     ev AS (SELECT ini AS t, 1 AS d FROM s UNION ALL SELECT fin, -1 FROM s),
     acumulado AS (
       SELECT t, SUM(d) OVER (ORDER BY t, d ROWS UNBOUNDED PRECEDING) AS n FROM ev
     )
     SELECT n, t FROM acumulado ORDER BY n DESC, t LIMIT 1`,
    [inicio, fin, fin, inicio]
  );
  return fila ? { maximo: Number(fila.n), momento: fila.t } : { maximo: 0, momento: null };
}

/**
 * Celdas distintas ocupadas en cada franja de `horas` horas de un día (para col-chart).
 * @returns {Promise<Map<number, number>>} hora de inicio de la franja → celdas
 */
async function ocupacionPorFranjas(inicioDia, horas = 1) {
  const [filas] = await pool.query(
    `WITH RECURSIVE franjas AS (
       SELECT 0 AS h UNION ALL SELECT h + ? FROM franjas WHERE h + ? < 24
     )
     SELECT f.h, COUNT(DISTINCT e.celda_id) AS celdas
       FROM franjas f
       LEFT JOIN estadias e
         ON e.fecha_hora_entrada < TIMESTAMP(?) + INTERVAL (f.h + ?) HOUR
        AND COALESCE(e.fecha_hora_salida, NOW()) > TIMESTAMP(?) + INTERVAL f.h HOUR
        AND e.fecha_hora_entrada >= TIMESTAMP(?) - INTERVAL 3 DAY
      GROUP BY f.h ORDER BY f.h`,
    [horas, horas, inicioDia, horas, inicioDia, inicioDia]
  );
  return new Map(filas.map((f) => [f.h, f.celdas]));
}

async function celdasHabilitadas() {
  const [[fila]] = await pool.query(
    `SELECT COUNT(*) AS habilitadas,
            SUM(tipo = 'carro') AS carros, SUM(tipo = 'moto') AS motos
       FROM celdas WHERE activa = 1 AND estado <> 'fuera_servicio'`
  );
  return {
    habilitadas: Number(fila.habilitadas),
    carro: Number(fila.carros),
    moto: Number(fila.motos),
  };
}

// ---------------------------------------------------------------- REP-08 / REP-09 rankings
const MINUTOS = 'COALESCE(e.minutos_estadia, TIMESTAMPDIFF(MINUTE, e.fecha_hora_entrada, NOW()))';

async function celdasMasUsadas({ inicio, fin, tipo, limite }) {
  const { where, valores } = condiciones([
    ['e.fecha_hora_entrada >= ?', true, [inicio]],
    ['e.fecha_hora_entrada < ?', true, [fin]],
    ['c.tipo = ?', tipo, [tipo]],
  ]);
  const [filas] = await pool.query(
    `SELECT c.id, c.codigo, c.tipo, c.es_accesible, pi.nombre AS piso,
            COUNT(*) AS estadias, SUM(${MINUTOS}) AS minutos
       FROM estadias e JOIN celdas c ON c.id = e.celda_id JOIN pisos pi ON pi.id = c.piso_id
     ${where}
      GROUP BY c.id
      ORDER BY estadias DESC, minutos DESC, c.codigo
      LIMIT ?`,
    [...valores, limite]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM estadias e JOIN celdas c ON c.id = e.celda_id ${where}`,
    valores
  );
  return { filas, total };
}

async function vehiculosFrecuentes({ inicio, fin, tipo, limite }) {
  const { where, valores } = condiciones([
    ['e.fecha_hora_entrada >= ?', true, [inicio]],
    ['e.fecha_hora_entrada < ?', true, [fin]],
    ['v.tipo = ?', tipo, [tipo]],
  ]);
  const [filas] = await pool.query(
    `SELECT v.id, v.placa, v.tipo, v.marca, v.modelo, ${nombre('u')} AS propietario,
            COUNT(*) AS visitas, SUM(${MINUTOS}) AS minutos,
            COALESCE(SUM(f.total), 0) AS pagado, MAX(e.fecha_hora_entrada) AS ultima_visita
       FROM estadias e
       JOIN vehiculos v ON v.id = e.vehiculo_id
       LEFT JOIN usuarios u ON u.id = v.usuario_id
       LEFT JOIN facturas f ON f.estadia_id = e.id
     ${where}
      GROUP BY v.id
      ORDER BY visitas DESC, minutos DESC, v.placa
      LIMIT ?`,
    [...valores, limite]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM estadias e JOIN vehiculos v ON v.id = e.vehiculo_id ${where}`,
    valores
  );
  return { filas, total };
}

// ---------------------------------------------------------------- REP-10 ocupación
/**
 * Suma de celdas ocupadas por (día de la semana, hora) en [inicio, fin).
 * Cada estadía se parte en las horas que toca (CTE recursiva) y se cuentan celdas
 * distintas por hora; el servicio divide por cuántas veces aparece cada (día, hora).
 */
async function ocupacionDiaHora(inicio, fin) {
  const [filas] = await pool.query(
    `WITH RECURSIVE tramos AS (
       SELECT e.celda_id,
              GREATEST(e.fecha_hora_entrada, ?) AS ini,
              LEAST(COALESCE(e.fecha_hora_salida, NOW()), ?) AS fin
         FROM estadias e
        WHERE ${SOLAPA}
     ),
     horas AS (
       SELECT celda_id, fin, CAST(DATE_FORMAT(ini, '%Y-%m-%d %H:00:00') AS DATETIME) AS franja
         FROM tramos WHERE fin > ini
       UNION ALL
       SELECT celda_id, fin, franja + INTERVAL 1 HOUR FROM horas WHERE franja + INTERVAL 1 HOUR < fin
     ),
     por_franja AS (SELECT franja, COUNT(DISTINCT celda_id) AS ocupadas FROM horas GROUP BY franja)
     SELECT WEEKDAY(franja) + 1 AS dia, HOUR(franja) AS hora, SUM(ocupadas) AS suma,
            MAX(ocupadas) AS maximo
       FROM por_franja
      GROUP BY dia, hora`,
    [inicio, fin, fin, inicio]
  );
  return filas;
}

// ---------------------------------------------------------------- REP-11 financiero
const PERIODOS = {
  dia: "DATE_FORMAT(f.fecha_pago, '%Y-%m-%d')",
  semana: "DATE_FORMAT(f.fecha_pago - INTERVAL WEEKDAY(f.fecha_pago) DAY, '%Y-%m-%d')",
  mes: "DATE_FORMAT(f.fecha_pago, '%Y-%m')",
};
const EN_RANGO = 'f.fecha_pago >= ? AND f.fecha_pago < ?';
const SUMAS = `COUNT(*) AS facturas, COALESCE(SUM(f.total), 0) AS total,
  COALESCE(SUM(f.subtotal), 0) AS subtotal, COALESCE(SUM(f.valor_descuento), 0) AS descuentos`;

async function financiero(inicio, fin, agrupar) {
  const rango = [inicio, fin];
  const consulta = async (texto) => (await pool.query(texto, rango))[0];
  const [porPeriodo, porMetodo, porTipo, porConcepto, porDescuento, [totales]] = await Promise.all([
    consulta(
      `SELECT ${PERIODOS[agrupar]} AS periodo, ${SUMAS}, SUM(f.concepto = 'estadia') AS estadias
           FROM facturas f WHERE ${EN_RANGO} GROUP BY periodo ORDER BY periodo`
    ),
    consulta(
      `SELECT f.metodo_pago, ${SUMAS} FROM facturas f WHERE ${EN_RANGO}
          GROUP BY f.metodo_pago ORDER BY total DESC`
    ),
    consulta(
      `SELECT COALESCE(ve.tipo, vm.tipo) AS tipo, ${SUMAS}
           FROM facturas f
           LEFT JOIN estadias e ON e.id = f.estadia_id
           LEFT JOIN vehiculos ve ON ve.id = e.vehiculo_id
           LEFT JOIN membresias m ON m.id = f.membresia_id
           LEFT JOIN vehiculos vm ON vm.id = m.vehiculo_id
          WHERE ${EN_RANGO}
          GROUP BY tipo ORDER BY total DESC`
    ),
    consulta(
      `SELECT f.concepto, ${SUMAS} FROM facturas f WHERE ${EN_RANGO}
          GROUP BY f.concepto ORDER BY total DESC`
    ),
    consulta(
      `SELECT d.id, d.nombre, f.porcentaje_descuento AS porcentaje, ${SUMAS}
           FROM facturas f JOIN descuentos d ON d.id = f.descuento_id
          WHERE ${EN_RANGO}
          GROUP BY d.id, f.porcentaje_descuento ORDER BY descuentos DESC`
    ),
    consulta(
      `SELECT ${SUMAS}, SUM(f.total = 0) AS sin_cobro,
                AVG(CASE WHEN f.concepto = 'estadia' AND f.total > 0 THEN f.total END) AS ticket_promedio
           FROM facturas f WHERE ${EN_RANGO}`
    ),
  ]);
  return { porPeriodo, porMetodo, porTipo, porConcepto, porDescuento, totales };
}

module.exports = {
  usuarios,
  vehiculos,
  entradas,
  salidas,
  vehiculosRestringidos,
  reglasDelDia,
  vehiculosActivosPorTipo,
  denegadosDelDia,
  celdasOcupadasDelDia,
  maximoSimultaneo,
  ocupacionPorFranjas,
  celdasHabilitadas,
  celdasMasUsadas,
  vehiculosFrecuentes,
  ocupacionDiaHora,
  financiero,
};
