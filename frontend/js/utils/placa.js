// Placas colombianas (RN-11): misma normalización y formato que el servidor, para avisar antes de enviar.
// El servidor siempre vuelve a validar (constitución §III).
const FORMATO = {
  carro: { regex: /^[A-Z]{3}\d{3}$/, ejemplo: 'AAA123' },
  moto: { regex: /^[A-Z]{3}\d{2}[A-Z]?$/, ejemplo: 'AAA12 o AAA12A' },
};

/** «abc 123» → «ABC123». */
export const normalizarPlaca = (texto) => String(texto ?? '').toUpperCase().replace(/[\s.-]/g, '');

export const placaValida = (placa, tipo) => Boolean(FORMATO[tipo]?.regex.test(placa));

export const mensajeFormato = (tipo) => `Formato de placa inválido para ${tipo} (${FORMATO[tipo]?.ejemplo ?? 'AAA123'}).`;

/** «ABC123» → «ABC 123»; «QWE45A» → «QWE 45A» (solo para mostrar). */
export const formatearPlaca = (placa) => (placa ? `${placa.slice(0, 3)} ${placa.slice(3)}` : '—');
