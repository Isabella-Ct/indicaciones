// Página · Movimientos (caseta, HU-31..HU-35): registrar entrada con su ticket, registrar salida por placa
// o ticket, vehículos dentro con su tiempo y anulación de entradas erróneas. Aviso de pico y placa de hoy.
import { registrarEntrada, registrarSalida, listarMovimientos, anularMovimiento } from '../services/movimientos.service.js';
import { obtenerTicket } from '../services/tickets.service.js';
import { listarParqueaderos, listarPuertas } from '../services/parqueaderos.service.js';
import { listarCeldas } from '../services/celdas.service.js';
import { buscarPorPlaca } from '../services/vehiculos.service.js';
import { restriccionHoy } from '../services/restricciones.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { ponerTicket } from '../components/organismos/ticket.js';
import { abrirDialogo, cerrarDialogo } from '../components/organismos/modal.js';
import { conectarSelectorTipo } from '../components/moleculas/selector-tipo.js';
import { ponerPicoPlaca } from '../components/moleculas/aviso-pico-placa.js';
import { consultarCada } from '../components/moleculas/consulta-periodica.js';
import { conectarBusqueda } from '../components/moleculas/buscador.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerPlaca } from '../components/atomos/placa.js';
import { botonCargando } from '../components/atomos/boton.js';
import { clonar } from '../utils/plantillas.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, mostrar } from '../utils/dom.js';
import { formatearFechaHora, formatearHora, formatearDuracion } from '../utils/formato.js';
import { normalizarPlaca, placaValida, mensajeFormato } from '../utils/placa.js';

const marco = montarMarco({ permiso: 'movimientos.ver', alSalir: cerrarSesion });

const TIPO = { carro: 'Carro', moto: 'Moto' };
const puede = { registrar: tienePermiso('movimientos.crear'), anular: tienePermiso('movimientos.anular') };
/** Estado de la página: los datos viven aquí, no en el DOM. */
const estado = { sedes: [], idParqueadero: null, vehiculo: undefined, placaBuscada: '', salida: null, anulando: null, q: '' };

const sedeActual = () => estado.sedes.find((p) => p.idParqueadero === estado.idParqueadero);

function llenarSelect(select, opciones, { conVacia } = {}) {
  const vacia = conVacia ? [select.querySelector('option[value=""]') ?? clonar('tpl-opcion')] : [];
  if (conVacia) {
    vacia[0].value = '';
    vacia[0].textContent = conVacia;
  }
  select.replaceChildren(
    ...vacia,
    ...opciones.map(([valor, texto]) => {
      const opcion = clonar('tpl-opcion');
      opcion.value = String(valor);
      opcion.textContent = texto;
      return opcion;
    })
  );
}

// ---------------------------------------------------------------- entrada (HU-31, HU-32)
const formEntrada = $('form-entrada');
const campoPlaca = $('entrada-placa');
const alertaEntrada = $('entrada-alerta');
const tipoNuevo = conectarSelectorTipo($('entrada-tipo'), { onCambio: () => cargarCeldas() });

/** Tipo del vehículo: el registrado o el elegido para una placa nueva. */
const tipoActual = () => estado.vehiculo?.tipo ?? tipoNuevo.valor();

async function cargarCeldas() {
  if (!estado.idParqueadero) return;
  try {
    const { data } = await listarCeldas({ parqueadero: estado.idParqueadero, tipo: tipoActual(), estado: 'disponible' });
    llenarSelect(
      $('entrada-celda'),
      data.map((c) => [c.idCelda, `${c.codigo} · piso ${c.piso}${c.area ? ` · área ${c.area}` : ''}`]),
      { conVacia: data.length ? 'Asignar automáticamente (menor código)' : `Sin celdas disponibles para ${tipoActual()}` }
    );
  } catch {
    // Si falla, la celda se asigna automáticamente.
  }
}

/** Busca el vehículo de la placa: si existe fija su tipo; si no, pide el tipo (vehículo ocasional). */
async function buscarVehiculo() {
  const placa = normalizarPlaca(campoPlaca.value);
  campoPlaca.value = placa;
  if (placa === estado.placaBuscada) return;
  estado.placaBuscada = placa;
  estado.vehiculo = undefined;
  const pista = $('entrada-placa-hint');
  if (placa.length < 5) {
    pista.textContent = 'Escriba la placa: el sistema busca el vehículo.';
    mostrar($('entrada-tipo'), false);
    mostrar($('entrada-nuevo'), false);
    return;
  }
  try {
    const v = await buscarPorPlaca(placa);
    estado.vehiculo = v;
    pista.textContent = v
      ? `${TIPO[v.tipo]} · ${v.marca} · ${v.color} · ${v.propietario?.nombre ?? 'sin propietario'}${v.dentro ? ' · YA ESTÁ DENTRO' : ''}`
      : 'Vehículo nuevo: se registrará como ocasional (sin propietario).';
  } catch {
    estado.vehiculo = null;
    pista.textContent = 'No se pudo buscar el vehículo; indique el tipo.';
  }
  mostrar($('entrada-tipo'), !estado.vehiculo);
  mostrar($('entrada-nuevo'), !estado.vehiculo);
  cargarCeldas();
}

campoPlaca.addEventListener('input', () => {
  campoPlaca.value = campoPlaca.value.toUpperCase();
});
campoPlaca.addEventListener('change', buscarVehiculo);

function mostrarTicket(movimiento) {
  ponerTicket($('ticket-ultimo'), {
    codigo: movimiento.ticket.codigo,
    valido: movimiento.ticket.valido,
    extraviado: movimiento.ticket.extraviado,
    parqueadero: movimiento.parqueadero.nombre,
    movimiento,
  });
  $('ticket-imprimir').href = `/ticket.html?codigo=${encodeURIComponent(movimiento.ticket.codigo)}`;
  mostrar($('ticket-vacio'), false);
  mostrar($('ticket-emitido'));
}

formEntrada.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formEntrada);
  mostrarAlerta(alertaEntrada, '');
  await buscarVehiculo();
  const placa = normalizarPlaca(campoPlaca.value);
  const tipo = tipoActual();
  let valido = marcarCampo(campoPlaca, !placa ? 'Ingrese la placa.' : placaValida(placa, tipo) ? '' : mensajeFormato(tipo));
  valido = marcarCampo($('entrada-puerta'), $('entrada-puerta').value ? '' : 'Elija la puerta.') && valido;
  if (!valido) return formEntrada.querySelector('[aria-invalid="true"]')?.focus();

  const datos = { placa, idPuerta: Number($('entrada-puerta').value) };
  if ($('entrada-celda').value) datos.idCelda = Number($('entrada-celda').value);
  if (!estado.vehiculo) {
    datos.tipo = tipo;
    if ($('entrada-color').value.trim()) datos.color = $('entrada-color').value.trim();
    if ($('entrada-marca').value.trim()) datos.marca = $('entrada-marca').value.trim();
  }
  const boton = $('entrada-guardar');
  botonCargando(boton, true, 'Registrando…');
  try {
    const movimiento = await registrarEntrada(datos);
    mostrarTicket(movimiento);
    mostrarAviso(`Entrada registrada: ${movimiento.vehiculo.placa} en la celda ${movimiento.celda.codigo}`, 'success');
    formEntrada.reset();
    estado.placaBuscada = '';
    estado.vehiculo = undefined;
    mostrar($('entrada-tipo'), false);
    mostrar($('entrada-nuevo'), false);
    $('entrada-placa-hint').textContent = 'Escriba la placa: el sistema busca el vehículo.';
    campoPlaca.focus();
    cargarCeldas();
    consulta?.ahora();
  } catch (error) {
    if (error.status === 401) return;
    if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, { placa: 'entrada-placa', tipo: 'entrada-tipo-carro', idPuerta: 'entrada-puerta', idCelda: 'entrada-celda', color: 'entrada-color', marca: 'entrada-marca' });
      if (sinCampo.length) mostrarAlerta(alertaEntrada, sinCampo.join(' '), 'error');
    } else {
      // PICO_Y_PLACA (con el motivo completo), VEHICULO_DENTRO, SIN_CELDAS, CELDA_NO_DISPONIBLE, PUERTA_NO_VALIDA.
      const detalle = error.code === 'PICO_Y_PLACA' && error.details?.[0]?.mensaje ? ` ${error.details[0].mensaje}` : '';
      mostrarAlerta(alertaEntrada, `${error.message}.${detalle}`.replace('..', '.'), 'error');
    }
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------- salida (HU-33)
const formSalida = $('form-salida');
const alertaSalida = $('salida-alerta');

function mostrarSalida(m) {
  estado.salida = m;
  ponerPlaca($('salida-placa'), m.vehiculo.placa);
  $('salida-celda').textContent = `${m.celda.codigo} · piso ${m.celda.piso}`;
  $('salida-entrada').textContent = formatearFechaHora(m.fechaHoraEntrada);
  $('salida-tiempo').textContent = formatearDuracion(m.minutosTranscurridos);
  $('salida-ticket').textContent = m.ticket?.codigo ?? '—';
  limpiarErrores(formSalida);
  mostrarAlerta(alertaSalida, '');
  mostrar(formSalida);
  mostrar($('salida-resultado'), false);
  $('salida-puerta').focus();
}

$('form-buscar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const campo = $('salida-buscar');
  const texto = campo.value.trim().toUpperCase();
  marcarCampo(campo, '');
  mostrar(formSalida, false);
  if (!texto) return marcarCampo(campo, 'Escriba la placa o el código del ticket.');
  try {
    let movimiento = null;
    // Un texto que empieza por «T-» es un ticket (lector o digitado); si no, una placa.
    if (/^T-\d+$/.test(texto)) {
      const ticket = await obtenerTicket(texto);
      movimiento = ticket.movimiento.estado === 'abierto' ? ticket.movimiento : null;
      $('salida-extraviado').checked = false;
    } else {
      const { data } = await listarMovimientos({ placa: normalizarPlaca(texto), estado: 'abierto', limit: 1 });
      movimiento = data[0] ?? null;
      $('salida-extraviado').checked = true;
    }
    if (!movimiento) return marcarCampo(campo, 'El vehículo no tiene una entrada registrada');
    mostrarSalida(movimiento);
  } catch (error) {
    if (error.status === 404) marcarCampo(campo, 'El ticket no existe.');
    else if (error.status !== 401) marcarCampo(campo, error.message);
  }
});

formSalida.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formSalida);
  mostrarAlerta(alertaSalida, '');
  if (!marcarCampo($('salida-puerta'), $('salida-puerta').value ? '' : 'Elija la puerta de salida.')) return $('salida-puerta').focus();
  const boton = $('salida-guardar');
  botonCargando(boton, true, 'Registrando…');
  try {
    const m = await registrarSalida(estado.salida.idMovimiento, {
      idPuerta: Number($('salida-puerta').value),
      ticketExtraviado: $('salida-extraviado').checked,
    });
    mostrar(formSalida, false);
    // La liquidación (valor a pagar) la agrega la spec 009; aquí se informa el tiempo de estadía.
    $('salida-resultado').querySelector('p').textContent =
      `Salida registrada: ${m.vehiculo.placa} · ${formatearDuracion(m.minutosEstadia)} de estadía (${m.minutosEstadia} min). La celda ${m.celda.codigo} quedó disponible.`;
    mostrar($('salida-resultado'));
    $('salida-buscar').value = '';
    $('salida-buscar').focus();
    cargarCeldas();
    consulta?.ahora();
  } catch (error) {
    if (error.status === 401) return;
    if (error.code === 'VALIDACION') pintarErroresApi(error, { idPuerta: 'salida-puerta' });
    else mostrarAlerta(alertaSalida, error.message, 'error');
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------- vehículos dentro (HU-34)
const tablaDentro = conectarTabla($('tabla-dentro'), {
  plantilla: 'tpl-dentro',
  idDe: (m) => m.idMovimiento,
  rellenar(fila, m) {
    fila.classList.toggle('organism-log-table-row--alert', m.masDe24h);
    ponerPlaca(fila.querySelector('.js-placa'), m.vehiculo.placa);
    fila.querySelector('.js-tipo').textContent = TIPO[m.vehiculo.tipo];
    fila.querySelector('.js-celda').textContent = m.celda.codigo;
    fila.querySelector('.js-entrada').textContent = formatearFechaHora(m.fechaHoraEntrada);
    fila.querySelector('.js-tiempo').textContent = formatearDuracion(m.minutosTranscurridos);
    fila.querySelector('.js-alerta').classList.toggle('hidden', !m.masDe24h);
    const ticket = fila.querySelector('.js-ticket');
    ticket.href = `/ticket.html?codigo=${encodeURIComponent(m.ticket?.codigo ?? '')}`;
    ticket.setAttribute('aria-label', `Ver el ticket de ${m.vehiculo.placa}`);
    const salida = fila.querySelector('.js-salida');
    salida.classList.toggle('hidden', !puede.registrar);
    salida.setAttribute('aria-label', `Registrar la salida de ${m.vehiculo.placa}`);
    salida.addEventListener('click', () => {
      $('salida-buscar').value = m.vehiculo.placa;
      $('salida-extraviado').checked = false;
      mostrarSalida(m);
      $('salida-titulo').scrollIntoView({ block: 'start' });
    });
    const anular = fila.querySelector('.js-anular');
    anular.classList.toggle('hidden', !puede.anular);
    anular.setAttribute('aria-label', `Anular la entrada de ${m.vehiculo.placa}`);
    anular.addEventListener('click', () => abrirAnulacion(m, anular));
  },
});

async function cargarDentro() {
  try {
    const { data } = await listarMovimientos({ estado: 'abierto', q: estado.q || undefined });
    tablaDentro.pintar(data.filter((m) => m.parqueadero.idParqueadero === estado.idParqueadero || estado.sedes.length <= 1));
    $('dentro-actualizado').textContent = `Actualizado a las ${formatearHora(new Date())}`;
  } catch (error) {
    if (error.status !== 401) $('dentro-actualizado').textContent = error.message;
  }
}

conectarBusqueda($('dentro-buscar'), (q) => {
  estado.q = q;
  cargarDentro();
});

// ---------------------------------------------------------------- anulación (HU-35)
const dialogoAnular = $('dialogo-anular');
const campoMotivo = $('anular-motivo');

function abrirAnulacion(m, origen) {
  estado.anulando = m;
  limpiarErrores($('form-anular'));
  mostrarAlerta($('anular-alerta'), '');
  $('dialogo-anular-titulo').textContent = `Anular entrada · ${m.vehiculo.placa}`;
  campoMotivo.value = '';
  abrirDialogo(dialogoAnular, { origen, foco: campoMotivo });
}

$('form-anular').addEventListener('submit', async (e) => {
  e.preventDefault();
  const motivo = campoMotivo.value.trim();
  if (!marcarCampo(campoMotivo, motivo.length < 10 || motivo.length > 200 ? 'El motivo debe tener entre 10 y 200 caracteres.' : '')) return campoMotivo.focus();
  const boton = $('anular-guardar');
  botonCargando(boton, true, 'Anulando…');
  try {
    await anularMovimiento(estado.anulando.idMovimiento, motivo);
    mostrarAviso(`Entrada de ${estado.anulando.vehiculo.placa} anulada`, 'success');
    cerrarDialogo(dialogoAnular);
    cargarCeldas();
    consulta?.ahora();
  } catch (error) {
    if (error.status === 401) return;
    if (error.code === 'VALIDACION') pintarErroresApi(error, { motivo: 'anular-motivo' });
    // SOLO_ADMIN_ANULA, MOVIMIENTO_NO_ANULABLE…
    else mostrarAlerta($('anular-alerta'), error.message, 'error');
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------- sede, puertas y arranque
async function elegirSede(idParqueadero) {
  estado.idParqueadero = idParqueadero;
  $('movimientos-subtitulo').textContent = `// Caseta · ${sedeActual()?.nombre ?? ''} · hora del servidor`;
  try {
    const [entrada, salida] = await Promise.all([listarPuertas(idParqueadero, { uso: 'entrada', estado: 'activo' }), listarPuertas(idParqueadero, { uso: 'salida', estado: 'activo' })]);
    llenarSelect($('entrada-puerta'), entrada.map((p) => [p.idPuerta, p.nombre]));
    llenarSelect($('salida-puerta'), salida.map((p) => [p.idPuerta, p.nombre]));
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
  cargarCeldas();
  consulta?.ahora();
}

$('sede').addEventListener('change', (e) => elegirSede(Number(e.target.value)));

let consulta = null;

async function iniciar() {
  mostrar(formEntrada, puede.registrar);
  mostrar($('form-buscar'), puede.registrar);
  try {
    ponerPicoPlaca($('pico-placa-hoy'), await restriccionHoy());
  } catch {
    // El aviso es informativo.
  }
  try {
    estado.sedes = (await listarParqueaderos({ estado: 'activo', limit: 100 })).data;
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
    return;
  }
  llenarSelect($('sede'), estado.sedes.map((p) => [p.idParqueadero, p.nombre]));
  mostrar($('sede-campo'), estado.sedes.length > 1);
  if (estado.sedes[0]) await elegirSede(estado.sedes[0].idParqueadero);
  consulta = consultarCada(cargarDentro, 10000);
}

if (marco?.permitido) iniciar();
