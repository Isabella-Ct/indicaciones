// Reglas de tarifas (spec 008): RF-TAR-01..07, RN-18, RN-19. Escrituras en transacción con bloqueo de las
// tarifas de la misma combinación y bitácora. `vigenteEn` lo usa la liquidación (spec 009).
const { withTransaction } = require('../../config/db');
const repositorio = require('./tarifas.repository');
const reloj = require('../../utils/reloj');
const { errores } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { aLimites, meta } = require('../../utils/paginacion');
const { aIsoBogota } = require('../../utils/fechas');
const { vigenciasSeCruzan, contiene, situacion, cambiosNoPermitidosEnUsada, etiqueta } = require('./tarifas.reglas');

const NO_ENCONTRADA = () => errores.noEncontrado('Tarifa no encontrada.', 'TARIFA_NO_ENCONTRADA');

const bitacora = (conexion, actor, accion, idRegistro, anterior, nuevo) =>
  registrarBitacora(conexion, { idUsuario: actor.idUsuario, accion, entidad: 'tarifa', idRegistro, anterior, nuevo, ip: actor.ip });

/** Tarifa para la API: fechas en ISO de Bogotá y su situación respecto al reloj. */
function publica(t, ahora = reloj.ahora(), { interna = true } = {}) {
  if (!t) return t;
  const base = { ...t, vigenteDesde: aIsoBogota(t.vigenteDesde), vigenteHasta: aIsoBogota(t.vigenteHasta), situacion: situacion(t, ahora) };
  if (interna) return base;
  const { estado: _e, usada: _u, ...visible } = base;
  return visible;
}

function superpuesta(choque, d) {
  const error = errores.conflicto(`Ya existe una tarifa activa para ${etiqueta(d.tipoVehiculo, d.tipoCliente)} en ese periodo.`, 'TARIFA_SUPERPUESTA');
  error.details = [{ campo: 'idTarifa', mensaje: String(choque.idTarifa) }];
  return error;
}

/** RN-18 (R-03): tarifas activas de la combinación con vigencia cruzada, sin contar la propia. */
async function choques(conexion, d, idPropia = null) {
  const activas = await repositorio.activasDe(d.tipoVehiculo, d.tipoCliente, { conexion, bloquear: true });
  return activas.filter((t) => t.idTarifa !== idPropia && vigenciasSeCruzan(t, d));
}

const datosBitacora = (d) => ({ ...d, vigenteDesde: aIsoBogota(d.vigenteDesde), vigenteHasta: aIsoBogota(d.vigenteHasta) });

// ---------------------------------------------------------------- HU-36
/** RF-TAR-01..03, RF-TAR-05: crea la tarifa; con `cerrarAnterior` cierra la que empezó antes. */
async function crear({ cerrarAnterior, ...datos }, actor) {
  const nueva = { ...datos, vigenteHasta: datos.vigenteHasta ?? null, topeDiario: datos.topeDiario ?? null };
  const id = await withTransaction(async (conexion) => {
    const encontrados = await choques(conexion, nueva);
    if (encontrados.length) {
      const [anterior] = encontrados;
      // Solo se cierra una única tarifa que empezó antes que la nueva; si no, se responde 409.
      const sePuedeCerrar = cerrarAnterior && encontrados.length === 1 && anterior.vigenteDesde < nueva.vigenteDesde;
      if (!sePuedeCerrar) throw superpuesta(anterior, nueva);
      // RF-TAR-05: la anterior termina donde empieza la nueva.
      await repositorio.cerrarVigencia(anterior.idTarifa, nueva.vigenteDesde, { conexion });
      await bitacora(conexion, actor, 'cerrar_vigencia', anterior.idTarifa, { vigenteHasta: aIsoBogota(anterior.vigenteHasta) }, { vigenteHasta: aIsoBogota(nueva.vigenteDesde) });
    }
    const idTarifa = await repositorio.insertar(nueva, { conexion });
    await bitacora(conexion, actor, 'crear', idTarifa, null, datosBitacora(nueva));
    return idTarifa;
  });
  return publica(await repositorio.obtenerPorId(id));
}

// ---------------------------------------------------------------- HU-37
/** RF-TAR-04, RF-TAR-05 (R-04): una tarifa usada solo cambia nombre y cierre de vigencia (hacia adelante). */
async function actualizar(id, datos, actor) {
  const ahora = reloj.ahora();
  await withTransaction(async (conexion) => {
    const actual = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!actual) throw NO_ENCONTRADA();
    const nueva = { ...datos, vigenteHasta: datos.vigenteHasta ?? null, topeDiario: datos.topeDiario ?? null };
    if (actual.usada) {
      const prohibidos = cambiosNoPermitidosEnUsada(actual, nueva);
      if (prohibidos.length) {
        throw errores.conflicto(
          'La tarifa ya se usó en liquidaciones: cree una tarifa nueva con vigencia y cierre la actual.',
          'TARIFA_USADA'
        );
      }
      if (nueva.vigenteHasta && nueva.vigenteHasta < ahora) {
        throw errores.validacion([{ campo: 'vigenteHasta', mensaje: 'En una tarifa usada la vigencia solo se puede cerrar desde ahora en adelante.' }]);
      }
    }
    if (actual.estado === 'activo') {
      const [choque] = await choques(conexion, nueva, id);
      if (choque) throw superpuesta(choque, nueva);
    }
    const anterior = {};
    const cambios = {};
    for (const campo of ['nombre', 'tipoVehiculo', 'tipoCliente', 'valorPrimeraHora', 'minutosFraccion', 'valorFraccion', 'topeDiario', 'minutosGracia', 'vigenteDesde', 'vigenteHasta']) {
      const a = actual[campo] instanceof Date ? aIsoBogota(actual[campo]) : actual[campo];
      const n = nueva[campo] instanceof Date ? aIsoBogota(nueva[campo]) : nueva[campo];
      if (a !== n) {
        anterior[campo] = a;
        cambios[campo] = n;
      }
    }
    if (!Object.keys(cambios).length) return;
    await repositorio.actualizar(id, nueva, { conexion });
    await bitacora(conexion, actor, 'editar', id, anterior, cambios);
  });
  return publica(await repositorio.obtenerPorId(id), ahora);
}

/** RF-TAR-06 (R-05): inactivar la única vigente exige confirmar; activar revisa la superposición. */
async function cambiarEstado(id, { estado, confirmar }, actor) {
  const ahora = reloj.ahora();
  await withTransaction(async (conexion) => {
    const actual = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!actual) throw NO_ENCONTRADA();
    if (actual.estado === estado) return;
    if (estado === 'inactivo') {
      const otras = await repositorio.activasDe(actual.tipoVehiculo, actual.tipoCliente, { conexion, bloquear: true });
      const quedaOtraVigente = otras.some((t) => t.idTarifa !== id && contiene(t, ahora));
      if (contiene(actual, ahora) && !quedaOtraVigente && !confirmar) {
        throw errores.conflicto(
          `Es la única tarifa vigente para ${etiqueta(actual.tipoVehiculo, actual.tipoCliente)}: las salidas de ese tipo no podrán liquidarse. Confirme para inactivarla.`,
          'UNICA_TARIFA_VIGENTE'
        );
      }
    } else {
      const [choque] = await choques(conexion, actual, id);
      if (choque) throw superpuesta(choque, actual);
    }
    await repositorio.cambiarEstado(id, estado, { conexion });
    await bitacora(conexion, actor, 'cambiar_estado', id, { estado: actual.estado }, { estado });
  });
  return publica(await repositorio.obtenerPorId(id), ahora);
}

// ---------------------------------------------------------------- HU-38
/** Listado administrativo con `usada` y `situacion`. */
async function listar(filtros) {
  const ahora = reloj.ahora();
  const { filas, total } = await repositorio.listar({ ...filtros, ...aLimites(filtros) });
  return { data: filas.map((t) => publica(t, ahora)), meta: meta(filtros, total) };
}

/** RF-TAR-07 (R-06): vigentes y programadas, sin datos internos (público). */
async function vigentes({ tipoVehiculo, tipoCliente } = {}) {
  const ahora = reloj.ahora();
  const filas = (await repositorio.noVencidas(ahora)).filter(
    (t) => (!tipoVehiculo || t.tipoVehiculo === tipoVehiculo) && (!tipoCliente || t.tipoCliente === tipoCliente)
  );
  return filas.map((t) => publica(t, ahora, { interna: false }));
}

/** RN-19 (R-07): tarifa activa cuya vigencia contiene el instante (la entrada del vehículo), o null. */
async function vigenteEn({ tipoVehiculo, tipoCliente, fechaHora }, { conexion } = {}) {
  const activas = await repositorio.activasDe(tipoVehiculo, tipoCliente, { conexion });
  return activas.find((t) => contiene(t, fechaHora)) ?? null;
}

module.exports = { crear, actualizar, cambiarEstado, listar, vigentes, vigenteEn };
