// Estado del servidor y de la base de datos.
const { ping } = require('../../config/db');
const { ok } = require('../../utils/respuesta');
const { AppError } = require('../../utils/errores');
const { aIsoBogota } = require('../../utils/fechas');

async function estado(_req, res) {
  try {
    await ping();
  } catch {
    throw new AppError(503, 'BD_NO_DISPONIBLE', 'La base de datos no está disponible.');
  }
  return ok(res, { estado: 'ok', baseDatos: 'ok', hora: aIsoBogota(new Date()) });
}

module.exports = { estado };
