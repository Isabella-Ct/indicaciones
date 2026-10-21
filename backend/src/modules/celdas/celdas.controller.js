const celdasService = require('./celdas.service');
const { aPublico, puedeVerOcupantes } = require('./celdas.mapper');
const { abrirStream } = require('../../realtime/sse');

async function listar(req, res) {
  res.json({ data: await celdasService.listar(req.validado.query, req.usuario) });
}

async function obtener(req, res) {
  res.json({ data: await celdasService.obtener(req.validado.params.id, req.usuario) });
}

async function resumen(_req, res) {
  res.json({ data: await celdasService.resumen() });
}

/** SSE: cada conexión recibe las celdas filtradas según su rol. */
async function stream(req, res) {
  const verOcupantes = puedeVerOcupantes(req.usuario);
  // El cliente recibe marcadas sus propias celdas (reserva, mensualidad, su vehículo).
  const propios = verOcupantes ? null : await celdasService.vehiculosDeUsuario(req.usuario.id);
  const verInactivas = req.usuario.permisos.includes('celdas.gestionar');
  abrirStream(req, res, {
    inicial: [['resumen-actualizado', await celdasService.resumen()]],
    eventos: {
      'celda-actualizada': (fila) =>
        fila.activa || verInactivas
          ? aPublico(fila, verOcupantes, propios)
          : { id: fila.id, activa: false },
      'resumen-actualizado': (datos) => datos,
      // Bitácora de entradas/salidas: lleva placas, solo para el personal.
      'movimiento-registrado': (mov) => (verOcupantes ? mov : null),
    },
  });
}

async function crear(req, res) {
  res.status(201).json({ data: await celdasService.crear(req.body, req.usuario) });
}

async function actualizar(req, res) {
  res.json({ data: await celdasService.actualizar(req.validado.params.id, req.body, req.usuario) });
}

async function cambiarEstado(req, res) {
  const { id } = req.validado.params;
  const { estado } = await celdasService.cambiarEstado(id, req.body);
  res.json({ data: await celdasService.obtener(id, req.usuario), meta: { estado_final: estado } });
}

async function cambiarActiva(req, res) {
  const celda = await celdasService.cambiarActiva(
    req.validado.params.id,
    req.body.activa,
    req.usuario
  );
  res.json({ data: celda });
}

module.exports = {
  listar,
  obtener,
  resumen,
  stream,
  crear,
  actualizar,
  cambiarEstado,
  cambiarActiva,
};
