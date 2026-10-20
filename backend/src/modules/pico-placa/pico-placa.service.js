// Pico y placa — REQ-CAR-4 (tabla de restricciones) y REQ-INEX-4 (negar la entrada).
const { AppError, errores } = require('../../utils/errores');
const { enBogota, nombreDia } = require('../../utils/fechas');
const repo = require('./pico-placa.repository');
const { evaluarRestriccion, describirRegla } = require('./pico-placa.evaluador');

const aPublico = (r) => ({
  id: r.id,
  tipo_vehiculo: r.tipo_vehiculo,
  dia_semana: r.dia_semana,
  dia_nombre: nombreDia(r.dia_semana),
  digito: r.digito,
  hora_inicio: r.hora_inicio,
  hora_fin: r.hora_fin,
  activa: Boolean(r.activa),
  descripcion: describirRegla(r),
});

async function listar(filtros) {
  return (await repo.listar(filtros)).map(aPublico);
}

/** Reglas activas que aplican hoy (día de Bogotá). */
async function deHoy(ahora = new Date()) {
  const { diaSemana, fecha } = enBogota(ahora);
  const reglas = (await repo.listar({ dia_semana: diaSemana, activa: 1 })).map(aPublico);
  return { fecha, dia_semana: diaSemana, dia_nombre: nombreDia(diaSemana), reglas };
}

/** ¿La placa tiene pico y placa en este momento? Usa la hora del servidor. */
async function evaluar(placa, tipo, fechaHora = new Date()) {
  const resultado = evaluarRestriccion(placa, tipo, fechaHora, await repo.listarActivas());
  return { ...resultado, regla: resultado.regla ? aPublico(resultado.regla) : null };
}

async function validarSinSolape(datos, excluirId) {
  const solapadas = await repo.buscarSolapadas(datos, excluirId);
  if (solapadas.length) {
    const r = aPublico(solapadas[0]);
    throw new AppError(
      409,
      'REGLA_DUPLICADA',
      `Ya existe una regla para ${r.tipo_vehiculo}s con dígito ${r.digito} el ${r.dia_nombre} que se cruza con ese horario (${r.hora_inicio}–${r.hora_fin}).`
    );
  }
}

async function crear(datos, solicitante) {
  await validarSinSolape(datos);
  const id = await repo.insertar(datos, solicitante.id);
  return aPublico(await repo.buscarPorId(id));
}

async function actualizar(id, datos) {
  if (!(await repo.buscarPorId(id))) throw errores.noEncontrado('La regla no existe.');
  await validarSinSolape(datos, id);
  await repo.actualizar(id, datos);
  return aPublico(await repo.buscarPorId(id));
}

async function cambiarActiva(id, activa) {
  const regla = await repo.buscarPorId(id);
  if (!regla) throw errores.noEncontrado('La regla no existe.');
  if (activa) await validarSinSolape(aPublico(regla), id);
  await repo.actualizarActiva(id, activa);
  return aPublico(await repo.buscarPorId(id));
}

module.exports = { listar, deHoy, evaluar, crear, actualizar, cambiarActiva, aPublico };
