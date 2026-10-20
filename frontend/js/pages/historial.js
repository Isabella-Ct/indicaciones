/**
 * Historial de movimientos (wireframe 10 con estilo PARKO) — REQ-INEX-3:
 * entradas y salidas con fecha, hora, duración, celda y puertas; exportar CSV.
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createField } from '../components/molecules/field/field.js';
import { createSearchBox } from '../components/molecules/search-box/search-box.js';
import { showToast } from '../components/molecules/toast/toast.js';
import { createDataTable } from '../components/organisms/data-table/data-table.js';
import { createButton, setButtonLoading } from '../components/atoms/button/button.js';
import { createInput } from '../components/atoms/input/input.js';
import { createSelect } from '../components/atoms/select/select.js';
import { createPlate } from '../components/atoms/plate/plate.js';
import { createStatusChip } from '../components/atoms/status-chip/status-chip.js';
import { historialEstadias, urlTicketPdf } from '../services/estadias.service.js';
import { normalizarPlaca } from '../utils/placa.js';
import { formatearFechaHora } from '../utils/formato.js';

const estado = {
  filtros: { placa: '', desde: '', hasta: '', puerta_id: '', estado: '', pagina: 1, limite: 20 },
  resultado: { data: [], meta: null },
  cargando: false,
};
const contenedorTabla = el('div');

const duracion = (e) => e.tiempo;
const puertas = (e) => [e.puerta_entrada, e.puerta_salida].filter(Boolean).join(' → ');
const observaciones = (e) =>
  [e.observaciones_entrada, e.deja_llaves ? 'Dejó llaves' : null].filter(Boolean).join(' · ') ||
  '—';

function pintar() {
  const { data, meta } = estado.resultado;
  contenedorTabla.replaceChildren(
    createDataTable({
      caption: 'Historial de movimientos',
      minWidth: 1040,
      rows: data,
      loading: estado.cargando,
      empty: { title: 'Sin movimientos', text: 'No hay entradas ni salidas con esos filtros.' },
      columns: [
        {
          key: 'vehiculo',
          label: 'Vehículo',
          render: (e) =>
            el('span', {}, [
              createPlate({ placa: e.vehiculo.placa }),
              el('span', {
                className: 'cell-sub cell-nowrap',
                text: `${e.vehiculo.tipo === 'moto' ? 'Moto' : 'Carro'} · ${e.codigo_ticket}`,
              }),
            ]),
        },
        {
          key: 'entrada',
          label: 'Ingreso',
          render: (e) =>
            el('span', {
              className: 'cell-nowrap',
              text: formatearFechaHora(e.fecha_hora_entrada),
            }),
        },
        {
          key: 'salida',
          label: 'Salida',
          render: (e) =>
            e.fecha_hora_salida
              ? el('span', {
                  className: 'cell-nowrap',
                  text: formatearFechaHora(e.fecha_hora_salida),
                })
              : createStatusChip({ text: 'Dentro', variant: 'occupied' }),
        },
        {
          key: 'duracion',
          label: 'Duración',
          render: (e) => el('span', { className: 'cell-nowrap', text: duracion(e) }),
        },
        {
          key: 'celda',
          label: 'Celda',
          render: (e) =>
            el('span', { className: 'cell-nowrap', text: `${e.celda.codigo} · ${e.celda.piso}` }),
        },
        { key: 'puertas', label: 'Puertas', render: puertas },
        { key: 'observaciones', label: 'Observaciones', render: observaciones },
        {
          key: 'ticket',
          label: 'Ticket',
          align: 'right',
          render: (e) =>
            createButton({
              label: 'PDF',
              variant: 'ghost',
              size: 'sm',
              icon: 'i-print',
              ariaLabel: `Ticket ${e.codigo_ticket} en PDF`,
              href: urlTicketPdf(e.id),
            }),
        },
      ],
      pagination: meta && {
        pagina: meta.pagina,
        totalPaginas: meta.total_paginas,
        total: meta.total,
        onChange: (pagina) => {
          estado.filtros.pagina = pagina;
          recargar();
        },
      },
    })
  );
  contenedorTabla.querySelectorAll('a.btn').forEach((a) => a.setAttribute('target', '_blank'));
}

async function recargar() {
  estado.cargando = true;
  pintar();
  try {
    estado.resultado = await historialEstadias(estado.filtros);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    estado.cargando = false;
    pintar();
  }
}

/** CSV con todos los registros del filtro (página a página, 100 por petición). */
async function exportarCsv(boton) {
  setButtonLoading(boton, true, 'Exportando…');
  try {
    const filas = [];
    for (let pagina = 1; ; pagina++) {
      const { data, meta } = await historialEstadias({ ...estado.filtros, pagina, limite: 100 });
      filas.push(...data);
      if (pagina >= meta.total_paginas) break;
    }
    const encabezado = [
      'Ticket',
      'Placa',
      'Tipo',
      'Ingreso',
      'Salida',
      'Minutos',
      'Duración',
      'Celda',
      'Piso',
      'Puerta entrada',
      'Puerta salida',
      'Observaciones',
      'Llaves',
    ];
    const campo = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lineas = filas.map((e) =>
      [
        e.codigo_ticket,
        e.vehiculo.placa,
        e.vehiculo.tipo,
        formatearFechaHora(e.fecha_hora_entrada),
        e.fecha_hora_salida ? formatearFechaHora(e.fecha_hora_salida) : '',
        e.minutos,
        e.tiempo,
        e.celda.codigo,
        e.celda.piso,
        e.puerta_entrada,
        e.puerta_salida ?? '',
        e.observaciones_entrada ?? '',
        e.deja_llaves ? 'Sí' : 'No',
      ]
        .map(campo)
        .join(';')
    );
    // BOM + ";" para que Excel en español lo abra con tildes y columnas correctas.
    const contenido = `\uFEFF${[encabezado.map(campo).join(';'), ...lineas].join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
    const enlace = el('a', {
      attrs: {
        href: url,
        download: `parko-movimientos-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
    showToast(`CSV exportado con ${filas.length} movimientos.`, 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    setButtonLoading(boton, false);
  }
}

function filtros(puertasSede) {
  const aplicar = (clave) => (valor) => {
    estado.filtros[clave] = valor;
    estado.filtros.pagina = 1;
    recargar();
  };
  const fecha = (clave) => {
    const input = createInput({ type: 'date' });
    input.addEventListener('change', () => aplicar(clave)(input.value));
    return input;
  };
  return el('div', { className: 'filters' }, [
    createSearchBox({
      label: 'Placa',
      placeholder: 'Ej. MNP908',
      transform: normalizarPlaca,
      onSearch: aplicar('placa'),
    }),
    createField({ label: 'Desde', control: fecha('desde') }),
    createField({ label: 'Hasta', control: fecha('hasta') }),
    createField({
      label: 'Puerta',
      control: createSelect({
        options: [
          { value: '', label: 'Todas' },
          ...puertasSede.map((p) => ({ value: String(p.id), label: p.nombre })),
        ],
        onChange: (e) => aplicar('puerta_id')(e.target.value),
      }),
    }),
    createField({
      label: 'Estado',
      control: createSelect({
        options: [
          { value: '', label: 'Todos' },
          { value: 'en_curso', label: 'Dentro ahora' },
          { value: 'finalizada', label: 'Finalizadas' },
        ],
        onChange: (e) => aplicar('estado')(e.target.value),
      }),
    }),
  ]);
}

async function iniciar() {
  const exportar = createButton({
    label: 'Exportar CSV',
    variant: 'dark',
    onClick: () => exportarCsv(exportar),
  });
  const app = await montarApp({
    paginaId: 'historial',
    cabecera: () => ({
      titulo: 'Historial de movimientos',
      subtitulo: 'entradas y salidas con fecha, hora, duración, celda y puertas',
      acciones: [exportar],
    }),
  });
  if (!app) return;
  app.main.append(
    createPanel({
      title: 'Movimientos',
      children: [filtros(app.sede?.puertas ?? []), contenedorTabla],
    })
  );
  await recargar();
}

iniciar();
