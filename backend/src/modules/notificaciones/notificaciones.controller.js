const service = require('./notificaciones.service');
const { abrirStream } = require('../../realtime/sse');

async function mias(req, res) {
  res.json(await service.mias(req.usuario.id, req.validado.query));
}

async function conteo(req, res) {
  res.json({ data: { no_leidas: await service.conteo(req.usuario.id) } });
}

async function marcarLeida(req, res) {
  res.json({ data: await service.marcarLeida(req.validado.params.id, req.usuario.id) });
}

async function marcarTodasLeidas(req, res) {
  res.json({ data: await service.marcarTodasLeidas(req.usuario.id) });
}

async function enviar(req, res) {
  res.status(201).json({ data: await service.enviarManual(req.body, req.usuario) });
}

/**
 * SSE por usuario: "conteo" al conectar y cada vez que llega o se lee una notificación.
 * Solo se envía el conteo y el título: el detalle se pide con /mias (con sesión).
 */
async function stream(req, res) {
  const yo = req.usuario.id;
  const paraMi = (d) => d.usuarios.includes(yo);
  abrirStream(req, res, {
    inicial: [['conteo', { no_leidas: await service.conteo(yo) }]],
    eventos: {
      [service.EVENTO]: (d) => (paraMi(d) ? { titulo: d.titulo } : null),
      'notificaciones-leidas': (d) => (paraMi(d) ? {} : null),
    },
    renombrar: { [service.EVENTO]: 'notificacion', 'notificaciones-leidas': 'leidas' },
  });
}

module.exports = { mias, conteo, marcarLeida, marcarTodasLeidas, enviar, stream };
