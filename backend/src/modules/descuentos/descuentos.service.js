// Descuentos y promociones (spec 011): RF-DES-01, RF-DES-02, RF-DES-05, RN-02. La aplicación en la liquidación
// (RF-DES-03, RF-DES-04) la hace liquidaciones.service con `elegirPara`. Editar o inactivar un descuento no
// cambia las liquidaciones ya guardadas: guardan su descuento y su valor.
const { withTransaction } = require('../../config/db');
const repositorio = require('./descuentos.repository');
const reloj = require('../../utils/reloj');
const { errores } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { aLimites, meta } = require('../../utils/paginacion');
const { aIsoBogota } = require('../../utils/fechas');
const { corresponde, elegir, situacion } = require('./descuentos.reglas');

const NO_ENCONTRADO = () => errores.noEncontrado('Descuento no encontrado.', 'DESCUENTO_NO_ENCONTRADO');
const CAMPOS = ['nombre', 'tipo', 'valor', 'aplicaTipoCliente', 'aplicaTipoVehiculo', 'minutosMinimos', 'vigenteDesde', 'vigenteHasta'];

const bitacora = (conexion, actor, accion, idRegistro, anterior, nuevo) =>
  registrarBitacora(conexion, { idUsuario: actor.idUsuario, accion, entidad: 'descuento', idRegistro, anterior, nuevo, ip: actor.ip });

/** Para la bitácora: fechas en ISO de Bogotá. */
const conFechasIso = (d) => {
  const salida = { ...d };
  for (const campo of ['vigenteDesde', 'vigenteHasta']) if (salida[campo]) salida[campo] = aIsoBogota(salida[campo]);
  return salida;
};

/** Descuento para la API: fechas en ISO de Bogotá y su situación respecto al reloj. */
function publico(d, ahora = reloj.ahora()) {
  if (!d) return d;
  return { ...d, vigenteDesde: aIsoBogota(d.vigenteDesde), vigenteHasta: aIsoBogota(d.vigenteHasta), situacion: situacion(d, ahora) };
}

/** RF-DES-01: nombre único (índice uq_descuento_nombre) → 409. */
function traducirDuplicado(error) {
  if (error.code === 'ER_DUP_ENTRY' && String(error.message).includes('uq_descuento_nombre')) {
    throw errores.conflicto('Ya existe un descuento con ese nombre.', 'DESCUENTO_DUPLICADO');
  }
  throw error;
}

const igual = (a, b) => (a instanceof Date || b instanceof Date ? new Date(a).getTime() === new Date(b).getTime() : a === b);

// ---------------------------------------------------------------- HU-49
async function listar(filtros) {
  const { filas, total } = await repositorio.listar({ ...filtros, ...aLimites(filtros) });
  const ahora = reloj.ahora();
  return { data: filas.map((d) => publico(d, ahora)), meta: meta(filtros, total) };
}

/** HU-49 E1: queda activo en su periodo. */
async function crear(datos, actor) {
  let id;
  try {
    id = await withTransaction(async (conexion) => {
      const idDescuento = await repositorio.insertar(datos, { conexion });
      await bitacora(conexion, actor, 'crear', idDescuento, null, conFechasIso(datos));
      return idDescuento;
    });
  } catch (error) {
    traducirDuplicado(error);
  }
  return publico(await repositorio.obtenerPorId(id));
}

/** HU-49 E4: reemplaza los campos; en la bitácora solo las diferencias. */
async function actualizar(id, datos, actor) {
  try {
    await withTransaction(async (conexion) => {
      const actual = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
      if (!actual) throw NO_ENCONTRADO();
      const anterior = {};
      const cambios = {};
      for (const campo of CAMPOS) {
        if (!igual(actual[campo], datos[campo])) {
          anterior[campo] = actual[campo];
          cambios[campo] = datos[campo];
        }
      }
      if (!Object.keys(cambios).length) return;
      await repositorio.actualizar(id, datos, { conexion });
      await bitacora(conexion, actor, 'editar', id, conFechasIso(anterior), conFechasIso(cambios));
    });
  } catch (error) {
    traducirDuplicado(error);
  }
  return publico(await repositorio.obtenerPorId(id));
}

// ---------------------------------------------------------------- HU-51
/** RF-DES-05 (R-05): activar uno con la vigencia terminada → 422; inactivar siempre se permite. */
async function cambiarEstado(id, { estado }, actor) {
  await withTransaction(async (conexion) => {
    const actual = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!actual) throw NO_ENCONTRADO();
    if (actual.estado === estado) return;
    if (estado === 'activo' && new Date(actual.vigenteHasta) < reloj.ahora()) {
      throw errores.validacion([{ campo: 'vigenteHasta', mensaje: 'Amplíe la vigencia del descuento antes de activarlo.' }]);
    }
    await repositorio.cambiarEstado(id, estado, { conexion });
    await bitacora(conexion, actor, 'cambiar_estado', id, { estado: actual.estado }, { estado });
  });
  return publico(await repositorio.obtenerPorId(id));
}

// ---------------------------------------------------------------- HU-50
/**
 * RF-DES-03, RN-25: el descuento que más descuenta sobre `bruto` entre los que corresponden a la liquidación
 * (activo y vigente en `fecha`, tipos y minutos). Devuelve { descuento, valor } o null.
 */
async function elegirPara({ tipoVehiculo, tipoCliente, minutos, fecha, bruto }, { conexion } = {}) {
  if (!(bruto > 0)) return null;
  const candidatos = await repositorio.candidatos({ tipoVehiculo, tipoCliente, fecha }, { conexion });
  return elegir(
    candidatos.filter((d) => corresponde(d, { tipoVehiculo, tipoCliente, minutos, fecha })),
    bruto
  );
}

/** Resumen del descuento para la liquidación y la factura (RF-DES-04). */
const resumen = (d) => d && { idDescuento: d.idDescuento, nombre: d.nombre, tipo: d.tipo, valor: d.valor };

module.exports = { listar, crear, actualizar, cambiarEstado, elegirPara, resumen };
