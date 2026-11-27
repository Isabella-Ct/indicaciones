// Átomo · atom-status-chip: texto y variante de color de un chip de estado.

/** Variantes: free | occupied | reserved | out | neutral. */
export function ponerChip(chip, textoChip, variante = 'neutral') {
  chip.className =
    variante === 'neutral' ? 'atom-status-chip' : `atom-status-chip atom-status-chip--${variante}`;
  chip.textContent = textoChip;
}

/** Chip de estado activo/inactivo (usuarios, roles, tarifas…). */
export function ponerChipActivo(chip, estado) {
  ponerChip(chip, estado === 'activo' ? 'Activo' : 'Inactivo', estado === 'activo' ? 'free' : 'out');
}
