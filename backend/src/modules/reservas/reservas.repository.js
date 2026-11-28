// Único lugar con SQL de reservas (spec 012). Franja = [inicio, inicio + minutos_espera] (research R-01); dos
// franjas se cruzan si se tocan. Acepta una conexión opcional para la transacción.
const { pool } = require('../../config/db');
const { escapeLike } = require('../../utils/sql');

const FIN = 'DATE_ADD(r.fecha_hora_inicio, INTERVAL r.minutos_espera MINUTE)';

const COLUMNAS = `r.id_reserva, r.codigo, r.estado, r.fecha_hora_inicio, r.minutos_espera, ${FIN} AS fin_espera, r.id_movimiento,
  r.id_cliente, u.nombre_completo AS cliente_nombre, u.tipo_documento, u.numero_documento, u.correo AS cliente_correo,
  r.id_vehiculo, v.placa, v.tipo AS vehiculo_tipo,
  r.id_celda, c.codigo AS celda_codigo, c.estado AS celda_estado, c.tipo_vehiculo AS celda_tipo, c.id_parqueadero, p.nombre AS parqueadero`;

const DESDE = `FROM reserva r
  JOIN usuario u ON u.id_usuario = r.id_cliente
  JOIN vehiculo v ON v.id_vehiculo = r.id_vehiculo
  JOIN celda c ON c.id_celda = r.id_celda
  JOIN parqueadero p ON p.id_parqueadero = c.id_parqueadero`;

/** Condición SQL: la reserva `r` confirmada se cruza con la franja [?, ?]. */
const CRUZA = `r.estado = 'confirmada' AND r.fecha_hora_inicio <= ? AND ? <= ${FIN}`;

const aReserva = (f) =>
  f && {
    idReserva: f.id_reserva,
    codigo: f.codigo,
    estado: f.estado,
    fechaHoraInicio: f.fecha_hora_inicio,
    minutosEspera: f.minutos_espera,
    finEspera: f.fin_espera,
    idMovimiento: f.id_movimiento,
    cliente: { idUsuario: f.id_cliente, nombre: f.cliente_nombre, tipoDocumento: f.tipo_documento, numeroDocumento: f.numero_documento },
    vehiculo: { idVehiculo: f.id_vehiculo, placa: f.placa, tipo: f.vehiculo_tipo },
    celda: { idCelda: f.id_celda, codigo: f.celda_codigo, idParqueadero: f.id_parqueadero, parqueadero: f.parqueadero },
    // Datos internos (no salen en la API).
    _correo: f.cliente_correo,
    _estadoCelda: f.celda_estado,
    _tipoCelda: f.celda_tipo,
  };

async function obtenerPorId(id, { conexion = pool, bloquear = false } = {}) {
  if (bloquear) await conexion.query('SELECT id_reserva FROM reserva WHERE id_reserva = ? FOR UPDATE', [id]);
  const [[fila]] = await conexion.query(`SELECT ${COLUMNAS} ${DESDE} WHERE r.id_reserva = ?`, [id]);
  return aReserva(fila) ?? null;
}

/** RF-RES-02: reserva confirmada del vehículo que se cruza con la franja (o null). */
async function cruceDeVehiculo(idVehiculo, { desde, hasta }, { conexion = pool } = {}) {
  const [[fila]] = await conexion.query(`SELECT r.codigo FROM reserva r WHERE r.id_vehiculo = ? AND ${CRUZA} LIMIT 1`, [idVehiculo, hasta, desde]);
  return fila?.codigo ?? null;
}

/** RF-RES-02: ¿la celda tiene una reserva confirmada que se cruza con la franja? (sin contar `excluir`). */
async function celdaCruzada(idCelda, { desde, hasta }, { conexion = pool, excluir = 0 } = {}) {
  const [[fila]] = await conexion.query(`SELECT r.id_reserva FROM reserva r WHERE r.id_celda = ? AND r.id_reserva <> ? AND ${CRUZA} LIMIT 1`, [
    idCelda,
    excluir,
    hasta,
    desde,
  ]);
  return Boolean(fila);
}

/**
 * Celdas del tipo, de un parqueadero activo, no inhabilitadas y sin reservas que se crucen con la franja, por
 * código. `soloDisponibles`: además, que estén libres ahora (reasignación al iniciar, R-07).
 */
async function celdasLibres({ idParqueadero, tipo, desde, hasta, soloDisponibles = false, excluir = 0, limit = 200 }, { conexion = pool } = {}) {
  const [filas] = await conexion.query(
    `SELECT c.id_celda, c.codigo, c.piso, c.area FROM celda c JOIN parqueadero p ON p.id_parqueadero = c.id_parqueadero
      WHERE c.id_parqueadero = ? AND c.tipo_vehiculo = ? AND p.estado = 'activo'
        AND ${soloDisponibles ? "c.estado = 'disponible'" : "c.estado <> 'inhabilitada'"}
        AND NOT EXISTS (SELECT 1 FROM reserva r WHERE r.id_celda = c.id_celda AND r.id_reserva <> ? AND ${CRUZA})
      ORDER BY c.codigo LIMIT ?`,
    [idParqueadero, tipo, excluir, hasta, desde, limit]
  );
  return filas.map((f) => ({ idCelda: f.id_celda, codigo: f.codigo, piso: f.piso, area: f.area }));
}

/** Parqueadero principal: el activo de menor id. */
async function parqueaderoPrincipal({ conexion = pool } = {}) {
  const [[fila]] = await conexion.query("SELECT id_parqueadero FROM parqueadero WHERE estado = 'activo' ORDER BY id_parqueadero LIMIT 1");
  return fila?.id_parqueadero ?? null;
}

async function insertar({ codigo, idCliente, idVehiculo, idCelda, inicio, minutosEspera }, { conexion }) {
  const [r] = await conexion.query(
    'INSERT INTO reserva (codigo, id_cliente, id_vehiculo, id_celda, fecha_hora_inicio, minutos_espera) VALUES (?, ?, ?, ?, ?, ?)',
    [codigo, idCliente, idVehiculo, idCelda, inicio, minutosEspera]
  );
  return r.insertId;
}

async function cambiarEstado(id, estado, { conexion, idMovimiento = null }) {
  await conexion.query('UPDATE reserva SET estado = ?, id_movimiento = COALESCE(?, id_movimiento) WHERE id_reserva = ?', [estado, idMovimiento, id]);
}

async function reasignar(id, idCelda, { conexion }) {
  await conexion.query('UPDATE reserva SET id_celda = ? WHERE id_reserva = ?', [idCelda, id]);
}

/** Cambia el estado de la celda solo si está en `desde` (no pisa una ocupada o inhabilitada). */
async function estadoCelda(idCelda, { desde, hacia }, { conexion }) {
  const [r] = await conexion.query('UPDATE celda SET estado = ? WHERE id_celda = ? AND estado = ?', [hacia, idCelda, desde]);
  return r.affectedRows > 0;
}

/** HU-55 E1: la reserva confirmada del vehículo cuya franja contiene el instante (bloqueada). */
async function enFranjaDeVehiculo(idVehiculo, instante, { conexion }) {
  const [[fila]] = await conexion.query(
    `SELECT r.id_reserva FROM reserva r WHERE r.id_vehiculo = ? AND r.estado = 'confirmada' AND r.fecha_hora_inicio <= ? AND ? <= ${FIN}
      ORDER BY r.fecha_hora_inicio LIMIT 1 FOR UPDATE`,
    [idVehiculo, instante, instante]
  );
  return fila ? obtenerPorId(fila.id_reserva, { conexion }) : null;
}

/** RF-RES-09: confirmadas cuya espera ya terminó (bloqueadas). */
async function porVencer(instante, { conexion }) {
  const [filas] = await conexion.query(`SELECT r.id_reserva FROM reserva r WHERE r.estado = 'confirmada' AND ${FIN} < ? ORDER BY r.id_reserva FOR UPDATE`, [instante]);
  return Promise.all(filas.map((f) => obtenerPorId(f.id_reserva, { conexion })));
}

/** RF-RES-08: confirmadas en franja cuya celda todavía no está reservada (bloqueadas). */
async function porActivar(instante, { conexion }) {
  const [filas] = await conexion.query(
    `SELECT r.id_reserva FROM reserva r JOIN celda c ON c.id_celda = r.id_celda
      WHERE r.estado = 'confirmada' AND r.fecha_hora_inicio <= ? AND ? <= ${FIN} AND c.estado <> 'reservada'
      ORDER BY r.fecha_hora_inicio, r.id_reserva FOR UPDATE`,
    [instante, instante]
  );
  return Promise.all(filas.map((f) => obtenerPorId(f.id_reserva, { conexion })));
}

/** RF-RES-06: por rango de inicio, estado, cliente y búsqueda (placa, código o cliente). */
async function listar({ desde, hasta, estado, q, idCliente, descendente = false, limit, offset }) {
  const condiciones = [];
  const valores = [];
  if (desde) {
    condiciones.push('r.fecha_hora_inicio >= ?');
    valores.push(desde);
  }
  if (hasta) {
    condiciones.push('r.fecha_hora_inicio < ?');
    valores.push(hasta);
  }
  if (estado) {
    condiciones.push('r.estado = ?');
    valores.push(estado);
  }
  if (idCliente) {
    condiciones.push('r.id_cliente = ?');
    valores.push(idCliente);
  }
  if (q) {
    const patron = `%${escapeLike(q)}%`;
    condiciones.push('(v.placa LIKE ? OR r.codigo LIKE ? OR u.nombre_completo LIKE ?)');
    valores.push(patron, patron, patron);
  }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const orden = descendente ? 'r.fecha_hora_inicio DESC, r.id_reserva DESC' : 'r.fecha_hora_inicio, r.id_reserva';
  const [filas] = await pool.query(`SELECT ${COLUMNAS} ${DESDE} ${donde} ORDER BY ${orden} LIMIT ? OFFSET ?`, [...valores, limit, offset]);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${DESDE} ${donde}`, valores);
  return { filas: filas.map(aReserva), total: Number(total) };
}

/** Notificación interna tipo «reserva» por correo y en la aplicación (RF-RES-03). */
async function insertarNotificacion({ idUsuario, titulo, mensaje, fecha }, { conexion }) {
  const [r] = await conexion.query(
    "INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje, canal, enviada, leida, fecha) VALUES (?, 'reserva', ?, ?, 'ambos', FALSE, FALSE, ?)",
    [idUsuario, titulo.slice(0, 80), mensaje.slice(0, 300), fecha]
  );
  return r.insertId;
}

async function marcarNotificacionEnviada(idNotificacion) {
  await pool.query('UPDATE notificacion SET enviada = TRUE, intentos_envio = intentos_envio + 1 WHERE id_notificacion = ?', [idNotificacion]);
}

module.exports = {
  obtenerPorId,
  cruceDeVehiculo,
  celdaCruzada,
  celdasLibres,
  parqueaderoPrincipal,
  insertar,
  cambiarEstado,
  reasignar,
  estadoCelda,
  enFranjaDeVehiculo,
  porVencer,
  porActivar,
  listar,
  insertarNotificacion,
  marcarNotificacionEnviada,
};
