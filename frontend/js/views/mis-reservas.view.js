// Página · Panel del cliente › Mis reservas (HU-52, HU-53): reservar una celda con uno de sus vehículos (fecha y
// hora y, opcional, la celda entre las libres de esa franja) y cancelar las confirmadas que no han iniciado. Sin
// vehículos, el aviso para registrar uno (HU-52 E4).
import { reservar, misReservas, cancelarReserva, celdasDisponibles } from '../services/reservas.service.js';
import { misVehiculos } from '../services/vehiculos.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { confirmar } from '../components/organismos/modal.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChipReserva } from '../components/atomos/chip-estado.js';
import { ponerPlaca } from '../components/atomos/placa.js';
import { botonCargando } from '../components/atomos/boton.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, mostrar } from '../utils/dom.js';
import { clonar } from '../utils/plantillas.js';
import { formatearFechaHora } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'perfil.ver', alSalir: cerrarSesion });

const DIAS_MAXIMOS = 7;
/** Estado de la página: vehículos propios, página y filtro del listado. */
const estado = { vehiculos: [], page: 1, filtro: '' };

/** Date → valor de <input type="datetime-local"> en la hora local del navegador (Bogotá). */
const aLocal = (fecha) => new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

// ---------------------------------------------------------------- mis reservas (HU-53)
async function cancelar(r, origen) {
  const acepta = await confirmar({
    titulo: `Cancelar la reserva ${r.codigo}`,
    mensaje: `${r.vehiculo.placa} · celda ${r.celda.codigo} · ${formatearFechaHora(r.fechaHoraInicio)}. La celda quedará libre para otros clientes.`,
    textoConfirmar: 'Cancelar reserva',
    origen,
  });
  if (!acepta) return;
  try {
    await cancelarReserva(r.idReserva);
    mostrarAviso(`Reserva ${r.codigo} cancelada: le enviamos la confirmación`, 'success');
    cargar();
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
}

const tabla = conectarTabla($('tabla-mis-reservas'), {
  plantilla: 'tpl-mi-reserva',
  idDe: (r) => r.idReserva,
  onPagina: (pagina) => cargar(pagina),
  rellenar(fila, r) {
    fila.querySelector('.js-codigo').textContent = r.codigo;
    fila.querySelector('.js-hora').textContent = formatearFechaHora(r.fechaHoraInicio);
    ponerPlaca(fila.querySelector('.js-placa'), r.vehiculo.placa);
    fila.querySelector('.js-celda').textContent = r.celda.codigo;
    fila.querySelector('.js-parqueadero').textContent = r.celda.parqueadero;
    ponerChipReserva(fila.querySelector('.js-estado'), r.estado);
    const boton = fila.querySelector('.js-cancelar');
    const cancelable = r.estado === 'confirmada' && new Date(r.fechaHoraInicio) > new Date();
    boton.classList.toggle('hidden', !cancelable || !tienePermiso('reservas.editar'));
    boton.setAttribute('aria-label', `Cancelar la reserva ${r.codigo}`);
    boton.addEventListener('click', () => cancelar(r, boton));
  },
});

async function cargar(page = estado.page) {
  estado.page = page;
  tabla.cargando(true);
  try {
    const { data, meta } = await misReservas({ estado: estado.filtro || undefined, page });
    tabla.pintar(data, meta);
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
    tabla.pintar([]);
  } finally {
    tabla.cargando(false);
  }
}

$('filtro-estado').addEventListener('change', (e) => {
  estado.filtro = e.target.value;
  cargar(1);
});

// ---------------------------------------------------------------- reservar (HU-52)
const formulario = $('form-reserva');
const alerta = $('reserva-alerta');
const campo = { vehiculo: $('reserva-vehiculo'), inicio: $('reserva-inicio'), celda: $('reserva-celda') };

const vehiculoElegido = () => estado.vehiculos.find((v) => String(v.idVehiculo) === campo.vehiculo.value) ?? null;

function opcion(valor, texto) {
  const o = clonar('tpl-opcion');
  o.value = valor;
  o.textContent = texto;
  return o;
}

/** Recarga las celdas libres en la franja de la hora elegida (la primera opción asigna automáticamente). */
async function cargarCeldas(preseleccion = '') {
  const vehiculo = vehiculoElegido();
  const automatica = opcion('', 'Asignar automáticamente');
  if (!vehiculo || !campo.inicio.value) {
    campo.celda.replaceChildren(automatica);
    $('reserva-celda-hint').textContent = 'Elija la hora para ver las celdas libres.';
    return;
  }
  try {
    const celdas = await celdasDisponibles({ fecha: campo.inicio.value, tipo: vehiculo.tipo });
    campo.celda.replaceChildren(automatica, ...celdas.map((c) => opcion(String(c.idCelda), `${c.codigo} · piso ${c.piso}`)));
    campo.celda.value = preseleccion && celdas.some((c) => String(c.idCelda) === preseleccion) ? preseleccion : '';
    $('reserva-celda-hint').textContent = celdas.length ? `${celdas.length} celdas libres en esa franja.` : 'No hay celdas libres en esa franja: elija otra hora.';
  } catch (error) {
    if (error.status !== 401) $('reserva-celda-hint').textContent = error.message;
  }
}

function limitesDeFecha() {
  const ahora = new Date();
  campo.inicio.min = aLocal(new Date(ahora.getTime() + 60000));
  campo.inicio.max = aLocal(new Date(ahora.getTime() + DIAS_MAXIMOS * 86400000));
}

campo.vehiculo.addEventListener('change', () => cargarCeldas());
campo.inicio.addEventListener('change', () => cargarCeldas());

function validar() {
  limitesDeFecha();
  const valor = campo.inicio.value;
  const mensaje = !valor ? 'Indique la fecha y la hora de llegada.' : valor < campo.inicio.min ? 'La hora de inicio debe ser futura.' : valor > campo.inicio.max ? `La reserva debe ser para los próximos ${DIAS_MAXIMOS} días.` : '';
  const valido = [marcarCampo(campo.vehiculo, vehiculoElegido() ? '' : 'Elija un vehículo.'), marcarCampo(campo.inicio, mensaje)].every(Boolean);
  if (!valido) formulario.querySelector('[aria-invalid="true"]')?.focus();
  return valido;
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  if (!validar()) return;
  const datos = { idVehiculo: vehiculoElegido().idVehiculo, fechaHoraInicio: campo.inicio.value };
  if (campo.celda.value) datos.idCelda = Number(campo.celda.value);
  const boton = $('reserva-guardar');
  botonCargando(boton, true, 'Reservando…');
  try {
    const r = await reservar(datos);
    mostrarAviso(`Reserva ${r.codigo} confirmada: celda ${r.celda.codigo}, ${formatearFechaHora(r.fechaHoraInicio)}. Le enviamos el detalle por correo.`, 'success');
    campo.inicio.value = '';
    await cargarCeldas();
    cargar(1);
  } catch (error) {
    if (error.status === 401) return;
    if (error.code === 'CELDA_NO_DISPONIBLE') {
      // HU-52 E2: se muestra el motivo y se preselecciona la celda sugerida.
      const sugerida = error.details?.[0]?.sugerida;
      mostrarAlerta(alerta, `${error.message}. ${error.details?.[0]?.mensaje ?? ''}`, 'error');
      await cargarCeldas(sugerida ? String(sugerida.idCelda) : '');
    } else if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, { idVehiculo: 'reserva-vehiculo', fechaHoraInicio: 'reserva-inicio', idCelda: 'reserva-celda' });
      if (sinCampo.length) mostrarAlerta(alerta, sinCampo.join(' '), 'error');
    } else {
      // RESERVA_VEHICULO_CRUZADA, SIN_CELDAS…
      mostrarAlerta(alerta, error.message, 'error');
    }
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------- arranque
async function iniciar() {
  try {
    estado.vehiculos = (await misVehiculos()).filter((v) => v.estado === 'activo');
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
  const hay = estado.vehiculos.length > 0;
  mostrar($('sin-vehiculos'), !hay);
  mostrar($('panel-reservar'), hay && tienePermiso('reservas.crear'));
  campo.vehiculo.replaceChildren(...estado.vehiculos.map((v) => opcion(String(v.idVehiculo), `${v.placa} · ${v.tipo === 'moto' ? 'Moto' : 'Carro'} ${v.marca}`)));
  limitesDeFecha();
  cargarCeldas();
  cargar(1);
}

if (marco?.permitido) iniciar();
