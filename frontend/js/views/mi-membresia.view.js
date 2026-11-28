// Página · Panel del cliente › Mi membresía (HU-48; suscripción del Cliente, HU-46): sus membresías con plan,
// vehículo, vigencia, días restantes, aviso de renovación e historial de pagos; sin membresía vigente, los planes
// disponibles. El Cliente suscribe sus vehículos pagando con tarjeta, transferencia o QR.
import { miMembresia, listarPlanes, suscribir } from '../services/membresias.service.js';
import { misVehiculos } from '../services/vehiculos.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarFormularioPago } from '../components/organismos/formulario-pago.js';
import { ponerVigencia, fechaCorta } from '../components/moleculas/vigencia.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChipMembresia, ponerChipFactura } from '../components/atomos/chip-estado.js';
import { ponerPlaca } from '../components/atomos/placa.js';
import { botonCargando } from '../components/atomos/boton.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, mostrar } from '../utils/dom.js';
import { clonar } from '../utils/plantillas.js';
import { formatearCOP, formatearFechaHora, plural } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'perfil.ver', alSalir: cerrarSesion });

const ICONO = { carro: 'i-car', moto: 'i-moto' };
/** Estado de la página: vehículos que se pueden suscribir y planes activos. */
const estado = { vehiculos: [], planes: [] };

// ---------------------------------------------------------------- mis membresías (HU-48 E1, E3)
function tarjetaMembresia(m) {
  const tarjeta = clonar('tpl-mi-membresia');
  tarjeta.dataset.id = String(m.idMembresia);
  tarjeta.querySelector('.js-plan').textContent = m.plan.nombre;
  ponerChipMembresia(tarjeta.querySelector('.js-estado'), m.estado);
  ponerVigencia(tarjeta.querySelector('.molecule-panel-body'), m);
  ponerPlaca(tarjeta.querySelector('.js-placa'), m.vehiculo.placa);
  tarjeta.querySelector('.js-inicio').textContent = fechaCorta(m.fechaInicio);
  tarjeta.querySelector('.js-fin').textContent = fechaCorta(m.fechaFin);
  tarjeta.querySelector('.js-valor').textContent = `${formatearCOP(m.plan.valorMensual)} / ${plural(m.plan.diasVigencia, 'día')}`;
  tarjeta.querySelector('tbody').replaceChildren(
    ...m.facturas.map((f) => {
      const fila = clonar('tpl-mi-factura');
      fila.dataset.id = String(f.idFactura);
      fila.querySelector('.js-numero').textContent = f.numero;
      fila.querySelector('.js-fecha').textContent = formatearFechaHora(f.fecha);
      fila.querySelector('.js-total').textContent = formatearCOP(f.total);
      ponerChipFactura(fila.querySelector('.js-estado'), f.estado);
      return fila;
    })
  );
  return tarjeta;
}

// ---------------------------------------------------------------- planes disponibles (HU-48 E2)
function tarjetaPlan(p) {
  const tarjeta = clonar('tpl-plan-tarjeta');
  tarjeta.dataset.id = String(p.idPlan);
  tarjeta.querySelector('use').setAttribute('href', `/assets/icons.svg#${ICONO[p.tipoVehiculo]}`);
  tarjeta.querySelector('.js-nombre').textContent = p.nombre;
  tarjeta.querySelector('.js-valor').textContent = formatearCOP(p.valorMensual);
  tarjeta.querySelector('.js-dias').textContent = `por ${plural(p.diasVigencia, 'día')}`;
  tarjeta.querySelector('.js-beneficios').textContent = p.beneficios ?? '';
  return tarjeta;
}

async function cargar() {
  try {
    const [{ membresias, planesDisponibles }, vehiculos, planes] = await Promise.all([
      miMembresia(),
      misVehiculos(),
      tienePermiso('planes.ver') ? listarPlanes({ estado: 'activo', limit: 100 }).then((r) => r.data) : Promise.resolve([]),
    ]);
    $('mis-membresias').replaceChildren(...membresias.map(tarjetaMembresia));
    mostrar($('sin-membresias'), membresias.length === 0);
    $('planes-lista').replaceChildren(...planesDisponibles.map(tarjetaPlan));
    mostrar($('panel-planes'), planesDisponibles.length > 0);

    const conActiva = new Set(membresias.filter((m) => m.estado === 'activa').map((m) => m.vehiculo.idVehiculo));
    estado.vehiculos = vehiculos.filter((v) => v.estado === 'activo' && !conActiva.has(v.idVehiculo));
    estado.planes = planes;
    prepararSuscripcion();
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
}

// ---------------------------------------------------------------- suscribir un vehículo propio (HU-46 E1, E5)
const formulario = $('form-mi-suscripcion');
const alerta = $('mi-suscripcion-alerta');
const pago = conectarFormularioPago('mi-pago');
const selectorVehiculo = $('mi-suscripcion-vehiculo');
const selectorPlan = $('mi-suscripcion-plan');

const vehiculoElegido = () => estado.vehiculos.find((v) => String(v.idVehiculo) === selectorVehiculo.value) ?? null;
const planesDe = (vehiculo) => estado.planes.filter((p) => vehiculo && p.tipoVehiculo === vehiculo.tipo);
const planElegido = () => estado.planes.find((p) => String(p.idPlan) === selectorPlan.value) ?? null;

function opciones(selector, datos, valor, texto) {
  selector.replaceChildren(
    ...datos.map((d) => {
      const opcion = clonar('tpl-opcion');
      opcion.value = String(valor(d));
      opcion.textContent = texto(d);
      return opcion;
    })
  );
}

function mostrarValor() {
  const plan = planElegido();
  $('mi-suscripcion-valor').textContent = plan ? formatearCOP(plan.valorMensual) : '—';
  pago.ponerTotal(plan?.valorMensual ?? 0);
}

function pintarPlanesDelVehiculo() {
  const planes = planesDe(vehiculoElegido());
  opciones(selectorPlan, planes, (p) => p.idPlan, (p) => `${p.nombre} · ${formatearCOP(p.valorMensual)} / ${plural(p.diasVigencia, 'día')}`);
  selectorPlan.disabled = planes.length === 0;
  mostrarValor();
}

function prepararSuscripcion() {
  const hay = estado.vehiculos.length > 0 && estado.planes.length > 0 && tienePermiso('membresias.crear');
  mostrar($('panel-suscribir'), hay);
  if (!hay) return;
  opciones(selectorVehiculo, estado.vehiculos, (v) => v.idVehiculo, (v) => `${v.placa} · ${v.tipo === 'moto' ? 'Moto' : 'Carro'} ${v.marca}`);
  pago.reiniciar(0);
  pintarPlanesDelVehiculo();
}

selectorVehiculo.addEventListener('change', pintarPlanesDelVehiculo);
selectorPlan.addEventListener('change', mostrarValor);

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  const vehiculo = vehiculoElegido();
  const plan = planElegido();
  let valido = marcarCampo(selectorVehiculo, vehiculo ? '' : 'Elija un vehículo.');
  valido = marcarCampo(selectorPlan, plan ? '' : `No hay planes activos para ${vehiculo?.tipo === 'moto' ? 'motos' : 'carros'}.`) && valido;
  const datosPago = pago.leer();
  if (!valido || !datosPago.valido) return formulario.querySelector('[aria-invalid="true"]')?.focus();
  const boton = $('mi-suscripcion-guardar');
  botonCargando(boton, true, 'Pagando…');
  try {
    const { membresia, factura } = await suscribir({ idVehiculo: vehiculo.idVehiculo, idPlan: plan.idPlan, pago: datosPago.pago });
    mostrarAviso(`Membresía activa hasta el ${fechaCorta(membresia.fechaFin)} · factura ${factura.numero}`, 'success');
    await cargar();
  } catch (error) {
    if (error.status === 401) return;
    if (error.code === 'VALIDACION') {
      const otros = pago.pintarErrores(error);
      const sinCampo = pintarErroresApi({ details: otros }, { idVehiculo: 'mi-suscripcion-vehiculo', idPlan: 'mi-suscripcion-plan' });
      if (sinCampo.length) mostrarAlerta(alerta, sinCampo.join(' '), 'error');
    } else {
      // MEMBRESIA_ACTIVA, PLAN_INACTIVO, SIN_PERMISO…
      mostrarAlerta(alerta, error.message, 'error');
    }
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------- arranque
if (marco?.permitido) cargar();
