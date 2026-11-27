// Único lugar con SQL de usuarios. Nunca selecciona contrasena_hash (RNF-SEG-02); acepta una
// conexión opcional para participar en la transacción del servicio. snake_case ↔ camelCase.
const { pool } = require('../../config/db');
const { escapeLike } = require('../../utils/sql');
const { aIsoBogota } = require('../../utils/fechas');
const { ROL_ADMINISTRADOR } = require('../../config/constantes');

const COLUMNAS = `u.id_usuario, u.tipo_documento, u.numero_documento, u.nombre_completo, u.correo,
  u.celular, u.foto_url, u.id_rol, r.nombre AS rol_nombre, u.estado, u.debe_cambiar_contrasena,
  u.acepta_tratamiento_datos, u.fecha_autorizacion, u.created_at, u.updated_at`;

function aUsuario(f) {
  return {
    idUsuario: f.id_usuario,
    tipoDocumento: f.tipo_documento,
    numeroDocumento: f.numero_documento,
    nombreCompleto: f.nombre_completo,
    correo: f.correo,
    celular: f.celular,
    fotoUrl: f.foto_url ? `/api/v1/usuarios/${f.id_usuario}/foto` : null,
    rol: { idRol: f.id_rol, nombre: f.rol_nombre },
    estado: f.estado,
    debeCambiarContrasena: Boolean(f.debe_cambiar_contrasena),
    aceptaTratamientoDatos: Boolean(f.acepta_tratamiento_datos),
    fechaAutorizacion: aIsoBogota(f.fecha_autorizacion),
    createdAt: aIsoBogota(f.created_at),
    updatedAt: aIsoBogota(f.updated_at),
  };
}

function filtros({ q, idRol, estado }) {
  const condiciones = [];
  const valores = [];
  if (q) {
    const patron = `%${escapeLike(q)}%`;
    condiciones.push('(u.numero_documento LIKE ? OR u.nombre_completo LIKE ? OR u.correo LIKE ?)');
    valores.push(patron, patron, patron);
  }
  if (idRol) {
    condiciones.push('u.id_rol = ?');
    valores.push(idRol);
  }
  if (estado) {
    condiciones.push('u.estado = ?');
    valores.push(estado);
  }
  return { donde: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '', valores };
}

/** RF-USR-06: página de usuarios con búsqueda y filtros. */
async function listar({ q, idRol, estado, limit, offset }) {
  const { donde, valores } = filtros({ q, idRol, estado });
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      ${donde} ORDER BY u.nombre_completo, u.id_usuario LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM usuario u ${donde}`, valores);
  return { usuarios: filas.map(aUsuario), total: Number(total) };
}

/** Usuario con su rol; `bloquear` usa SELECT … FOR UPDATE. Incluye la clave interna de la foto. */
async function obtenerPorId(id, { conexion = pool, bloquear = false } = {}) {
  const [filas] = await conexion.query(
    `SELECT ${COLUMNAS}, r.es_base AS rol_es_base FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = ? ${bloquear ? 'FOR UPDATE' : ''}`,
    [id]
  );
  if (!filas[0]) return null;
  return { ...aUsuario(filas[0]), claveFoto: filas[0].foto_url, rolEsBase: Boolean(filas[0].rol_es_base) };
}

/** RF-ROL-14: rol que se va a asignar, bloqueado mientras dura la transacción. */
async function rolAsignable(idRol, { conexion }) {
  const [filas] = await conexion.query(
    'SELECT id_rol, nombre, estado, es_base FROM rol WHERE id_rol = ? FOR UPDATE',
    [idRol]
  );
  return filas[0] ?? null;
}

/** id del rol base Cliente (alcance del Operador, research R-08). */
async function idRolCliente() {
  const [[fila]] = await pool.query("SELECT id_rol FROM rol WHERE es_base = TRUE AND nombre = 'Cliente'");
  return fila.id_rol;
}

async function insertar(datos, { conexion }) {
  const [resultado] = await conexion.query(
    `INSERT INTO usuario (tipo_documento, numero_documento, nombre_completo, correo, celular, foto_url,
                          id_rol, contrasena_hash, debe_cambiar_contrasena, estado,
                          acepta_tratamiento_datos, fecha_autorizacion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', TRUE, NOW())`,
    [
      datos.tipoDocumento,
      datos.numeroDocumento,
      datos.nombreCompleto,
      datos.correo,
      datos.celular,
      datos.claveFoto ?? null,
      datos.idRol,
      datos.contrasenaHash,
      // Contraseña temporal (spec 002) → TRUE; autorregistro (spec 003) → FALSE.
      datos.debeCambiarContrasena ?? true,
    ]
  );
  return resultado.insertId;
}

const COLUMNA_DE = {
  tipoDocumento: 'tipo_documento',
  numeroDocumento: 'numero_documento',
  nombreCompleto: 'nombre_completo',
  correo: 'correo',
  celular: 'celular',
  idRol: 'id_rol',
  claveFoto: 'foto_url',
};

/** Actualiza solo los campos dados (los nombres de columna vienen de COLUMNA_DE, no del cliente). */
async function actualizar(id, campos, { conexion }) {
  const claves = Object.keys(campos).filter((c) => COLUMNA_DE[c]);
  if (claves.length === 0) return;
  await conexion.query(
    `UPDATE usuario SET ${claves.map((c) => `${COLUMNA_DE[c]} = ?`).join(', ')} WHERE id_usuario = ?`,
    [...claves.map((c) => campos[c]), id]
  );
}

async function cambiarEstado(id, estado, { conexion }) {
  await conexion.query('UPDATE usuario SET estado = ? WHERE id_usuario = ?', [estado, id]);
}

/** RF-USR-13: invalida las sesiones abiertas del usuario. */
async function revocarSesiones(idUsuario, { conexion }) {
  const [resultado] = await conexion.query(
    'UPDATE sesion SET revocada_en = NOW() WHERE id_usuario = ? AND revocada_en IS NULL',
    [idUsuario]
  );
  return resultado.affectedRows;
}

/** RF-USR-07: vehículos del usuario (spec 005 los registra). */
async function vehiculosDe(idUsuario) {
  const [filas] = await pool.query(
    `SELECT id_vehiculo, placa, tipo, marca, color, estado
       FROM vehiculo WHERE id_propietario = ? ORDER BY placa`,
    [idUsuario]
  );
  return filas.map((f) => ({
    idVehiculo: f.id_vehiculo,
    placa: f.placa,
    tipo: f.tipo,
    marca: f.marca,
    color: f.color,
    estado: f.estado,
  }));
}

/** RF-USR-07: membresía activa y vigente hoy (spec 010 las crea). */
async function membresiaVigente(idUsuario) {
  const [filas] = await pool.query(
    `SELECT m.id_membresia, p.nombre AS plan, v.placa,
            DATE_FORMAT(m.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
            DATE_FORMAT(m.fecha_fin, '%Y-%m-%d') AS fecha_fin
       FROM membresia m
       JOIN plan_membresia p ON p.id_plan = m.id_plan
       JOIN vehiculo v ON v.id_vehiculo = m.id_vehiculo
      WHERE m.id_cliente = ? AND m.estado = 'activa' AND m.fecha_fin >= CURDATE()
      ORDER BY m.fecha_fin DESC LIMIT 1`,
    [idUsuario]
  );
  const f = filas[0];
  return f
    ? { idMembresia: f.id_membresia, plan: f.plan, placa: f.placa, fechaInicio: f.fecha_inicio, fechaFin: f.fecha_fin }
    : null;
}

/** RF-USR-16: Administradores activos (rol base Administrador), excepto `excluir`. */
async function administradoresActivos(excluir, { conexion = pool } = {}) {
  const [filas] = await conexion.query(
    `SELECT u.id_usuario, u.correo FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      WHERE r.es_base = TRUE AND r.nombre = ? AND u.estado = 'activo' AND u.id_usuario <> ?`,
    [ROL_ADMINISTRADOR, excluir]
  );
  return filas.map((f) => ({ idUsuario: f.id_usuario, correo: f.correo }));
}

/** Inserta una notificación tipo «datos» por destinatario; devuelve sus ids. */
async function insertarNotificaciones(destinatarios, { titulo, mensaje }, { conexion }) {
  const ids = [];
  for (const { idUsuario } of destinatarios) {
    const [resultado] = await conexion.query(
      `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje, canal, enviada, leida, fecha)
       VALUES (?, 'datos', ?, ?, 'ambos', FALSE, FALSE, NOW())`,
      [idUsuario, titulo, mensaje]
    );
    ids.push(resultado.insertId);
  }
  return ids;
}

async function marcarNotificacionEnviada(idNotificacion) {
  await pool.query(
    'UPDATE notificacion SET enviada = TRUE, intentos_envio = intentos_envio + 1 WHERE id_notificacion = ?',
    [idNotificacion]
  );
}

module.exports = {
  listar,
  obtenerPorId,
  rolAsignable,
  idRolCliente,
  insertar,
  actualizar,
  cambiarEstado,
  revocarSesiones,
  vehiculosDe,
  membresiaVigente,
  administradoresActivos,
  insertarNotificaciones,
  marcarNotificacionEnviada,
};
