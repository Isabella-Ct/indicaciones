/**
 * Reservas (admin/operador) — REQ-RES-1: todas las reservas con filtros y cancelación, y
 * "Nueva reserva" para el vehículo de un cliente.
 * Las activas muestran cuánto les queda; la lista se refresca sola cada 30 s.
 * HTML en app/reservas.html.
 */
import { montarMarco } from './comun/marco-app.js';
import { abrirModal, cerrarModal, confirmar, mostrarAviso } from './comun/dialogos.js';
import {
  llenarSelect,
  ponerChip,
  marcarCampo,
  mostrarAlerta,
  botonCargando,
} from './comun/plantillas.js';
import { conectarTabla, conectarBusqueda, ponerKpi } from './comun/tablas.js';
import { listarReservas, cancelarReserva, crearReserva } from '../services/reservas.service.js';
import { obtenerVehiculoPorPlaca } from '../services/vehiculos.service.js';
import { listarCeldas } from '../services/celdas.service.js';
import { tienePermiso } from '../utils/sesion.js';
import { normalizarPlaca, formatearPlaca } from '../utils/placa.js';
import { formatearFechaHora, formatearHora } from '../utils/formato.js';

const $ = (id) => document.getElementById(id);
const ESTADOS = {
  pendiente: ['Pendiente', 'reserved'],
  confirmada: ['Activa', 'reserved'],
  cumplida: ['Cumplida', 'free'],
  cancelada: ['Cancelada', 'neutral'],
  expirada: ['Expirada', 'out'],
};
const filtros = {
  estado: '',
  activas: '1',
  placa: '',
  desde: '',
  hasta: '',
  pagina: 1,
  limite: 20,
};
let cargando = false;

const restante = (r) => {
  const s = Math.max(0, Math.round((new Date(r.fecha_hora_expiracion) - Date.now()) / 1000));
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
};

const tabla = conectarTabla($('tabla-reservas'), {
  plantilla: 'tpl-reserva',
  rellenar: (fila, r) => {
    const [titular, vehiculo, celda, creada, vence, chip, acciones] = fila.cells;
    const [nombre, documento] = titular.firstElementChild.children;
    nombre.textContent = r.titular.nombre_completo;
    documento.textContent = `${r.titular.tipo_documento} ${r.titular.numero_documento}`;
    vehiculo.firstElementChild.textContent = formatearPlaca(r.vehiculo.placa);
    const [codigo, piso] = celda.firstElementChild.children;
    codigo.textContent = r.celda.codigo;
    piso.textContent = r.celda.piso;
    creada.firstElementChild.textContent = formatearFechaHora(r.fecha_hora_reserva);
    const [hora, queda] = vence.firstElementChild.children;
    hora.textContent = formatearFechaHora(r.fecha_hora_expiracion);
    queda.textContent = r.activa ? `quedan ${restante(r)}` : '';
    const [texto, variante] = ESTADOS[r.estado];
    ponerChip(chip.firstElementChild, texto, variante);
    const [boton, ticket] = acciones.children;
    boton.classList.toggle('hidden', !r.activa);
    boton.addEventListener('click', () => cancelar(r, boton));
    ticket.textContent = !r.activa && r.estadia ? r.estadia.codigo_ticket : '';
  },
  onPagina: (pagina) => {
    filtros.pagina = pagina;
    recargar();
  },
});

async function cancelar(r, origen) {
  const ok = await confirmar({
    titulo: `Cancelar la reserva de ${r.vehiculo.placa}`,
    mensaje: `${r.titular.nombre_completo} · celda ${r.celda.codigo}. La celda queda libre.`,
    textoConfirmar: 'Cancelar reserva',
    origen,
  });
  if (!ok) return;
  try {
    await cancelarReserva(r.id);
    mostrarAviso('Reserva cancelada.', 'success');
    await recargar();
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
}

async function recargar() {
  cargando = true;
  tabla.cargando(true);
  try {
    const { data, meta } = await listarReservas(filtros);
    const activas = data.filter((r) => r.activa);
    ponerKpi('kpi-reservas', {
      titulo: filtros.activas ? 'Reservas activas' : 'Reservas',
      valor: meta.total,
      nota: 'con los filtros aplicados',
    });
    ponerKpi('kpi-proxima', {
      valor: activas.length
        ? formatearHora(activas.map((r) => r.fecha_hora_expiracion).sort()[0])
        : '—',
      nota: activas.length
        ? `celda ${[...activas].sort((a, b) => a.segundos_restantes - b.segundos_restantes)[0].celda.codigo}`
        : 'Ninguna activa',
    });
    tabla.pintar(data, { meta });
  } catch (error) {
    mostrarAviso(error.message, 'error');
  } finally {
    cargando = false;
    tabla.cargando(false);
  }
}

function aplicar(cambios) {
  Object.assign(filtros, cambios, { pagina: 1 });
  recargar();
}

// ---------------------------------------------------------------- nueva reserva (personal)
/** El personal reserva para el vehículo de un cliente (el dueño la ve en su portal). */
const nueva = { vehiculo: null };
const placa = $('reserva-placa');
const celda = $('reserva-celda');
const alerta = $('reserva-alerta');
const guardar = $('reserva-guardar');

function reiniciarNueva() {
  nueva.vehiculo = null;
  placa.value = '';
  $('reserva-vehiculo').textContent = '';
  llenarSelect(celda, { opciones: [{ value: '', label: 'Busca primero el vehículo' }] });
  celda.disabled = true;
  guardar.disabled = true;
  $('reserva-accesible').checked = false;
  marcarCampo(placa, '');
  marcarCampo(celda, '');
  mostrarAlerta(alerta, '');
}

async function buscarVehiculo() {
  marcarCampo(placa, '');
  marcarCampo(celda, '');
  mostrarAlerta(alerta, '');
  nueva.vehiculo = null;
  guardar.disabled = true;
  celda.disabled = true;
  $('reserva-vehiculo').textContent = '';
  const valor = normalizarPlaca(placa.value);
  if (!valor) return marcarCampo(placa, 'Escribe la placa.');
  try {
    const v = await obtenerVehiculoPorPlaca(valor);
    if (!v.propietario) {
      return marcarCampo(placa, `${v.placa} es de un visitante: solo se reserva para clientes.`);
    }
    const libres = await listarCeldas({ tipo: v.tipo, estado: 'disponible' });
    nueva.vehiculo = v;
    $('reserva-vehiculo').textContent =
      `${v.marca} ${v.modelo} · ${v.tipo === 'moto' ? 'Moto' : 'Carro'} · ${v.propietario.nombre_completo} (${v.propietario.tipo_documento} ${v.propietario.numero_documento})`;
    llenarSelect(celda, {
      opciones: libres.length
        ? libres.map((c) => ({
            value: String(c.id),
            label: `${c.codigo} · ${c.piso.nombre}${c.es_accesible ? ' · accesible' : ''}`,
          }))
        : [{ value: '', label: `No hay celdas libres de ${v.tipo}` }],
    });
    celda.disabled = libres.length === 0;
    guardar.disabled = libres.length === 0;
  } catch (error) {
    marcarCampo(placa, error.estado === 404 ? 'No hay un vehículo con esa placa.' : error.message);
  }
}

$('reserva-buscar').addEventListener('click', buscarVehiculo);
placa.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    buscarVehiculo();
  }
});

$('form-reserva').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!nueva.vehiculo || !celda.value) return;
  botonCargando(guardar, true, 'Reservando…');
  try {
    const r = await crearReserva({
      vehiculo_id: nueva.vehiculo.id,
      celda_id: Number(celda.value),
      requiere_accesible: $('reserva-accesible').checked,
    });
    cerrarModal($('modal-reserva'));
    mostrarAviso(
      `Celda ${r.celda.codigo} reservada para ${r.vehiculo.placa} hasta las ${formatearHora(r.fecha_hora_expiracion)}.`,
      'success'
    );
    await recargar();
  } catch (error) {
    const campos = { vehiculo_id: placa, celda_id: celda };
    for (const d of error.detalles ?? [])
      if (campos[d.campo]) marcarCampo(campos[d.campo], d.mensaje);
    mostrarAlerta(alerta, error.message);
  } finally {
    botonCargando(guardar, false);
    guardar.disabled = !nueva.vehiculo || !celda.value;
  }
});

async function iniciar() {
  const app = await montarMarco({ paginaId: 'reservas' });
  if (!app) return;
  if (tienePermiso(app.sesion, 'reservas.crear')) {
    $('pagina-acciones').classList.remove('hidden');
    $('accion-nueva').classList.remove('hidden');
    $('accion-nueva').addEventListener('click', (e) => {
      reiniciarNueva();
      abrirModal($('modal-reserva'), { origen: e.currentTarget, foco: placa });
    });
  }
  $('filtro-estado').value = 'activas';
  $('filtro-estado').addEventListener('change', (e) =>
    aplicar(
      e.target.value === 'activas'
        ? { activas: '1', estado: '' }
        : { activas: '', estado: e.target.value }
    )
  );
  conectarBusqueda($('filtro-placa'), (valor) => aplicar({ placa: valor }), {
    transform: normalizarPlaca,
  });
  $('filtro-desde').addEventListener('change', (e) => aplicar({ desde: e.target.value }));
  $('filtro-hasta').addEventListener('change', (e) => aplicar({ hasta: e.target.value }));
  await recargar();
  setInterval(() => {
    if (!cargando) recargar();
  }, 30 * 1000);
}

iniciar();
