// Incidencias (spec 013): RF-INC-01..08, RN-28. El registro, su código consecutivo y la alerta al Administrador van
// en una transacción (research R-02); la evidencia se guarda antes y se borra si el registro falla (R-03). Las
// incidencias no se borran: se cierran con una solución y ya no admiten cambios (R-05).
const { withTransaction } = require('../../config/db');
const repositorio = require('./incidencias.repository');
const vehiculos = require('../vehiculos/vehiculos.repository');
const celdasRepositorio = require('../celdas/celdas.repository');
const movimientosRepositorio = require('../movimientos/movimientos.repository');
const reloj = require('../../utils/reloj');
const { AppError, errores } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { siguienteConsecutivo } = require('../../utils/consecutivos');
const { aLimites, meta } = require('../../utils/paginacion');
const { aIsoBogota, anioActualBogota, sumarDias } = require('../../utils/fechas');
const { guardarArchivo, borrarArchivo, rutaArchivo, tipoDeClave } = require('../../utils/archivos');
const { placaValida, mensajeFormato } = require('../vehiculos/vehiculos.reglas');
const { TIPOS, fechaEventoValida, puedeCambiar, estadoTrasNota } = require('./incidencias.reglas');

const NO_ENCONTRADA = () => errores.noEncontrado('Incidencia no encontrada.', 'INCIDENCIA_NO_ENCONTRADA');
const CERRADA = () => errores.conflicto('La incidencia está cerrada: ya no admite cambios.', 'INCIDENCIA_CERRADA');
const campo = (nombre, mensaje) => errores.validacion([{ campo: nombre, mensaje }]);
const SIN_REGISTRAR = 'Sin registrar';

const bitacora = (conexion, actor, accion, idRegistro, nuevo, anterior = null) =>
  registrarBitacora(conexion, { idUsuario: actor.idUsuario, accion, entidad: 'incidencia', idRegistro, anterior, nuevo, ip: actor.ip });

/** Incidencia para la API: fechas en ISO de Bogotá, nombre del tipo y sin la clave del archivo. */
function publica(i) {
  if (!i) return i;
  const { _evidencia: _e, ...resto } = i;
  return { ...resto, tipoNombre: TIPOS[i.tipo], fechaHoraEvento: aIsoBogota(i.fechaHoraEvento), fechaCierre: aIsoBogota(i.fechaCierre) };
}

/** Detalle con el seguimiento (RF-INC-06). */
async function detalle(id) {
  const incidencia = await repositorio.obtenerPorId(id);
  if (!incidencia) throw NO_ENCONTRADA();
  const seguimientos = (await repositorio.seguimientos(id)).map((s) => ({ ...s, fecha: aIsoBogota(s.fecha) }));
  return { ...publica(incidencia), seguimientos };
}

// ---------------------------------------------------------------- HU-56
/** Vehículo por placa (bloqueado); si no está registrado, se crea ocasional con su tipo (RF-MOV-05). */
async function vehiculoPara(conexion, { placa, tipoVehiculo }, actor, ahora) {
  const existente = await vehiculos.obtenerPorPlaca(placa, { conexion, bloquear: true });
  if (existente) return existente;
  if (!tipoVehiculo) throw campo('tipoVehiculo', 'La placa no está registrada: indique si es carro o moto.');
  if (!placaValida(placa, tipoVehiculo)) throw campo('placa', mensajeFormato(tipoVehiculo));
  const nuevo = { placa, tipo: tipoVehiculo, color: SIN_REGISTRAR, marca: SIN_REGISTRAR, modelo: anioActualBogota(ahora) };
  const idVehiculo = await vehiculos.insertar(nuevo, { conexion });
  await registrarBitacora(conexion, { idUsuario: actor.idUsuario, accion: 'crear', entidad: 'vehiculo', idRegistro: idVehiculo, nuevo: { ...nuevo, ocasional: true }, ip: actor.ip });
  return { idVehiculo, placa, tipo: tipoVehiculo };
}

/** RF-INC-01..04. `archivo`: { buffer, ext } de la evidencia (opcional). */
async function registrar(datos, archivo, actor) {
  const ahora = reloj.ahora();
  if (!fechaEventoValida(datos.fechaHoraEvento, ahora)) throw campo('fechaHoraEvento', 'La fecha y hora del evento no puede ser futura.');
  const evidencia = archivo ? await guardarArchivo('incidencias', archivo.buffer, archivo.ext) : null;
  let id;
  try {
    id = await withTransaction(async (conexion) => {
      const vehiculo = await vehiculoPara(conexion, datos, actor, ahora);
      // Celda: la indicada o la que ocupa el vehículo si está dentro (o ninguna).
      let idCelda;
      if (datos.idCelda) {
        const celda = await celdasRepositorio.obtenerPorId(datos.idCelda, { conexion });
        if (!celda) throw campo('idCelda', 'La celda no existe.');
        idCelda = celda.idCelda;
      } else {
        idCelda = (await movimientosRepositorio.abiertoDeVehiculo(vehiculo.idVehiculo, { conexion }))?.celda.idCelda ?? null;
      }
      // RF-INC-02: el número se toma dentro de la transacción (sin huecos si el registro falla).
      const codigo = await siguienteConsecutivo(conexion, 'incidencia');
      const idIncidencia = await repositorio.insertar(
        { codigo, tipo: datos.tipo, idVehiculo: vehiculo.idVehiculo, idCelda, fechaHoraEvento: datos.fechaHoraEvento, descripcion: datos.descripcion, evidencia, idOperador: actor.idUsuario },
        { conexion }
      );
      await repositorio.insertarAlerta({ mensaje: `Incidencia ${codigo}: ${TIPOS[datos.tipo]} de ${vehiculo.placa}`, referencia: `incidencia:${idIncidencia}`, fecha: ahora }, { conexion });
      await bitacora(conexion, actor, 'registrar', idIncidencia, { codigo, tipo: datos.tipo, placa: vehiculo.placa, idCelda, fechaHoraEvento: aIsoBogota(datos.fechaHoraEvento), evidencia: Boolean(evidencia) });
      return idIncidencia;
    });
  } catch (error) {
    if (evidencia) await borrarArchivo(evidencia);
    throw error;
  }
  return detalle(id);
}

// ---------------------------------------------------------------- HU-57
/** Fechas 'AAAA-MM-DD' de Bogotá → [desde 00:00, hasta + 1 día 00:00). */
const rango = ({ desde, hasta }) => ({
  desde: desde ? new Date(`${desde}T00:00:00-05:00`) : undefined,
  hasta: hasta ? new Date(`${sumarDias(hasta, 1)}T00:00:00-05:00`) : undefined,
});

/** RF-INC-05. */
async function listar(filtros) {
  const { filas, total } = await repositorio.listar({ ...filtros, ...rango(filtros), ...aLimites(filtros) });
  return { data: filas.map(publica), meta: meta(filtros, total) };
}

const obtener = (id) => detalle(id);

/** GET /incidencias/:id/evidencia [Propuesta]: ruta y tipo del archivo. */
async function evidencia(id) {
  const incidencia = await repositorio.obtenerPorId(id);
  if (!incidencia) throw NO_ENCONTRADA();
  const ruta = incidencia._evidencia ? rutaArchivo(incidencia._evidencia) : null;
  if (!ruta) throw new AppError(404, 'SIN_EVIDENCIA', 'La incidencia no tiene evidencia.');
  return { ruta, tipo: tipoDeClave(incidencia._evidencia) };
}

// ---------------------------------------------------------------- HU-58
/** RF-INC-07: nota con el usuario y la hora del servidor; la primera pasa la incidencia a «en seguimiento». */
async function agregarSeguimiento(id, { nota }, actor) {
  await withTransaction(async (conexion) => {
    const incidencia = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!incidencia) throw NO_ENCONTRADA();
    if (!puedeCambiar(incidencia.estado)) throw CERRADA();
    const idSeguimiento = await repositorio.insertarSeguimiento({ idIncidencia: id, nota, idUsuario: actor.idUsuario, fecha: reloj.ahora() }, { conexion });
    const nuevo = estadoTrasNota(incidencia.estado);
    if (nuevo !== incidencia.estado) await repositorio.cambiarEstado(id, nuevo, { conexion });
    await bitacora(conexion, actor, 'seguimiento', id, { idSeguimiento, estado: nuevo }, { estado: incidencia.estado });
  });
  return detalle(id);
}

/** RF-INC-08, RN-28: cierre con solución; después ya no admite cambios. */
async function cerrar(id, { solucion }, actor) {
  await withTransaction(async (conexion) => {
    const incidencia = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!incidencia) throw NO_ENCONTRADA();
    if (!puedeCambiar(incidencia.estado)) throw CERRADA();
    await repositorio.cerrar(id, { solucion, fecha: reloj.ahora() }, { conexion });
    await bitacora(conexion, actor, 'cerrar', id, { estado: 'cerrada', solucion }, { estado: incidencia.estado });
  });
  return detalle(id);
}

module.exports = { registrar, listar, obtener, evidencia, agregarSeguimiento, cerrar };
