// Página · Configuración › Descuentos (HU-49, HU-51): listado con búsqueda y filtros, nuevo descuento, edición y
// activar / inactivar (inactivar se confirma; activar uno vencido pide ampliar la vigencia). La aplicación en la
// liquidación (HU-50) se ve en el cobro de Movimientos y en el comprobante.
import { listarDescuentos, crearDescuento, actualizarDescuento, cambiarEstadoDescuento } from '../services/descuentos.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { abrirDialogo, cerrarDialogo, confirmar } from '../components/organismos/modal.js';
import { conectarBusqueda } from '../components/moleculas/buscador.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChipDescuento } from '../components/atomos/chip-estado.js';
import { botonCargando } from '../components/atomos/boton.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, mostrar } from '../utils/dom.js';
import { formatearCOP, formatearFechaHora, plural } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'descuentos.ver', alSalir: cerrarSesion });

const CLIENTE = { todos: 'todos los clientes', ocasional: 'ocasionales', registrado: 'registrados' };
const VEHICULO = { todos: 'Carros y motos', carro: 'Carros', moto: 'Motos' };
const puede = { crear: tienePermiso('descuentos.crear'), editar: tienePermiso('descuentos.editar'), estado: tienePermiso('descuentos.cambiar_estado') };
/** Estado de la página: página actual, filtros y el descuento en edición. */
const estado = { page: 1, filtros: { q: '', tipoVehiculo: '', estado: '' }, editando: null };

const textoValor = (d) => (d.tipo === 'porcentaje' ? `${d.valor} %` : formatearCOP(d.valor));

// ---------------------------------------------------------------- listado
const tabla = conectarTabla($('tabla-descuentos'), {
  plantilla: 'tpl-descuento',
  idDe: (d) => d.idDescuento,
  onPagina: (pagina) => cargar(pagina),
  rellenar(fila, d) {
    fila.querySelector('.js-nombre').textContent = d.nombre;
    fila.querySelector('.js-valor').textContent = textoValor(d);
    fila.querySelector('.js-aplica').textContent = `${VEHICULO[d.aplicaTipoVehiculo]} · ${CLIENTE[d.aplicaTipoCliente]}`;
    fila.querySelector('.js-minimo').textContent = d.minutosMinimos ? plural(d.minutosMinimos, 'minuto') : '—';
    fila.querySelector('.js-vigencia').textContent = `${formatearFechaHora(d.vigenteDesde)} → ${formatearFechaHora(d.vigenteHasta)}`;
    ponerChipDescuento(fila.querySelector('.js-situacion'), d.situacion);
    fila.querySelector('.js-usado').classList.toggle('hidden', !d.usado);
    const editar = fila.querySelector('.js-editar');
    editar.classList.toggle('hidden', !puede.editar);
    editar.setAttribute('aria-label', `Editar el descuento ${d.nombre}`);
    editar.addEventListener('click', () => abrirFormulario(d, editar));
    const cambiar = fila.querySelector('.js-cambiar');
    const accion = d.estado === 'activo' ? 'Inactivar' : 'Activar';
    cambiar.classList.toggle('hidden', !puede.estado);
    cambiar.querySelector('span').textContent = accion;
    cambiar.setAttribute('aria-label', `${accion} el descuento ${d.nombre}`);
    cambiar.addEventListener('click', () => alternarEstado(d, cambiar));
  },
});

async function cargar(page = estado.page) {
  estado.page = page;
  tabla.cargando(true);
  try {
    const { data, meta } = await listarDescuentos({ ...estado.filtros, page });
    tabla.pintar(data, meta);
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
    tabla.pintar([]);
  } finally {
    tabla.cargando(false);
  }
}

conectarBusqueda($('filtro-texto'), (texto) => {
  estado.filtros.q = texto;
  cargar(1);
});
for (const [id, clave] of [
  ['filtro-vehiculo', 'tipoVehiculo'],
  ['filtro-estado', 'estado'],
]) {
  $(id).addEventListener('change', (e) => {
    estado.filtros[clave] = e.target.value;
    cargar(1);
  });
}

// ---------------------------------------------------------------- activar / inactivar (HU-51)
async function alternarEstado(d, origen) {
  const nuevo = d.estado === 'activo' ? 'inactivo' : 'activo';
  if (nuevo === 'inactivo') {
    // HU-51 E1: se confirma; las liquidaciones ya guardadas conservan su descuento.
    const acepta = await confirmar({
      titulo: `Inactivar ${d.nombre}`,
      mensaje: 'Deja de aplicarse a las liquidaciones siguientes. Las ya liquidadas y facturadas no cambian.',
      textoConfirmar: 'Inactivar',
      origen,
    });
    if (!acepta) return;
  }
  try {
    await cambiarEstadoDescuento(d.idDescuento, nuevo);
    mostrarAviso(nuevo === 'inactivo' ? 'Descuento inactivado' : 'Descuento activado', 'success');
    cargar();
  } catch (error) {
    if (error.status === 401) return;
    // HU-51 E2: activar uno vencido → se abre la edición con el error junto a «Vigente hasta».
    if (error.code === 'VALIDACION' && puede.editar) {
      abrirFormulario(d, origen);
      pintarErroresApi(error, { vigenteHasta: 'descuento-hasta' });
      mostrarAlerta(alerta, 'Amplíe la vigencia, guarde y vuelva a activarlo.', 'error');
    } else {
      mostrarAviso(error.details?.[0]?.mensaje ?? error.message, 'error');
    }
  }
}

// ---------------------------------------------------------------- nuevo / editar (HU-49)
const dialogo = $('dialogo-descuento');
const formulario = $('form-descuento');
const alerta = $('descuento-alerta');
const campo = {
  nombre: $('descuento-nombre'),
  tipo: $('descuento-tipo'),
  valor: $('descuento-valor'),
  cliente: $('descuento-cliente'),
  vehiculo: $('descuento-vehiculo'),
  minimo: $('descuento-minimo'),
  desde: $('descuento-desde'),
  hasta: $('descuento-hasta'),
};

/** La etiqueta y la ayuda del valor cambian con el tipo (RF-DES-02). */
function ajustarTipo() {
  const porcentaje = campo.tipo.value === 'porcentaje';
  $('descuento-valor-etiqueta').textContent = porcentaje ? 'Porcentaje (%)' : 'Valor fijo ($)';
  $('descuento-valor-hint').textContent = porcentaje ? 'De 1 a 100.' : 'Mayor que 0; nunca deja el total por debajo de $ 0.';
}
campo.tipo.addEventListener('change', ajustarTipo);

function abrirFormulario(d = null, origen) {
  estado.editando = d;
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  $('dialogo-descuento-titulo').textContent = d ? `Editar descuento · ${d.nombre}` : 'Nuevo descuento';
  campo.nombre.value = d?.nombre ?? '';
  campo.tipo.value = d?.tipo ?? 'porcentaje';
  campo.valor.value = d ? String(d.valor) : '';
  campo.cliente.value = d?.aplicaTipoCliente ?? 'todos';
  campo.vehiculo.value = d?.aplicaTipoVehiculo ?? 'todos';
  campo.minimo.value = d?.minutosMinimos ? String(d.minutosMinimos) : '';
  campo.desde.value = d ? d.vigenteDesde.slice(0, 10) : '';
  campo.hasta.value = d ? d.vigenteHasta.slice(0, 10) : '';
  ajustarTipo();
  abrirDialogo(dialogo, { origen, foco: campo.nombre });
}

function leer() {
  return {
    nombre: campo.nombre.value.trim(),
    tipo: campo.tipo.value,
    valor: campo.valor.value === '' ? null : Number(campo.valor.value),
    aplicaTipoCliente: campo.cliente.value,
    aplicaTipoVehiculo: campo.vehiculo.value,
    minutosMinimos: campo.minimo.value === '' ? null : Number(campo.minimo.value),
    vigenteDesde: campo.desde.value,
    vigenteHasta: campo.hasta.value,
  };
}

function validar(d) {
  const valorMal =
    d.valor === null ? 'Ingrese el valor.' : d.tipo === 'porcentaje' ? (d.valor < 1 || d.valor > 100 ? 'El porcentaje debe estar entre 1 y 100.' : '') : d.valor > 0 ? '' : 'El valor fijo debe ser mayor que 0.';
  const reglas = [
    [campo.nombre, d.nombre.length < 3 || d.nombre.length > 60 ? 'El nombre debe tener entre 3 y 60 caracteres.' : ''],
    [campo.valor, valorMal],
    [campo.minimo, d.minutosMinimos !== null && (!Number.isInteger(d.minutosMinimos) || d.minutosMinimos < 1 || d.minutosMinimos > 10080) ? 'Los minutos mínimos van de 1 a 10.080.' : ''],
    [campo.desde, d.vigenteDesde ? '' : 'Indique desde cuándo aplica.'],
    [campo.hasta, !d.vigenteHasta ? 'Indique hasta cuándo aplica.' : d.vigenteDesde && d.vigenteHasta < d.vigenteDesde ? 'La vigencia debe terminar después de su inicio.' : ''],
  ];
  const valido = reglas.map(([control, mensaje]) => marcarCampo(control, mensaje)).every(Boolean);
  if (!valido) formulario.querySelector('[aria-invalid="true"]')?.focus();
  return valido;
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  const datos = leer();
  if (!validar(datos)) return;
  const boton = $('descuento-guardar');
  botonCargando(boton, true, 'Guardando…');
  try {
    if (estado.editando) await actualizarDescuento(estado.editando.idDescuento, datos);
    else await crearDescuento(datos);
    mostrarAviso(estado.editando ? 'Descuento actualizado' : 'Descuento creado', 'success');
    cerrarDialogo(dialogo);
    cargar(estado.editando ? estado.page : 1);
  } catch (error) {
    if (error.status === 401) return;
    if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, {
        nombre: 'descuento-nombre',
        tipo: 'descuento-tipo',
        valor: 'descuento-valor',
        aplicaTipoCliente: 'descuento-cliente',
        aplicaTipoVehiculo: 'descuento-vehiculo',
        minutosMinimos: 'descuento-minimo',
        vigenteDesde: 'descuento-desde',
        vigenteHasta: 'descuento-hasta',
      });
      if (sinCampo.length) mostrarAlerta(alerta, sinCampo.join(' '), 'error');
    } else {
      // DESCUENTO_DUPLICADO, DESCUENTO_NO_ENCONTRADO…
      mostrarAlerta(alerta, error.message, 'error');
    }
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------- arranque
if (marco?.permitido) {
  mostrar($('accion-nuevo'), puede.crear);
  $('accion-nuevo').addEventListener('click', (e) => abrirFormulario(null, e.currentTarget));
  cargar(1);
}
