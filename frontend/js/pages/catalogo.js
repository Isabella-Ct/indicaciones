/**
 * Catálogo de componentes (SOLO DESARROLLO): muestra atoms, molecules y
 * organisms con sus variantes para compararlos con docs/diseno-parko/.
 * Usa datos de ejemplo; no llama a la API.
 */
import { el } from '../utils/dom.js';
import { createButton, setButtonLoading } from '../components/atoms/button/button.js';
import { createIconButton } from '../components/atoms/icon-button/icon-button.js';
import { createIcon } from '../components/atoms/icon/icon.js';
import { createInput } from '../components/atoms/input/input.js';
import { createSelect } from '../components/atoms/select/select.js';
import { createTextarea } from '../components/atoms/textarea/textarea.js';
import { createLabelCaps } from '../components/atoms/label-caps/label-caps.js';
import { createStatusChip, ESTADOS_CELDA } from '../components/atoms/status-chip/status-chip.js';
import { createPlate } from '../components/atoms/plate/plate.js';
import { createMeter } from '../components/atoms/meter/meter.js';
import { createSpinner } from '../components/atoms/spinner/spinner.js';
import { createLink } from '../components/atoms/link/link.js';
import { createAvatar } from '../components/atoms/avatar/avatar.js';
import { createBrandMark } from '../components/atoms/brand-mark/brand-mark.js';
import { createHazardStrip } from '../components/atoms/hazard-strip/hazard-strip.js';
import { createField } from '../components/molecules/field/field.js';
import { createTiles } from '../components/molecules/tiles/tiles.js';
import { createCheck } from '../components/molecules/check/check.js';
import { createKpi } from '../components/molecules/kpi/kpi.js';
import { createEmptyState } from '../components/molecules/empty-state/empty-state.js';
import { createBrand } from '../components/molecules/brand/brand.js';
import { createShift } from '../components/molecules/shift/shift.js';
import { showToast } from '../components/molecules/toast/toast.js';
import { createAlert } from '../components/molecules/alert/alert.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createPageHead } from '../components/molecules/page-head/page-head.js';
import { createDataList } from '../components/molecules/data-list/data-list.js';
import { createUserMenu } from '../components/molecules/user-menu/user-menu.js';
import { createHeader } from '../components/organisms/header/header.js';
import { createNavbar } from '../components/organisms/navbar/navbar.js';
import { createModal, openModal, closeModal } from '../components/organisms/modal/modal.js';
import { createFooter } from '../components/organisms/footer/footer.js';
import { createAppLayout } from '../components/templates/app-layout/app-layout.js';
import { ITEMS_NAVEGACION } from '../utils/navegacion.js';
import { normalizarPlaca } from '../utils/placa.js';
import { createSearchBox } from '../components/molecules/search-box/search-box.js';
import { createPagination } from '../components/molecules/pagination/pagination.js';
import { createUserPicker } from '../components/molecules/user-picker/user-picker.js';
import { createPhotoInput } from '../components/molecules/photo-input/photo-input.js';
import { createDataTable } from '../components/organisms/data-table/data-table.js';
import { createSpace } from '../components/molecules/space/space.js';
import { createMapLegend } from '../components/molecules/map-legend/map-legend.js';
import { createLiveStatus } from '../components/molecules/live-status/live-status.js';
import { createTicket } from '../components/organisms/ticket/ticket.js';
import { createMovementLog } from '../components/organisms/movement-log/movement-log.js';

// Celdas de ejemplo (formato de GET /celdas para el personal).
const celdaBase = {
  piso: { id: 1, nombre: 'Sótano 1' },
  fila_mapa: 'superior',
  es_accesible: false,
  tipo: 'carro',
};
const CELDAS = [
  { ...celdaBase, id: 901, codigo: 'A-01', estado: 'disponible', es_accesible: true },
  { ...celdaBase, id: 902, codigo: 'A-03', estado: 'ocupada', ocupante: { placa: 'JKL482' } },
  {
    ...celdaBase,
    id: 903,
    codigo: 'A-04',
    estado: 'reservada',
    reserva_origen: 'mensualidad',
    mensualidad: { placa: 'MNP908' },
  },
  { ...celdaBase, id: 904, codigo: 'A-09', estado: 'fuera_servicio' },
  {
    ...celdaBase,
    id: 905,
    codigo: 'M-01',
    estado: 'ocupada',
    tipo: 'moto',
    ocupante: { placa: 'XKP45F' },
  },
  { ...celdaBase, id: 906, codigo: 'M-02', estado: 'disponible', tipo: 'moto' },
];

// Datos de ejemplo para la tabla y el buscador de usuarios (sin API).
const CLIENTES = [
  {
    id: 4,
    nombre_completo: 'Andrea Salcedo Vélez',
    tipo_documento: 'CC',
    numero_documento: '1000000004',
  },
  {
    id: 5,
    nombre_completo: 'Paula Andrea Giraldo',
    tipo_documento: 'CC',
    numero_documento: '1000000005',
  },
];
const buscarEjemplo = async (doc) => CLIENTES.filter((c) => c.numero_documento.startsWith(doc));
const FILAS = [
  { id: 1, placa: 'MNP908', tipo: 'Carro', vehiculo: 'Mazda CX-30', dueno: 'Andrea Salcedo' },
  { id: 2, placa: 'XKP45F', tipo: 'Moto', vehiculo: 'Yamaha NMAX', dueno: 'Andrea Salcedo' },
  { id: 3, placa: 'JKL482', tipo: 'Carro', vehiculo: 'Chevrolet Spark', dueno: null },
];

const SEDE = {
  nombre: 'Parqueadero ABC',
  direccion: 'Carrera 43 # 47-53',
  ciudad: 'Medellín',
  horario: 'Abierto 24 horas',
};

/** Una muestra: título del componente + clase CSS + contenido. */
function muestra(nombre, clase, ...contenido) {
  return el('div', { className: 'catalogo-muestra' }, [
    el('p', { className: 'catalogo-nombre' }, [nombre, el('code', { text: clase })]),
    el('div', { className: 'catalogo-demo' }, contenido),
  ]);
}

function seccion(titulo, ...muestras) {
  return createPanel({
    title: titulo,
    children: [el('div', { className: 'catalogo-rejilla' }, muestras)],
  });
}

// ---------------- Atoms ----------------
const botonCargando = createButton({ label: 'Guardar', icon: 'i-check' });
setButtonLoading(botonCargando, true, 'Guardando…');

const placa = createInput({ id: 'cat-placa', plate: true, placeholder: 'ABC 123', maxLength: 7 });
placa.addEventListener('input', () => (placa.value = normalizarPlaca(placa.value)));

const atoms = seccion(
  'Atoms',
  muestra(
    'Botones',
    '.btn · --dark · --ghost · --block',
    createButton({ label: 'Registrar ingreso', icon: 'i-in' }),
    createButton({ label: 'Oscuro', variant: 'dark' }),
    createButton({ label: 'Cancelar', variant: 'ghost' }),
    botonCargando,
    createButton({ label: 'Botón de bloque', block: true })
  ),
  muestra(
    'Botón de icono',
    '.icon-button',
    createIconButton({ icon: 'i-x', label: 'Cerrar' }),
    createIconButton({ icon: 'i-print', label: 'Imprimir' }),
    createIconButton({ icon: 'i-menu', label: 'Menú' })
  ),
  muestra(
    'Iconos del sprite',
    '.icon · assets/icons.svg',
    el(
      'div',
      { className: 'catalogo-iconos' },
      [
        'i-in',
        'i-out',
        'i-x',
        'i-print',
        'i-car',
        'i-moto',
        'i-wheel',
        'i-menu',
        'i-user',
        'i-logout',
        'i-key',
        'i-chevron-down',
        'i-check',
        'i-alert',
        'i-info',
        'i-eye',
        'i-home',
        'i-map',
      ].map((nombre) =>
        el('span', { attrs: { title: nombre } }, [
          createIcon({ name: nombre }),
          el('small', { text: nombre }),
        ])
      )
    ),
    el('div', { className: 'catalogo-autos' }, [
      createIcon({ name: 'car-top', className: 'catalogo-car', viewBox: '0 0 26 46' }),
      createIcon({ name: 'moto-top', className: 'catalogo-moto', viewBox: '0 0 14 34' }),
    ])
  ),
  muestra('Placa (input)', '.input--plate', placa),
  muestra(
    'Input / select / textarea',
    '.input · .select · .textarea',
    createInput({ placeholder: 'Texto normal' }),
    createSelect({
      placeholder: 'Selecciona…',
      groups: [
        { label: 'Sótano 1', options: [{ value: 'A-06', label: 'A-06 · Carro' }] },
        { label: 'Sótano 2', options: [{ value: 'M-03', label: 'M-03 · Moto' }] },
      ],
    }),
    createTextarea({ placeholder: 'Ej. rayón en la puerta trasera derecha' })
  ),
  muestra('Etiqueta', '.label-caps', createLabelCaps({ text: 'Ocupación actual' })),
  muestra(
    'Chips de estado',
    '.status-chip--free · --occupied · --reserved · --out',
    ...Object.values(ESTADOS_CELDA).map((e) => createStatusChip(e))
  ),
  muestra(
    'Placas',
    '.plate · .plate--large',
    createPlate({ placa: 'JKL482' }),
    createPlate({ placa: 'XKP45F' }),
    createPlate({ placa: 'MNP908', large: true })
  ),
  muestra(
    'Medidor',
    '.meter · .meter--orange',
    createMeter({ value: 65 }),
    createMeter({ value: 67, variant: 'orange' })
  ),
  muestra(
    'Spinner, enlace, avatar, marca',
    '.spinner · .link · .avatar · .brand-mark',
    createSpinner(),
    createSpinner({ size: 'sm' }),
    createLink({ href: '#', text: 'Enlace de texto' }),
    createAvatar({ nombre: 'Laura Gómez' }),
    createAvatar({ nombre: 'Juan Pérez', size: 'md' }),
    createBrandMark()
  ),
  muestra('Franja de peligro', '.hazard-strip', createHazardStrip())
);

// ---------------- Molecules ----------------
const conError = createField({
  label: 'Número de documento',
  control: createInput({ value: '12.345' }),
  required: true,
  error: 'Solo letras y números, sin puntos ni espacios.',
});

const molecules = seccion(
  'Molecules',
  muestra(
    'Campo',
    '.field (+ .field-hint / .field-error)',
    el('div', { className: 'form-grid' }, [
      createField({
        label: 'Correo',
        control: createInput({ type: 'email' }),
        required: true,
        hint: 'Lo usamos para avisos.',
      }),
      conError,
    ])
  ),
  muestra(
    'Mosaicos',
    '.tiles / .tile',
    createTiles({
      name: 'tipo-vehiculo',
      label: 'Tipo de vehículo',
      value: 'carro',
      options: [
        { value: 'carro', label: 'Carro', icon: 'i-car' },
        { value: 'moto', label: 'Moto', icon: 'i-moto' },
      ],
    })
  ),
  muestra(
    'Casilla',
    '.check',
    createCheck({ label: 'El conductor deja las llaves en la caseta' }),
    createCheck({ label: 'Requiere celda accesible', checked: true })
  ),
  muestra(
    'Indicadores',
    '.kpi · .kpi--main',
    el('div', { className: 'catalogo-kpis' }, [
      createKpi({
        label: 'Ocupación actual',
        value: 65,
        unit: '%',
        note: '28 de 43 espacios habilitados',
        main: true,
        meter: 65,
      }),
      createKpi({ label: 'Espacios libres', value: 13, note: 'S1: 6 · S2: 7' }),
      createKpi({ label: 'Recaudo de hoy', value: '$ 1,28 M', note: '143 salidas cobradas' }),
    ])
  ),
  muestra(
    'Estado vacío',
    '.empty-state',
    createEmptyState({
      title: 'Selecciona un espacio',
      text: 'Toca cualquier celda del mapa para ver el vehículo, el tiempo y el valor a cobrar.',
    })
  ),
  muestra(
    'Marca y turno (sobre asfalto)',
    '.brand · .shift',
    el('div', { className: 'catalogo-oscuro' }, [
      createBrand({ sede: 'Parqueadero ABC · Medellín' }),
      createShift({ turno: 'Norte · L. Gómez' }),
    ])
  ),
  muestra(
    'Avisos',
    '.toast · .alert',
    createButton({
      label: 'Toast éxito',
      variant: 'dark',
      onClick: () => showToast('Ingreso registrado: ticket T-000123.', 'success'),
    }),
    createButton({
      label: 'Toast error',
      variant: 'dark',
      onClick: () => showToast('Entrada rechazada por pico y placa.', 'error'),
    }),
    createButton({
      label: 'Toast info',
      variant: 'dark',
      onClick: () => showToast('La celda A-09 sigue fuera de servicio.'),
    }),
    createAlert({ message: 'Documento o contraseña incorrectos.', variant: 'error' }),
    createAlert({ message: 'Contraseña actualizada.', variant: 'success' })
  ),
  muestra(
    'Lista de datos',
    '.data-list',
    createDataList({
      items: [
        { term: 'Cliente', value: 'Visitante' },
        { term: 'Ticket', value: 'T-004792' },
        { term: 'Hora de entrada', value: '16:05' },
        { term: 'Tarifa', value: '$ 120 / min' },
      ],
    })
  ),
  muestra(
    'Menú de usuario',
    '.user-menu',
    el('div', { className: 'catalogo-oscuro' }, [
      createUserMenu({
        nombre: 'Laura Gómez Ríos',
        rol: 'Administrador',
        items: [
          { label: 'Mi cuenta', icon: 'i-user', href: '#' },
          { label: 'Cerrar sesión', icon: 'i-logout', href: '#' },
        ],
      }),
    ])
  )
);

// ---------------- Organisms ----------------
const modal = createModal({
  title: 'Registrar ingreso',
  subtitle: 'asigna un espacio libre y genera el ticket',
  body: [
    el('div', { className: 'form-grid' }, [
      createField({
        label: 'Placa',
        control: createInput({ plate: true, placeholder: 'ABC 123', maxLength: 7 }),
        required: true,
        full: true,
      }),
      createField({ label: 'Observaciones', control: createTextarea({}), full: true }),
    ]),
  ],
  footer: [
    createButton({ label: 'Cancelar', variant: 'ghost', onClick: () => closeModal(modal) }),
    createButton({ label: 'Generar ticket', onClick: () => closeModal(modal) }),
  ],
});
const abrirModal = createButton({
  label: 'Abrir modal',
  icon: 'i-in',
  onClick: (e) => openModal(modal, e.currentTarget),
});

const organisms = seccion(
  'Organisms',
  muestra('Modal (Esc o clic en el fondo para cerrar)', '.modal-overlay / .modal', abrirModal),
  muestra(
    'Navbar (todos los ítems)',
    '.navbar · .navbar-item.is-active',
    createNavbar({ items: ITEMS_NAVEGACION.slice(0, 6), activeId: 'celdas' })
  ),
  muestra('Footer', '.footer', createFooter({ sede: SEDE })),
  muestra(
    'Tabla de datos',
    '.data-table · .log',
    createDataTable({
      caption: 'Vehículos de ejemplo',
      minWidth: 520,
      rows: FILAS,
      sort: { key: 'placa', dir: 'asc' },
      onSort: () => showToast('Orden: en las páginas se vuelve a pedir a la API.'),
      columns: [
        {
          key: 'placa',
          label: 'Placa',
          sortable: true,
          render: (f) => createPlate({ placa: f.placa }),
        },
        { key: 'tipo', label: 'Tipo', sortable: true },
        { key: 'vehiculo', label: 'Vehículo' },
        { key: 'dueno', label: 'Propietario' },
      ],
      pagination: { pagina: 1, totalPaginas: 3, total: 54, onChange: () => {} },
    })
  ),
  muestra(
    'Ticket de ingreso',
    '.ticket · .barcode',
    createTicket({
      nota: 'Vista previa: el número se asigna al generar el ticket.',
      datos: {
        numero: 'T-000123',
        placa: 'JKL 482',
        espacio: 'A-06 · Sótano 1',
        entrada: '19/10/2026 18:42',
        tarifa: '$ 120/min',
        cliente: 'Visitante',
        puerta: 'Norte',
      },
    })
  ),
  muestra(
    'Últimos movimientos',
    '.log · .move--in / .move--out',
    createMovementLog({
      movimientos: [
        {
          movimiento: 'entrada',
          fecha: new Date().toISOString(),
          placa: 'FJS27D',
          celda: 'M-12',
          valor: null,
        },
        {
          movimiento: 'salida',
          fecha: new Date().toISOString(),
          placa: 'KLP518',
          celda: 'A-06',
          valor: 21360,
        },
      ],
    })
  ),
  muestra(
    'Tabla vacía',
    '.data-table → .empty-state',
    createDataTable({ caption: 'Vacía', columns: [{ key: 'a', label: 'A' }], rows: [] })
  )
);

const moleculesFase2 = seccion(
  'Molecules · Fase 2',
  muestra(
    'Espacios del mapa',
    '.space --free/--occupied/--reserved/--out/--accessible/--moto · .is-selected',
    el(
      'div',
      { className: 'catalogo-lote' },
      CELDAS.map((celda, i) => createSpace({ celda, seleccionada: i === 1 }))
    )
  ),
  muestra('Leyenda del mapa', '.map-legend', createMapLegend()),
  muestra(
    'Estado de la conexión',
    '.live-status--conectando/--en-vivo/--reconectando',
    createLiveStatus({ estado: 'conectando' }),
    createLiveStatus({ estado: 'en-vivo' }),
    createLiveStatus({ estado: 'reconectando' })
  )
);

const moleculesFase1 = seccion(
  'Molecules · Fase 1',
  muestra(
    'Búsqueda y paginación',
    '.search-box · .pagination',
    createSearchBox({
      label: 'Placa',
      placeholder: 'Ej. MNP908',
      transform: normalizarPlaca,
      onSearch: () => {},
    }),
    createPagination({ pagina: 2, totalPaginas: 5, total: 87, onChange: () => {} })
  ),
  muestra(
    'Buscador de usuario',
    '.user-picker (prueba 1000000004)',
    el('div', { className: 'form-grid' }, [
      createUserPicker({ label: 'Propietario', buscar: buscarEjemplo }),
    ])
  ),
  muestra(
    'Foto con vista previa',
    '.photo-input',
    el('div', { className: 'form-grid' }, [
      createPhotoInput({ label: 'Fotografía', nombre: 'Laura Gómez' }),
    ])
  )
);

// ---------------- Página ----------------
const layout = createAppLayout({
  header: createHeader({
    sede: 'Parqueadero ABC · Medellín',
    turno: 'Norte · L. Gómez',
    usuario: { nombre: 'Laura Gómez Ríos', rol: 'Administrador' },
    menuItems: [{ label: 'Cerrar sesión', icon: 'i-logout', href: '#' }],
  }),
  navbar: createNavbar({ items: ITEMS_NAVEGACION.slice(0, 8), activeId: 'inicio' }),
  pageHead: createPageHead({
    title: 'Catálogo de componentes',
    subtitle: 'solo desarrollo · compáralo con docs/diseno-parko/index.html',
    actions: [createButton({ label: 'Acción principal', icon: 'i-in' })],
  }),
  content: [
    el('div', { className: 'catalogo' }, [
      atoms,
      molecules,
      moleculesFase1,
      moleculesFase2,
      organisms,
    ]),
  ],
  footer: createFooter({ sede: SEDE }),
});

document.getElementById('app').replaceChildren(layout);
