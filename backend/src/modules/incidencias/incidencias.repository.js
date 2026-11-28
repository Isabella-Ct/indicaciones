// Único lugar con SQL de incidencias y su seguimiento (spec 013), y de la alerta «incidencia» para el
// Administrador (RF-INC-04; la bandeja es de la spec 014). Acepta una conexión opcional para la transacción.
const { pool } = require('../../config/db');
const { escapeLike } = require('../../utils/sql');

const COLUMNAS = `i.id_incidencia, i.codigo, i.tipo, i.estado, i.fecha_hora_evento, i.descripcion, i.evidencia_url, i.solucion,
  i.fecha_cierre, i.id_vehiculo, v.placa, v.tipo AS vehiculo_tipo, i.id_celda, c.codigo AS celda_codigo,
  i.id_operador, u.nombre_completo AS operador_nombre`;

const DESDE = `FROM incidencia i
  JOIN vehiculo v ON v.id_vehiculo = i.id_vehiculo
  JOIN usuario u ON u.id_usuario = i.id_operador
  LEFT JOIN celda c ON c.id_celda = i.id_celda`;

const aIncidencia = (f) =>
  f && {
    idIncidencia: f.id_incidencia,
    codigo: f.codigo,
    tipo: f.tipo,
    estado: f.estado,
    fechaHoraEvento: f.fecha_hora_evento,
    descripcion: f.descripcion,
    tieneEvidencia: Boolean(f.evidencia_url),
    solucion: f.solucion,
    fechaCierre: f.fecha_cierre,
    vehiculo: { idVehiculo: f.id_vehiculo, placa: f.placa, tipo: f.vehiculo_tipo },
    celda: f.id_celda ? { idCelda: f.id_celda, codigo: f.celda_codigo } : null,
    operador: { idUsuario: f.id_operador, nombre: f.operador_nombre },
    // Dato interno: clave del archivo (no sale en la API).
    _evidencia: f.evidencia_url,
  };

async function obtenerPorId(id, { conexion = pool, bloquear = false } = {}) {
  if (bloquear) await conexion.query('SELECT id_incidencia FROM incidencia WHERE id_incidencia = ? FOR UPDATE', [id]);
  const [[fila]] = await conexion.query(`SELECT ${COLUMNAS} ${DESDE} WHERE i.id_incidencia = ?`, [id]);
  return aIncidencia(fila) ?? null;
}

async function insertar(d, { conexion }) {
  const [r] = await conexion.query(
    `INSERT INTO incidencia (codigo, tipo, id_vehiculo, id_celda, fecha_hora_evento, descripcion, evidencia_url, id_operador)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [d.codigo, d.tipo, d.idVehiculo, d.idCelda, d.fechaHoraEvento, d.descripcion, d.evidencia, d.idOperador]
  );
  return r.insertId;
}

/** RF-INC-05: búsqueda por código o placa y filtros por tipo, estado y fecha del evento. */
async function listar({ q, tipo, estado, desde, hasta, limit, offset }) {
  const condiciones = [];
  const valores = [];
  if (q) {
    const patron = `%${escapeLike(q)}%`;
    condiciones.push('(i.codigo LIKE ? OR v.placa LIKE ?)');
    valores.push(patron, patron.toUpperCase().replace(/[\s.-]/g, ''));
  }
  if (tipo) {
    condiciones.push('i.tipo = ?');
    valores.push(tipo);
  }
  if (estado) {
    condiciones.push('i.estado = ?');
    valores.push(estado);
  }
  if (desde) {
    condiciones.push('i.fecha_hora_evento >= ?');
    valores.push(desde);
  }
  if (hasta) {
    condiciones.push('i.fecha_hora_evento < ?');
    valores.push(hasta);
  }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(`SELECT ${COLUMNAS} ${DESDE} ${donde} ORDER BY i.fecha_hora_evento DESC, i.id_incidencia DESC LIMIT ? OFFSET ?`, [
    ...valores,
    limit,
    offset,
  ]);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${DESDE} ${donde}`, valores);
  return { filas: filas.map(aIncidencia), total: Number(total) };
}

/** RF-INC-06: historial de seguimiento, del más antiguo al más reciente. */
async function seguimientos(idIncidencia, { conexion = pool } = {}) {
  const [filas] = await conexion.query(
    `SELECT s.id_seguimiento, s.nota, s.fecha, s.id_usuario, u.nombre_completo
       FROM seguimiento_incidencia s JOIN usuario u ON u.id_usuario = s.id_usuario
      WHERE s.id_incidencia = ? ORDER BY s.fecha, s.id_seguimiento`,
    [idIncidencia]
  );
  return filas.map((f) => ({ idSeguimiento: f.id_seguimiento, nota: f.nota, fecha: f.fecha, usuario: { idUsuario: f.id_usuario, nombre: f.nombre_completo } }));
}

async function insertarSeguimiento({ idIncidencia, nota, idUsuario, fecha }, { conexion }) {
  const [r] = await conexion.query('INSERT INTO seguimiento_incidencia (id_incidencia, nota, id_usuario, fecha) VALUES (?, ?, ?, ?)', [
    idIncidencia,
    nota,
    idUsuario,
    fecha,
  ]);
  return r.insertId;
}

async function cambiarEstado(id, estado, { conexion }) {
  await conexion.query('UPDATE incidencia SET estado = ? WHERE id_incidencia = ?', [estado, id]);
}

async function cerrar(id, { solucion, fecha }, { conexion }) {
  await conexion.query("UPDATE incidencia SET estado = 'cerrada', solucion = ?, fecha_cierre = ? WHERE id_incidencia = ?", [solucion, fecha, id]);
}

/** RF-INC-04 / RF-MON-04: alerta «incidencia» para el Administrador. */
async function insertarAlerta({ mensaje, referencia, fecha }, { conexion }) {
  await conexion.query("INSERT INTO alerta (tipo, mensaje, referencia, fecha) VALUES ('incidencia', ?, ?, ?)", [mensaje.slice(0, 200), referencia, fecha]);
}

module.exports = { obtenerPorId, insertar, listar, seguimientos, insertarSeguimiento, cambiarEstado, cerrar, insertarAlerta };
