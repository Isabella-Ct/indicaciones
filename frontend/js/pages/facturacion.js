/**
 * Facturación (wireframe 04 con estilo PARKO) — REQ-FAC-1/2: listado de facturas con
 * filtros, total del período y PDF. El operador solo ve las de hoy (lo fuerza el servidor).
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import { columnasFacturas } from './comun/tabla-facturas.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createField } from '../components/molecules/field/field.js';
import { createSearchBox } from '../components/molecules/search-box/search-box.js';
import { showToast } from '../components/molecules/toast/toast.js';
import { createKpis } from '../components/organisms/kpis/kpis.js';
import { createDataTable } from '../components/organisms/data-table/data-table.js';
import { createInput } from '../components/atoms/input/input.js';
import { createSelect } from '../components/atoms/select/select.js';
import { listarFacturas } from '../services/facturacion.service.js';
import { normalizarPlaca } from '../utils/placa.js';
import { formatearCOP, formatearFecha, hoyBogota, METODOS_PAGO } from '../utils/formato.js';
import { tienePermiso } from '../utils/sesion.js';

const estado = {
  sesion: null,
  filtros: {
    desde: hoyBogota(),
    hasta: hoyBogota(),
    metodo_pago: '',
    concepto: '',
    placa: '',
    pagina: 1,
    limite: 20,
  },
  resultado: { data: [], meta: null },
  cargando: false,
};
const contenedorTotales = el('div');
const contenedorTabla = el('div');
const esAdmin = () => tienePermiso(estado.sesion, 'reportes.ver');

function periodo(meta) {
  if (!meta?.desde && !meta?.hasta) return 'todas las fechas';
  if (meta.desde === meta.hasta) return formatearFecha(meta.desde);
  return `${formatearFecha(meta.desde)} – ${formatearFecha(meta.hasta)}`;
}

function pintar() {
  const { data, meta } = estado.resultado;
  if (meta) {
    contenedorTotales.replaceChildren(
      createKpis({
        label: 'Totales del período',
        items: [
          {
            label: 'Total del período',
            value: formatearCOP(meta.suma_total),
            main: true,
            note: periodo(meta),
          },
          { label: 'Facturas', value: meta.total, note: 'con los filtros aplicados' },
          {
            label: 'Promedio por factura',
            value: meta.total ? formatearCOP(meta.suma_total / meta.total) : '—',
            note: 'total del período ÷ facturas',
          },
        ],
      })
    );
  }
  contenedorTabla.replaceChildren(
    createDataTable({
      caption: 'Facturas',
      minWidth: 980,
      rows: data,
      loading: estado.cargando,
      empty: { title: 'Sin facturas', text: 'No hay facturas con esos filtros.' },
      columns: columnasFacturas(),
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
}

async function recargar() {
  estado.cargando = true;
  pintar();
  try {
    estado.resultado = await listarFacturas(estado.filtros);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    estado.cargando = false;
    pintar();
  }
}

function filtros() {
  const aplicar = (clave) => (valor) => {
    estado.filtros[clave] = valor;
    estado.filtros.pagina = 1;
    recargar();
  };
  const fecha = (clave) => {
    const input = createInput({ type: 'date', value: estado.filtros[clave] });
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
    // El operador solo consulta el día (el servidor ignora otras fechas).
    esAdmin() ? createField({ label: 'Desde', control: fecha('desde') }) : null,
    esAdmin() ? createField({ label: 'Hasta', control: fecha('hasta') }) : null,
    createField({
      label: 'Método',
      control: createSelect({
        options: [
          { value: '', label: 'Todos' },
          ...Object.entries(METODOS_PAGO).map(([value, label]) => ({ value, label })),
        ],
        onChange: (e) => aplicar('metodo_pago')(e.target.value),
      }),
    }),
    createField({
      label: 'Concepto',
      control: createSelect({
        options: [
          { value: '', label: 'Todos' },
          { value: 'estadia', label: 'Parqueo' },
          { value: 'membresia', label: 'Mensualidad' },
        ],
        onChange: (e) => aplicar('concepto')(e.target.value),
      }),
    }),
  ]);
}

async function iniciar() {
  const app = await montarApp({
    paginaId: 'facturas',
    cabecera: (sesion) => ({
      titulo: 'Facturación',
      subtitulo: tienePermiso(sesion, 'reportes.ver')
        ? 'facturas de parqueo y mensualidades · total del período'
        : 'facturas de hoy · total del turno',
    }),
  });
  if (!app) return;
  estado.sesion = app.sesion;
  app.main.append(
    el('div', { className: 'stack' }, [
      contenedorTotales,
      createPanel({ title: 'Facturas', children: [filtros(), contenedorTabla] }),
    ])
  );
  await recargar();
}

iniciar();
