// Subida de una foto (multipart/form-data) con multer en memoria.
// Reglas (CLAUDE.md §9): solo jpg/png, máximo 2 MB. El tipo se comprueba por
// la firma real del archivo, no solo por el mimetype que declara el navegador.
// Deja req.imagen = { buffer, extension } (o null); guardarla es tarea del service.
const multer = require('multer');
const { errores } = require('../utils/errores');
const { detectarTipoImagen } = require('../utils/archivos');

const TAMANO_MAXIMO = 2 * 1024 * 1024;
const MIMES_PERMITIDOS = ['image/jpeg', 'image/png'];

const errorFoto = (campo, mensaje) => errores.validacion([{ campo, mensaje }], mensaje);

/** @param {string} campo nombre del campo del formulario (ej. "foto") */
function subirImagen(campo) {
  const procesar = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: TAMANO_MAXIMO, files: 1, fields: 30 },
    fileFilter: (_req, archivo, cb) => {
      if (!MIMES_PERMITIDOS.includes(archivo.mimetype)) {
        return cb(errorFoto(campo, 'La foto debe ser una imagen JPG o PNG.'));
      }
      return cb(null, true);
    },
  }).single(campo);

  return (req, res, next) => {
    procesar(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(errorFoto(campo, 'La foto no puede pesar más de 2 MB.'));
        }
        if (err instanceof multer.MulterError) {
          return next(errorFoto(err.field || campo, 'El archivo enviado no es válido.'));
        }
        return next(err);
      }
      if (!req.file) {
        req.imagen = null;
        return next();
      }
      const extension = detectarTipoImagen(req.file.buffer);
      if (!extension) {
        return next(errorFoto(campo, 'El archivo no es una imagen JPG o PNG válida.'));
      }
      req.imagen = { buffer: req.file.buffer, extension };
      return next();
    });
  };
}

module.exports = { subirImagen, TAMANO_MAXIMO };
