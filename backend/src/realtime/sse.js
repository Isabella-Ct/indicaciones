// Server-Sent Events: abre el stream, reenvía eventos del emisor y mantiene viva
// la conexión con un heartbeat cada 25 s (proxies y navegadores cortan si no hay tráfico).
const { suscribir } = require('./emisor');

const HEARTBEAT_MS = 25 * 1000;

function escribir(res, evento, datos) {
  res.write(`event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`);
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {{
 *   eventos: Record<string, (datos: any) => any>,  // evento → transformación (null = no enviar)
 *   inicial?: Array<[string, any]>,                 // eventos a enviar apenas conecta
 *   renombrar?: Record<string, string>,             // nombre interno → nombre enviado
 * }} opciones
 */
function abrirStream(req, res, { eventos, inicial = [], renombrar = {} }) {
  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n'); // el navegador reintenta a los 3 s si se cae

  for (const [evento, datos] of inicial) escribir(res, evento, datos);

  const cancelar = Object.entries(eventos).map(([evento, transformar]) =>
    suscribir(evento, (datos) => {
      const salida = transformar(datos);
      if (salida !== null && salida !== undefined)
        escribir(res, renombrar[evento] ?? evento, salida);
    })
  );
  const latido = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);

  req.on('close', () => {
    clearInterval(latido);
    cancelar.forEach((fn) => fn());
  });
}

module.exports = { abrirStream, HEARTBEAT_MS };
