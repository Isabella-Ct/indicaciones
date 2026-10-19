// Pub/sub en memoria del proceso para los eventos en tiempo real (SSE).
// Eventos actuales: 'celda-actualizada' y 'resumen-actualizado'.
const { EventEmitter } = require('node:events');

const emisor = new EventEmitter();
emisor.setMaxListeners(0); // una suscripción por navegador conectado

function publicar(evento, datos) {
  emisor.emit(evento, datos);
}

/**
 * @param {string} evento
 * @param {(datos: any) => void} fn
 * @returns {() => void} función para cancelar la suscripción
 */
function suscribir(evento, fn) {
  emisor.on(evento, fn);
  return () => emisor.off(evento, fn);
}

module.exports = { publicar, suscribir };
