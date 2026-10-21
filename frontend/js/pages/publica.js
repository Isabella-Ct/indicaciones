/**
 * Página pública (REQ-WEB-1), sin sesión: portada, disponibilidad en vivo, tarifas
 * vigentes, servicios, pico y placa de hoy, ubicación y contacto. Todos los datos salen
 * de la API pública (solo totales: nunca celdas, placas ni personas).
 */
import { el } from '../utils/dom.js';
import {
  createPublicLayout,
  createPublicSection,
} from '../components/templates/public-layout/public-layout.js';
import { createHero } from '../components/organisms/hero/hero.js';
import {
  createAvailabilityWidget,
  setAvailability,
  setAvailabilityStatus,
} from '../components/organisms/availability-widget/availability-widget.js';
import { createPricingTable } from '../components/organisms/pricing-table/pricing-table.js';
import { createFeatureGrid } from '../components/organisms/feature-grid/feature-grid.js';
import { createContactSection } from '../components/organisms/contact-section/contact-section.js';
import { createFooter } from '../components/organisms/footer/footer.js';
import { createButton } from '../components/atoms/button/button.js';
import { createIcon } from '../components/atoms/icon/icon.js';
import { createEmptyState } from '../components/molecules/empty-state/empty-state.js';
import { obtenerSede, subtituloSede } from '../services/parqueadero.service.js';
import {
  obtenerDisponibilidad,
  obtenerTarifas,
  obtenerPicoPlacaHoy,
  suscribirDisponibilidad,
} from '../services/publico.service.js';
import { RUTA_LOGIN } from '../utils/sesion.js';

/** Carrera 43 # 47-53, Medellín (centro del mapa embebido de OpenStreetMap). */
const UBICACION = { lat: 6.2507, lon: -75.5638, zoom: 17 };

const SERVICIOS = [
  {
    icono: 'i-clock',
    titulo: 'Abierto 24 horas',
    texto: 'Entra y sal a cualquier hora, todos los días del año.',
  },
  {
    icono: 'i-car',
    titulo: 'Carros y motos',
    texto: 'Celdas separadas por tipo y celdas accesibles para quien las necesita.',
  },
  {
    icono: 'i-calendar',
    titulo: 'Mensualidades',
    texto: 'Planes mensuales o anuales, con celda fija opcional.',
  },
  {
    icono: 'i-map',
    titulo: 'Reservas',
    texto: 'Desde tu cuenta aparta una celda libre antes de llegar.',
  },
  {
    icono: 'i-shield',
    titulo: 'Seguridad',
    texto: 'Registro de cada entrada y salida con ticket y factura.',
  },
  {
    icono: 'i-alert',
    titulo: 'Registro de incidentes',
    texto: 'Cualquier novedad con tu vehículo queda registrada y te avisamos.',
  },
];

const ENLACES = [
  { texto: 'Disponibilidad', href: '#disponibilidad' },
  { texto: 'Tarifas', href: '#tarifas' },
  { texto: 'Servicios', href: '#servicios' },
  { texto: 'Pico y placa', href: '#pico-placa' },
  { texto: 'Ubicación', href: '#ubicacion' },
  { texto: 'Ingresar', href: RUTA_LOGIN },
];

const sinDatos = () =>
  createEmptyState({
    title: 'No disponible',
    text: 'No pudimos cargar esta información. Intenta de nuevo en un momento.',
  });

function seccionDisponibilidad() {
  const widget = createAvailabilityWidget();
  obtenerDisponibilidad()
    .then((datos) => setAvailability(widget, datos))
    .catch(() => {});
  suscribirDisponibilidad({
    onDisponibilidad: (datos) => setAvailability(widget, datos),
    onEstado: (e) => setAvailabilityStatus(widget, e),
  });
  return createPublicSection({
    id: 'disponibilidad',
    titulo: 'Disponibilidad en vivo',
    subtitulo: 'Cupos libres en este momento',
    children: [widget],
  });
}

function seccionTarifas(datos) {
  return createPublicSection({
    id: 'tarifas',
    titulo: 'Tarifas',
    subtitulo: 'Pagas por minuto, con un tope por cada 24 horas',
    children: [
      datos
        ? createPricingTable({
            tarifas: { carro: datos.carro, moto: datos.moto },
            mensualidades: datos.mensualidades,
          })
        : sinDatos(),
    ],
  });
}

function reglaTipo(tipo, titulo, regla) {
  return el('div', {}, [
    el('h3', { className: 'price-title' }, [
      createIcon({ name: tipo === 'moto' ? 'i-moto' : 'i-car' }),
      titulo,
    ]),
    regla.digitos.length
      ? el(
          'div',
          {
            className: 'plate-digits',
            attrs: { 'aria-label': `Dígitos restringidos: ${regla.digitos.join(', ')}` },
          },
          regla.digitos.map((d) => el('span', { className: 'plate-digit', text: String(d) }))
        )
      : el('p', { text: 'Sin restricción hoy.' }),
    el('p', {
      text: regla.digitos.length
        ? `Según el ${regla.criterio}, de ${regla.horarios.join(' y ')}.`
        : `Hoy pueden circular todas las placas.`,
    }),
  ]);
}

function seccionPicoPlaca(datos) {
  return createPublicSection({
    id: 'pico-placa',
    titulo: 'Pico y placa hoy',
    subtitulo: datos ? `${datos.dia_nombre} ${datos.fecha}` : 'Medellín',
    children: [
      datos
        ? el('div', { className: 'plate-rule' }, [
            reglaTipo('carro', 'Carros', datos.carro),
            reglaTipo('moto', 'Motos', datos.moto),
          ])
        : sinDatos(),
    ],
  });
}

async function iniciar() {
  const [sede, tarifas, picoPlaca] = await Promise.all([
    obtenerSede().catch(() => null),
    obtenerTarifas().catch(() => null),
    obtenerPicoPlacaHoy().catch(() => null),
  ]);

  const hero = createHero({
    sede: subtituloSede(sede) || 'Parqueadero ABC · Medellín',
    titulo: '24 horas en el corazón de Medellín',
    texto:
      'Parqueo para carros y motos con cobro por minuto, mensualidades y reservas desde tu cuenta.',
    datos: sede ? [`${sede.direccion}, ${sede.ciudad}`, sede.horario] : [],
    acciones: [
      createButton({ label: 'Ver disponibilidad', href: '#disponibilidad' }),
      createButton({ label: 'Ingresar', href: RUTA_LOGIN, variant: 'ghost', icon: 'i-in' }),
    ],
  });

  document.getElementById('app').replaceChildren(
    createPublicLayout({
      sede: subtituloSede(sede),
      actions: [createButton({ label: 'Ingresar', href: RUTA_LOGIN, size: 'sm', icon: 'i-in' })],
      hero,
      content: [
        seccionDisponibilidad(),
        seccionTarifas(tarifas),
        createPublicSection({
          id: 'servicios',
          titulo: 'Servicios',
          children: [createFeatureGrid({ items: SERVICIOS })],
        }),
        seccionPicoPlaca(picoPlaca),
        createPublicSection({
          id: 'ubicacion',
          titulo: 'Ubicación y contacto',
          children: [
            createContactSection({
              sede,
              mapa: UBICACION,
              acciones: [createButton({ label: 'Ingresar', href: RUTA_LOGIN, size: 'sm' })],
            }),
          ],
        }),
      ],
      footer: createFooter({ sede, franja: true, enlaces: ENLACES }),
    })
  );
}

iniciar();
