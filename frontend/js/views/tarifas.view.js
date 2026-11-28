// Página · Configuración › Tarifas (HU-36, HU-37): listado con filtros, nueva tarifa (con «Cerrar la anterior
// y crear» ante una superposición), edición (limitada si la tarifa ya se usó) y cambio de estado (con
// confirmación si es la única vigente).
import { listarTarifas, crearTarifa, actualizarTarifa, cambiarEstadoTarifa } from '../services/tarifas.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { abrirDialogo, cerrarDialogo, confirmar } from '../components/organismos/modal.js';
import { ponerPrecio } from '../components/moleculas/precio.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChipTarifa } from '../components/atomos/chip-estado.js';
import { botonCargando } from '../components/atomos/boton.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, mostrar } from '../utils/dom.js';
import { formatearFechaHora } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'tarifas.ver', alSalir: cerrarSesion });

const TIPO = { carro: 'Carro', moto: 'Moto' };
const puede = { crear: tienePermiso('tarifas.crear'), editar: tienePermiso('tarifas.editar'), estado: tienePermiso('tarifas.cambiar_estado') };
/** Estado de la página: filtros, la tarifa en edición y la última petición (para reintentar con cierre). */
const estado = { page: 1, filtros: { tipoVehiculo: '', tipoCliente: '', estado: '' }, editando: null, pendiente: null };

// ---------------------------------------------------------------- listado
const tabla = conectarTabla($('tabla-tarifas'), {
  plantilla: 'tpl-tarifa',
  idDe: (t) => t.idTarifa,
  onPagina: (pagina) => cargar(pagina),
  rellenar(fila, t) {
    fila.querySelector('.js-nombre').textContent = t.nombre;
    fila.querySelector('.js-combinacion').textContent = `${TIPO[t.tipoVehiculo]} · ${t.tipoCliente}`;
    ponerPrecio(fila.querySelector('.js-primera'), t.valorPrimeraHora);
    ponerPrecio(fila.querySelector('.js-fraccion'), t.valorFraccion, `/ ${t.minutosFraccion} min`);
    ponerPrecio(fila.querySelector('.js-tope'), t.topeDiario);
    fila.querySelector('.js-gracia').textContent = `${t.minutosGracia} min`;
    fila.querySelector('.js-vigencia').textContent = `${formatearFechaHora(t.vigenteDesde)} → ${t.vigenteHasta ? formatearFechaHora(t.vigenteHasta) : 'sin fin'}`;
    ponerChipTarifa(fila.querySelector('.js-situacion'), t.situacion);
    fila.querySelector('.js-usada').classList.toggle('hidden', !t.usada);
    const editar = fila.querySelector('.js-editar');
    editar.classList.toggle('hidden', !puede.editar);
    editar.setAttribute('aria-label', `Editar la tarifa ${t.nombre}`);
    editar.addEventListener('click', () => abrirFormulario(t, editar));
    const accion = fila.querySelector('.js-estado');
    accion.classList.toggle('hidden', !puede.estado);
    accion.querySelector('span').textContent = t.estado === 'activo' ? 'Inactivar' : 'Activar';
    accion.addEventListener('click', () => alternarEstado(t, accion));
  },
});

async function cargar(page = estado.page) {
  estado.page = page;
  tabla.cargando(true);
  try {
    const { data, meta } = await listarTarifas({ ...estado.filtros, page });
    tabla.pintar(data, meta);
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
    tabla.pintar([]);
  } finally {
    tabla.cargando(false);
  }
}

for (const [id, clave] of [
  ['filtro-vehiculo', 'tipoVehiculo'],
  ['filtro-cliente', 'tipoCliente'],
  ['filtro-estado', 'estado'],
]) {
  $(id).addEventListener('change', (e) => {
    estado.filtros[clave] = e.target.value;
    cargar(1);
  });
}

// ---------------------------------------------------------------- cambio de estado (HU-37 E3)
async function alternarEstado(t, origen) {
  const nuevo = t.estado === 'activo' ? 'inactivo' : 'activo';
  const enviar = async (confirmado) => {
    await cambiarEstadoTarifa(t.idTarifa, nuevo, confirmado);
    mostrarAviso(nuevo === 'inactivo' ? 'Tarifa inactivada' : 'Tarifa activada', 'success');
    cargar();
  };
  try {
    await enviar(false);
  } catch (error) {
    if (error.code === 'UNICA_TARIFA_VIGENTE') {
      // RF-TAR-06: advertencia y confirmación.
      const acepta = await confirmar({ titulo: 'Inactivar la única tarifa vigente', mensaje: error.message, textoConfirmar: 'Inactivar igual', origen });
      if (acepta) await enviar(true).catch((e) => mostrarAviso(e.message, 'error'));
    } else if (error.status !== 401 && error.status !== 403) {
      mostrarAviso(error.message, 'error');
    }
  }
}

// ---------------------------------------------------------------- nueva / editar (HU-36, HU-37)
const dialogo = $('dialogo-tarifa');
const formulario = $('form-tarifa');
const alerta = $('tarifa-alerta');
const campo = {
  nombre: $('tarifa-nombre'),
  vehiculo: $('tarifa-vehiculo'),
  cliente: $('tarifa-cliente'),
  primera: $('tarifa-primera'),
  minutosFraccion: $('tarifa-minutos-fraccion'),
  valorFraccion: $('tarifa-valor-fraccion'),
  tope: $('tarifa-tope'),
  gracia: $('tarifa-gracia'),
  desde: $('tarifa-desde'),
  hasta: $('tarifa-hasta'),
};
/** Campos que una tarifa usada no puede cambiar (RF-TAR-04). */
const DE_PRECIO = ['vehiculo', 'cliente', 'primera', 'minutosFraccion', 'valorFraccion', 'tope', 'gracia', 'desde'];

/** ISO de la API (hora de Bogotá) → valor de <input type="datetime-local">. */
const aLocal = (iso) => (iso ? iso.slice(0, 16) : '');

function abrirFormulario(t = null, origen) {
  estado.editando = t;
  estado.pendiente = null;
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  mostrar($('tarifa-cerrar-campo'), false);
  $('dialogo-tarifa-titulo').textContent = t ? `Editar tarifa · ${t.nombre}` : 'Nueva tarifa';
  campo.nombre.value = t?.nombre ?? '';
  campo.vehiculo.value = t?.tipoVehiculo ?? 'carro';
  campo.cliente.value = t?.tipoCliente ?? 'ocasional';
  campo.primera.value = t ? String(t.valorPrimeraHora) : '';
  campo.minutosFraccion.value = String(t?.minutosFraccion ?? 15);
  campo.valorFraccion.value = t ? String(t.valorFraccion) : '';
  campo.tope.value = t?.topeDiario === null || t?.topeDiario === undefined ? '' : String(t.topeDiario);
  campo.gracia.value = String(t?.minutosGracia ?? 10);
  campo.desde.value = aLocal(t?.vigenteDesde);
  campo.hasta.value = aLocal(t?.vigenteHasta);
  const usada = Boolean(t?.usada);
  DE_PRECIO.forEach((c) => (campo[c].disabled = usada));
  mostrar($('tarifa-usada-aviso'), usada);
  abrirDialogo(dialogo, { origen, foco: campo.nombre });
}

const numero = (control) => (control.value === '' ? null : Number(control.value));

function leer() {
  return {
    nombre: campo.nombre.value.trim(),
    tipoVehiculo: campo.vehiculo.value,
    tipoCliente: campo.cliente.value,
    valorPrimeraHora: numero(campo.primera),
    minutosFraccion: numero(campo.minutosFraccion),
    valorFraccion: numero(campo.valorFraccion),
    topeDiario: numero(campo.tope),
    minutosGracia: numero(campo.gracia) ?? 0,
    vigenteDesde: campo.desde.value,
    vigenteHasta: campo.hasta.value || null,
  };
}

function validar(d) {
  const reglas = [
    [campo.nombre, d.nombre.length < 3 || d.nombre.length > 60 ? 'El nombre debe tener entre 3 y 60 caracteres.' : ''],
    [campo.primera, !(d.valorPrimeraHora > 0) ? 'El valor de la primera hora debe ser mayor que 0.' : ''],
    [campo.minutosFraccion, !Number.isInteger(d.minutosFraccion) || d.minutosFraccion < 1 || d.minutosFraccion > 60 ? 'Los minutos de la fracción van de 1 a 60.' : ''],
    [campo.valorFraccion, d.valorFraccion === null || d.valorFraccion < 0 ? 'Ingrese el valor de la fracción (0 o más).' : ''],
    [campo.tope, d.topeDiario !== null && d.topeDiario < d.valorPrimeraHora ? 'El tope diario debe ser mayor o igual que el valor de la primera hora.' : ''],
    [campo.gracia, !Number.isInteger(d.minutosGracia) || d.minutosGracia < 0 || d.minutosGracia > 30 ? 'Los minutos de gracia van de 0 a 30.' : ''],
    [campo.desde, d.vigenteDesde ? '' : 'Indique desde cuándo aplica.'],
    [campo.hasta, d.vigenteHasta && d.vigenteHasta <= d.vigenteDesde ? 'La vigencia debe terminar después de su inicio.' : ''],
  ];
  const valido = reglas.map(([control, mensaje]) => marcarCampo(control, mensaje)).every(Boolean);
  if (!valido) formulario.querySelector('[aria-invalid="true"]')?.focus();
  return valido;
}

async function guardar(datos) {
  const boton = $('tarifa-guardar');
  botonCargando(boton, true, 'Guardando…');
  try {
    if (estado.editando) await actualizarTarifa(estado.editando.idTarifa, datos);
    else await crearTarifa(datos);
    mostrarAviso(estado.editando ? 'Tarifa actualizada' : 'Tarifa creada', 'success');
    cerrarDialogo(dialogo);
    cargar(estado.editando ? estado.page : 1);
  } catch (error) {
    if (error.status === 401) return;
    if (error.code === 'TARIFA_SUPERPUESTA' && !estado.editando) {
      // RF-TAR-05: se ofrece cerrar la vigencia de la anterior en el inicio de la nueva.
      mostrarAlerta(alerta, `${error.message} Puede cerrar la anterior en la fecha de inicio de esta.`, 'error');
      estado.pendiente = datos;
      mostrar($('tarifa-cerrar-campo'), true);
    } else if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, {
        nombre: 'tarifa-nombre',
        tipoVehiculo: 'tarifa-vehiculo',
        tipoCliente: 'tarifa-cliente',
        valorPrimeraHora: 'tarifa-primera',
        minutosFraccion: 'tarifa-minutos-fraccion',
        valorFraccion: 'tarifa-valor-fraccion',
        topeDiario: 'tarifa-tope',
        minutosGracia: 'tarifa-gracia',
        vigenteDesde: 'tarifa-desde',
        vigenteHasta: 'tarifa-hasta',
      });
      if (sinCampo.length) mostrarAlerta(alerta, sinCampo.join(' '), 'error');
    } else {
      // TARIFA_USADA, TARIFA_SUPERPUESTA al editar, TARIFA_NO_ENCONTRADA…
      mostrarAlerta(alerta, error.message, 'error');
    }
  } finally {
    botonCargando(boton, false);
  }
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  mostrar($('tarifa-cerrar-campo'), false);
  const datos = leer();
  if (validar(datos)) await guardar(datos);
});

$('tarifa-cerrar-anterior').addEventListener('click', async () => {
  if (!estado.pendiente) return;
  mostrar($('tarifa-cerrar-campo'), false);
  mostrarAlerta(alerta, '');
  await guardar({ ...estado.pendiente, cerrarAnterior: true });
});

// ---------------------------------------------------------------- arranque
if (marco?.permitido) {
  mostrar($('accion-nueva'), puede.crear);
  $('accion-nueva').addEventListener('click', (e) => abrirFormulario(null, e.currentTarget));
  cargar(1);
}
