// Archivos privados (RNF-PRI-03): fotos de usuario (spec 002, research R-03) y evidencias de incidencias (spec 013,
// research R-03). Nombre aleatorio, fuera de la carpeta pública del frontend. En la BD se guarda solo la clave
// relativa '<carpeta>/<uuid>.<ext>'.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const CARPETA_UPLOADS = path.join(__dirname, '..', '..', 'uploads');
const CARPETAS = ['usuarios', 'incidencias'];
const CLAVE_VALIDA = /^(usuarios|incidencias)\/[0-9a-f-]{36}\.(jpg|png)$/;

/** Guarda el contenido en `carpeta` y devuelve su clave. */
async function guardarArchivo(carpeta, buffer, ext) {
  if (!CARPETAS.includes(carpeta)) throw new Error(`Carpeta de archivos no permitida: ${carpeta}`);
  const clave = `${carpeta}/${crypto.randomUUID()}.${ext}`;
  await fs.mkdir(path.join(CARPETA_UPLOADS, carpeta), { recursive: true });
  await fs.writeFile(path.join(CARPETA_UPLOADS, clave), buffer);
  return clave;
}

/** Foto de usuario (spec 002). */
const guardarFoto = (buffer, ext) => guardarArchivo('usuarios', buffer, ext);

/** Ruta absoluta de una clave guardada (rechaza claves con otra forma: evita recorrer carpetas). */
function rutaFoto(clave) {
  if (!CLAVE_VALIDA.test(String(clave))) return null;
  return path.join(CARPETA_UPLOADS, clave);
}

/** Borra el archivo; no falla si no existe. */
async function borrarFoto(clave) {
  const ruta = rutaFoto(clave);
  if (!ruta) return;
  await fs.rm(ruta, { force: true });
}

const tipoDeClave = (clave) => (String(clave).endsWith('.png') ? 'image/png' : 'image/jpeg');

module.exports = { guardarArchivo, guardarFoto, rutaFoto, rutaArchivo: rutaFoto, borrarFoto, borrarArchivo: borrarFoto, tipoDeClave, CARPETA_UPLOADS };
