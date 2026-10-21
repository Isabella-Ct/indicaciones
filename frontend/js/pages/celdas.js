/**
 * Control de espacios — REQ-CLD-01 (celdas por piso/área), REQ-CLD-02 (cliente: solo
 * lectura, sin placas), REQ-CLD-03 (cambiar estado). Mapa en vivo por SSE.
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import { confirmar } from './comun/confirmar.js';
import { abrirGestionPuertas } from './comun/puertas.js';
import { limpiarErrores, mostrarErrorApi, marcarError } from './comun/formularios.js';
import { createParkingMap } from '../components/organisms/parking-map/parking-map.js';
import { createSpaceDetail } from '../components/organisms/space-detail/space-detail.js';
import { createKpis } from '../components/organisms/kpis/kpis.js';
import { createModal, openModal, closeModal } from '../components/organisms/modal/modal.js';
import {
  createLiveStatus,
  setLiveStatus,
} from '../components/molecules/live-status/live-status.js';
import { createField } from '../components/molecules/field/field.js';
import { createTiles } from '../components/molecules/tiles/tiles.js';
import { createCheck } from '../components/molecules/check/check.js';
import { createAlert, setAlert } from '../components/molecules/alert/alert.js';
import { showToast } from '../components/molecules/toast/toast.js';
import { createButton, setButtonLoading } from '../components/atoms/button/button.js';
import { createInput } from '../components/atoms/input/input.js';
import { createSelect } from '../components/atoms/select/select.js';
import { createTextarea } from '../components/atoms/textarea/textarea.js';
import { createPlate } from '../components/atoms/plate/plate.js';
import {
  listarPisos,
  listarCeldas,
  obtenerResumen,
  cambiarEstadoCelda,
  crearCelda,
  actualizarCelda,
  cambiarActivaCelda,
  suscribirCeldas,
} from '../services/celdas.service.js';
import { obtenerVehiculoPorPlaca, crearVehiculo } from '../services/vehiculos.service.js';
import {
  previsualizarEntrada,
  registrarEntrada,
  liquidarSalida,
  liquidarEstadia,
  pagarEstadia,
  ultimosMovimientos,
  urlTicketPdf,
} from '../services/estadias.service.js';
import {
  createEntryModal,
  abrirEntryModal,
} from '../components/organisms/entry-modal/entry-modal.js';
import { createMovementLog } from '../components/organisms/movement-log/movement-log.js';
import {
  createChargeModal,
  abrirChargeModal,
} from '../components/organisms/charge-modal/charge-modal.js';
import { resumenFacturacionHoy, urlFacturaPdf } from '../services/facturacion.service.js';
import { createIconButton } from '../components/atoms/icon-button/icon-button.js';
import { leerPuertaPreferida, guardarPuertaPreferida } from '../utils/almacen.js';
import { formatearCOP } from '../utils/formato.js';
import { formatearPlaca } from '../utils/placa.js';
import { normalizarPlaca } from '../utils/placa.js';
import { tienePermiso } from '../utils/sesion.js';

const CLAVE_PISO = 'parko.piso';

const estado = {
  sesion: null,
  pisos: [],
  celdas: new Map(),
  resumen: null,
  pisoActivoId: null,
  seleccionadaId: null,
  facturacion: null, // GET /facturas/resumen-hoy (KPIs del personal)
  liquidacion: null, // { estadiaId, datos } de la celda seleccionada
};

const puede = (codigo) => tienePermiso(estado.sesion, codigo);
const verOcupantes = () => puede('celdas.cambiar_estado');

const zonas = {
  bitacora: el('div', { className: 'bottom' }),
  kpis: el('div'),
  mapa: el('div'),
  detalle: el('aside', {
    className: 'detail-column',
    attrs: { 'aria-live': 'polite', 'aria-label': 'Detalle del espacio' },
  }),
};
const indicador = createLiveStatus();

// ---------------------------------------------------------------------------
// Pintado
// ---------------------------------------------------------------------------
const abreviarPiso = (nombre) => nombre.replace(/^(\p{L})\p{L}*\s*(\d+)$/u, '$1$2');

function pintarKpis() {
  const r = estado.resumen;
  if (!r) return;
  const libresPorPiso = r.por_piso
    .map((p) => `${abreviarPiso(p.nombre)}: ${p.disponible}`)
    .join(' · ');
  zonas.kpis.replaceChildren(
    createKpis({
      items: [
        {
          label: 'Ocupación actual',
          value: r.ocupacion_pct,
          unit: '%',
          main: true,
          meter: r.ocupacion_pct,
          note: `${r.por_estado.ocupada} de ${r.habilitadas} espacios habilitados`,
        },
        { label: 'Espacios libres', value: r.por_estado.disponible, note: libresPorPiso },
        {
          label: 'Vehículos dentro',
          value: r.por_estado.ocupada,
          note: `${r.por_tipo.moto.ocupada} motos · ${r.por_tipo.carro.ocupada} carros`,
        },
        ...kpisFinales(r),
      ],
    })
  );
}

function kpisFinales(r) {
  const f = estado.facturacion;
  if (!f) {
    return [
      { label: 'Reservados', value: r.por_estado.reservada, note: 'Mensualidades y reservas' },
      {
        label: 'Fuera de servicio',
        value: r.por_estado.fuera_servicio,
        note: `de ${r.total} celdas`,
      },
    ];
  }
  const prom = f.permanencia_promedio_min;
  return [
    {
      label: 'Recaudo de hoy',
      value: formatearCOP(f.recaudo),
      note: `${f.salidas_cobradas} salida${f.salidas_cobradas === 1 ? '' : 's'} cobrada${f.salidas_cobradas === 1 ? '' : 's'}`,
    },
    {
      label: 'Permanencia prom.',
      value: prom === null || prom === undefined ? '—' : String(Math.round(prom)),
      unit: prom === null || prom === undefined ? '' : 'min',
      note: 'Visitantes que salieron hoy',
    },
  ];
}

async function cargarFacturacion() {
  if (!puede('facturas.ver')) return;
  try {
    estado.facturacion = await resumenFacturacionHoy();
    pintarKpis();
  } catch {
    /* los KPI de dinero son secundarios */
  }
}

function pintarMapa() {
  const enfocada = document.activeElement?.closest?.('.space, .level-tab');
  const idEnfocado = enfocada?.classList.contains('space')
    ? enfocada.getAttribute('data-id')
    : null;
  const tabEnfocada = enfocada?.classList.contains('level-tab');

  zonas.mapa.replaceChildren(
    createParkingMap({
      pisos: estado.pisos,
      celdas: [...estado.celdas.values()],
      pisoActivoId: estado.pisoActivoId,
      seleccionadaId: estado.seleccionadaId,
      onSelectPiso: (id, { enfocar } = {}) => {
        estado.pisoActivoId = id;
        try {
          localStorage.setItem(CLAVE_PISO, String(id));
        } catch {
          /* preferencia opcional */
        }
        pintarMapa();
        if (enfocar) zonas.mapa.querySelector('.level-tab.is-active')?.focus();
      },
      onSelectCelda: (celda) => {
        estado.seleccionadaId = celda.id;
        pintarMapa();
        pintarDetalle();
        actualizarLiquidacion();
        zonas.mapa.querySelector(`.space[data-id="${celda.id}"]`)?.focus();
      },
    })
  );
  // Las actualizaciones en vivo no deben robar el foco del teclado.
  if (idEnfocado) zonas.mapa.querySelector(`.space[data-id="${idEnfocado}"]`)?.focus();
  else if (tabEnfocada) zonas.mapa.querySelector('.level-tab.is-active')?.focus();
}

function pintarDetalle() {
  const celda = estado.celdas.get(estado.seleccionadaId) ?? null;
  zonas.detalle.replaceChildren(
    createSpaceDetail({
      celda,
      verOcupantes: verOcupantes(),
      liquidacion: liquidacionDe(celda),
      acciones: celda ? acciones(celda) : [],
    })
  );
}

function liquidacionDe(celda) {
  const l = estado.liquidacion;
  return celda?.estadia && l && l.estadiaId === celda.estadia.id ? l.datos : null;
}

/** Pide al servidor el cobro en vivo de la celda seleccionada (si tiene estadía). */
async function actualizarLiquidacion() {
  const celda = estado.celdas.get(estado.seleccionadaId);
  if (!celda?.estadia || !puede('movimientos.registrar')) {
    estado.liquidacion = null;
    return;
  }
  const estadiaId = celda.estadia.id;
  try {
    const datos = await liquidarEstadia(estadiaId);
    if (estado.celdas.get(estado.seleccionadaId)?.estadia?.id !== estadiaId) return;
    estado.liquidacion = { estadiaId, datos };
    if (!zonas.detalle.contains(document.activeElement)) pintarDetalle();
    else actualizarSoloCobro();
  } catch {
    /* sin tarifa vigente u otro error: el detalle se muestra sin dinero */
  }
}

/** Repinta el detalle conservando el foco en el botón que lo tenía. */
function actualizarSoloCobro() {
  const etiqueta = document.activeElement?.textContent;
  pintarDetalle();
  [...zonas.detalle.querySelectorAll('button')].find((b) => b.textContent === etiqueta)?.focus();
}

function pintarTodo() {
  pintarKpis();
  pintarMapa();
  pintarDetalle();
}

// ---------------------------------------------------------------------------
// Acciones del detalle según rol y estado
// ---------------------------------------------------------------------------
function acciones(celda) {
  const lista = [];
  const boton = (props) => createButton({ size: 'md', ...props });

  if (puede('celdas.cambiar_estado')) {
    if (celda.estado === 'disponible' || celda.estado === 'reservada') {
      lista.push(
        boton({
          label: 'Ocupar con vehículo',
          icon: 'i-in',
          onClick: (e) => abrirOcupar(celda, e.currentTarget),
        })
      );
      lista.push(
        boton({
          label: 'Fuera de servicio',
          variant: 'dark',
          onClick: (e) => abrirFueraServicio(celda, e.currentTarget),
        })
      );
    }
    if (celda.estado === 'ocupada' && !celda.estadia) {
      lista.push(
        boton({
          label: 'Liberar celda',
          icon: 'i-out',
          onClick: (e) => liberar(celda, e.currentTarget, 'Liberar celda'),
        })
      );
    }
    if (celda.estado === 'fuera_servicio') {
      lista.push(
        boton({
          label: 'Habilitar celda',
          icon: 'i-check',
          onClick: (e) => liberar(celda, e.currentTarget, 'Habilitar celda'),
        })
      );
    }
    if (celda.estado === 'ocupada' && celda.estadia && puede('movimientos.registrar')) {
      const salida = boton({
        label: 'Registrar salida y cobrar',
        icon: 'i-out',
        onClick: (e) => abrirSalida(celda, e.currentTarget),
      });
      const imprimir = createIconButton({
        icon: 'i-print',
        label: `Imprimir ticket ${celda.estadia.codigo_ticket}`,
        onClick: () => imprimirTicket(celda.estadia.id),
      });
      salida.classList.add('detail-actions-pair');
      imprimir.classList.add('detail-actions-pair');
      lista.push(salida, imprimir);
    }
  }
  if (puede('celdas.gestionar')) {
    lista.push(
      boton({
        label: 'Editar celda',
        variant: 'ghost',
        onClick: (e) => abrirGestion(celda, e.currentTarget),
      })
    );
  }
  const cerrar = createButton({
    label: 'Cerrar detalle',
    variant: 'ghost',
    onClick: () => {
      const id = estado.seleccionadaId;
      estado.seleccionadaId = null;
      pintarMapa();
      pintarDetalle();
      zonas.mapa.querySelector(`.space[data-id="${id}"]`)?.focus();
    },
  });
  cerrar.classList.add('detail-actions-full');
  lista.push(cerrar);
  // La rejilla .detail-actions es "1fr auto": los botones de acción van a lo ancho.
  lista
    .filter((b) => !b.classList.contains('detail-actions-pair'))
    .forEach((b) => b.classList.add('detail-actions-full'));
  return lista;
}

/** Aplica la respuesta de la API sin esperar el evento SSE. */
function aplicarCelda(celda) {
  if (celda.activa === false) estado.celdas.delete(celda.id);
  else estado.celdas.set(celda.id, celda);
  pintarMapa();
  pintarDetalle();
}

function modalFormulario({
  titulo,
  subtitulo,
  contenido,
  textoGuardar,
  onGuardar,
  size = 'sm',
  extra = [],
}) {
  const id = `form-${Math.random().toString(36).slice(2, 8)}`;
  const alerta = createAlert();
  const formulario = el('form', { className: 'stack', attrs: { id, novalidate: true } }, [
    alerta,
    ...contenido,
  ]);
  const guardar = createButton({ label: textoGuardar, type: 'submit', icon: 'i-check' });
  guardar.setAttribute('form', id);
  const modal = createModal({
    title: titulo,
    subtitle: subtitulo,
    size,
    body: [formulario],
    footer: [
      createButton({ label: 'Cancelar', variant: 'ghost', onClick: () => closeModal(modal) }),
      ...extra,
      guardar,
    ],
    onClose: () => modal.remove(),
  });
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    setAlert(alerta, '');
    setButtonLoading(guardar, true, 'Guardando…');
    try {
      const continuar = await onGuardar({ alerta });
      if (continuar === false) {
        setButtonLoading(guardar, false);
        return;
      }
      closeModal(modal);
    } catch (error) {
      setButtonLoading(guardar, false);
      if (!error.mostrado) setAlert(alerta, error.message, 'error');
    }
  });
  return { modal, alerta, formulario };
}

/** Ocupar manualmente (REQ-CLD-03): busca el vehículo por placa. */
function abrirOcupar(celda, origen) {
  let vehiculo = null;
  const placa = createInput({
    plate: true,
    placeholder: 'ABC 123',
    maxLength: 8,
    onInput: (e) => {
      e.target.value = normalizarPlaca(e.target.value);
      vehiculo = null;
      resultado.replaceChildren();
    },
  });
  const campoPlaca = createField({
    label: 'Placa del vehículo',
    control: placa,
    required: true,
    full: true,
  });
  const resultado = el('div', { attrs: { 'aria-live': 'polite' } });

  async function buscar() {
    resultado.replaceChildren();
    vehiculo = null;
    if (!placa.value) return marcarError(campoPlaca, 'Escribe la placa.');
    try {
      vehiculo = await obtenerVehiculoPorPlaca(placa.value);
      const compatible = vehiculo.tipo === celda.tipo;
      resultado.append(
        el('div', { className: 'vehicle-line' }, [
          createPlate({ placa: vehiculo.placa, large: true }),
          el('p', {
            text: `${vehiculo.marca} ${vehiculo.modelo} · ${vehiculo.color} · ${vehiculo.tipo === 'moto' ? 'Moto' : 'Carro'}`,
          }),
        ]),
        compatible
          ? el('p', {
              className: 'field-hint',
              text: vehiculo.propietario
                ? `Propietario: ${vehiculo.propietario.nombre_completo}`
                : 'Vehículo de visitante.',
            })
          : el('p', {
              className: 'field-error',
              text: `La celda ${celda.codigo} es de ${celda.tipo}: este vehículo no puede ocuparla.`,
            })
      );
    } catch (error) {
      resultado.append(el('p', { className: 'field-error', text: error.message }));
    }
  }

  const botonBuscar = createButton({
    label: 'Buscar placa',
    variant: 'dark',
    size: 'sm',
    onClick: buscar,
  });
  placa.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscar();
    }
  });

  const { modal } = modalFormulario({
    titulo: `Ocupar ${celda.codigo}`,
    subtitulo: `${celda.piso.nombre} · celda de ${celda.tipo}`,
    contenido: [campoPlaca, el('div', {}, [botonBuscar]), resultado],
    textoGuardar: 'Ocupar celda',
    onGuardar: async ({ alerta }) => {
      limpiarErrores({ placa: campoPlaca }, alerta);
      if (!vehiculo) {
        await buscar();
        if (!vehiculo) return false;
      }
      const { data } = await cambiarEstadoCelda(celda.id, {
        estado: 'ocupada',
        vehiculo_id: vehiculo.id,
      });
      aplicarCelda(data);
      showToast(`${data.codigo} ocupada por ${vehiculo.placa}.`, 'success');
      return true;
    },
  });
  openModal(modal, origen);
}

function abrirFueraServicio(celda, origen) {
  const nota = createTextarea({
    maxLength: 255,
    placeholder: 'Ej. filtración en el techo; revisión el 15 oct',
  });
  const campo = createField({ label: 'Motivo', control: nota, required: true, full: true });
  const { modal } = modalFormulario({
    titulo: `${celda.codigo} fuera de servicio`,
    subtitulo: 'el motivo se muestra en el detalle de la celda',
    contenido: [campo],
    textoGuardar: 'Marcar fuera de servicio',
    onGuardar: async () => {
      limpiarErrores({ nota: campo });
      if (!nota.value.trim()) {
        marcarError(campo, 'Escribe el motivo.');
        return false;
      }
      const { data } = await cambiarEstadoCelda(celda.id, {
        estado: 'fuera_servicio',
        nota: nota.value,
      });
      aplicarCelda(data);
      showToast(`${data.codigo} quedó fuera de servicio.`, 'success');
      return true;
    },
  });
  openModal(modal, origen);
}

async function liberar(celda, origen, titulo) {
  const ok = await confirmar({
    titulo: `${titulo} ${celda.codigo}`,
    mensaje:
      celda.estado === 'fuera_servicio'
        ? 'La celda vuelve a estar disponible (o reservada, si es la celda fija de una mensualidad).'
        : 'La celda quedará disponible y sin vehículo asociado.',
    textoConfirmar: titulo,
    origen,
  });
  if (!ok) return;
  try {
    const { data, meta } = await cambiarEstadoCelda(celda.id, { estado: 'disponible' });
    aplicarCelda(data);
    showToast(
      meta.estado_final === 'reservada'
        ? `${data.codigo} vuelve a estar reservada para su mensualidad.`
        : `${data.codigo} quedó disponible.`,
      'success'
    );
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Gestionar celdas (admin): crear, editar, activar/desactivar
// ---------------------------------------------------------------------------
async function abrirGestion(celdaInicial, origen) {
  let todas = [];
  try {
    todas = await listarCeldas({ incluir_inactivas: '1' });
  } catch (error) {
    showToast(error.message, 'error');
    return;
  }

  const selector = createSelect({
    options: [{ value: '', label: '+ Nueva celda' }],
    groups: estado.pisos.map((p) => ({
      label: p.nombre,
      options: todas
        .filter((c) => c.piso.id === p.id)
        .map((c) => ({
          value: String(c.id),
          label: `${c.codigo} · ${c.tipo}${c.activa ? '' : ' (desactivada)'}`,
        })),
    })),
    value: celdaInicial ? String(celdaInicial.id) : '',
  });

  const control = {
    codigo: createInput({ maxLength: 7, placeholder: 'Ej. C-09' }),
    piso_id: createSelect({
      options: estado.pisos.map((p) => ({ value: String(p.id), label: p.nombre })),
    }),
    area: createInput({ maxLength: 5, placeholder: 'Ej. C' }),
    fila_mapa: createSelect({
      options: [
        { value: 'superior', label: 'Superior (arriba del carril)' },
        { value: 'inferior', label: 'Inferior (abajo del carril)' },
      ],
    }),
    posicion: createInput({ type: 'number', inputMode: 'numeric' }),
  };
  control.posicion.min = '1';
  control.posicion.max = '99';
  let tipo = 'carro';
  const tiles = createTiles({
    name: 'tipo-celda',
    label: 'Tipo',
    value: tipo,
    options: [
      { value: 'carro', label: 'Carro', icon: 'i-car' },
      { value: 'moto', label: 'Moto', icon: 'i-moto' },
    ],
    onChange: (v) => (tipo = v),
  });
  const accesible = createCheck({ label: 'Celda accesible (personas con movilidad reducida)' });
  const campos = {
    codigo: createField({
      label: 'Código',
      control: control.codigo,
      required: true,
      hint: 'Letras-número, ej. A-01.',
    }),
    area: createField({
      label: 'Área',
      control: control.area,
      required: true,
      hint: 'Fila de letras: A, B, C, M…',
    }),
    piso_id: createField({ label: 'Piso', control: control.piso_id, required: true }),
    fila_mapa: createField({ label: 'Fila del mapa', control: control.fila_mapa, required: true }),
    posicion: createField({
      label: 'Posición',
      control: control.posicion,
      required: true,
      hint: 'Orden de izquierda a derecha.',
    }),
  };
  const estadoActual = el('p', { className: 'field-hint field--full' });

  function cargar(id) {
    const celda = todas.find((c) => c.id === Number(id));
    control.codigo.value = celda?.codigo ?? '';
    control.area.value = celda?.area ?? '';
    control.piso_id.value = String(celda?.piso.id ?? estado.pisoActivoId);
    control.fila_mapa.value = celda?.fila_mapa ?? 'superior';
    control.posicion.value = celda?.posicion ?? '';
    tipo = celda?.tipo ?? 'carro';
    tiles.querySelector(`input[value="${tipo}"]`).checked = true;
    accesible.querySelector('input').checked = Boolean(celda?.es_accesible);
    estadoActual.textContent = celda
      ? `Estado actual: ${celda.estado.replace('_', ' ')}${celda.activa ? '' : ' · desactivada'}`
      : 'La celda nueva queda disponible.';
    activar.classList.toggle('hidden', !celda);
    activar.querySelector('span').textContent = celda?.activa ? 'Desactivar' : 'Activar';
  }

  const activar = createButton({
    label: 'Desactivar',
    variant: 'dark',
    onClick: async () => {
      const celda = todas.find((c) => c.id === Number(selector.value));
      if (!celda) return;
      if (celda.activa) {
        const ok = await confirmar({
          titulo: `Desactivar ${celda.codigo}`,
          mensaje:
            'La celda sale del mapa y no se podrá asignar. Su historial se conserva y puedes activarla de nuevo.',
          textoConfirmar: 'Desactivar',
          origen: activar,
        });
        if (!ok) return;
      }
      try {
        const actualizada = await cambiarActivaCelda(celda.id, !celda.activa);
        Object.assign(celda, actualizada);
        showToast(`${celda.codigo} ${actualizada.activa ? 'activada' : 'desactivada'}.`, 'success');
        if (actualizada.activa) estado.celdas.set(actualizada.id, actualizada);
        else estado.celdas.delete(actualizada.id);
        if (estado.seleccionadaId === actualizada.id && !actualizada.activa)
          estado.seleccionadaId = null;
        pintarMapa();
        pintarDetalle();
        closeModal(modal);
      } catch (error) {
        setAlert(alerta, error.message, 'error');
      }
    },
  });

  const { modal, alerta } = modalFormulario({
    titulo: 'Gestionar celdas',
    subtitulo: 'crear una celda nueva o editar una existente',
    size: 'md',
    textoGuardar: 'Guardar celda',
    extra: [activar],
    contenido: [
      createField({ label: 'Celda', control: selector, full: true }),
      el('div', { className: 'form-grid' }, [
        campos.codigo,
        campos.area,
        campos.piso_id,
        campos.fila_mapa,
        campos.posicion,
        el('div', { className: 'field' }, [tiles]),
        el('div', { className: 'field--full' }, [accesible]),
        estadoActual,
      ]),
    ],
    onGuardar: async ({ alerta: aviso }) => {
      limpiarErrores(campos, aviso);
      let ok = true;
      if (!/^[A-Za-z]{1,3}-\d{1,3}$/.test(control.codigo.value.trim()))
        ok = marcarError(campos.codigo, 'Formato letras-número, ej. A-01.');
      if (!/^[A-Za-z]{1,5}$/.test(control.area.value.trim()))
        ok = marcarError(campos.area, 'Escribe la letra del área.');
      if (!(Number(control.posicion.value) >= 1))
        ok = marcarError(campos.posicion, 'Posición desde 1.');
      if (!ok) return false;
      const datos = {
        codigo: control.codigo.value.trim(),
        area: control.area.value.trim(),
        piso_id: Number(control.piso_id.value),
        fila_mapa: control.fila_mapa.value,
        posicion: Number(control.posicion.value),
        tipo,
        es_accesible: accesible.querySelector('input').checked,
      };
      try {
        const id = Number(selector.value);
        const celda = id ? await actualizarCelda(id, datos) : await crearCelda(datos);
        if (celda.activa) estado.celdas.set(celda.id, celda);
        estado.seleccionadaId = celda.id;
        estado.pisoActivoId = celda.piso.id;
        pintarMapa();
        pintarDetalle();
        showToast(`Celda ${celda.codigo} ${id ? 'actualizada' : 'creada'}.`, 'success');
        return true;
      } catch (error) {
        mostrarErrorApi(error, campos, aviso);
        error.mostrado = true;
        throw error;
      }
    },
  });
  selector.addEventListener('change', () => cargar(selector.value));
  cargar(selector.value);
  openModal(modal, origen);
}

// ---------------------------------------------------------------------------
// Entradas, salidas y bitácora (Fase 3)
// ---------------------------------------------------------------------------
function puertaActual() {
  const puertas = estado.sede?.puertas ?? [];
  const preferida = puertas.find((p) => p.id === leerPuertaPreferida());
  return (preferida ?? puertas[0])?.id ?? null;
}

function imprimirTicket(estadiaId) {
  window.open(urlTicketPdf(estadiaId), '_blank', 'noopener');
}

/** Celdas libres del tipo, desde el estado del mapa (para el select del modal). */
function celdasLibres(tipo) {
  return [...estado.celdas.values()]
    .filter((c) => c.tipo === tipo && c.estado === 'disponible')
    .map((c) => ({
      id: c.id,
      codigo: c.codigo,
      piso: c.piso.nombre,
      es_accesible: c.es_accesible,
    }));
}

/** REQ-INEX-1: modal "Registrar ingreso" (abrir, placa, Enter). */
function abrirIngreso(origen) {
  const modal = createEntryModal({
    puertas: estado.sede?.puertas ?? [],
    puertaId: puertaActual(),
    celdasLibres,
    previsualizar: previsualizarEntrada,
    registrar: registrarEntrada,
    registrarVisitante: crearVehiculo,
    onPuerta: guardarPuertaPreferida,
    onImprimir: (ticket) => imprimirTicket(ticket.id),
    onRegistrado: (ticket) => {
      showToast(
        `Ingreso registrado: ${formatearPlaca(ticket.vehiculo.placa)} → ${ticket.celda.codigo}.`,
        'success'
      );
      // El mapa se actualiza por SSE; se deja seleccionada la celda para ver su detalle.
      estado.seleccionadaId = ticket.celda.id;
      const celda = estado.celdas.get(ticket.celda.id);
      if (celda) estado.pisoActivoId = celda.piso.id;
    },
  });
  abrirEntryModal(modal, origen);
}

/** REQ-INEX-2/3, REQ-TAR-2, REQ-FAC-1: liquidación oficial del servidor, cobro y factura. */
async function abrirSalida(celda, origen) {
  const puertaId = puertaActual();
  const salidas = (estado.sede?.puertas ?? []).filter((p) => p.tipo !== 'entrada');
  let liquidacion;
  try {
    liquidacion = await liquidarSalida({
      puerta_id: salidas.find((p) => p.id === puertaId)?.id ?? salidas[0]?.id,
      placa: celda.ocupante.placa,
    });
  } catch (error) {
    showToast(error.message, 'error');
    return;
  }
  const { estadia } = liquidacion;
  const modal = createChargeModal({
    liquidacion,
    puertas: estado.sede?.puertas ?? [],
    puertaId,
    recalcular: (descuentoId) => liquidarEstadia(estadia.id, descuentoId),
    pagar: async (datos) => {
      const resultado = await pagarEstadia(estadia.id, datos);
      guardarPuertaPreferida(datos.puerta_id);
      return resultado;
    },
    onImprimir: (factura) => window.open(urlFacturaPdf(factura.id), '_blank', 'noopener'),
    onPagado: ({ factura, estadia: cerrada }) => {
      showToast(
        `Salida cobrada: ${formatearPlaca(cerrada.vehiculo.placa)} · ${formatearCOP(factura.total)} · ${factura.numero}.`,
        'success'
      );
      estado.liquidacion = null;
      // El mapa y la bitácora llegan por SSE; el recaudo se recarga aquí.
      cargarFacturacion();
    },
  });
  abrirChargeModal(modal, origen);
}

/** Atajo del page-head: busca por placa o ticket entre los vehículos dentro. */
function buscarVehiculo(texto) {
  const valor = texto.trim().toUpperCase();
  if (!valor) return;
  const placa = normalizarPlaca(valor);
  const celda = [...estado.celdas.values()].find(
    (c) => c.ocupante?.placa === placa || c.estadia?.codigo_ticket === valor
  );
  if (!celda) {
    showToast(`No hay un vehículo dentro con la placa o ticket "${valor}".`, 'error');
    return;
  }
  estado.seleccionadaId = celda.id;
  estado.pisoActivoId = celda.piso.id;
  pintarMapa();
  pintarDetalle();
  actualizarLiquidacion();
  zonas.detalle.querySelector('.detail-actions .btn')?.focus();
}

function crearBuscador() {
  const campo = createInput({
    type: 'search',
    placeholder: 'Placa o ticket',
    maxLength: 12,
    autocomplete: 'off',
  });
  campo.setAttribute('aria-label', 'Buscar un vehículo dentro por placa o ticket');
  const formulario = el('form', { className: 'exit-search', attrs: { role: 'search' } }, [
    campo,
    createButton({ label: 'Buscar', variant: 'dark', type: 'submit', icon: 'i-out' }),
  ]);
  formulario.addEventListener('submit', (e) => {
    e.preventDefault();
    buscarVehiculo(campo.value);
  });
  return formulario;
}

async function cargarBitacora() {
  if (!puede('movimientos.ver')) return;
  try {
    const movimientos = await ultimosMovimientos(10);
    zonas.bitacora.replaceChildren(createMovementLog({ movimientos }));
  } catch {
    /* la bitácora es secundaria: no bloquea la pantalla */
  }
}

// ---------------------------------------------------------------------------
// Datos y tiempo real
// ---------------------------------------------------------------------------
async function cargarDatos() {
  const [pisos, celdas, resumen] = await Promise.all([
    listarPisos(),
    listarCeldas(),
    obtenerResumen(),
  ]);
  estado.pisos = pisos;
  estado.celdas = new Map(celdas.map((c) => [c.id, c]));
  estado.resumen = resumen;
  let guardado = null;
  try {
    guardado = Number(localStorage.getItem(CLAVE_PISO));
  } catch {
    /* sin almacenamiento */
  }
  if (!pisos.some((p) => p.id === estado.pisoActivoId)) {
    estado.pisoActivoId = pisos.some((p) => p.id === guardado) ? guardado : pisos[0]?.id;
  }
  if (!estado.celdas.has(estado.seleccionadaId)) estado.seleccionadaId = null;
}

function conectar() {
  suscribirCeldas({
    onCelda: (celda) => {
      if (celda.activa === false) {
        estado.celdas.delete(celda.id);
        if (estado.seleccionadaId === celda.id) estado.seleccionadaId = null;
      } else {
        estado.celdas.set(celda.id, celda);
      }
      pintarMapa();
      if (!estado.seleccionadaId || estado.seleccionadaId === celda.id) {
        pintarDetalle();
        if (estado.seleccionadaId === celda.id) actualizarLiquidacion();
      }
    },
    onResumen: (resumen) => {
      estado.resumen = resumen;
      pintarKpis();
    },
    onMovimiento: () => {
      cargarBitacora();
      cargarFacturacion();
    },
    onEstado: async (nuevo, reconectado) => {
      setLiveStatus(indicador, nuevo);
      // Tras una caída pudo haber cambios perdidos: se vuelve a cargar todo.
      if (reconectado) {
        try {
          await cargarDatos();
          pintarTodo();
        } catch {
          /* se intentará en la próxima reconexión */
        }
      }
    },
  });
}

async function iniciar() {
  const app = await montarApp({
    paginaId: 'celdas',
    cabecera: (sesion) => ({
      titulo: tienePermiso(sesion, 'celdas.cambiar_estado')
        ? 'Control de espacios'
        : 'Disponibilidad de celdas',
      subtitulo: 'mapa de celdas por piso, actualizado en tiempo real',
      acciones: [
        indicador,
        tienePermiso(sesion, 'movimientos.registrar') ? crearBuscador() : null,
        tienePermiso(sesion, 'movimientos.registrar')
          ? createButton({
              label: 'Registrar ingreso',
              icon: 'i-in',
              onClick: (e) => abrirIngreso(e.currentTarget),
            })
          : null,
        tienePermiso(sesion, 'celdas.gestionar')
          ? createButton({
              label: 'Gestionar celdas',
              icon: 'i-map',
              onClick: (e) => abrirGestion(null, e.currentTarget),
            })
          : null,
        tienePermiso(sesion, 'puertas.gestionar')
          ? createButton({
              label: 'Puertas',
              variant: 'dark',
              icon: 'i-in',
              onClick: (e) =>
                abrirGestionPuertas({
                  origen: e.currentTarget,
                  // El modal de ingreso y el cobro usan las puertas activas de la sede.
                  onCambio: (activas) => estado.sede && (estado.sede.puertas = activas),
                }),
            })
          : null,
      ].filter(Boolean),
    }),
  });
  if (!app) return;
  estado.sesion = app.sesion;
  estado.sede = app.sede;

  app.main.append(
    zonas.kpis,
    el('div', { className: 'workspace' }, [zonas.mapa, zonas.detalle]),
    zonas.bitacora
  );
  try {
    await cargarDatos();
  } catch (error) {
    showToast(error.message, 'error');
    return;
  }
  pintarTodo();
  conectar();
  cargarBitacora();
  cargarFacturacion();

  // El "tiempo dentro" y el valor a pagar del detalle avanzan solos (cobro por minuto).
  setInterval(() => {
    if (!estado.seleccionadaId) return;
    if (!zonas.detalle.contains(document.activeElement)) pintarDetalle();
    actualizarLiquidacion();
  }, 60 * 1000);
}

iniciar();
