// Página · Reservas (HU-54): las reservas de una fecha (hoy por defecto) ordenadas por hora, con filtro por estado
// y búsqueda; el personal puede cancelar las confirmadas que no han iniciado (HU-53).
import { listarReservas, cancelarReserva } from '../services/reservas.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { confirmar } from '../components/organismos/modal.js';
import { conectarBusqueda } from '../components/moleculas/buscador.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChipReserva } from '../components/atomos/chip-estado.js';
import { ponerPlaca } from '../components/atomos/placa.js';
import { tienePermiso } from '../utils/sesion.js';
import { $ } from '../utils/dom.js';
import { formatearFechaHora } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'reservas.ver', alSalir: cerrarSesion });

const puedeCancelar = tienePermiso('reservas.editar');
/** Estado de la página: página actual y filtros. */
const estado = { page: 1, filtros: { fecha: '', estado: '', q: '' } };

/** '2026-11-28T08:00:00-05:00' → '08:00'. */
const hora = (iso) => formatearFechaHora(iso).slice(11);

async function cancelar(r, origen) {
  const acepta = await confirmar({
    titulo: `Cancelar la reserva ${r.codigo}`,
    mensaje: `${r.vehiculo.placa} · celda ${r.celda.codigo} · ${formatearFechaHora(r.fechaHoraInicio)}. Se avisará al cliente.`,
    textoConfirmar: 'Cancelar reserva',
    origen,
  });
  if (!acepta) return;
  try {
    await cancelarReserva(r.idReserva);
    mostrarAviso(`Reserva ${r.codigo} cancelada`, 'success');
    cargar();
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
}

const tabla = conectarTabla($('tabla-reservas'), {
  plantilla: 'tpl-reserva',
  idDe: (r) => r.idReserva,
  onPagina: (pagina) => cargar(pagina),
  rellenar(fila, r) {
    fila.querySelector('.js-codigo').textContent = r.codigo;
    fila.querySelector('.js-hora').textContent = `${hora(r.fechaHoraInicio)} – ${hora(r.finEspera)}`;
    ponerPlaca(fila.querySelector('.js-placa'), r.vehiculo.placa);
    fila.querySelector('.js-cliente').textContent = r.cliente.nombre;
    fila.querySelector('.js-documento').textContent = `${r.cliente.tipoDocumento} ${r.cliente.numeroDocumento}`;
    fila.querySelector('.js-celda').textContent = r.celda.codigo;
    fila.querySelector('.js-parqueadero').textContent = r.celda.parqueadero;
    ponerChipReserva(fila.querySelector('.js-estado'), r.estado);
    const boton = fila.querySelector('.js-cancelar');
    const cancelable = r.estado === 'confirmada' && new Date(r.fechaHoraInicio) > new Date();
    boton.classList.toggle('hidden', !puedeCancelar || !cancelable);
    boton.setAttribute('aria-label', `Cancelar la reserva ${r.codigo}`);
    boton.addEventListener('click', () => cancelar(r, boton));
  },
});

async function cargar(page = estado.page) {
  estado.page = page;
  tabla.cargando(true);
  try {
    const { data, meta } = await listarReservas({ ...estado.filtros, fecha: estado.filtros.fecha || undefined, page });
    $('reservas-dia').textContent = meta.fecha.split('-').reverse().join('/');
    if (!estado.filtros.fecha) $('filtro-fecha').value = meta.fecha;
    tabla.pintar(data, meta);
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
    tabla.pintar([]);
  } finally {
    tabla.cargando(false);
  }
}

$('filtro-fecha').addEventListener('change', (e) => {
  estado.filtros.fecha = e.target.value;
  cargar(1);
});
$('filtro-estado').addEventListener('change', (e) => {
  estado.filtros.estado = e.target.value;
  cargar(1);
});
conectarBusqueda($('filtro-texto'), (texto) => {
  estado.filtros.q = texto;
  cargar(1);
});

if (marco?.permitido) cargar(1);
