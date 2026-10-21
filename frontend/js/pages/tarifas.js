/**
 * Tarifas — REQ-TAR-1/2: tarifa vigente por tipo, nueva tarifa (admin) y simulador
 * "si un carro dura X minutos, paga $Y". El cálculo lo hace siempre el servidor.
 * El administrador edita además los parámetros del negocio (tabla configuracion).
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import { limpiarErrores, mostrarErrorApi, marcarError } from './comun/formularios.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createField } from '../components/molecules/field/field.js';
import { createTiles } from '../components/molecules/tiles/tiles.js';
import { createAlert, setAlert } from '../components/molecules/alert/alert.js';
import { createDataList } from '../components/molecules/data-list/data-list.js';
import { createCharge } from '../components/molecules/charge/charge.js';
import { showToast } from '../components/molecules/toast/toast.js';
import { createDataTable } from '../components/organisms/data-table/data-table.js';
import { confirmar } from './comun/confirmar.js';
import { createButton, setButtonLoading } from '../components/atoms/button/button.js';
import { createInput } from '../components/atoms/input/input.js';
import { createIcon } from '../components/atoms/icon/icon.js';
import { createLabelCaps } from '../components/atoms/label-caps/label-caps.js';
import { obtenerTarifas, crearTarifa, simularCobro } from '../services/facturacion.service.js';
import { listarParametros, actualizarParametro } from '../services/configuracion.service.js';
import { formatearCOP, formatearFechaHora } from '../utils/formato.js';
import { tienePermiso } from '../utils/sesion.js';

const TIPOS = { carro: 'Carros', moto: 'Motos' };
const estado = { sesion: null, vigentes: { carro: null, moto: null }, historial: [] };
const zonas = {
  vigentes: el('div', { className: 'page-grid' }),
  historial: el('div'),
  parametros: el('div'),
};
const puede = (codigo) => tienePermiso(estado.sesion, codigo);

function panelVigente(tipo) {
  const t = estado.vigentes[tipo];
  return createPanel({
    title: `Tarifa vigente · ${TIPOS[tipo]}`,
    children: t
      ? [
          el('p', { className: 'tariff-headline' }, [
            createIcon({ name: tipo === 'moto' ? 'i-moto' : 'i-car' }),
            el('strong', { text: formatearCOP(t.valor_fraccion) }),
            el('span', { text: ` / ${t.unidad}` }),
          ]),
          createDataList({
            items: [
              {
                term: 'Fracción',
                value: `${t.minutos_fraccion} min${t.minutos_fraccion === 1 ? ' (cobro por minuto)' : ''}`,
              },
              {
                term: 'Gracia',
                value: t.minutos_gracia ? `${t.minutos_gracia} min` : 'Sin gracia',
              },
              { term: 'Tope del día', value: formatearCOP(t.valor_dia_maximo) },
              { term: 'Vigente desde', value: formatearFechaHora(t.vigente_desde) },
            ],
          }),
        ]
      : [el('p', { className: 'field-error', text: 'No hay tarifa vigente: no se puede cobrar.' })],
  });
}

function pintarVigentes() {
  zonas.vigentes.replaceChildren(panelVigente('carro'), panelVigente('moto'));
}

function pintarHistorial() {
  if (!puede('tarifas.gestionar')) return;
  zonas.historial.replaceChildren(
    createPanel({
      title: 'Historial de tarifas',
      children: [
        el('p', {
          className: 'field-hint',
          text: 'Cada factura guarda la tarifa con la que se calculó: cambiar la tarifa no altera las facturas anteriores.',
        }),
        createDataTable({
          caption: 'Historial de tarifas',
          minWidth: 760,
          rows: estado.historial,
          rowClass: (t) => (t.activa ? 'is-highlighted' : ''),
          empty: { title: 'Sin tarifas' },
          columns: [
            {
              key: 'tipo',
              label: 'Tipo',
              render: (t) => (t.tipo_vehiculo === 'moto' ? 'Moto' : 'Carro'),
            },
            { key: 'descripcion', label: 'Tarifa', render: (t) => t.descripcion },
            {
              key: 'desde',
              label: 'Vigente desde',
              render: (t) =>
                el('span', { className: 'cell-nowrap', text: formatearFechaHora(t.vigente_desde) }),
            },
            { key: 'estado', label: 'Estado', render: (t) => (t.activa ? 'Vigente' : 'Anterior') },
          ],
        }),
      ],
    })
  );
}

/** Simulador + formulario de nueva tarifa (los valores del formulario se simulan en vivo). */
function panelEditor() {
  let tipo = 'carro';
  const gestiona = puede('tarifas.gestionar');
  const numero = (props) => createInput({ type: 'number', inputMode: 'numeric', ...props });
  const control = {
    valor_fraccion: numero({ placeholder: 'Ej. 120' }),
    minutos_fraccion: numero({ placeholder: 'Ej. 1' }),
    minutos_gracia: numero({ placeholder: 'Ej. 0' }),
    valor_dia_maximo: numero({ placeholder: 'Ej. 28000' }),
  };
  const campos = {
    valor_fraccion: createField({
      label: 'Valor por fracción',
      control: control.valor_fraccion,
      required: true,
      hint: 'Pesos por cada fracción.',
    }),
    minutos_fraccion: createField({
      label: 'Minutos por fracción',
      control: control.minutos_fraccion,
      required: true,
      hint: '1 = cobro por minuto; 15 = cada cuarto de hora.',
    }),
    minutos_gracia: createField({
      label: 'Minutos de gracia',
      control: control.minutos_gracia,
      hint: 'Estadías hasta este tiempo no pagan.',
    }),
    valor_dia_maximo: createField({
      label: 'Tope del día',
      control: control.valor_dia_maximo,
      required: true,
      hint: 'Máximo por cada bloque de 24 h.',
    }),
  };
  const minutos = numero({ value: '157' });
  const campoMinutos = createField({
    label: 'Si dura (minutos)',
    control: minutos,
    required: true,
  });
  const resultado = el('div', { className: 'charge-summary', attrs: { 'aria-live': 'polite' } });
  const pasos = el('ol', {
    className: 'charge-steps',
    attrs: { 'aria-label': 'Detalle del cálculo' },
  });
  const alerta = createAlert();

  function cargarVigente() {
    const t = estado.vigentes[tipo];
    for (const clave of Object.keys(control)) control[clave].value = t ? String(t[clave]) : '';
  }

  /** Valores del formulario (si son válidos) para simular la tarifa propuesta. */
  function propuesta() {
    const v = Object.fromEntries(
      Object.entries(control).map(([k, input]) => [
        k,
        input.value === '' ? NaN : Number(input.value),
      ])
    );
    if (Number.isNaN(v.minutos_gracia)) v.minutos_gracia = 0;
    const ok =
      v.valor_fraccion >= 0 &&
      v.minutos_fraccion >= 1 &&
      v.minutos_gracia >= 0 &&
      v.valor_dia_maximo >= 0;
    return ok ? v : null;
  }

  let temporizador = null;
  function simularPronto() {
    clearTimeout(temporizador);
    temporizador = setTimeout(simular, 250);
  }

  async function simular() {
    const m = Number(minutos.value);
    if (!(m >= 0) || !Number.isInteger(m)) {
      resultado.replaceChildren(el('p', { className: 'field-hint', text: 'Escribe los minutos.' }));
      pasos.replaceChildren();
      return;
    }
    try {
      const { cobro } = await simularCobro({
        tipo_vehiculo: tipo,
        minutos: m,
        tarifa: gestiona ? (propuesta() ?? undefined) : undefined,
      });
      resultado.replaceChildren(
        createCharge({
          etiqueta: `Un ${tipo} que dura ${m} min paga`,
          total: cobro.total,
          porcentajeTope: cobro.porcentajeTope,
          nota: cobro.nota,
        })
      );
      pasos.replaceChildren(
        ...cobro.detalle.filter((d) => d.paso !== 'total').map((d) => el('li', { text: d.texto }))
      );
    } catch (error) {
      resultado.replaceChildren(el('p', { className: 'field-error', text: error.message }));
      pasos.replaceChildren();
    }
  }

  const tiles = createTiles({
    name: 'tipo-tarifa',
    label: 'Tipo de vehículo',
    value: tipo,
    columns: 2,
    options: [
      { value: 'carro', label: 'Carro', icon: 'i-car' },
      { value: 'moto', label: 'Moto', icon: 'i-moto' },
    ],
    onChange: (v) => {
      tipo = v;
      cargarVigente();
      simular();
    },
  });

  minutos.addEventListener('input', simularPronto);
  Object.values(control).forEach((input) => input.addEventListener('input', simularPronto));

  const simulador = el('div', { className: 'stack' }, [
    createLabelCaps({ text: 'Simulador' }),
    campoMinutos,
    resultado,
    pasos,
  ]);

  if (!gestiona) {
    cargarVigente();
    simular();
    return createPanel({
      title: 'Simulador de cobro',
      children: [el('div', { className: 'stack' }, [tiles, simulador])],
    });
  }

  const guardar = createButton({ label: 'Guardar nueva tarifa', type: 'submit', icon: 'i-check' });
  const formulario = el('form', { className: 'stack', attrs: { novalidate: true } }, [
    alerta,
    tiles,
    el('div', { className: 'form-grid' }, Object.values(campos)),
    el('p', {
      className: 'field-hint',
      text: 'Al guardar, la tarifa anterior del mismo tipo deja de estar vigente. Los vehículos que ya están dentro pagan con la tarifa vigente al salir.',
    }),
    el('div', {}, [guardar]),
  ]);

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErrores(campos, alerta);
    const v = propuesta();
    if (!v) {
      if (!(Number(control.valor_fraccion.value) >= 0) || control.valor_fraccion.value === '')
        marcarError(campos.valor_fraccion, 'Escribe el valor.');
      if (!(Number(control.minutos_fraccion.value) >= 1))
        marcarError(campos.minutos_fraccion, 'Desde 1 minuto.');
      if (!(Number(control.valor_dia_maximo.value) >= 0) || control.valor_dia_maximo.value === '')
        marcarError(campos.valor_dia_maximo, 'Escribe el tope.');
      return;
    }
    const ok = await confirmar({
      titulo: `Nueva tarifa de ${TIPOS[tipo].toLowerCase()}`,
      mensaje: `${formatearCOP(v.valor_fraccion)} cada ${v.minutos_fraccion} min, tope ${formatearCOP(v.valor_dia_maximo)} por día. Reemplaza la tarifa vigente desde ahora.`,
      textoConfirmar: 'Guardar tarifa',
      origen: guardar,
    });
    if (!ok) return;
    setButtonLoading(guardar, true, 'Guardando…');
    try {
      const nueva = await crearTarifa({ tipo_vehiculo: tipo, ...v });
      showToast(
        `Tarifa de ${TIPOS[tipo].toLowerCase()} actualizada: ${nueva.descripcion}.`,
        'success'
      );
      setAlert(alerta, '');
      await recargar();
    } catch (error) {
      mostrarErrorApi(error, campos, alerta);
    } finally {
      setButtonLoading(guardar, false);
    }
  });

  cargarVigente();
  simular();
  return createPanel({
    title: 'Nueva tarifa y simulador',
    children: [el('div', { className: 'tariff-editor' }, [formulario, simulador])],
  });
}

async function recargar() {
  try {
    const datos = await obtenerTarifas({ historial: puede('tarifas.gestionar') });
    estado.vigentes = datos.vigentes;
    estado.historial = datos.historial ?? [];
    pintarVigentes();
    pintarHistorial();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ---------------------------------------------------------------- parámetros (admin)
/** Valores del negocio de la tabla configuracion (minutos de reserva, membresías, etc.). */
function pintarParametros(parametros) {
  const fila = (p) => {
    const numerico = p.tipo === 'entero' || p.tipo === 'decimal';
    const input = createInput({
      name: p.clave,
      type: numerico ? 'number' : 'text',
      value: String(p.valor),
      inputMode: p.tipo === 'entero' ? 'numeric' : p.tipo === 'decimal' ? 'decimal' : undefined,
      maxLength: 255,
    });
    input.setAttribute('aria-label', p.descripcion);
    if (numerico) input.setAttribute('min', p.tipo === 'entero' ? '1' : '0');
    if (p.tipo === 'decimal') input.setAttribute('step', '0.01');
    const guardar = createButton({
      label: 'Guardar',
      size: 'sm',
      variant: 'dark',
      icon: 'i-check',
    });
    guardar.addEventListener('click', async () => {
      setButtonLoading(guardar, true);
      try {
        const actualizado = await actualizarParametro(p.clave, input.value);
        Object.assign(p, actualizado);
        input.value = String(actualizado.valor);
        showToast(`Parámetro actualizado: ${p.descripcion}.`, 'success');
      } catch (error) {
        showToast(error.message, 'error');
      } finally {
        setButtonLoading(guardar, false);
      }
    });
    return { ...p, input, guardar };
  };
  const filas = parametros.map(fila);
  zonas.parametros.replaceChildren(
    createPanel({
      title: 'Parámetros del negocio',
      children: [
        el('p', {
          className: 'field-hint',
          text: 'Valores que usa el sistema al reservar, vender membresías, avisar vencimientos y cobrar con descuento. Los cambios aplican de inmediato.',
        }),
        createDataTable({
          caption: 'Parámetros del negocio',
          minWidth: 640,
          rows: filas,
          rowKey: (f) => f.clave,
          columns: [
            {
              key: 'descripcion',
              label: 'Parámetro',
              render: (f) =>
                el('div', {}, [
                  el('strong', { text: f.descripcion }),
                  el('small', { className: 'cell-muted', text: ` ${f.clave}` }),
                ]),
            },
            { key: 'valor', label: 'Valor', render: (f) => f.input },
            {
              key: 'actualizado',
              label: 'Último cambio',
              render: (f) =>
                f.actualizado_por
                  ? `${formatearFechaHora(f.actualizado_en)} · ${f.actualizado_por.nombre_completo}`
                  : 'Valor inicial',
            },
            { key: 'accion', label: 'Acción', render: (f) => f.guardar },
          ],
        }),
      ],
    })
  );
}

async function cargarParametros() {
  try {
    pintarParametros(await listarParametros());
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function iniciar() {
  const app = await montarApp({
    paginaId: 'tarifas',
    cabecera: (sesion) => ({
      titulo: 'Tarifas',
      subtitulo: tienePermiso(sesion, 'tarifas.gestionar')
        ? 'cobro por fracción con tope diario · configura y simula'
        : 'cobro por fracción con tope diario · solo consulta',
    }),
  });
  if (!app) return;
  estado.sesion = app.sesion;
  await recargar();
  app.main.append(
    el('div', { className: 'stack' }, [
      zonas.vigentes,
      panelEditor(),
      zonas.historial,
      puede('configuracion.gestionar') ? zonas.parametros : null,
    ])
  );
  if (puede('configuracion.gestionar')) await cargarParametros();
}

iniciar();
