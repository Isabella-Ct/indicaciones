// Acceso a datos de estadías (entradas/salidas), lecturas de placa y accesos denegados.
const { pool } = require('../../config/db');
const { escaparLike } = require('../../utils/sql');

const NOMBRE = (a) => `CONCAT_WS(' ', ${a}.primer_nombre, ${a}.primer_apellido)`;

// ---------------------------------------------------------------- consultas de apoyo
async function puerta(id) {
  const [filas] = await pool.query('SELECT id, nombre, tipo, activa FROM puertas WHERE id = ?', [
    id,
  ]);
  return filas[0] ?? null;
}

async function vehiculoPorPlaca(placa) {
  const [filas] = await pool.query(
    `SELECT v.id, v.placa, v.tipo, v.marca, v.modelo, v.color, v.activo, v.usuario_id,
            ${NOMBRE('u')} AS propietario_nombre
       FROM vehiculos v LEFT JOIN usuarios u ON u.id = v.usuario_id
      WHERE v.placa = ?`,
    [placa]
  );
  return filas[0] ?? null;
}

/** Mensualidad vigente hoy del vehículo (con o sin celda fija). */
async function membresiaVigente(vehiculoId) {
  const [filas] = await pool.query(
    `SELECT m.id, m.usuario_id, m.celda_asignada_id, m.fecha_fin, ${NOMBRE('u')} AS titular
       FROM membresias m JOIN usuarios u ON u.id = m.usuario_id
      WHERE m.vehiculo_id = ? AND m.estado = 'activa' AND CURDATE() BETWEEN m.fecha_inicio AND m.fecha_fin
      ORDER BY m.fecha_fin DESC LIMIT 1`,
    [vehiculoId]
  );
  return filas[0] ?? null;
}

/** Reserva activa y no vencida del vehículo. */
async function reservaVigente(vehiculoId, ahora) {
  const [filas] = await pool.query(
    `SELECT id, celda_id FROM reservas
      WHERE vehiculo_reserva_activa = ? AND fecha_hora_expiracion > ?
      LIMIT 1`,
    [vehiculoId, ahora]
  );
  return filas[0] ?? null;
}

async function estadiaAbiertaDeVehiculo(vehiculoId, conexion = pool) {
  const [filas] = await conexion.query(
    `SELECT e.id, e.codigo_ticket, c.codigo AS celda_codigo
       FROM estadias e JOIN celdas c ON c.id = e.celda_id
      WHERE e.vehiculo_estadia_abierta = ?`,
    [vehiculoId]
  );
  return filas[0] ?? null;
}

/** Celdas libres del tipo, en el orden del mapa (piso, fila, posición). */
async function celdasLibres(tipo) {
  const [filas] = await pool.query(
    `SELECT c.id, c.codigo, c.tipo, c.es_accesible, c.estado, p.id AS piso_id, p.nombre AS piso_nombre
       FROM celdas c JOIN pisos p ON p.id = c.piso_id
      WHERE c.activa = 1 AND c.tipo = ? AND c.estado = 'disponible'
      ORDER BY p.orden, c.fila_mapa, c.posicion`,
    [tipo]
  );
  return filas;
}

async function celdaPorId(id, conexion = pool, bloquear = false) {
  const [filas] = await conexion.query(
    `SELECT c.id, c.codigo, c.tipo, c.es_accesible, c.estado, c.activa, p.id AS piso_id, p.nombre AS piso_nombre
       FROM celdas c JOIN pisos p ON p.id = c.piso_id
      WHERE c.id = ? ${bloquear ? 'FOR UPDATE' : ''}`,
    [id]
  );
  return filas[0] ?? null;
}

async function tarifaVigente(tipo) {
  const [filas] = await pool.query(
    `SELECT valor_fraccion, minutos_fraccion, valor_dia_maximo
       FROM tarifas
      WHERE tipo_vehiculo = ? AND activa = 1 AND vigente_desde <= NOW()
      ORDER BY vigente_desde DESC, id DESC LIMIT 1`,
    [tipo]
  );
  return filas[0] ?? null;
}

async function valorConfiguracion(clave) {
  const [filas] = await pool.query('SELECT valor FROM configuracion WHERE clave = ?', [clave]);
  return filas[0]?.valor ?? null;
}

// ---------------------------------------------------------------- escrituras
async function insertarLectura({ placa, imagen_url, fecha_hora, puerta_id, registrada_por }) {
  const [r] = await pool.query(
    `INSERT INTO lecturas_placa (placa_leida, imagen_url, fecha_hora, puerta_id, registrada_por)
     VALUES (?, ?, ?, ?, ?)`,
    [placa, imagen_url ?? null, fecha_hora, puerta_id, registrada_por]
  );
  return r.insertId;
}

async function asociarLectura(lecturaId, estadiaId, conexion) {
  await conexion.query('UPDATE lecturas_placa SET estadia_id = ? WHERE id = ?', [
    estadiaId,
    lecturaId,
  ]);
}

async function insertarDenegado({
  placa,
  tipo_vehiculo,
  puerta_id,
  fecha_hora,
  motivo,
  regla_pico_placa_id,
  registrado_por,
}) {
  const [r] = await pool.query(
    `INSERT INTO accesos_denegados
       (placa, tipo_vehiculo, puerta_id, fecha_hora, motivo, regla_pico_placa_id, registrado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [placa, tipo_vehiculo, puerta_id, fecha_hora, motivo, regla_pico_placa_id, registrado_por]
  );
  return r.insertId;
}

async function insertarEstadia(d, conexion) {
  // El código definitivo (T-000123) depende del id: se inserta uno provisional y se corrige.
  const provisional = `P${String(Date.now()).slice(-8)}${Math.floor(Math.random() * 100)}`.slice(
    0,
    12
  );
  const [r] = await conexion.query(
    `INSERT INTO estadias
       (codigo_ticket, vehiculo_id, celda_id, tipo_cliente, membresia_id, reserva_id, puerta_entrada_id,
        fecha_hora_entrada, requiere_accesible, observaciones_entrada, deja_llaves, estado, registrada_entrada_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_curso', ?)`,
    [
      provisional,
      d.vehiculo_id,
      d.celda_id,
      d.tipo_cliente,
      d.membresia_id ?? null,
      d.reserva_id ?? null,
      d.puerta_entrada_id,
      d.fecha_hora_entrada,
      d.requiere_accesible ? 1 : 0,
      d.observaciones_entrada ?? null,
      d.deja_llaves ? 1 : 0,
      d.registrada_entrada_por,
    ]
  );
  const codigo = `T-${String(r.insertId).padStart(6, '0')}`;
  await conexion.query('UPDATE estadias SET codigo_ticket = ? WHERE id = ?', [codigo, r.insertId]);
  return { id: r.insertId, codigo_ticket: codigo };
}

async function ocuparCelda(celdaId, vehiculoId, conexion) {
  await conexion.query(
    "UPDATE celdas SET estado = 'ocupada', vehiculo_actual_id = ?, nota = NULL WHERE id = ?",
    [vehiculoId, celdaId]
  );
}

async function liberarCelda(celdaId, estado, conexion) {
  await conexion.query('UPDATE celdas SET estado = ?, vehiculo_actual_id = NULL WHERE id = ?', [
    estado,
    celdaId,
  ]);
}

async function marcarReservaCumplida(reservaId, conexion) {
  await conexion.query("UPDATE reservas SET estado = 'cumplida' WHERE id = ?", [reservaId]);
}

async function bloquearEstadia(id, conexion) {
  const [filas] = await conexion.query('SELECT * FROM estadias WHERE id = ? FOR UPDATE', [id]);
  return filas[0] ?? null;
}

async function cerrarEstadia(
  id,
  { salida, minutos, puerta_salida_id, registrada_salida_por },
  conexion
) {
  await conexion.query(
    `UPDATE estadias
        SET fecha_hora_salida = ?, minutos_estadia = ?, puerta_salida_id = ?, registrada_salida_por = ?,
            estado = 'finalizada'
      WHERE id = ?`,
    [salida, minutos, puerta_salida_id, registrada_salida_por, id]
  );
}

// ---------------------------------------------------------------- detalle y listados
const SELECT_DETALLE = `
  SELECT e.id, e.codigo_ticket, e.estado, e.tipo_cliente, e.membresia_id, e.reserva_id,
         e.fecha_hora_entrada, e.fecha_hora_salida, e.minutos_estadia,
         e.requiere_accesible, e.observaciones_entrada, e.deja_llaves,
         v.id AS vehiculo_id, v.placa, v.tipo, v.marca, v.modelo, v.color, v.usuario_id,
         ${NOMBRE('u')} AS propietario_nombre,
         c.id AS celda_id, c.codigo AS celda_codigo, p.nombre AS piso_nombre,
         pe.id AS puerta_entrada_id, pe.nombre AS puerta_entrada,
         ps.id AS puerta_salida_id, ps.nombre AS puerta_salida,
         ${NOMBRE('ue')} AS registrada_entrada_por, ${NOMBRE('us')} AS registrada_salida_por,
         f.total AS valor_pagado
    FROM estadias e
    JOIN vehiculos v ON v.id = e.vehiculo_id
    LEFT JOIN usuarios u ON u.id = v.usuario_id
    JOIN celdas c ON c.id = e.celda_id
    JOIN pisos p ON p.id = c.piso_id
    JOIN puertas pe ON pe.id = e.puerta_entrada_id
    LEFT JOIN puertas ps ON ps.id = e.puerta_salida_id
    JOIN usuarios ue ON ue.id = e.registrada_entrada_por
    LEFT JOIN usuarios us ON us.id = e.registrada_salida_por
    LEFT JOIN facturas f ON f.estadia_id = e.id`;

async function buscarDetalle(id) {
  const [filas] = await pool.query(`${SELECT_DETALLE} WHERE e.id = ?`, [id]);
  return filas[0] ?? null;
}

async function buscarAbierta({ placa, codigo_ticket }) {
  const [filas] = await pool.query(
    `${SELECT_DETALLE} WHERE e.estado = 'en_curso' AND ${placa ? 'v.placa = ?' : 'e.codigo_ticket = ?'}`,
    [placa ?? codigo_ticket]
  );
  return filas[0] ?? null;
}

async function listarEnCurso() {
  const [filas] = await pool.query(
    `${SELECT_DETALLE} WHERE e.estado = 'en_curso' ORDER BY e.fecha_hora_entrada`
  );
  return filas;
}

function filtrosHistorial({ placa, desde, hasta, puerta_id, estado, usuario_id }) {
  const condiciones = [];
  const valores = [];
  if (placa) {
    condiciones.push('v.placa LIKE ?');
    valores.push(`%${escaparLike(placa)}%`);
  }
  if (desde) {
    condiciones.push('e.fecha_hora_entrada >= ?');
    valores.push(`${desde} 00:00:00`);
  }
  if (hasta) {
    condiciones.push('e.fecha_hora_entrada <= ?');
    valores.push(`${hasta} 23:59:59`);
  }
  if (puerta_id) {
    condiciones.push('(e.puerta_entrada_id = ? OR e.puerta_salida_id = ?)');
    valores.push(puerta_id, puerta_id);
  }
  if (estado) {
    condiciones.push('e.estado = ?');
    valores.push(estado);
  }
  if (usuario_id) {
    condiciones.push('v.usuario_id = ?');
    valores.push(usuario_id); // vehículos de un dueño (portal del cliente)
  }
  return { where: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '', valores };
}

async function listarHistorial(filtros, { limit, offset }) {
  const { where, valores } = filtrosHistorial(filtros);
  const [filas] = await pool.query(
    `${SELECT_DETALLE} ${where} ORDER BY e.fecha_hora_entrada DESC, e.id DESC LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM estadias e JOIN vehiculos v ON v.id = e.vehiculo_id ${where}`,
    valores
  );
  return { filas, total };
}

/** Entradas y salidas mezcladas, la más reciente primero (bitácora). */
async function ultimosMovimientos(limite) {
  const [filas] = await pool.query(
    `SELECT * FROM (
       SELECT e.id AS estadia_id, 'entrada' AS movimiento, e.fecha_hora_entrada AS fecha, v.placa, v.tipo,
              c.codigo AS celda, pe.nombre AS puerta, NULL AS valor
         FROM estadias e JOIN vehiculos v ON v.id = e.vehiculo_id JOIN celdas c ON c.id = e.celda_id
         JOIN puertas pe ON pe.id = e.puerta_entrada_id
       UNION ALL
       SELECT e.id, 'salida', e.fecha_hora_salida, v.placa, v.tipo, c.codigo, ps.nombre, f.total
         FROM estadias e JOIN vehiculos v ON v.id = e.vehiculo_id JOIN celdas c ON c.id = e.celda_id
         LEFT JOIN puertas ps ON ps.id = e.puerta_salida_id
         LEFT JOIN facturas f ON f.estadia_id = e.id
        WHERE e.fecha_hora_salida IS NOT NULL
     ) m
     ORDER BY m.fecha DESC, m.estadia_id DESC
     LIMIT ?`,
    [limite]
  );
  return filas;
}

async function listarDenegados({ desde, hasta, placa }, { limit, offset }) {
  const condiciones = [];
  const valores = [];
  if (desde) {
    condiciones.push('a.fecha_hora >= ?');
    valores.push(`${desde} 00:00:00`);
  }
  if (hasta) {
    condiciones.push('a.fecha_hora <= ?');
    valores.push(`${hasta} 23:59:59`);
  }
  if (placa) {
    condiciones.push('a.placa LIKE ?');
    valores.push(`%${escaparLike(placa)}%`);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `SELECT a.id, a.placa, a.tipo_vehiculo, a.fecha_hora, a.motivo, a.regla_pico_placa_id,
            p.nombre AS puerta, ${NOMBRE('u')} AS registrado_por
       FROM accesos_denegados a
       JOIN puertas p ON p.id = a.puerta_id
       JOIN usuarios u ON u.id = a.registrado_por
       ${where}
      ORDER BY a.fecha_hora DESC, a.id DESC
      LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM accesos_denegados a ${where}`,
    valores
  );
  return { filas, total };
}

module.exports = {
  puerta,
  vehiculoPorPlaca,
  membresiaVigente,
  reservaVigente,
  estadiaAbiertaDeVehiculo,
  celdasLibres,
  celdaPorId,
  tarifaVigente,
  valorConfiguracion,
  insertarLectura,
  asociarLectura,
  insertarDenegado,
  insertarEstadia,
  ocuparCelda,
  liberarCelda,
  marcarReservaCumplida,
  bloquearEstadia,
  cerrarEstadia,
  buscarDetalle,
  buscarAbierta,
  listarEnCurso,
  listarHistorial,
  ultimosMovimientos,
  listarDenegados,
};
