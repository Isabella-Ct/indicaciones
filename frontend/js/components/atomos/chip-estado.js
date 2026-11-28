// Átomo · atom-status-chip: texto y variante de color de un chip de estado.

/** Variantes: free | occupied | reserved | out | neutral. */
export function ponerChip(chip, textoChip, variante = 'neutral') {
  chip.className =
    variante === 'neutral' ? 'atom-status-chip' : `atom-status-chip atom-status-chip--${variante}`;
  chip.textContent = textoChip;
}

/** Texto y variante de cada estado de celda (RF-CLD-16: color y texto, nunca solo color). */
export const ESTADOS_CELDA = {
  disponible: { texto: 'Libre', variante: 'free' },
  ocupada: { texto: 'Ocupada', variante: 'occupied' },
  reservada: { texto: 'Reservada', variante: 'reserved' },
  inhabilitada: { texto: 'Inhabilitada', variante: 'out' },
};

/** Chip del estado de una celda (disponible | ocupada | reservada | inhabilitada). */
export function ponerChipCelda(chip, estado) {
  const { texto, variante } = ESTADOS_CELDA[estado] ?? { texto: estado, variante: 'neutral' };
  ponerChip(chip, texto, variante);
}

/** Situación de una tarifa (spec 008): vigente | programada | vencida | inactiva. */
const SITUACION_TARIFA = {
  vigente: ['Vigente', 'free'],
  programada: ['Programada', 'reserved'],
  vencida: ['Vencida', 'neutral'],
  inactiva: ['Inactiva', 'out'],
};

export function ponerChipTarifa(chip, situacion) {
  const [texto, variante] = SITUACION_TARIFA[situacion] ?? [situacion, 'neutral'];
  ponerChip(chip, texto, variante);
}

/** Estado de una factura (spec 009): emitida | anulada. */
export function ponerChipFactura(chip, estado) {
  ponerChip(chip, estado === 'anulada' ? 'Anulada' : 'Emitida', estado === 'anulada' ? 'out' : 'free');
}

/** Estado de una incidencia (spec 013): abierta | en_seguimiento | cerrada. */
const ESTADO_INCIDENCIA = {
  abierta: ['Abierta', 'occupied'],
  en_seguimiento: ['En seguimiento', 'reserved'],
  cerrada: ['Cerrada', 'free'],
};

export function ponerChipIncidencia(chip, estado) {
  const [texto, variante] = ESTADO_INCIDENCIA[estado] ?? [estado, 'neutral'];
  ponerChip(chip, texto, variante);
}

/** Estado de una reserva (spec 012): confirmada | cumplida | cancelada | vencida. */
const ESTADO_RESERVA = {
  confirmada: ['Confirmada', 'reserved'],
  cumplida: ['Cumplida', 'free'],
  cancelada: ['Cancelada', 'out'],
  vencida: ['Vencida', 'neutral'],
};

export function ponerChipReserva(chip, estado) {
  const [texto, variante] = ESTADO_RESERVA[estado] ?? [estado, 'neutral'];
  ponerChip(chip, texto, variante);
}

/** Situación de un descuento (spec 011): vigente | programado | vencido | inactivo. */
const SITUACION_DESCUENTO = {
  vigente: ['Vigente', 'free'],
  programado: ['Programado', 'reserved'],
  vencido: ['Vencido', 'neutral'],
  inactivo: ['Inactivo', 'out'],
};

export function ponerChipDescuento(chip, situacion) {
  const [texto, variante] = SITUACION_DESCUENTO[situacion] ?? [situacion, 'neutral'];
  ponerChip(chip, texto, variante);
}

/** Estado de una membresía (spec 010): activa | vencida | cancelada. */
const ESTADO_MEMBRESIA = {
  activa: ['Activa', 'free'],
  vencida: ['Vencida', 'reserved'],
  cancelada: ['Cancelada', 'out'],
};

export function ponerChipMembresia(chip, estado) {
  const [texto, variante] = ESTADO_MEMBRESIA[estado] ?? [estado, 'neutral'];
  ponerChip(chip, texto, variante);
}

/** Chip de estado activo/inactivo (usuarios, roles, tarifas…). */
export function ponerChipActivo(chip, estado) {
  ponerChip(chip, estado === 'activo' ? 'Activo' : 'Inactivo', estado === 'activo' ? 'free' : 'out');
}
