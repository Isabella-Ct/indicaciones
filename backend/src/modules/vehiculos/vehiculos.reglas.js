// Reglas puras de vehículos (research R-02, R-04): placa normalizada y con formato según el tipo
// (RF-VEH-02, RN-11) y rango del modelo (6.1). Sin BD ni HTTP: se prueban con pruebas unitarias.

const FORMATO = {
  carro: { regex: /^[A-Z]{3}\d{3}$/, ejemplo: 'AAA123' },
  moto: { regex: /^[A-Z]{3}\d{2}[A-Z]?$/, ejemplo: 'AAA12 o AAA12A' },
};

const MODELO_MINIMO = 1950;

/** «abc 123», «ABC-123», « abc.123 » → «ABC123». */
const normalizarPlaca = (texto) => String(texto ?? '').toUpperCase().replace(/[\s.-]/g, '');

/** ¿La placa (ya normalizada) tiene el formato del tipo? */
const placaValida = (placa, tipo) => Boolean(FORMATO[tipo]?.regex.test(placa));

/** Mensaje de HU-25 E3: «Formato de placa inválido para carro (AAA123)». */
const mensajeFormato = (tipo) => `Formato de placa inválido para ${tipo} (${FORMATO[tipo]?.ejemplo ?? 'AAA123'}).`;

/** Modelo entre 1950 y el año actual + 1. */
const modeloValido = (anio, anioActual) =>
  Number.isInteger(anio) && anio >= MODELO_MINIMO && anio <= anioActual + 1;

module.exports = { normalizarPlaca, placaValida, mensajeFormato, modeloValido, MODELO_MINIMO, FORMATO };
