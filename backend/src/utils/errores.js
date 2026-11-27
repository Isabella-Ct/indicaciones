// Errores de aplicación con código HTTP y código estable en MAYÚSCULAS (constitución §II, research R-03).
class AppError extends Error {
  /**
   * @param {number} status código HTTP
   * @param {string} code código estable, p. ej. ROL_DUPLICADO
   * @param {string} message mensaje en español para el usuario
   * @param {Array<{campo: string|null, mensaje: string}>} [details] errores por campo
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const errores = {
  /** 400: petición mal formada (JSON inválido, parámetro imposible de interpretar). */
  solicitudInvalida: (message = 'La solicitud está mal formada.', code = 'SOLICITUD_INVALIDA') =>
    new AppError(400, code, message),
  /** 401: sin token, token inválido, vencido o revocado, usuario inactivo. */
  noAutenticado: (message = 'Sesión no válida o vencida.', code = 'NO_AUTENTICADO') =>
    new AppError(401, code, message),
  /** 403: el rol no tiene el permiso (RNF-SEG-04). */
  sinPermiso: (message = 'No tiene permiso para esta acción.') =>
    new AppError(403, 'SIN_PERMISO', message),
  /** 404: el recurso no existe. */
  noEncontrado: (message = 'Recurso no encontrado.', code = 'NO_ENCONTRADO') =>
    new AppError(404, code, message),
  /** 409: conflicto o regla de negocio (duplicado, estado inválido…). */
  conflicto: (message, code = 'CONFLICTO') => new AppError(409, code, message),
  /** 422: validación de campos, con detalle por campo. */
  validacion: (details, message = 'Hay datos inválidos en la solicitud.') =>
    new AppError(422, 'VALIDACION', message, details),
  /** 429: demasiadas peticiones. */
  demasiadasPeticiones: (message = 'Demasiados intentos. Intente más tarde.') =>
    new AppError(429, 'DEMASIADAS_PETICIONES', message),
};

module.exports = { AppError, errores };
