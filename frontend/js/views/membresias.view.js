// Página · Membresías (HU-46, HU-47): listado del personal con búsqueda, nueva suscripción con pago (placa →
// propietario → planes activos de su tipo), renovación con pago y cancelación con motivo.
import { listarMembresias, listarPlanes, suscribir, renovar, cancelar } from '../services/membresias.service.js';
import { buscarPorPlaca } from '../services/vehiculos.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { abrirDialogo, cerrarDialogo } from '../components/organismos/modal.js';
import { conectarFormularioPago } from '../components/organismos/formulario-pago.js';
import { fechaCorta } from '../components/moleculas/vigencia.js';
import { conectarBusqueda } from '../components/moleculas/buscador.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChipMembresia } from '../components/atomos/chip-estado.js';
import { ponerPlaca } from '../components/atomos/placa.js';
import { botonCargando } from '../components/atomos/boton.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, mostrar } from '../utils/dom.js';
import { clonar } from '../utils/plantillas.js';
import { formatearCOP, plural } from '../utils/formato.js';
import { normalizarPlaca } from '../utils/placa.js';

const marco = montarMarco({ permiso: 'membresias.ver', alSalir: cerrarSesion });

const puede = { suscribir: tienePermiso('membresias.crear'), editar: tienePermiso('membresias.editar') };
/**
 * Estado de la página: página y filtros del listado, el vehículo y los planes de la suscripción en curso y la
 * membresía que se renueva o cancela.
 */
const estado = { page: 1, filtros: { q: '', estado: '' }, vehiculo: null, planes: [], actual: null };

/** Texto de un plan para las opciones y los resúmenes. */
const textoPlan = (p) => `${p.nombre} · ${formatearCOP(p.valorMensual)} / ${plural(p.diasVigencia, 'día')}`;

/** Mensaje de éxito con la factura emitida. */
function avisarFactura(accion, factura) {
  const cambio = factura.pago?.metodo === 'efectivo' && factura.pago.cambio ? ` · cambio ${formatearCOP(factura.pago.cambio)}` : '';
  mostrarAviso(`${accion}: factura ${factura.numero} por ${formatearCOP(factura.total)}${cambio}`, 'success');
}

// ---------------------------------------------------------------- listado
const tabla = conectarTabla($('tabla-membresias'), {
  plantilla: 'tpl-membresia',
  idDe: (m) => m.idMembresia,
  onPagina: (pagina) => cargar(pagina),
  rellenar(fila, m) {
    ponerPlaca(fila.querySelector('.js-placa'), m.vehiculo.placa);
    fila.querySelector('.js-cliente').textContent = m.cliente.nombre;
    fila.querySelector('.js-documento').textContent = `${m.cliente.tipoDocumento} ${m.cliente.numeroDocumento}`;
    fila.querySelector('.js-plan').textContent = m.plan.nombre;
    fila.querySelector('.js-valor').textContent = formatearCOP(m.plan.valorMensual);
    fila.querySelector('.js-vigencia').textContent = `${fechaCorta(m.fechaInicio)} → ${fechaCorta(m.fechaFin)}`;
    fila.querySelector('.js-dias').textContent = m.estado === 'activa' ? String(m.diasRestantes) : '—';
    ponerChipMembresia(fila.querySelector('.js-estado'), m.estado);
    fila.querySelector('.js-aviso').classList.toggle('hidden', !m.avisoRenovacion);
    const botonRenovar = fila.querySelector('.js-renovar');
    botonRenovar.classList.toggle('hidden', !puede.editar || m.estado === 'cancelada');
    botonRenovar.setAttribute('aria-label', `Renovar la membresía de ${m.vehiculo.placa}`);
    botonRenovar.addEventListener('click', () => abrirRenovacion(m, botonRenovar));
    const botonCancelar = fila.querySelector('.js-cancelar');
    botonCancelar.classList.toggle('hidden', !puede.editar || m.estado !== 'activa');
    botonCancelar.setAttribute('aria-label', `Cancelar la membresía de ${m.vehiculo.placa}`);
    botonCancelar.addEventListener('click', () => abrirCancelacion(m, botonCancelar));
  },
});

async function cargar(page = estado.page) {
  estado.page = page;
  tabla.cargando(true);
  try {
    const { data, meta } = await listarMembresias({ ...estado.filtros, page });
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
$('filtro-estado').addEventListener('change', (e) => {
  estado.filtros.estado = e.target.value;
  cargar(1);
});

// ---------------------------------------------------------------- nueva suscripción (HU-46)
const dialogoSuscripcion = $('dialogo-suscripcion');
const formSuscripcion = $('form-suscripcion');
const alertaSuscripcion = $('suscripcion-alerta');
const pagoSuscripcion = conectarFormularioPago('suscripcion');
const selectorPlan = $('suscripcion-plan');

const planElegido = () => estado.planes.find((p) => String(p.idPlan) === selectorPlan.value) ?? null;

function mostrarValor() {
  const plan = planElegido();
  $('suscripcion-valor').textContent = plan ? formatearCOP(plan.valorMensual) : '—';
  pagoSuscripcion.ponerTotal(plan?.valorMensual ?? 0);
}

function pintarPlanes(planes) {
  estado.planes = planes;
  selectorPlan.replaceChildren(
    ...planes.map((p) => {
      const opcion = clonar('tpl-opcion');
      opcion.value = String(p.idPlan);
      opcion.textContent = textoPlan(p);
      return opcion;
    })
  );
  selectorPlan.disabled = planes.length === 0;
  mostrarValor();
}

function abrirSuscripcion(origen) {
  estado.vehiculo = null;
  limpiarErrores(formSuscripcion);
  mostrarAlerta(alertaSuscripcion, '');
  $('suscripcion-placa').value = '';
  mostrar($('suscripcion-vehiculo'), false);
  pintarPlanes([]);
  pagoSuscripcion.reiniciar(0);
  abrirDialogo(dialogoSuscripcion, { origen, foco: $('suscripcion-placa') });
}

/** Busca el vehículo por placa, muestra su propietario y los planes activos de su tipo. */
async function buscarVehiculo() {
  const control = $('suscripcion-placa');
  const placa = normalizarPlaca(control.value);
  control.value = placa;
  mostrarAlerta(alertaSuscripcion, '');
  if (!marcarCampo(control, placa.length < 5 ? 'Escriba la placa del vehículo.' : '')) return false;
  const boton = $('suscripcion-buscar');
  botonCargando(boton, true, 'Buscando…');
  try {
    const vehiculo = await buscarPorPlaca(placa);
    estado.vehiculo = vehiculo;
    mostrar($('suscripcion-vehiculo'), Boolean(vehiculo));
    if (!vehiculo) {
      pintarPlanes([]);
      return marcarCampo(control, 'No hay un vehículo registrado con esa placa.');
    }
    const caja = $('suscripcion-vehiculo');
    caja.querySelector('.js-propietario').textContent = vehiculo.propietario
      ? `${vehiculo.propietario.nombre} · ${vehiculo.propietario.tipoDocumento} ${vehiculo.propietario.numeroDocumento}`
      : 'Sin propietario: asócielo primero a un cliente';
    caja.querySelector('.js-tipo').textContent = vehiculo.tipo === 'moto' ? 'Moto' : 'Carro';
    const { data } = await listarPlanes({ estado: 'activo', tipoVehiculo: vehiculo.tipo, limit: 100 });
    pintarPlanes(data);
    if (!vehiculo.propietario) return marcarCampo(control, 'Asocie primero el vehículo a un cliente.');
    if (!data.length) mostrarAlerta(alertaSuscripcion, `No hay planes activos para ${vehiculo.tipo === 'moto' ? 'motos' : 'carros'}.`, 'error');
    return data.length > 0;
  } catch (error) {
    if (error.status !== 401) mostrarAlerta(alertaSuscripcion, error.message, 'error');
    return false;
  } finally {
    botonCargando(boton, false);
  }
}

$('suscripcion-buscar').addEventListener('click', buscarVehiculo);
$('suscripcion-placa').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    buscarVehiculo();
  }
});
selectorPlan.addEventListener('change', mostrarValor);

formSuscripcion.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formSuscripcion);
  mostrarAlerta(alertaSuscripcion, '');
  if (!estado.vehiculo || normalizarPlaca($('suscripcion-placa').value) !== estado.vehiculo.placa) {
    if (!(await buscarVehiculo())) return;
  }
  const plan = planElegido();
  if (!marcarCampo(selectorPlan, plan ? '' : 'Elija un plan.')) return selectorPlan.focus();
  const { valido, pago } = pagoSuscripcion.leer();
  if (!valido) return formSuscripcion.querySelector('[aria-invalid="true"]')?.focus();
  const boton = $('suscripcion-guardar');
  botonCargando(boton, true, 'Cobrando…');
  try {
    const { factura } = await suscribir({ idVehiculo: estado.vehiculo.idVehiculo, idPlan: plan.idPlan, pago });
    cerrarDialogo(dialogoSuscripcion);
    avisarFactura('Membresía activa', factura);
    cargar(1);
  } catch (error) {
    if (error.status === 401) return;
    if (error.code === 'VALIDACION') {
      const otros = pagoSuscripcion.pintarErrores(error);
      const sinCampo = pintarErroresApi({ details: otros }, { idVehiculo: 'suscripcion-placa', idPlan: 'suscripcion-plan' });
      if (sinCampo.length) mostrarAlerta(alertaSuscripcion, sinCampo.join(' '), 'error');
    } else {
      // MEMBRESIA_ACTIVA, PLAN_INACTIVO, SIN_PERMISO…
      mostrarAlerta(alertaSuscripcion, error.message, 'error');
    }
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------- renovación (HU-47 E1)
const dialogoRenovacion = $('dialogo-renovacion');
const formRenovacion = $('form-renovacion');
const alertaRenovacion = $('renovacion-alerta');
const pagoRenovacion = conectarFormularioPago('renovacion');

function abrirRenovacion(m, origen) {
  estado.actual = m;
  limpiarErrores(formRenovacion);
  mostrarAlerta(alertaRenovacion, '');
  ponerPlaca($('renovacion-placa'), m.vehiculo.placa);
  $('renovacion-plan').textContent = m.plan.nombre;
  $('renovacion-vigencia').textContent = `${fechaCorta(m.fechaInicio)} → ${fechaCorta(m.fechaFin)} (${m.estado})`;
  $('renovacion-valor').textContent = formatearCOP(m.plan.valorMensual);
  pagoRenovacion.reiniciar(m.plan.valorMensual);
  abrirDialogo(dialogoRenovacion, { origen, foco: $('renovacion-metodo') });
}

formRenovacion.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formRenovacion);
  mostrarAlerta(alertaRenovacion, '');
  const { valido, pago } = pagoRenovacion.leer();
  if (!valido) return formRenovacion.querySelector('[aria-invalid="true"]')?.focus();
  const boton = $('renovacion-guardar');
  botonCargando(boton, true, 'Cobrando…');
  try {
    const { periodo, factura } = await renovar(estado.actual.idMembresia, pago);
    cerrarDialogo(dialogoRenovacion);
    avisarFactura(`Renovada del ${fechaCorta(periodo.desde)} al ${fechaCorta(periodo.hasta)}`, factura);
    cargar();
  } catch (error) {
    if (error.status === 401) return;
    if (error.code === 'VALIDACION') {
      const otros = pagoRenovacion.pintarErrores(error);
      if (otros.length) mostrarAlerta(alertaRenovacion, otros.map((d) => d.mensaje).join(' '), 'error');
    } else {
      // MEMBRESIA_CANCELADA, PLAN_INACTIVO, MEMBRESIA_ACTIVA…
      mostrarAlerta(alertaRenovacion, error.message, 'error');
    }
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------- cancelación (HU-47 E2)
const dialogoCancelacion = $('dialogo-cancelacion');
const formCancelacion = $('form-cancelacion');
const alertaCancelacion = $('cancelacion-alerta');
const campoMotivo = $('cancelacion-motivo');

function abrirCancelacion(m, origen) {
  estado.actual = m;
  limpiarErrores(formCancelacion);
  mostrarAlerta(alertaCancelacion, '');
  campoMotivo.value = '';
  $('cancelacion-resumen').textContent = `${m.plan.nombre} de ${m.vehiculo.placa} (${m.cliente.nombre}), vigente hasta el ${fechaCorta(m.fechaFin)}.`;
  abrirDialogo(dialogoCancelacion, { origen, foco: campoMotivo });
}

formCancelacion.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formCancelacion);
  mostrarAlerta(alertaCancelacion, '');
  const motivo = campoMotivo.value.trim();
  if (!marcarCampo(campoMotivo, motivo.length < 10 || motivo.length > 200 ? 'El motivo debe tener entre 10 y 200 caracteres.' : '')) return campoMotivo.focus();
  const boton = $('cancelacion-guardar');
  botonCargando(boton, true, 'Cancelando…');
  try {
    await cancelar(estado.actual.idMembresia, motivo);
    cerrarDialogo(dialogoCancelacion);
    mostrarAviso('Membresía cancelada', 'success');
    cargar();
  } catch (error) {
    if (error.status === 401) return;
    if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, { motivo: 'cancelacion-motivo' });
      if (sinCampo.length) mostrarAlerta(alertaCancelacion, sinCampo.join(' '), 'error');
    } else {
      mostrarAlerta(alertaCancelacion, error.message, 'error');
    }
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------- arranque
if (marco?.permitido) {
  mostrar($('accion-suscribir'), puede.suscribir);
  $('accion-suscribir').addEventListener('click', (e) => abrirSuscripcion(e.currentTarget));
  cargar(1);
}
