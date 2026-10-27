/**
 * Tarifas — REQ-TAR-1/2: tarifa vigente por tipo, nueva tarifa (admin) y simulador
 * "si un carro dura X minutos, paga $Y". El cálculo lo hace siempre el servidor.
 * El administrador edita además los parámetros del negocio (tabla configuracion).
 * HTML en app/tarifas.html.
 */
import { montarMarco } from './comun/marco-app.js';
import { confirmar, mostrarAviso } from './comun/dialogos.js';
import { clonar, marcarCampo, mostrarAlerta, botonCargando } from './comun/plantillas.js';
import { conectarTabla } from './comun/tablas.js';
import { obtenerTarifas, crearTarifa, simularCobro } from '../services/facturacion.service.js';
import { listarParametros, actualizarParametro } from '../services/configuracion.service.js';
import { formatearCOP, formatearFechaHora } from '../utils/formato.js';
import { tienePermiso } from '../utils/sesion.js';

const $ = (id) => document.getElementById(id);
const mostrar = (nodo, visible) => nodo.classList.toggle('hidden', !visible);
const TIPOS = { carro: 'Carros', moto: 'Motos' };
const CAMPOS = ['valor_fraccion', 'minutos_fraccion', 'minutos_gracia', 'valor_dia_maximo'];
const estado = { sesion: null, vigentes: { carro: null, moto: null } };
const puede = (codigo) => tienePermiso(estado.sesion, codigo);
const gestiona = () => puede('tarifas.gestionar');
const formulario = $('form-tarifa');
const tipoActual = () => formulario.querySelector('input[name="tipo-tarifa"]:checked').value;

// ---------------------------------------------------------------- vigentes e historial
function pintarVigente(tipo) {
  const t = estado.vigentes[tipo];
  mostrar($(`vigente-${tipo}`), Boolean(t));
  mostrar($(`vigente-${tipo}-sin`), !t);
  if (!t) return;
  $(`vigente-${tipo}-valor`).textContent = formatearCOP(t.valor_fraccion);
  $(`vigente-${tipo}-unidad`).textContent = ` / ${t.unidad}`;
  $(`vigente-${tipo}-fraccion`).textContent =
    `${t.minutos_fraccion} min${t.minutos_fraccion === 1 ? ' (cobro por minuto)' : ''}`;
  $(`vigente-${tipo}-gracia`).textContent = t.minutos_gracia
    ? `${t.minutos_gracia} min`
    : 'Sin gracia';
  $(`vigente-${tipo}-tope`).textContent = formatearCOP(t.valor_dia_maximo);
  $(`vigente-${tipo}-desde`).textContent = formatearFechaHora(t.vigente_desde);
}

const historial = conectarTabla($('tabla-historial'), {
  plantilla: 'tpl-tarifa',
  rellenar: (fila, t) => {
    const [tipo, tarifa, desde, estadoTarifa] = fila.cells;
    fila.classList.toggle('is-highlighted', t.activa);
    tipo.textContent = t.tipo_vehiculo === 'moto' ? 'Moto' : 'Carro';
    tarifa.textContent = t.descripcion;
    desde.firstElementChild.textContent = formatearFechaHora(t.vigente_desde);
    estadoTarifa.textContent = t.activa ? 'Vigente' : 'Anterior';
  },
});

async function recargar() {
  try {
    const datos = await obtenerTarifas({ historial: gestiona() });
    estado.vigentes = datos.vigentes;
    pintarVigente('carro');
    pintarVigente('moto');
    if (gestiona()) historial.pintar(datos.historial ?? []);
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
}

// ---------------------------------------------------------------- simulador y nueva tarifa
function cargarVigenteEnFormulario() {
  const t = estado.vigentes[tipoActual()];
  for (const clave of CAMPOS) $(clave).value = t ? String(t[clave]) : '';
}

/** Valores del formulario (si son válidos) para simular la tarifa propuesta. */
function propuesta() {
  const v = Object.fromEntries(
    CAMPOS.map((k) => [k, $(k).value === '' ? NaN : Number($(k).value)])
  );
  if (Number.isNaN(v.minutos_gracia)) v.minutos_gracia = 0;
  const ok =
    v.valor_fraccion >= 0 &&
    v.minutos_fraccion >= 1 &&
    v.minutos_gracia >= 0 &&
    v.valor_dia_maximo >= 0;
  return ok ? v : null;
}

function ponerResultado({ sinMinutos = false, error = '', cobro = null, etiqueta = '' }) {
  mostrar($('sim-sin-minutos'), sinMinutos);
  $('sim-error').textContent = error;
  mostrar($('sim-error'), Boolean(error));
  mostrar($('sim-resultado'), Boolean(cobro));
  $('sim-pasos').replaceChildren(
    ...(cobro?.detalle ?? [])
      .filter((d) => d.paso !== 'total')
      .map((d) => {
        const li = clonar('tpl-paso');
        li.textContent = d.texto;
        return li;
      })
  );
  if (!cobro) return;
  $('sim-etiqueta').textContent = etiqueta;
  $('sim-total').textContent = formatearCOP(cobro.total);
  const conTope = cobro.porcentajeTope !== null && cobro.porcentajeTope !== undefined;
  $('sim-pct').textContent = conTope ? `${cobro.porcentajeTope} % del tope` : '';
  mostrar($('sim-medidor'), conTope);
  if (conTope) {
    const v = Math.max(0, Math.min(100, Math.round(cobro.porcentajeTope)));
    $('sim-medidor').setAttribute('aria-valuenow', String(v));
    $('sim-medidor').firstElementChild.style.setProperty('--v', String(v));
  }
  $('sim-nota').textContent = cobro.nota ?? '';
}

async function simular() {
  const m = Number($('sim-minutos').value);
  if ($('sim-minutos').value === '' || !(m >= 0) || !Number.isInteger(m)) {
    ponerResultado({ sinMinutos: true });
    return;
  }
  const tipo = tipoActual();
  try {
    const { cobro } = await simularCobro({
      tipo_vehiculo: tipo,
      minutos: m,
      tarifa: gestiona() ? (propuesta() ?? undefined) : undefined,
    });
    ponerResultado({ cobro, etiqueta: `Un ${tipo} que dura ${m} min paga` });
  } catch (error) {
    ponerResultado({ error: error.message });
  }
}

let temporizador = null;
function simularPronto() {
  clearTimeout(temporizador);
  temporizador = setTimeout(simular, 250);
}

$('sim-minutos').addEventListener('input', simularPronto);
CAMPOS.forEach((k) => $(k).addEventListener('input', simularPronto));
formulario.addEventListener('change', (e) => {
  if (e.target.name !== 'tipo-tarifa') return;
  cargarVigenteEnFormulario();
  simular();
});

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!gestiona()) return;
  const alerta = $('tarifa-alerta');
  const guardar = $('tarifa-guardar');
  mostrarAlerta(alerta, '');
  CAMPOS.forEach((k) => marcarCampo($(k), ''));
  const tipo = tipoActual();
  const v = propuesta();
  if (!v) {
    if ($('valor_fraccion').value === '' || !(Number($('valor_fraccion').value) >= 0))
      marcarCampo($('valor_fraccion'), 'Escribe el valor.');
    if (!(Number($('minutos_fraccion').value) >= 1))
      marcarCampo($('minutos_fraccion'), 'Desde 1 minuto.');
    if ($('valor_dia_maximo').value === '' || !(Number($('valor_dia_maximo').value) >= 0))
      marcarCampo($('valor_dia_maximo'), 'Escribe el tope.');
    return;
  }
  const ok = await confirmar({
    titulo: `Nueva tarifa de ${TIPOS[tipo].toLowerCase()}`,
    mensaje: `${formatearCOP(v.valor_fraccion)} cada ${v.minutos_fraccion} min, tope ${formatearCOP(v.valor_dia_maximo)} por día. Reemplaza la tarifa vigente desde ahora.`,
    textoConfirmar: 'Guardar tarifa',
    origen: guardar,
  });
  if (!ok) return;
  botonCargando(guardar, true, 'Guardando…');
  try {
    const nueva = await crearTarifa({ tipo_vehiculo: tipo, ...v });
    mostrarAviso(
      `Tarifa de ${TIPOS[tipo].toLowerCase()} actualizada: ${nueva.descripcion}.`,
      'success'
    );
    await recargar();
  } catch (error) {
    for (const d of error.detalles ?? []) if ($(d.campo)) marcarCampo($(d.campo), d.mensaje);
    mostrarAlerta(alerta, error.message);
  } finally {
    botonCargando(guardar, false);
  }
});

// ---------------------------------------------------------------- parámetros (admin)
/** Valores del negocio de la tabla configuracion (minutos de reserva, membresías, etc.). */
const parametros = conectarTabla($('tabla-parametros'), {
  plantilla: 'tpl-parametro',
  rellenar: (fila, p) => {
    const [nombre, valor, cambio, accion] = fila.cells;
    fila.dataset.id = p.clave;
    nombre.querySelector('strong').textContent = p.descripcion;
    nombre.querySelector('small').textContent = ` ${p.clave}`;
    const input = valor.firstElementChild;
    const numerico = p.tipo === 'entero' || p.tipo === 'decimal';
    input.type = numerico ? 'number' : 'text';
    input.name = p.clave;
    input.value = String(p.valor);
    input.setAttribute('aria-label', p.descripcion);
    if (p.tipo === 'entero') input.inputMode = 'numeric';
    if (p.tipo === 'decimal') input.inputMode = 'decimal';
    if (numerico) input.min = p.tipo === 'entero' ? '1' : '0';
    if (p.tipo === 'decimal') input.step = '0.01';
    const ponerCambio = () => {
      cambio.textContent = p.actualizado_por
        ? `${formatearFechaHora(p.actualizado_en)} · ${p.actualizado_por.nombre_completo}`
        : 'Valor inicial';
    };
    ponerCambio();
    const guardar = accion.firstElementChild;
    guardar.addEventListener('click', async () => {
      botonCargando(guardar, true);
      try {
        const actualizado = await actualizarParametro(p.clave, input.value);
        Object.assign(p, actualizado);
        input.value = String(actualizado.valor);
        ponerCambio();
        mostrarAviso(`Parámetro actualizado: ${p.descripcion}.`, 'success');
      } catch (error) {
        mostrarAviso(error.message, 'error');
      } finally {
        botonCargando(guardar, false);
      }
    });
  },
});

async function iniciar() {
  const app = await montarMarco({ paginaId: 'tarifas' });
  if (!app) return;
  estado.sesion = app.sesion;
  if (gestiona()) {
    $('pagina-subtitulo').textContent =
      '// cobro por fracción con tope diario · configura y simula';
    $('panel-editor-titulo').textContent = 'Nueva tarifa y simulador';
    $('editor').classList.replace('template-app-layout-stack', 'template-app-layout-tariff-editor');
    ['tarifa-campos', 'tarifa-nota', 'tarifa-acciones', 'panel-historial'].forEach((id) =>
      $(id).classList.remove('hidden')
    );
  }
  await recargar();
  cargarVigenteEnFormulario();
  simular();
  if (puede('configuracion.gestionar')) {
    $('panel-parametros').classList.remove('hidden');
    try {
      parametros.pintar(await listarParametros());
    } catch (error) {
      mostrarAviso(error.message, 'error');
    }
  }
}

iniciar();
