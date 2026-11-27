// Funciones puras de acceso (spec 003 research R-03, R-04), sin BD.
const crypto = require('node:crypto');

/** Token de recuperación: 32 bytes aleatorios en hexadecimal (64 caracteres). Viaja solo en el correo. */
const generarTokenRecuperacion = () => crypto.randomBytes(32).toString('hex');

/** Lo que se guarda en la BD: SHA-256 del token (RNF-SEG-02). */
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

/** Reglas de la contraseña nueva (HU-12 y HU-14 «Datos»): 8–64 caracteres, al menos una letra y un dígito. */
function contrasenaCumple(texto) {
  const valor = String(texto ?? '');
  return valor.length >= 8 && valor.length <= 64 && /\p{L}/u.test(valor) && /\d/.test(valor);
}

module.exports = { generarTokenRecuperacion, hashToken, contrasenaCumple };
