// Funciones puras del módulo de usuarios (spec 002 research R-02, R-07, R-09), sin BD.
const crypto = require('node:crypto');

/** Documento sin espacios, puntos ni guiones; PAS en mayúsculas (puede tener letras). */
function normalizarDocumento(tipoDocumento, numero) {
  const limpio = String(numero ?? '').replace(/[\s.-]/g, '');
  return tipoDocumento === 'PAS' ? limpio.toUpperCase() : limpio;
}

/** '  maría   fernanda  ríos ' → 'maría fernanda ríos' (recorta y unifica espacios). */
const normalizarNombre = (nombre) => String(nombre ?? '').trim().replace(/\s+/g, ' ');

/** Correo en minúsculas y sin espacios extremos. */
const normalizarCorreo = (correo) => String(correo ?? '').trim().toLowerCase();

/** Celular sin espacios ni guiones: '310 456-7890' → '3104567890'. */
const normalizarCelular = (celular) => String(celular ?? '').replace(/[\s-]/g, '');

// Sin caracteres ambiguos (0 O o, 1 l I) para que el usuario la pueda transcribir del correo.
const MAYUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MINUSCULAS = 'abcdefghijkmnpqrstuvwxyz';
const DIGITOS = '23456789';
const SIMBOLOS = '*#$%&@!?';

/** RF-USR-05: contraseña temporal de 12 caracteres con mayúscula, minúscula, dígito y símbolo. */
function generarContrasenaTemporal(longitud = 12) {
  const grupos = [MAYUSCULAS, MINUSCULAS, DIGITOS, SIMBOLOS];
  const todos = grupos.join('');
  const caracteres = grupos.map((g) => g[crypto.randomInt(g.length)]);
  while (caracteres.length < longitud) caracteres.push(todos[crypto.randomInt(todos.length)]);
  // Mezcla de Fisher–Yates con números criptográficos.
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join('');
}

/**
 * RF-USR-11: campos que cambiaron entre `anterior` y `nuevo` (solo las claves de `nuevo`).
 * @returns {{ anterior: object, nuevo: object, campos: string[] }}
 */
function diferencias(anterior, nuevo) {
  const salida = { anterior: {}, nuevo: {}, campos: [] };
  for (const [clave, valor] of Object.entries(nuevo)) {
    if (valor === undefined) continue;
    if ((anterior[clave] ?? null) !== (valor ?? null)) {
      salida.anterior[clave] = anterior[clave] ?? null;
      salida.nuevo[clave] = valor ?? null;
      salida.campos.push(clave);
    }
  }
  return salida;
}

const ETIQUETAS = {
  nombreCompleto: 'nombre',
  correo: 'correo',
  celular: 'celular',
  foto: 'foto',
};

/** RF-USR-16: texto del aviso al Administrador (≤ 300 caracteres, tabla notificacion). */
function mensajeCambioDatos({ nombreCompleto, idUsuario }, { anterior, nuevo, campos }) {
  const partes = campos.map((c) =>
    c === 'foto' ? 'foto actualizada' : `${ETIQUETAS[c] ?? c} ${anterior[c] ?? '—'} → ${nuevo[c] ?? '—'}`
  );
  return `${nombreCompleto} (código ${idUsuario}) cambió: ${partes.join('; ')}.`.slice(0, 300);
}

module.exports = {
  normalizarDocumento,
  normalizarNombre,
  normalizarCorreo,
  normalizarCelular,
  generarContrasenaTemporal,
  diferencias,
  mensajeCambioDatos,
};
