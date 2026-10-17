const { AppError } = require('../../utils/errores');
const repo = require('./salud.repository');

async function verificar() {
  try {
    await repo.ping();
  } catch {
    throw new AppError(503, 'BD_NO_DISPONIBLE', 'No hay conexión con la base de datos.');
  }
  return { estado: 'ok', bd: 'ok' };
}

module.exports = { verificar };
