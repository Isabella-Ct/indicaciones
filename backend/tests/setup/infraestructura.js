// Ayudas de prueba para parqueaderos, celdas y vehículos (specs 004 en adelante). Cada prueba crea su
// propia infraestructura para no alterar los conteos de la semilla que usan otros archivos.
const { pool } = require('../../src/config/db');
const { app, request, auth } = require('./helpers');

let secuencia = 0;
const sufijo = () => `${Date.now() % 1e6}${++secuencia}`;

/** Crea un parqueadero activo por la API y devuelve su id. */
async function crearParqueadero(token, cambios = {}) {
  const res = await request(app)
    .post('/api/v1/parqueaderos')
    .set(auth(token))
    .send({ nombre: `Prueba ${sufijo()}`, direccion: 'Calle 10 # 20-30', pisos: 2, ...cambios });
  if (res.status !== 201) throw new Error(`No se creó el parqueadero: ${JSON.stringify(res.body)}`);
  return res.body.data.idParqueadero;
}

/** Crea celdas por rango y devuelve sus ids en orden de código. */
async function crearCeldas(token, idParqueadero, { prefijo = 'T-', cantidad = 3, tipoVehiculo = 'carro', piso = 1 } = {}) {
  await request(app)
    .post('/api/v1/celdas/lote')
    .set(auth(token))
    .send({ idParqueadero, prefijo, desde: 1, hasta: cantidad, tipoVehiculo, piso });
  const [filas] = await pool.query('SELECT id_celda FROM celda WHERE id_parqueadero = ? AND codigo LIKE ? ORDER BY codigo', [
    idParqueadero,
    `${prefijo}%`,
  ]);
  return filas.map((f) => f.id_celda);
}

/** Inserta un vehículo directo en la BD (el CRUD de vehículos es de la spec 005). Devuelve { id, placa }. */
async function crearVehiculo(tipo = 'carro') {
  const n = String(Math.floor(Math.random() * 900) + 100);
  const letras = Array.from({ length: 3 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
  const placa = tipo === 'carro' ? `${letras}${n}` : `${letras}${n.slice(0, 2)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
  const [r] = await pool.query(
    "INSERT INTO vehiculo (placa, tipo, color, marca, modelo, estado) VALUES (?, ?, 'Gris', 'Prueba', 2024, 'activo')",
    [placa, tipo]
  );
  return { id: r.insertId, placa };
}

/** Ocupa una celda directo en la BD (para simular vehículos dentro). */
async function ocuparPorSql(idCelda, idVehiculo) {
  await pool.query("UPDATE celda SET estado = 'ocupada', id_vehiculo_actual = ? WHERE id_celda = ?", [idVehiculo, idCelda]);
}

module.exports = { crearParqueadero, crearCeldas, crearVehiculo, ocuparPorSql, sufijo };
