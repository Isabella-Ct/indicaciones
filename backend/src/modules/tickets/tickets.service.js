// Ticket de ingreso (spec 007, HU-32): consulta por código (RF-MOV-08) y envío al correo del
// propietario (RF-MOV-07). El correo nunca sale en la respuesta (RNF-PRI-02).
const repositorio = require('./tickets.repository');
const movimientos = require('../movimientos/movimientos.repository');
const { publico } = require('../movimientos/movimientos.service');
const { enviarCorreo } = require('../../integrations/correo');
const { errores } = require('../../utils/errores');
const { formatearFechaHora } = require('../../utils/fechas');
const { enmascararCorreo } = require('../movimientos/movimientos.reglas');

const NO_ENCONTRADO = () => errores.noEncontrado('El ticket no existe.', 'TICKET_NO_ENCONTRADO');

/** RF-MOV-08: ticket con su movimiento (en cualquier estado). */
async function obtener(codigo) {
  const ticket = await repositorio.obtenerPorCodigo(codigo);
  if (!ticket) throw NO_ENCONTRADO();
  const { _correo, _propietario: _p, idMovimiento, ...resto } = ticket;
  const movimiento = publico(await movimientos.obtenerPorId(idMovimiento));
  return { ...resto, tieneCorreo: Boolean(_correo), movimiento };
}

/** RF-MOV-07: envía el ticket en texto al correo del propietario. */
async function enviar(codigo) {
  const ticket = await repositorio.obtenerPorCodigo(codigo);
  if (!ticket) throw NO_ENCONTRADO();
  if (!ticket._correo) {
    throw errores.conflicto('El vehículo no tiene un propietario con correo registrado.', 'SIN_CORREO');
  }
  const m = await movimientos.obtenerPorId(ticket.idMovimiento);
  const texto = [
    `Hola, ${ticket._propietario}.`,
    '',
    `Este es el ticket de ingreso de su vehículo en ${ticket.parqueadero.nombre} (${ticket.parqueadero.direccion}).`,
    '',
    `Ticket: ${ticket.codigo}`,
    `Placa: ${m.vehiculo.placa} (${m.vehiculo.tipo})`,
    `Celda: ${m.celda.codigo} · piso ${m.celda.piso}`,
    `Puerta: ${m.puertaEntrada.nombre}`,
    `Entrada: ${formatearFechaHora(m._entrada)}`,
    '',
    'Presente este código a la salida.',
    'PARKO · Sistema de Gestión de Parqueadero',
  ].join('\n');
  await enviarCorreo({ para: ticket._correo, asunto: `PARKO · Ticket ${ticket.codigo} · ${m.vehiculo.placa}`, texto });
  return { codigo: ticket.codigo, enviadoA: enmascararCorreo(ticket._correo) };
}

module.exports = { obtener, enviar };
