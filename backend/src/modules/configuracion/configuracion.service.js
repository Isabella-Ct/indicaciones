// Parámetros del negocio (tabla configuracion): minutos de reserva, valores de membresía,
// días de aviso, redondeo y pie del ticket (CLAUDE.md §7: nunca quemados en el código).
// Solo se editan valores existentes; el tipo de cada clave define cómo se valida.
const { errores } = require('../../utils/errores');
const repo = require('./configuracion.repository');

function aPublico(c) {
  const valor =
    c.tipo === 'entero' || c.tipo === 'decimal'
      ? Number(c.valor)
      : c.tipo === 'booleano'
        ? c.valor === 'true' || c.valor === '1'
        : c.valor;
  return {
    clave: c.clave,
    valor,
    tipo: c.tipo,
    descripcion: c.descripcion,
    actualizado_por: c.actualizado_por
      ? { id: c.actualizado_por, nombre_completo: c.actualizado_por_nombre }
      : null,
    actualizado_en: c.updated_at,
  };
}

/** Normaliza el valor según el tipo de la clave o lanza 422. */
function normalizar(tipo, valor) {
  const texto = String(valor).trim();
  const invalido = (mensaje) => errores.validacion([{ campo: 'valor', mensaje }], mensaje);
  if (tipo === 'entero') {
    if (!/^\d+$/.test(texto) || Number(texto) < 1)
      throw invalido('Debe ser un número entero mayor que cero.');
    return String(Number(texto));
  }
  if (tipo === 'decimal') {
    if (!/^\d+(\.\d{1,2})?$/.test(texto)) throw invalido('Debe ser un valor mayor o igual a cero.');
    return String(Number(texto));
  }
  if (tipo === 'booleano') {
    if (!['true', 'false', '1', '0'].includes(texto)) throw invalido('Debe ser sí o no.');
    return texto === 'true' || texto === '1' ? 'true' : 'false';
  }
  if (!texto) throw invalido('El valor no puede quedar vacío.');
  return texto;
}

async function listar() {
  return (await repo.listar()).map(aPublico);
}

async function actualizar(clave, valor, solicitante) {
  const actual = await repo.buscar(clave);
  if (!actual) throw errores.noEncontrado('El parámetro no existe.');
  await repo.actualizar(clave, normalizar(actual.tipo, valor), solicitante.id);
  return aPublico(await repo.buscar(clave));
}

module.exports = { listar, actualizar };
