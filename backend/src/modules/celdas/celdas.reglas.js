// Funciones puras de celdas (spec 004 research R-05 y casos borde), sin BD.

const CODIGO_VALIDO = /^[A-Z0-9-]{1,10}$/;
const MAXIMO_LOTE = 200;

/** RF-CLD-10: código en mayúsculas y sin espacios extremos. */
const normalizarCodigo = (codigo) => String(codigo ?? '').trim().toUpperCase();

/**
 * RF-CLD-12: códigos de un rango. El número se rellena con ceros hasta 2 dígitos o hasta los dígitos
 * de `hasta` (M-01…M-20, B-001…B-120). Lanza Error con `campo` si el rango no es válido.
 */
function codigosDelRango(prefijo, desde, hasta) {
  const base = normalizarCodigo(prefijo);
  if (!Number.isInteger(desde) || !Number.isInteger(hasta) || desde < 0 || hasta < desde) {
    throw Object.assign(new Error('El número inicial debe ser menor o igual que el final.'), { campo: 'hasta' });
  }
  if (hasta - desde + 1 > MAXIMO_LOTE) {
    throw Object.assign(new Error(`Puede registrar máximo ${MAXIMO_LOTE} celdas por rango.`), { campo: 'hasta' });
  }
  const ancho = Math.max(2, String(hasta).length);
  const codigos = [];
  for (let n = desde; n <= hasta; n++) codigos.push(`${base}${String(n).padStart(ancho, '0')}`);
  if (codigos.some((c) => !CODIGO_VALIDO.test(c))) {
    throw Object.assign(new Error('Los códigos deben tener máximo 10 letras, dígitos o guiones.'), { campo: 'prefijo' });
  }
  return codigos;
}

/**
 * RN-09 / research R-05: resultado de pedir a mano `pedido` sobre una celda en `actual`.
 * @returns {{ permitido: true, sinCambios?: boolean } | { permitido: false, code: string }}
 */
function transicionManual(actual, pedido) {
  if (pedido === 'ocupada' || pedido === 'reservada') return { permitido: false, code: 'CAMBIO_ESTADO_NO_PERMITIDO' };
  if (actual === 'ocupada') return { permitido: false, code: 'CELDA_OCUPADA' };
  if (actual === 'reservada') return { permitido: false, code: 'CELDA_RESERVADA' };
  if (actual === pedido) return { permitido: true, sinCambios: true };
  return { permitido: true };
}

module.exports = { normalizarCodigo, codigosDelRango, transicionManual, CODIGO_VALIDO, MAXIMO_LOTE };
