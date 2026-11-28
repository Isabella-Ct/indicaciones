// Subida opcional de una imagen en multipart/form-data (RNF-PRI-03): la foto de usuario (campo `foto`, 2 MB; spec
// 002 research R-03/R-04) y la evidencia de una incidencia (campo `evidencia`, 5 MB; spec 013 research R-03). Se
// valida la firma del contenido, no solo el tipo declarado. Deja req.<campo> = { buffer, ext, mime } o undefined.
// Errores → 422 con el nombre del campo.
const multer = require('multer');
const { errores } = require('../utils/errores');

const TAMANO_MAXIMO = 2 * 1024 * 1024;
const MB = 1024 * 1024;

/** Tipo real según los primeros bytes: JPG (FF D8 FF) o PNG (89 50 4E 47 0D 0A 1A 0A). */
function tipoPorFirma(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buffer.length >= 8 && png.every((b, i) => buffer[i] === b)) return { ext: 'png', mime: 'image/png' };
  return null;
}

/**
 * Middleware para una imagen JPG o PNG opcional.
 * @param {{ campo: string, tamanoMaximo: number, etiqueta: string }} opciones etiqueta: «La foto», «La evidencia»
 */
function subirImagen({ campo, tamanoMaximo, etiqueta }) {
  const carga = multer({ storage: multer.memoryStorage(), limits: { fileSize: tamanoMaximo, files: 1, fields: 20 } }).single(campo);
  const error = (mensaje) => errores.validacion([{ campo, mensaje }]);
  return function (req, res, next) {
    if (!req.is('multipart/form-data')) return next();
    return carga(req, res, (falla) => {
      if (falla) {
        if (falla.code === 'LIMIT_FILE_SIZE') return next(error(`${etiqueta} supera ${Math.round(tamanoMaximo / MB)} MB.`));
        if (falla.code === 'LIMIT_UNEXPECTED_FILE') return next(error(`Solo se admite un archivo en el campo «${campo}».`));
        return next(errores.solicitudInvalida('El formulario enviado no es válido.'));
      }
      if (req.file) {
        const tipo = tipoPorFirma(req.file.buffer);
        if (!tipo) return next(error(`${etiqueta} debe ser JPG o PNG.`));
        req[campo] = { buffer: req.file.buffer, ...tipo };
      }
      return next();
    });
  };
}

/** Foto de usuario (spec 002): req.foto. */
const subirFoto = subirImagen({ campo: 'foto', tamanoMaximo: TAMANO_MAXIMO, etiqueta: 'La foto' });

/** Evidencia de una incidencia (spec 013): req.evidencia, hasta 5 MB. */
const subirEvidencia = subirImagen({ campo: 'evidencia', tamanoMaximo: 5 * MB, etiqueta: 'La evidencia' });

module.exports = { subirImagen, subirFoto, subirEvidencia, tipoPorFirma, TAMANO_MAXIMO };
