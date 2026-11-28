// Página · Incidencias (HU-56, HU-57): listado con búsqueda por código o placa y filtros por tipo, estado y fechas,
// y «Nueva incidencia» con tipo, placa (registrada u ocasional), fecha y hora del evento, descripción y evidencia.
import { listarIncidencias, registrarIncidencia } from '../services/incidencias.service.js';
import { buscarPorPlaca } from '../services/vehiculos.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { abrirDialogo, cerrarDialogo } from '../components/organismos/modal.js';
import { conectarEvidencia } from '../components/moleculas/evidencia.js';
import { conectarBusqueda } from '../components/moleculas/buscador.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChipIncidencia } from '../components/atomos/chip-estado.js';
import { ponerPlaca } from '../components/atomos/placa.js';
import { botonCargando } from '../components/atomos/boton.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, mostrar } from '../utils/dom.js';
import { formatearFechaHora } from '../utils/formato.js';
import { normalizarPlaca } from '../utils/placa.js';

const marco = montarMarco({ permiso: 'incidencias.ver', alSalir: cerrarSesion });

/** Estado de la página: página y filtros del listado y si la placa escrita está registrada. */
const estado = { page: 1, filtros: { q: '', tipo: '', estado: '', desde: '', hasta: '' }, placaRegistrada: null };

/** Date → valor de <input type="datetime-local"> en la hora local del navegador (Bogotá). */
const aLocal = (fecha) => new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

// ---------------------------------------------------------------- listado (HU-57 E1)
const tabla = conectarTabla($('tabla-incidencias'), {
  plantilla: 'tpl-incidencia',
  idDe: (i) => i.idIncidencia,
  onPagina: (pagina) => cargar(pagina),
  rellenar(fila, i) {
    fila.querySelector('.js-codigo').textContent = i.codigo;
    fila.querySelector('.js-tipo').textContent = i.tipoNombre;
    fila.querySelector('.js-fecha').textContent = formatearFechaHora(i.fechaHoraEvento);
    ponerPlaca(fila.querySelector('.js-placa'), i.vehiculo.placa);
    fila.querySelector('.js-celda').textContent = i.celda?.codigo ?? '—';
    fila.querySelector('.js-operador').textContent = i.operador.nombre;
    ponerChipIncidencia(fila.querySelector('.js-estado'), i.estado);
    const enlace = fila.querySelector('.js-detalle');
    enlace.href = `/incidencia.html?id=${i.idIncidencia}`;
    enlace.setAttribute('aria-label', `Ver el detalle de la incidencia ${i.codigo}`);
  },
});

async function cargar(page = estado.page) {
  estado.page = page;
  tabla.cargando(true);
  try {
    const filtros = Object.fromEntries(Object.entries(estado.filtros).map(([k, v]) => [k, v || undefined]));
    const { data, meta } = await listarIncidencias({ ...filtros, page });
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
  ['filtro-tipo', 'tipo'],
  ['filtro-estado', 'estado'],
  ['filtro-desde', 'desde'],
  ['filtro-hasta', 'hasta'],
]) {
  $(id).addEventListener('change', (e) => {
    estado.filtros[clave] = e.target.value;
    cargar(1);
  });
}

// ---------------------------------------------------------------- nueva incidencia (HU-56)
const dialogo = $('dialogo-incidencia');
const formulario = $('form-incidencia');
const alerta = $('incidencia-alerta');
const evidencia = conectarEvidencia($('incidencia-evidencia-campo'));
const campo = {
  tipo: $('incidencia-tipo'),
  placa: $('incidencia-placa'),
  tipoVehiculo: $('incidencia-tipo-vehiculo'),
  fecha: $('incidencia-fecha'),
  descripcion: $('incidencia-descripcion'),
};

function contarDescripcion() {
  $('incidencia-descripcion-hint').textContent = `${campo.descripcion.value.trim().length} de 500 caracteres (mínimo 10).`;
}
campo.descripcion.addEventListener('input', contarDescripcion);

/** Busca la placa: si no está registrada, pide el tipo de vehículo (se registra como ocasional). */
async function revisarPlaca() {
  const placa = normalizarPlaca(campo.placa.value);
  campo.placa.value = placa;
  if (placa.length < 5) return;
  try {
    const vehiculo = tienePermiso('vehiculos.ver') ? await buscarPorPlaca(placa) : null;
    estado.placaRegistrada = Boolean(vehiculo);
    $('incidencia-placa-hint').textContent = vehiculo ? `Registrada: ${vehiculo.tipo === 'moto' ? 'moto' : 'carro'} ${vehiculo.marca}.` : 'No está registrada: se registrará como ocasional.';
    mostrar($('incidencia-tipo-vehiculo-campo'), !vehiculo);
  } catch (error) {
    if (error.status !== 401) $('incidencia-placa-hint').textContent = error.message;
  }
}
campo.placa.addEventListener('change', revisarPlaca);

function abrirFormulario(origen) {
  formulario.reset();
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  evidencia.limpiar();
  estado.placaRegistrada = null;
  mostrar($('incidencia-tipo-vehiculo-campo'), false);
  $('incidencia-placa-hint').textContent = 'Registrada u ocasional.';
  const ahora = new Date();
  campo.fecha.max = aLocal(ahora);
  campo.fecha.value = aLocal(ahora);
  contarDescripcion();
  abrirDialogo(dialogo, { origen, foco: campo.tipo });
}

function validar() {
  campo.fecha.max = aLocal(new Date());
  const descripcion = campo.descripcion.value.trim();
  const reglas = [
    [campo.tipo, campo.tipo.value ? '' : 'Seleccione el tipo de incidencia.'],
    [campo.placa, normalizarPlaca(campo.placa.value).length >= 5 ? '' : 'Ingrese la placa del vehículo afectado.'],
    [campo.fecha, !campo.fecha.value ? 'Indique la fecha y hora del evento.' : campo.fecha.value > campo.fecha.max ? 'La fecha y hora del evento no puede ser futura.' : ''],
    [campo.descripcion, descripcion.length < 10 || descripcion.length > 500 ? 'La descripción debe tener entre 10 y 500 caracteres.' : ''],
  ];
  const valido = reglas.map(([control, mensaje]) => marcarCampo(control, mensaje)).every(Boolean) && evidencia.validar();
  if (!valido) formulario.querySelector('[aria-invalid="true"]')?.focus();
  return valido;
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  if (!validar()) return;
  const datos = {
    tipo: campo.tipo.value,
    placa: normalizarPlaca(campo.placa.value),
    fechaHoraEvento: campo.fecha.value,
    descripcion: campo.descripcion.value.trim(),
  };
  if (estado.placaRegistrada === false) datos.tipoVehiculo = campo.tipoVehiculo.value;
  const boton = $('incidencia-guardar');
  botonCargando(boton, true, 'Registrando…');
  try {
    const incidencia = await registrarIncidencia(datos, evidencia.archivo());
    cerrarDialogo(dialogo);
    mostrarAviso(`Incidencia ${incidencia.codigo} registrada: se alertó al Administrador`, 'success');
    cargar(1);
  } catch (error) {
    if (error.status === 401) return;
    if (error.code === 'VALIDACION') {
      // Placa nueva sin tipo: se muestra el campo para elegirlo.
      if (error.details?.some((d) => d.campo === 'tipoVehiculo')) mostrar($('incidencia-tipo-vehiculo-campo'), true);
      const sinCampo = pintarErroresApi(error, {
        tipo: 'incidencia-tipo',
        placa: 'incidencia-placa',
        tipoVehiculo: 'incidencia-tipo-vehiculo',
        fechaHoraEvento: 'incidencia-fecha',
        descripcion: 'incidencia-descripcion',
        evidencia: 'incidencia-evidencia',
      });
      if (sinCampo.length) mostrarAlerta(alerta, sinCampo.join(' '), 'error');
    } else {
      mostrarAlerta(alerta, error.message, 'error');
    }
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------- arranque
if (marco?.permitido) {
  mostrar($('accion-nueva'), tienePermiso('incidencias.crear'));
  $('accion-nueva').addEventListener('click', (e) => abrirFormulario(e.currentTarget));
  cargar(1);
}
