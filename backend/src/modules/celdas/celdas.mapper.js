// Forma pública de una celda. Los datos de ocupantes (placas, titulares, tickets)
// SOLO se incluyen para el personal (REQ-CLD-02: el cliente ve estados, no placas ajenas).

/** ¿El usuario en sesión puede ver quién ocupa cada celda? */
function puedeVerOcupantes(usuario) {
  return Boolean(usuario?.permisos?.includes('celdas.cambiar_estado'));
}

function origenReserva(fila) {
  if (fila.estado !== 'reservada') return null;
  if (fila.membresia_id) return 'mensualidad';
  if (fila.reserva_id) return 'reserva';
  return null;
}

/**
 * @param {object} fila resultado de celdas.repository (SELECT_DETALLE)
 * @param {boolean} verOcupantes
 * @param {Set<number>} [propios] vehículos del cliente en sesión: marca SUS celdas (su reserva,
 *   su celda de mensualidad o donde está parqueado) sin exponer nada de otras personas.
 */
function aPublico(fila, verOcupantes, propios) {
  const celda = {
    id: fila.id,
    codigo: fila.codigo,
    piso: { id: fila.piso_id, nombre: fila.piso_nombre },
    area: fila.area,
    tipo: fila.tipo,
    es_accesible: Boolean(fila.es_accesible),
    fila_mapa: fila.fila_mapa,
    posicion: fila.posicion,
    estado: fila.estado,
    nota: fila.estado === 'fuera_servicio' ? fila.nota : null,
    activa: Boolean(fila.activa),
    reserva_origen: origenReserva(fila),
  };
  if (!verOcupantes) {
    const motivo = !propios
      ? null
      : propios.has(fila.reserva_vehiculo_id)
        ? 'reserva'
        : propios.has(fila.membresia_vehiculo_id)
          ? 'mensualidad'
          : fila.estado === 'ocupada' && propios.has(fila.vehiculo_actual_id)
            ? 'vehiculo'
            : null;
    if (!motivo) return celda;
    return {
      ...celda,
      propia: motivo,
      reserva: motivo === 'reserva' ? { id: fila.reserva_id, expira: fila.reserva_expira } : null,
    };
  }

  return {
    ...celda,
    ocupante:
      fila.estado === 'ocupada' && fila.vehiculo_actual_id
        ? {
            vehiculo_id: fila.vehiculo_actual_id,
            placa: fila.placa,
            marca: fila.marca,
            modelo: fila.modelo,
            color: fila.color,
            propietario: fila.propietario_nombre || null,
          }
        : null,
    estadia: fila.estadia_id
      ? {
          id: fila.estadia_id,
          codigo_ticket: fila.codigo_ticket,
          fecha_hora_entrada: fila.fecha_hora_entrada,
          tipo_cliente: fila.tipo_cliente,
        }
      : null,
    mensualidad: fila.membresia_id
      ? {
          id: fila.membresia_id,
          titular: fila.titular_nombre,
          placa: fila.membresia_placa,
          vence: fila.membresia_fin,
        }
      : null,
    reserva: fila.reserva_id
      ? { id: fila.reserva_id, placa: fila.reserva_placa, expira: fila.reserva_expira }
      : null,
  };
}

module.exports = { puedeVerOcupantes, aPublico };
