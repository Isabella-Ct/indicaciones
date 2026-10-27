/**
 * Incidencias (wireframe 06 corregido) — REQ-INCD-1: tipo, placa del vehículo afectado
 * (autocompletar), celda opcional y descripción. El código INC-AAAAMMDD-0001 y la
 * fecha/hora las pone el servidor. Tabla filtrable con detalle en modal; tipos (admin).
 * HTML en app/incidencias.html.
 */
import { montarMarco } from './comun/marco-app.js';
import { abrirModal, cerrarModal, confirmar, mostrarAviso } from './comun/dialogos.js';
import {
  clonar,
  llenarSelect,
  ponerChip,
  marcarCampo,
  mostrarAlerta,
  botonCargando,
} from './comun/plantillas.js';
import { conectarTabla, conectarBusqueda } from './comun/tablas.js';
import {
  listarTiposIncidencia,
  crearTipoIncidencia,
  actualizarTipoIncidencia,
  cambiarActivoTipoIncidencia,
  listarIncidencias,
  obtenerIncidencia,
  registrarIncidencia,
} from '../services/incidencias.service.js';
import { listarVehiculos, obtenerVehiculoPorPlaca } from '../services/vehiculos.service.js';
import { listarPisos, listarCeldas } from '../services/celdas.service.js';
import { normalizarPlaca, formatearPlaca } from '../utils/placa.js';
import { formatearFechaHora } from '../utils/formato.js';
import { tienePermiso } from '../utils/sesion.js';

const $ = (id) => document.getElementById(id);
const estado = {
  sesion: null,
  tipos: [],
  editandoTipo: null,
  filtros: { tipo_id: '', placa: '', desde: '', hasta: '', pagina: 1, limite: 20 },
};
const puede = (codigo) => tienePermiso(estado.sesion, codigo);

// ---------------------------------------------------------------------------
// Detalle
// ---------------------------------------------------------------------------
async function abrirDetalle(id, origen) {
  let i;
  try {
    i = await obtenerIncidencia(id);
  } catch (error) {
    mostrarAviso(error.message, 'error');
    return;
  }
  const v = i.vehiculo;
  $('modal-detalle-titulo').textContent = `Incidencia ${i.codigo}`;
  $('modal-detalle-subtitulo').textContent =
    `// ${i.tipo.nombre} · ${formatearFechaHora(i.fecha_hora)}`;
  $('detalle-placa').textContent = formatearPlaca(v.placa);
  $('detalle-vehiculo').textContent = [`${v.marca ?? ''} ${v.modelo ?? ''}`.trim(), v.color]
    .filter(Boolean)
    .join(' · ');
  $('detalle-tipo').textContent = i.tipo.nombre;
  $('detalle-fecha').textContent = formatearFechaHora(i.fecha_hora);
  $('detalle-propietario').textContent = v.propietario?.nombre_completo ?? 'Visitante';
  $('detalle-celda').textContent = i.celda ? `${i.celda.codigo} · ${i.celda.piso}` : 'No indicada';
  $('detalle-registro').textContent = i.registrada_por.nombre_completo;
  $('detalle-estadia').textContent = i.estadia_id ? 'Vehículo dentro al registrar' : '—';
  $('detalle-descripcion').textContent = i.descripcion;
  abrirModal($('modal-detalle'), { origen });
}

// ---------------------------------------------------------------------------
// Listado
// ---------------------------------------------------------------------------
const tabla = conectarTabla($('tabla-incidencias'), {
  plantilla: 'tpl-incidencia',
  rellenar: (fila, i) => {
    const [codigo, tipo, vehiculo, celda, descripcion, registro, ver] = fila.cells;
    codigo.querySelector('strong').textContent = i.codigo;
    codigo.querySelector('.organism-data-table-cell-sub').textContent = formatearFechaHora(
      i.fecha_hora
    );
    tipo.firstElementChild.textContent = i.tipo.nombre;
    const [placa, propietario] = vehiculo.firstElementChild.children;
    placa.textContent = formatearPlaca(i.vehiculo.placa);
    propietario.textContent = i.vehiculo.propietario?.nombre_completo ?? 'Visitante';
    celda.textContent = i.celda?.codigo ?? '—';
    descripcion.firstElementChild.textContent = i.descripcion;
    registro.textContent = i.registrada_por.nombre_completo;
    const boton = ver.firstElementChild;
    boton.setAttribute('aria-label', `Ver incidencia ${i.codigo}`);
    boton.addEventListener('click', () => abrirDetalle(i.id, boton));
  },
  onPagina: (pagina) => {
    estado.filtros.pagina = pagina;
    recargar();
  },
});

async function recargar() {
  tabla.cargando(true);
  try {
    const { data, meta } = await listarIncidencias(estado.filtros);
    tabla.pintar(data, { meta });
  } catch (error) {
    mostrarAviso(error.message, 'error');
  } finally {
    tabla.cargando(false);
  }
}

function aplicar(clave, valor) {
  estado.filtros[clave] = valor;
  estado.filtros.pagina = 1;
  recargar();
}

// ---------------------------------------------------------------------------
// Registrar
// ---------------------------------------------------------------------------
function prepararRegistro(pisos, celdas) {
  const formulario = $('form-incidencia');
  const tipo = $('incidencia-tipo');
  const placa = $('incidencia-placa');
  const celda = $('incidencia-celda');
  const descripcion = $('incidencia-descripcion');
  const alerta = $('incidencia-alerta');
  const guardar = $('incidencia-guardar');
  const sugerencias = $('placas-registradas');
  const vehiculo = $('incidencia-vehiculo');
  const campos = { tipo_incidencia_id: tipo, placa, celda_id: celda, descripcion };

  llenarSelect(tipo, {
    opciones: [
      { value: '', label: 'Elige el tipo' },
      ...estado.tipos
        .filter((t) => t.activo)
        .map((t) => ({ value: String(t.id), label: t.nombre })),
    ],
  });
  llenarSelect(celda, {
    opciones: [{ value: '', label: 'Sin celda' }],
    grupos: pisos.map((p) => ({
      label: p.nombre,
      options: celdas
        .filter((c) => c.piso.id === p.id)
        .map((c) => ({ value: String(c.id), label: `${c.codigo} · ${c.tipo}` })),
    })),
  });

  async function mostrarVehiculo(texto) {
    try {
      const v = await obtenerVehiculoPorPlaca(texto);
      vehiculo.textContent = `${v.marca} ${v.modelo} · ${v.color} · ${v.propietario ? `Propietario: ${v.propietario.nombre_completo} (se le notificará)` : 'Visitante, sin propietario'}`;
    } catch {
      vehiculo.textContent = '';
    }
  }

  async function sugerir() {
    const texto = normalizarPlaca(placa.value);
    vehiculo.textContent = '';
    if (texto.length < 2) return sugerencias.replaceChildren();
    try {
      const { data } = await listarVehiculos({ placa: texto, limite: 8 });
      sugerencias.replaceChildren(
        ...data.map((v) => {
          const opcion = clonar('tpl-opcion');
          opcion.value = v.placa;
          opcion.label = `${v.marca ?? ''} ${v.modelo ?? ''} · ${v.color ?? ''}`;
          return opcion;
        })
      );
      if (texto.length >= 5 && data.some((v) => v.placa === texto)) await mostrarVehiculo(texto);
    } catch {
      /* el autocompletar es una ayuda */
    }
  }

  let temporizador = null;
  placa.addEventListener('input', () => {
    placa.value = normalizarPlaca(placa.value);
    clearTimeout(temporizador);
    temporizador = setTimeout(sugerir, 250);
  });

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarAlerta(alerta, '');
    Object.values(campos).forEach((c) => marcarCampo(c, ''));
    let ok = true;
    if (!tipo.value) ok = marcarCampo(tipo, 'Elige el tipo.');
    if (normalizarPlaca(placa.value).length < 5) ok = marcarCampo(placa, 'Escribe la placa.');
    if (descripcion.value.trim().length < 10)
      ok = marcarCampo(descripcion, 'Describe lo ocurrido (mínimo 10 caracteres).');
    if (!ok) return;
    botonCargando(guardar, true, 'Registrando…');
    try {
      const nueva = await registrarIncidencia({
        tipo_incidencia_id: Number(tipo.value),
        placa: normalizarPlaca(placa.value),
        celda_id: celda.value ? Number(celda.value) : null,
        descripcion: descripcion.value.trim(),
      });
      mostrarAviso(
        `Incidencia ${nueva.codigo} registrada${nueva.vehiculo.propietario ? ' y notificada al propietario' : ''}.`,
        'success'
      );
      formulario.reset();
      vehiculo.textContent = '';
      estado.filtros.pagina = 1;
      await recargar();
    } catch (error) {
      for (const d of error.detalles ?? [])
        if (campos[d.campo]) marcarCampo(campos[d.campo], d.mensaje);
      mostrarAlerta(alerta, error.message);
    } finally {
      botonCargando(guardar, false);
    }
  });
}

// ---------------------------------------------------------------------------
// Tipos (admin)
// ---------------------------------------------------------------------------
const tablaTipos = conectarTabla($('tabla-tipos'), {
  plantilla: 'tpl-tipo',
  rellenar: (fila, t) => {
    const [nombre, usos, chip, acciones] = fila.cells;
    nombre.querySelector('strong').textContent = t.nombre;
    nombre.querySelector('.organism-data-table-cell-sub').textContent = t.descripcion ?? '';
    usos.textContent = String(t.usos);
    ponerChip(
      chip.firstElementChild,
      t.activo ? 'Activo' : 'Inactivo',
      t.activo ? 'free' : 'neutral'
    );
    const [editar, alternar] = acciones.firstElementChild.children;
    alternar.querySelector('span').textContent = t.activo ? 'Desactivar' : 'Activar';
    editar.addEventListener('click', () => abrirTipo(t, editar));
    alternar.addEventListener('click', () => alternarTipo(t, alternar));
  },
});

async function recargarTipos() {
  estado.tipos = await listarTiposIncidencia();
  if (puede('incidencias.gestionar_tipos')) tablaTipos.pintar(estado.tipos);
}

function abrirTipo(t, origen) {
  estado.editandoTipo = t;
  $('modal-tipo-titulo').textContent = t ? `Editar ${t.nombre}` : 'Nuevo tipo de incidencia';
  $('tipo-guardar').querySelector('span').textContent = t ? 'Guardar' : 'Crear tipo';
  $('tipo-nombre').value = t?.nombre ?? '';
  $('tipo-descripcion').value = t?.descripcion ?? '';
  marcarCampo($('tipo-nombre'), '');
  marcarCampo($('tipo-descripcion'), '');
  mostrarAlerta($('tipo-alerta'), '');
  abrirModal($('modal-tipo'), { origen });
}

$('form-tipo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = $('tipo-nombre');
  const descripcion = $('tipo-descripcion');
  const guardar = $('tipo-guardar');
  mostrarAlerta($('tipo-alerta'), '');
  marcarCampo(nombre, '');
  if (nombre.value.trim().length < 3) return marcarCampo(nombre, 'Mínimo 3 caracteres.');
  botonCargando(guardar, true, 'Guardando…');
  try {
    const datos = { nombre: nombre.value.trim(), descripcion: descripcion.value.trim() || null };
    if (estado.editandoTipo) await actualizarTipoIncidencia(estado.editandoTipo.id, datos);
    else await crearTipoIncidencia(datos);
    mostrarAviso(`Tipo "${datos.nombre}" guardado.`, 'success');
    cerrarModal($('modal-tipo'));
    await recargarTipos();
  } catch (error) {
    for (const d of error.detalles ?? []) {
      const control = { nombre, descripcion }[d.campo];
      if (control) marcarCampo(control, d.mensaje);
    }
    mostrarAlerta($('tipo-alerta'), error.message);
  } finally {
    botonCargando(guardar, false);
  }
});

async function alternarTipo(t, origen) {
  const ok = await confirmar({
    titulo: t.activo ? 'Desactivar tipo' : 'Activar tipo',
    mensaje: t.activo
      ? `"${t.nombre}" no se podrá elegir en incidencias nuevas. Las ${t.usos} registradas no cambian.`
      : `"${t.nombre}" volverá a estar disponible.`,
    textoConfirmar: t.activo ? 'Desactivar' : 'Activar',
    origen,
  });
  if (!ok) return;
  try {
    await cambiarActivoTipoIncidencia(t.id, !t.activo);
    await recargarTipos();
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
}

async function iniciar() {
  const app = await montarMarco({ paginaId: 'incidencias' });
  if (!app) return;
  estado.sesion = app.sesion;
  let pisos = [];
  let celdas = [];
  try {
    [estado.tipos, pisos, celdas] = await Promise.all([
      listarTiposIncidencia(),
      listarPisos(),
      listarCeldas(),
    ]);
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }

  const registra = puede('incidencias.registrar');
  const gestionaTipos = puede('incidencias.gestionar_tipos');
  $('panel-registro').classList.toggle('hidden', !registra);
  $('panel-tipos').classList.toggle('hidden', !gestionaTipos);
  if (registra && gestionaTipos)
    $('incidencias-superior').classList.add('template-app-layout-grid');
  if (registra) prepararRegistro(pisos, celdas);
  if (gestionaTipos) {
    tablaTipos.pintar(estado.tipos);
    $('accion-nuevo-tipo').addEventListener('click', (e) => abrirTipo(null, e.currentTarget));
  }

  llenarSelect($('filtro-tipo'), {
    opciones: [
      { value: '', label: 'Todos' },
      ...estado.tipos.map((t) => ({ value: String(t.id), label: t.nombre })),
    ],
  });
  $('filtro-tipo').addEventListener('change', (e) => aplicar('tipo_id', e.target.value));
  conectarBusqueda($('filtro-placa'), (valor) => aplicar('placa', valor), {
    transform: normalizarPlaca,
  });
  $('filtro-desde').addEventListener('change', (e) => aplicar('desde', e.target.value));
  $('filtro-hasta').addEventListener('change', (e) => aplicar('hasta', e.target.value));
  await recargar();
  // Enlace desde una notificación: /app/incidencias.html?id=N
  const id = Number(new URLSearchParams(location.search).get('id'));
  if (id) abrirDetalle(id);
}

iniciar();
