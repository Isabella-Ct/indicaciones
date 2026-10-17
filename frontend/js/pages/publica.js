/**
 * Página pública provisional (REQ-WEB-1 se completa en la Fase 7):
 * datos de la sede desde la BD y acceso al login.
 */
import { el } from '../utils/dom.js';
import { createPublicLayout } from '../components/templates/public-layout/public-layout.js';
import { createFooter } from '../components/organisms/footer/footer.js';
import { createButton } from '../components/atoms/button/button.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createDataList } from '../components/molecules/data-list/data-list.js';
import { createEmptyState } from '../components/molecules/empty-state/empty-state.js';
import { createLabelCaps } from '../components/atoms/label-caps/label-caps.js';
import { obtenerSede, subtituloSede } from '../services/parqueadero.service.js';
import { RUTA_LOGIN } from '../utils/sesion.js';

async function iniciar() {
  const sede = await obtenerSede().catch(() => null);

  const hero = el('section', { className: 'hero', attrs: { 'aria-labelledby': 'hero-titulo' } }, [
    el('div', { className: 'hero-copy' }, [
      createLabelCaps({ text: 'Carros y motos · Abierto 24 horas' }),
      el('h1', { text: sede ? sede.nombre : 'PARKO', attrs: { id: 'hero-titulo' } }),
      el('p', {
        text: 'Parqueo seguro en el centro de Medellín. Consulta tus vehículos, facturas y reservas desde tu cuenta.',
      }),
      el('div', { className: 'hero-actions' }, [
        createButton({ label: 'Iniciar sesión', href: RUTA_LOGIN, variant: 'dark', icon: 'i-in' }),
      ]),
    ]),
    createPanel({
      title: 'Dónde estamos',
      children: [
        createDataList({
          items: [
            { term: 'Dirección', value: sede?.direccion ?? '—' },
            { term: 'Ciudad', value: sede?.ciudad ?? '—' },
            { term: 'Horario', value: sede?.horario ?? '—' },
            { term: 'Teléfono', value: sede?.telefono ?? '—' },
          ],
        }),
      ],
    }),
  ]);

  const pronto = createEmptyState({
    title: 'Disponibilidad y tarifas en línea',
    text: 'Muy pronto podrás ver aquí las celdas libres en tiempo real y las tarifas vigentes.',
  });

  document.getElementById('app').replaceChildren(
    createPublicLayout({
      sede: subtituloSede(sede),
      actions: [createButton({ label: 'Ingresar', href: RUTA_LOGIN })],
      content: [hero, pronto],
      footer: createFooter({ sede }),
    })
  );
}

iniciar();
