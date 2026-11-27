// Subida opcional de la foto (campo `foto` en multipart/form-data) para usuarios (RNF-PRI-03,
// spec 002 research R-03/R-04). Se valida la firma del contenido, no solo el tipo declarado.
// Deja req.foto = { buffer, ext, mime } o undefined. Errores → 422 con el campo `foto`.
const multer = require('multer');
const { errores } = require('../utils/errores');

const TAMANO_MAXIMO = 2 * 1024 * 1024;

const carga = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO, files: 1, fields: 20 },
}).single('foto');

/** Tipo real según los primeros bytes: JPG (FF D8 FF) o PNG (89 50 4E 47 0D 0A 1A 0A). */
function tipoPorFirma(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buffer.length >= 8 && png.every((b, i) => buffer[i] === b)) return { ext: 'png', mime: 'image/png' };
  return null;
}

const errorFoto = (mensaje) => errores.validacion([{ campo: 'foto', mensaje }]);

function subirFoto(req, res, next) {
  if (!req.is('multipart/form-data')) return next();
  return carga(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') return next(errorFoto('La foto supera 2 MB.'));
      if (error.code === 'LIMIT_UNEXPECTED_FILE') return next(errorFoto('Solo se admite un archivo en el campo «foto».'));
      return next(errores.solicitudInvalida('El formulario enviado no es válido.'));
    }
    if (req.file) {
      const tipo = tipoPorFirma(req.file.buffer);
      if (!tipo) return next(errorFoto('La foto debe ser JPG o PNG.'));
      req.foto = { buffer: req.file.buffer, ...tipo };
    }
    return next();
  });
}

module.exports = { subirFoto, tipoPorFirma, TAMANO_MAXIMO };
