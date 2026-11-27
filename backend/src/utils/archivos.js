// Fotos privadas de usuario (RNF-PRI-03, spec 002 research R-03): nombre aleatorio, fuera de la
// carpeta pública del frontend. En la BD se guarda solo la clave relativa 'usuarios/<uuid>.<ext>'.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const CARPETA_UPLOADS = path.join(__dirname, '..', '..', 'uploads');
const CLAVE_VALIDA = /^usuarios\/[0-9a-f-]{36}\.(jpg|png)$/;

/** Guarda el contenido y devuelve su clave. */
async function guardarFoto(buffer, ext) {
  const clave = `usuarios/${crypto.randomUUID()}.${ext}`;
  await fs.mkdir(path.join(CARPETA_UPLOADS, 'usuarios'), { recursive: true });
  await fs.writeFile(path.join(CARPETA_UPLOADS, clave), buffer);
  return clave;
}

/** Ruta absoluta de una clave guardada (rechaza claves con otra forma: evita recorrer carpetas). */
function rutaFoto(clave) {
  if (!CLAVE_VALIDA.test(String(clave))) return null;
  return path.join(CARPETA_UPLOADS, clave);
}

/** Borra la foto; no falla si no existe. */
async function borrarFoto(clave) {
  const ruta = rutaFoto(clave);
  if (!ruta) return;
  await fs.rm(ruta, { force: true });
}

const tipoDeClave = (clave) => (String(clave).endsWith('.png') ? 'image/png' : 'image/jpeg');

module.exports = { guardarFoto, rutaFoto, borrarFoto, tipoDeClave, CARPETA_UPLOADS };
