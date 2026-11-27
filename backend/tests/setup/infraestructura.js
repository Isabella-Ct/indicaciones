// Ayudas de prueba para parqueaderos, celdas y vehículos (specs 004 en adelante). Cada prueba crea su
// propia infraestructura para no alterar los conteos de la semilla que usan otros archivos.
const { pool } = require('../../src/config/db');
const { app, request, auth } = require('./helpers');
const { VEHICULOS } = require('../../database/generar-seed');

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

// Placas de la semilla (spec 005): las aleatorias nunca las repiten.
const PLACAS_SEMILLA = new Set(VEHICULOS.map((v) => v[1]));
const letra = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));

/** Placa aleatoria válida para el tipo que no está en la semilla. */
function placaAleatoria(tipo = 'carro') {
  for (;;) {
    const n = String(Math.floor(Math.random() * 900) + 100);
    const letras = letra() + letra() + letra();
    const placa = tipo === 'carro' ? `${letras}${n}` : `${letras}${n.slice(0, 2)}${letra()}`;
    if (!PLACAS_SEMILLA.has(placa)) return placa;
  }
}

/** Inserta un vehículo directo en la BD (sin pasar por la API). Devuelve { id, placa }. */
async function crearVehiculo(tipo = 'carro') {
  const placa = placaAleatoria(tipo);
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

/**
 * Abre un movimiento por SQL (la spec 007 hará la entrada real): celda ocupada + movimiento abierto
 * en la puerta 1 con el Operador semilla. Devuelve el id del movimiento.
 */
async function abrirMovimiento(idVehiculo, idCelda, { entrada = new Date() } = {}) {
  await ocuparPorSql(idCelda, idVehiculo);
  const [r] = await pool.query(
    "INSERT INTO movimiento (id_vehiculo, id_celda, id_puerta_entrada, fecha_hora_entrada, id_operador_entrada) VALUES (?, ?, 1, ?, 2)",
    [idVehiculo, idCelda, entrada]
  );
  return r.insertId;
}

module.exports = { crearParqueadero, crearCeldas, crearVehiculo, placaAleatoria, ocuparPorSql, abrirMovimiento, sufijo };
