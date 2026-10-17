// Error de aplicación con código HTTP y código de negocio (formato CLAUDE.md §4).
class AppError extends Error {
  /**
   * @param {number} estado código HTTP
   * @param {string} codigo código estable en MAYÚSCULAS, ej. CREDENCIALES_INVALIDAS
   * @param {string} mensaje mensaje en español para mostrar al usuario
   * @param {Array<object>} [detalles]
   */
  constructor(estado, codigo, mensaje, detalles) {
    super(mensaje);
    this.name = 'AppError';
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

const errores = {
  solicitudInvalida: (mensaje, detalles) =>
    new AppError(400, 'SOLICITUD_INVALIDA', mensaje, detalles),
  noAutenticado: (mensaje = 'Debes iniciar sesión.') =>
    new AppError(401, 'NO_AUTENTICADO', mensaje),
  prohibido: (mensaje = 'No tienes permiso para realizar esta acción.') =>
    new AppError(403, 'PROHIBIDO', mensaje),
  noEncontrado: (mensaje = 'Recurso no encontrado.') => new AppError(404, 'NO_ENCONTRADO', mensaje),
  conflicto: (mensaje, codigo = 'CONFLICTO') => new AppError(409, codigo, mensaje),
  validacion: (detalles, mensaje = 'Hay datos inválidos en la solicitud.') =>
    new AppError(422, 'VALIDACION', mensaje, detalles),
};

module.exports = { AppError, errores };
