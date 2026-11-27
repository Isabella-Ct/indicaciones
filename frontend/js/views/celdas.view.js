// Página · Celdas (HU-20..HU-23): mapa por piso y área con su estado, que se refresca cada 10 s
// (RF-CLD-21); detalle con el vehículo (solo personal); nueva celda, por rango, editar,
// inhabilitar y habilitar.
import { listarParqueaderos } from '../services/parqueaderos.service.js';
import {
  listarCeldas,
  crearCelda,
  crearLoteCeldas,
  actualizarCelda,
  cambiarEstadoCelda,
} from '../services/celdas.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarMapa } from '../components/organismos/mapa-celdas.js';
import { abrirDialogo, cerrarDialogo, confirmar } from '../components/organismos/modal.js';
import { conectarPestanas } from '../components/moleculas/pestanas.js';
import { consultarCada } from '../components/moleculas/consulta-periodica.js';
import { ponerKpi } from '../components/moleculas/kpi.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChipCelda } from '../components/atomos/chip-estado.js';
import { botonCargando } from '../components/atomos/boton.js';
import { clonar } from '../utils/plantillas.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, parametro, mostrar } from '../utils/dom.js';
import { formatearFechaHora, formatearHora, plural, texto } from '../utils/formato.js';

const marco = montarMarco({ permiso: ['celdas.ver', 'movimientos.ver'], alSalir: cerrarSesion });

const TIPO = { carro: 'Carro', moto: 'Moto' };
const puede = {
  crear: tienePermiso('celdas.crear'),
  editar: tienePermiso('celdas.editar'),
  cambiarEstado: tienePermiso('celdas.cambiar_estado'),
};
/** Estado de la página: los datos de cada celda viven aquí, no en atributos del DOM. */
const estado = { parqueaderos: [], idParqueadero: null, piso: 1, tipo: '', filtroEstado: '', celdas: [], seleccion: null };

const parqueaderoActual = () => estado.parqueaderos.find((p) => p.idParqueadero === estado.idParqueadero);
const celdaSeleccionada = () => estado.celdas.find((c) => c.idCelda === estado.seleccion) ?? null;

// ---------------------------------------------------------------- mapa y pisos (HU-22)
const mapa = conectarMapa($('mapa'), {
  onSeleccionar(id) {
    estado.seleccion = id;
    pintarDetalle();
  },
});

const pestanas = conectarPestanas($('pisos'), {
  plantilla: 'tpl-piso',
  onCambio(valor) {
    estado.piso = Number(valor);
    estado.seleccion = null;
    mapa.limpiar();
    pintarDetalle();
    consulta?.ahora();
  },
});

function pintarPisos() {
  const p = parqueaderoActual();
  const opciones = Array.from({ length: p?.pisos ?? 0 }, (_, i) => ({ valor: String(i + 1), texto: `Piso ${i + 1}` }));
  estado.piso = Number(pestanas.pintar(opciones, String(estado.piso)) ?? 1);
}

function pintarKpis(celdas) {
  const cuenta = (e) => celdas.filter((c) => c.estado === e).length;
  const habilitadas = celdas.length - cuenta('inhabilitada');
  const libres = cuenta('disponible');
  ponerKpi($('kpi-libres'), {
    valor: String(libres),
    nota: `de ${plural(habilitadas, 'celda habilitada', 'celdas habilitadas')}`,
    medidor: habilitadas ? (libres / habilitadas) * 100 : 0,
  });
  ponerKpi($('kpi-ocupadas'), { valor: String(cuenta('ocupada')), nota: 'con un vehículo dentro' });
  ponerKpi($('kpi-reservadas'), { valor: String(cuenta('reservada')), nota: 'reservas y mensualidades' });
  ponerKpi($('kpi-inhabilitadas'), { valor: String(cuenta('inhabilitada')), nota: 'fuera de servicio' });
}

async function consultarMapa() {
  if (!estado.idParqueadero) return;
  try {
    const { data, meta } = await listarCeldas({ parqueadero: estado.idParqueadero, piso: estado.piso, tipo: estado.tipo });
    estado.celdas = data;
    pintarKpis(data);
    const visibles = estado.filtroEstado ? data.filter((c) => c.estado === estado.filtroEstado) : data;
    const ocupadas = data.filter((c) => c.estado === 'ocupada').length;
    mapa.pintar(visibles, {
      titulo: `Piso ${estado.piso}${estado.tipo ? ` · ${TIPO[estado.tipo]}s` : ''}`,
      conteo: `${ocupadas} ocupadas de ${meta?.total ?? data.length}`,
    });
    $('mapa-actualizado').textContent = `Actualizado a las ${formatearHora(new Date())}`;
    pintarDetalle();
  } catch (error) {
    if (error.status !== 401 && error.status !== 403) $('mapa-actualizado').textContent = error.message;
    throw error;
  }
}

// ---------------------------------------------------------------- detalle de la celda (HU-22 E3)
function pintarDetalle() {
  const celda = celdaSeleccionada();
  mostrar($('detalle-vacio'), !celda);
  mostrar($('detalle-celda'), Boolean(celda));
  if (!celda) return;
  $('detalle-ubicacion').textContent = `Piso ${celda.piso} · ${TIPO[celda.tipoVehiculo]}`;
  $('detalle-codigo').textContent = celda.codigo;
  ponerChipCelda($('detalle-estado'), celda.estado);
  $('detalle-tipo').textContent = TIPO[celda.tipoVehiculo];
  $('detalle-area').textContent = texto(celda.area);

  const ocupante = celda.ocupante;
  mostrar($('detalle-vehiculo'), Boolean(ocupante));
  mostrar($('detalle-entrada-fila'), Boolean(ocupante));
  if (ocupante) {
    $('detalle-placa').textContent = ocupante.placa;
    $('detalle-tipo-vehiculo').textContent = TIPO[ocupante.tipo] ?? ocupante.tipo;
    $('detalle-entrada').textContent = formatearFechaHora(ocupante.fechaHoraEntrada);
  }
  mostrar($('detalle-motivo-fila'), celda.estado === 'inhabilitada');
  $('detalle-motivo').textContent = texto(celda.motivoInhabilitacion);

  const activo = parqueaderoActual()?.estado === 'activo';
  mostrar($('detalle-inhabilitar'), puede.cambiarEstado && celda.estado === 'disponible');
  mostrar($('detalle-habilitar'), puede.cambiarEstado && celda.estado === 'inhabilitada' && activo);
  mostrar($('detalle-editar'), puede.editar && celda.estado !== 'ocupada');
}

$('detalle-cerrar').addEventListener('click', () => {
  estado.seleccion = null;
  mapa.limpiar();
  pintarDetalle();
});

// ---------------------------------------------------------------- filtros
$('filtro-parqueadero').addEventListener('change', (e) => {
  estado.idParqueadero = Number(e.target.value);
  estado.piso = 1;
  estado.seleccion = null;
  pintarPisos();
  actualizarAcciones();
  consulta?.ahora();
});
$('filtro-tipo').addEventListener('change', (e) => {
  estado.tipo = e.target.value;
  consulta?.ahora();
});
$('filtro-estado').addEventListener('change', (e) => {
  estado.filtroEstado = e.target.value;
  consulta?.ahora();
});

function actualizarAcciones() {
  const activo = parqueaderoActual()?.estado === 'activo';
  mostrar($('accion-nueva'), puede.crear && activo);
  mostrar($('accion-lote'), puede.crear && activo);
  const p = parqueaderoActual();
  $('celdas-subtitulo').textContent = p
    ? `// ${p.nombre}${activo ? '' : ' (inactivo)'} · se actualiza cada 10 segundos`
    : '// No hay parqueaderos registrados';
}

// ---------------------------------------------------------------- nueva / editar celda (HU-20, HU-21 E5)
const dialogoCelda = $('dialogo-celda');
const formCelda = $('form-celda');
const campoCelda = { codigo: $('celda-codigo'), tipo: $('celda-tipo'), piso: $('celda-piso'), area: $('celda-area') };
const alertaCelda = $('celda-alerta');
let editando = null;

function abrirCelda(celda, origen) {
  editando = celda;
  limpiarErrores(formCelda);
  mostrarAlerta(alertaCelda, '');
  $('dialogo-celda-titulo').textContent = celda ? `Editar celda · ${celda.codigo}` : 'Nueva celda';
  campoCelda.codigo.value = celda?.codigo ?? '';
  campoCelda.tipo.value = celda?.tipoVehiculo ?? (estado.tipo || 'carro');
  campoCelda.piso.value = String(celda?.piso ?? estado.piso);
  campoCelda.piso.max = String(parqueaderoActual()?.pisos ?? 1);
  campoCelda.area.value = celda?.area ?? '';
  abrirDialogo(dialogoCelda, { origen, foco: campoCelda.codigo });
}

function pisoValido(control) {
  const piso = Number(control.value);
  const maximo = parqueaderoActual()?.pisos ?? 1;
  return marcarCampo(control, !Number.isInteger(piso) || piso < 1 || piso > maximo ? `El parqueadero tiene ${maximo} pisos.` : '');
}

formCelda.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formCelda);
  mostrarAlerta(alertaCelda, '');
  const codigo = campoCelda.codigo.value.trim().toUpperCase();
  let valido = marcarCampo(campoCelda.codigo, /^[A-Z0-9-]{1,10}$/.test(codigo) ? '' : 'Use de 1 a 10 letras, dígitos o guiones.');
  valido = pisoValido(campoCelda.piso) && valido;
  if (!valido) return formCelda.querySelector('[aria-invalid="true"]')?.focus();
  const datos = { codigo, tipoVehiculo: campoCelda.tipo.value, piso: Number(campoCelda.piso.value), area: campoCelda.area.value.trim() || null };
  const boton = $('celda-guardar');
  botonCargando(boton, true, 'Guardando…');
  try {
    if (editando) await actualizarCelda(editando.idCelda, datos);
    else await crearCelda({ idParqueadero: estado.idParqueadero, ...datos });
    mostrarAviso(editando ? 'Celda actualizada' : `Celda ${codigo} creada`, 'success');
    cerrarDialogo(dialogoCelda);
    consulta?.ahora();
  } catch (error) {
    if (error.code === 'CELDA_DUPLICADA') marcarCampo(campoCelda.codigo, error.message);
    else if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, { codigo: 'celda-codigo', tipoVehiculo: 'celda-tipo', piso: 'celda-piso', area: 'celda-area' });
      if (sinCampo.length) mostrarAlerta(alertaCelda, sinCampo.join(' '), 'error');
    } else if (error.status !== 401 && error.status !== 403) mostrarAlerta(alertaCelda, error.message, 'error');
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------- crear por rango (HU-20 E4)
const dialogoLote = $('dialogo-lote');
const formLote = $('form-lote');
const campoLote = {
  prefijo: $('lote-prefijo'),
  tipo: $('lote-tipo'),
  desde: $('lote-desde'),
  hasta: $('lote-hasta'),
  piso: $('lote-piso'),
  area: $('lote-area'),
};

function abrirLote(origen) {
  limpiarErrores(formLote);
  mostrarAlerta($('lote-alerta'), '');
  campoLote.prefijo.value = '';
  campoLote.tipo.value = estado.tipo || 'carro';
  campoLote.desde.value = '1';
  campoLote.hasta.value = '10';
  campoLote.piso.value = String(estado.piso);
  campoLote.area.value = '';
  abrirDialogo(dialogoLote, { origen, foco: campoLote.prefijo });
}

formLote.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formLote);
  mostrarAlerta($('lote-alerta'), '');
  const desde = Number(campoLote.desde.value);
  const hasta = Number(campoLote.hasta.value);
  let valido = marcarCampo(campoLote.prefijo, campoLote.prefijo.value.trim() ? '' : 'Ingrese el prefijo.');
  valido = marcarCampo(campoLote.desde, Number.isInteger(desde) && desde >= 0 ? '' : 'Ingrese un número entero.') && valido;
  valido =
    marcarCampo(
      campoLote.hasta,
      !Number.isInteger(hasta) || hasta < desde ? 'Debe ser mayor o igual que «Desde».' : hasta - desde >= 200 ? 'Máximo 200 celdas por rango.' : ''
    ) && valido;
  valido = pisoValido(campoLote.piso) && valido;
  if (!valido) return formLote.querySelector('[aria-invalid="true"]')?.focus();
  const boton = $('lote-guardar');
  botonCargando(boton, true, 'Creando…');
  try {
    const { creadas, omitidas } = await crearLoteCeldas({
      idParqueadero: estado.idParqueadero,
      prefijo: campoLote.prefijo.value.trim(),
      desde,
      hasta,
      tipoVehiculo: campoLote.tipo.value,
      piso: Number(campoLote.piso.value),
      area: campoLote.area.value.trim() || null,
    });
    const extra = omitidas.length ? ` Ya existían: ${omitidas.join(', ')}.` : '';
    mostrarAviso(`Se crearon ${plural(creadas.length, 'celda')}.${extra}`, creadas.length ? 'success' : 'info');
    cerrarDialogo(dialogoLote);
    consulta?.ahora();
  } catch (error) {
    if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, {
        prefijo: 'lote-prefijo',
        desde: 'lote-desde',
        hasta: 'lote-hasta',
        tipoVehiculo: 'lote-tipo',
        piso: 'lote-piso',
        area: 'lote-area',
      });
      if (sinCampo.length) mostrarAlerta($('lote-alerta'), sinCampo.join(' '), 'error');
    } else if (error.status !== 401 && error.status !== 403) mostrarAlerta($('lote-alerta'), error.message, 'error');
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------- inhabilitar / habilitar (HU-21)
const dialogoInhabilitar = $('dialogo-inhabilitar');
const campoMotivo = $('inhabilitar-motivo');

$('detalle-inhabilitar').addEventListener('click', (e) => {
  const celda = celdaSeleccionada();
  if (!celda) return;
  limpiarErrores($('form-inhabilitar'));
  mostrarAlerta($('inhabilitar-alerta'), '');
  $('dialogo-inhabilitar-titulo').textContent = `Inhabilitar celda · ${celda.codigo}`;
  campoMotivo.value = '';
  abrirDialogo(dialogoInhabilitar, { origen: e.currentTarget, foco: campoMotivo });
});

$('form-inhabilitar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const celda = celdaSeleccionada();
  const motivo = campoMotivo.value.trim();
  if (!marcarCampo(campoMotivo, motivo.length < 3 ? 'Indique el motivo (mínimo 3 caracteres).' : '')) return campoMotivo.focus();
  const boton = $('inhabilitar-guardar');
  botonCargando(boton, true, 'Guardando…');
  try {
    await cambiarEstadoCelda(celda.idCelda, { estado: 'inhabilitada', motivo });
    mostrarAviso(`Celda ${celda.codigo} inhabilitada`, 'success');
    cerrarDialogo(dialogoInhabilitar);
    consulta?.ahora();
  } catch (error) {
    // CELDA_OCUPADA («La celda está ocupada por ABC123.»), CELDA_RESERVADA, VALIDACION…
    if (error.code === 'VALIDACION') pintarErroresApi(error, { motivo: 'inhabilitar-motivo' });
    else if (error.status !== 401 && error.status !== 403) mostrarAlerta($('inhabilitar-alerta'), error.message, 'error');
  } finally {
    botonCargando(boton, false);
  }
});

$('detalle-habilitar').addEventListener('click', async (e) => {
  const celda = celdaSeleccionada();
  if (!celda) return;
  const acepta = await confirmar({
    titulo: 'Habilitar celda',
    mensaje: `La celda ${celda.codigo} volverá a estar disponible para asignarse.`,
    textoConfirmar: 'Habilitar',
    origen: e.currentTarget,
  });
  if (!acepta) return;
  try {
    await cambiarEstadoCelda(celda.idCelda, { estado: 'disponible' });
    mostrarAviso(`Celda ${celda.codigo} habilitada`, 'success');
    consulta?.ahora();
  } catch (error) {
    if (error.status !== 401 && error.status !== 403) mostrarAviso(error.message, 'error');
  }
});

$('detalle-editar').addEventListener('click', (e) => {
  const celda = celdaSeleccionada();
  if (celda) abrirCelda(celda, e.currentTarget);
});
$('accion-nueva').addEventListener('click', (e) => abrirCelda(null, e.currentTarget));
$('accion-lote').addEventListener('click', (e) => abrirLote(e.currentTarget));

// ---------------------------------------------------------------- arranque
let consulta = null;

async function iniciar() {
  try {
    const { data } = await listarParqueaderos({ limit: 100 });
    estado.parqueaderos = data;
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
    return;
  }
  const selector = $('filtro-parqueadero');
  selector.replaceChildren(
    ...estado.parqueaderos.map((p) => {
      const opcion = clonar('tpl-opcion');
      opcion.value = String(p.idParqueadero);
      opcion.textContent = p.estado === 'activo' ? p.nombre : `${p.nombre} (inactivo)`;
      return opcion;
    })
  );
  const pedido = Number(parametro('parqueadero'));
  const inicial =
    estado.parqueaderos.find((p) => p.idParqueadero === pedido) ??
    estado.parqueaderos.find((p) => p.estado === 'activo') ??
    estado.parqueaderos[0];
  estado.idParqueadero = inicial?.idParqueadero ?? null;
  if (inicial) selector.value = String(inicial.idParqueadero);
  pintarPisos();
  actualizarAcciones();
  pintarDetalle();
  consulta = consultarCada(consultarMapa, 10000);
}

if (marco?.permitido) iniciar();
