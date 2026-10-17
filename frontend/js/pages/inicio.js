/**
 * Inicio del panel interno: bienvenida con nombre y rol. El dashboard con
 * indicadores reales llega en la fase de reportes.
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createDataList } from '../components/molecules/data-list/data-list.js';
import { createEmptyState } from '../components/molecules/empty-state/empty-state.js';
import { createStatusChip } from '../components/atoms/status-chip/status-chip.js';
import { createAvatar } from '../components/atoms/avatar/avatar.js';
import { createButton } from '../components/atoms/button/button.js';
import { itemsPermitidos } from '../utils/navegacion.js';
import { esPersonal, etiquetaRol, primerNombre } from '../utils/sesion.js';

async function iniciar() {
  const app = await montarApp({
    paginaId: 'inicio',
    cabecera: (sesion, sede) => ({
      titulo: `Hola, ${primerNombre(sesion)}`,
      subtitulo: [etiquetaRol(sesion.rol), sede ? `${sede.nombre} · ${sede.ciudad}` : null]
        .filter(Boolean)
        .join(' · '),
    }),
  });
  if (!app) return;
  const { sesion, main } = app;

  const cuenta = createPanel({
    title: 'Tu cuenta',
    children: [
      el('div', { className: 'account-hero' }, [
        createAvatar({ nombre: sesion.nombre_completo, fotoUrl: sesion.foto_url, size: 'md' }),
        el('div', {}, [
          el('p', { className: 'account-name', text: sesion.nombre_completo }),
          createStatusChip({ text: etiquetaRol(sesion.rol), variant: 'free' }),
        ]),
      ]),
      createDataList({
        items: [
          { term: 'Código', value: String(sesion.id).padStart(5, '0') },
          { term: 'Documento', value: `${sesion.tipo_documento} ${sesion.numero_documento}` },
          { term: 'Correo', value: sesion.correo },
          { term: 'Celular', value: sesion.celular },
        ],
      }),
    ],
  });

  const modulos = itemsPermitidos(sesion).filter((item) => item.id !== 'inicio');
  const accesos = createPanel({
    title: 'Accesos rápidos',
    children: [
      el(
        'div',
        { className: 'link-grid' },
        modulos.map((item) =>
          createButton({ label: item.etiqueta, variant: 'ghost', href: item.href })
        )
      ),
    ],
  });

  const tablero = el('div', { className: 'page-grid-full' }, [
    createEmptyState({
      title: 'Tablero en preparación',
      text: esPersonal(sesion)
        ? 'Aquí verás la ocupación en tiempo real, el recaudo del día y los últimos movimientos.'
        : 'Aquí verás el estado de tus vehículos, tus reservas y tus últimas facturas.',
    }),
  ]);

  main.append(el('div', { className: 'page-grid' }, [cuenta, accesos, tablero]));
}

iniciar();
