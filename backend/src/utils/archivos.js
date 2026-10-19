// Guardado de imágenes subidas (fotos). Los nombres son aleatorios: nunca se
// usa el nombre que envía el cliente.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const CARPETA_UPLOADS = path.join(__dirname, '..', '..', 'uploads');
const URL_UPLOADS = '/uploads';

/**
 * Detecta el tipo real por la firma de los primeros bytes (no por la extensión).
 * @returns {'jpg'|'png'|null}
 */
function detectarTipoImagen(buffer) {
  if (!buffer || buffer.length < 8) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, i) => buffer[i] === byte)) return 'png';
  return null;
}

/**
 * Guarda la imagen en uploads/<carpeta>/ y devuelve su URL pública (/uploads/…).
 * @param {{ buffer: Buffer, extension: 'jpg'|'png' }} imagen
 * @param {string} carpeta ej. "usuarios"
 */
async function guardarImagen({ buffer, extension }, carpeta) {
  const destino = path.join(CARPETA_UPLOADS, carpeta);
  await fs.mkdir(destino, { recursive: true });
  const nombre = `${crypto.randomUUID()}.${extension}`;
  await fs.writeFile(path.join(destino, nombre), buffer);
  return `${URL_UPLOADS}/${carpeta}/${nombre}`;
}

/** Borra un archivo a partir de su URL (/uploads/…). No falla si no existe. */
async function eliminarArchivo(url) {
  if (!url || !url.startsWith(`${URL_UPLOADS}/`)) return;
  const relativa = url.slice(URL_UPLOADS.length + 1);
  const ruta = path.resolve(CARPETA_UPLOADS, relativa);
  if (!ruta.startsWith(CARPETA_UPLOADS + path.sep)) return; // evita salir de uploads/
  await fs.rm(ruta, { force: true });
}

module.exports = { CARPETA_UPLOADS, detectarTipoImagen, guardarImagen, eliminarArchivo };
