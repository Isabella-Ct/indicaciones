// Ayudas de prueba para liquidaciones, pagos, facturas y caja (spec 009 en adelante): registrar una estadía
// completa con el reloj fijado, crear una membresía por SQL (la spec 010 aún no existe) y crear un operador
// propio para aislar su turno de caja.
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

let operadores = 0;
/**
 * Operador nuevo (sin contraseña temporal) y su token: su turno de caja empieza vacío. Usa un rol propio con
 * los mismos permisos del Operador, para no cambiar los conteos del rol Operador que revisa la spec 001.
 */
async function crearOperador() {
  operadores += 1;
  const documento = `7${String(Date.now()).slice(-7)}${operadores}`;
  const [rol] = await pool.query("INSERT INTO rol (nombre, descripcion, es_base, estado) VALUES (?, 'Rol de prueba de caja', FALSE, 'activo')", [
    `Cajero ${documento}`,
  ]);
  await pool.query('INSERT INTO rol_permiso (id_rol, id_permiso) SELECT ?, id_permiso FROM rol_permiso WHERE id_rol = 2', [rol.insertId]);
  const hash = await bcrypt.hash('Operador2026*', 4);
  await pool.query(
    `INSERT INTO usuario (tipo_documento, numero_documento, nombre_completo, correo, celular, id_rol, contrasena_hash, debe_cambiar_contrasena, estado, acepta_tratamiento_datos, fecha_autorizacion)
     VALUES ('CC', ?, ?, ?, '3001234567', ?, ?, FALSE, 'activo', TRUE, NOW())`,
    [documento, `Operador de caja ${operadores}`, `caja${documento}@parqueaderoabc.co`, rol.insertId, hash]
  );
  const res = await request(app).post('/api/v1/auth/login').send({ tipoDocumento: 'CC', numeroDocumento: documento, contrasena: 'Operador2026*' });
  if (res.status !== 200) throw new Error(`Login del operador de caja: ${JSON.stringify(res.body)}`);
  return res.body.data.token;
}

module.exports = { estadia, crearMembresia, crearOperador };
