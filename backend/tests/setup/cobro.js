// Ayudas de prueba para liquidaciones, pagos, facturas y caja (spec 009 en adelante): registrar una estadía
// completa con el reloj fijado, crear una membresía por SQL (atajo de las pruebas de la spec 009) y crear un
// operador o un cliente propios para aislar sus datos.
const bcrypt = require('bcrypt');
const { pool } = require('../../src/config/db');
const { app, request, auth } = require('./helpers');
const { placaAleatoria } = require('./infraestructura');
const { fijarReloj } = require('./sede');

/**
 * Entra a `inicio` y sale `minutos` después (reloj fijado). Devuelve el cuerpo de la salida.
 * @param {{ puertas: { mixta: number } }} sede
 */
async function estadia(sede, token, { minutos, inicio = '2026-11-29T08:10:00-05:00', placa = placaAleatoria(), tipo = 'carro', idPropietario } = {}) {
  const reloj = fijarReloj(inicio);
  if (idPropietario) {
    await request(app).post('/api/v1/vehiculos').set(auth(token)).send({ placa, tipo, color: 'Gris', marca: 'Prueba', modelo: 2022, idPropietario });
  }
  const entrada = await request(app).post('/api/v1/movimientos').set(auth(token)).send({ placa, tipo: idPropietario ? undefined : tipo, idPuerta: sede.puertas.mixta });
  if (entrada.status !== 201) throw new Error(`Entrada: ${JSON.stringify(entrada.body)}`);
  reloj.sumarMinutos(minutos);
  const salida = await request(app).post(`/api/v1/movimientos/${entrada.body.data.idMovimiento}/salida`).set(auth(token)).send({ idPuerta: sede.puertas.mixta });
  if (salida.status !== 200) throw new Error(`Salida: ${JSON.stringify(salida.body)}`);
  return salida.body.data;
}

let planes = 0;
/** Membresía activa por SQL para el vehículo (cubre de `desde` a `hasta`). */
async function crearMembresia({ idVehiculo, idCliente, tipo = 'carro', desde = '2026-11-01', hasta = '2026-12-31' }) {
  planes += 1;
  const [p] = await pool.query("INSERT INTO plan_membresia (nombre, tipo_vehiculo, valor_mensual) VALUES (?, ?, 90000)", [`Plan prueba ${Date.now()}-${planes}`, tipo]);
  const [m] = await pool.query("INSERT INTO membresia (id_plan, id_cliente, id_vehiculo, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?, ?)", [
    p.insertId,
    idCliente,
    idVehiculo,
    desde,
    hasta,
  ]);
  return m.insertId;
}

let usuarios = 0;
/**
 * Usuario nuevo (sin contraseña temporal) con un rol propio que copia los permisos del rol base (2 = Operador,
 * 3 = Cliente), para no cambiar los conteos de los roles base que revisa la spec 001. Devuelve { token, idUsuario }.
 */
async function crearUsuarioConRol(idRolBase, etiqueta) {
  usuarios += 1;
  const documento = `7${String(Date.now()).slice(-7)}${usuarios}`;
  const [rol] = await pool.query("INSERT INTO rol (nombre, descripcion, es_base, estado) VALUES (?, 'Rol de prueba', FALSE, 'activo')", [
    `${etiqueta} ${documento}`,
  ]);
  await pool.query('INSERT INTO rol_permiso (id_rol, id_permiso) SELECT ?, id_permiso FROM rol_permiso WHERE id_rol = ?', [rol.insertId, idRolBase]);
  const hash = await bcrypt.hash('Prueba2026*', 4);
  const [u] = await pool.query(
    `INSERT INTO usuario (tipo_documento, numero_documento, nombre_completo, correo, celular, id_rol, contrasena_hash, debe_cambiar_contrasena, estado, acepta_tratamiento_datos, fecha_autorizacion)
     VALUES ('CC', ?, ?, ?, '3001234567', ?, ?, FALSE, 'activo', TRUE, NOW())`,
    [documento, `${etiqueta} de prueba ${usuarios}`, `prueba${documento}@parqueaderoabc.co`, rol.insertId, hash]
  );
  const res = await request(app).post('/api/v1/auth/login').send({ tipoDocumento: 'CC', numeroDocumento: documento, contrasena: 'Prueba2026*' });
  if (res.status !== 200) throw new Error(`Login de ${etiqueta}: ${JSON.stringify(res.body)}`);
  return { token: res.body.data.token, idUsuario: u.insertId };
}

/** Operador nuevo y su token: su turno de caja empieza vacío. */
const crearOperador = async () => (await crearUsuarioConRol(2, 'Cajero')).token;

/** Cliente nuevo, sin vehículos ni membresías: { token, idUsuario }. */
const crearCliente = () => crearUsuarioConRol(3, 'Cliente');

module.exports = { estadia, crearMembresia, crearOperador, crearCliente };
