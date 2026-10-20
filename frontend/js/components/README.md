# Catálogo de componentes PARKO (Atomic Design)

Todos los componentes son **funciones que reciben un objeto de props y devuelven un `HTMLElement`**.
Su CSS vive al lado (`button.js` + `button.css`) y se registra en `frontend/styles/main.css`.
El estilo sale de `docs/diseno-parko/styles.css` (valores copiados tal cual; los colores
literales de la maqueta se volvieron tokens en `styles/tokens.css`).

Para verlos todos: `npm run dev` y abre <http://localhost:3000/app/_catalogo.html> (solo en desarrollo).

## Reglas

1. **Un nivel solo importa niveles inferiores**: atoms → molecules → organisms → templates. Las `pages` importan cualquiera.
2. **Los componentes no llaman a la API.** Las páginas (`js/pages/`) piden los datos a `js/services/` y se los pasan como props.
3. **Nunca `innerHTML` con datos**: usa `el()` de `js/utils/dom.js` (todo el texto va por `textContent`). ESLint lo bloquea.
4. Los datos de negocio viven en el estado JS de la página, **no** en atributos `data-*` (solo `data-id`).
5. Clases con la convención de la maqueta: bloque (`panel`) + `--modificador` (`btn--dark`) + estados `is-active` / `is-selected` + utilidad `hidden`.
6. Accesibilidad: cada control con su `label` (usa `createField`), foco visible naranja, `aria-*` donde aplique.

## Atoms (`js/components/atoms/`)

| Componente | Función | Clase(s) | Props principales |
|---|---|---|---|
| button | `createButton` · `setButtonLoading` | `.btn`, `--dark`, `--ghost`, `--block`, `--sm` | `label`, `variant`, `size`, `icon`, `block`, `type`, `href`, `onClick` |
| icon-button | `createIconButton` | `.icon-button` | `icon`, `label` (obligatorio), `onClick`, `attrs` |
| icon | `createIcon` | `.icon` | `name` (símbolo del sprite), `className`, `viewBox`, `label` |
| input | `createInput` | `.input`, `.input--plate` | `id`, `name`, `type`, `plate`, `maxLength`, `autocomplete`… |
| select | `createSelect` | `.select` | `options`, `groups` (optgroup), `placeholder`, `value` |
| textarea | `createTextarea` | `.textarea` | `id`, `name`, `placeholder`, `maxLength` |
| label-caps | `createLabelCaps` | `.label-caps` | `text`, `tag` |
| status-chip | `createStatusChip` · `ESTADOS_CELDA` | `.status-chip--free/--occupied/--reserved/--out` | `text`, `variant` |
| plate | `createPlate` | `.plate`, `.plate--large` | `placa` (normalizada: `JKL482` → muestra `JKL 482`) |
| meter | `createMeter` · `setMeterValue` | `.meter`, `.meter--orange` | `value` 0–100 (va en `--v`), `variant`, `label` |
| spinner | `createSpinner` | `.spinner`, `--sm` | `label`, `size` |
| link | `createLink` | `.link`, `.link--on-dark` | `href`, `text`, `onDark`, `external` |
| avatar | `createAvatar` | `.avatar`, `--md` | `nombre`, `fotoUrl`, `size` |
| brand-mark | `createBrandMark` | `.brand-mark` | — |
| hazard-strip | `createHazardStrip` | `.hazard-strip` | — |

Iconos: un solo sprite en `frontend/assets/icons.svg`. Símbolos de la maqueta: `car-top`, `moto-top`,
`i-in`, `i-x`, `i-print`, `i-car`, `i-moto`, `i-wheel`. Agregados: `i-out`, `i-menu`, `i-user`, `i-logout`,
`i-key`, `i-chevron-down`, `i-check`, `i-alert`, `i-info`, `i-eye`, `i-home`, `i-map`
(trazo 2.2, terminaciones cuadradas, rejilla 24×24).

## Molecules (`js/components/molecules/`)

| Componente | Función | Clase(s) | Notas |
|---|---|---|---|
| field | `createField` · `setFieldError` | `.field`, `.field--full`, `.form-grid`, `.field-hint`, `.field-error` | Asocia `label for`, `aria-describedby`, `aria-invalid` |
| tiles | `createTiles` | `.tiles` / `.tile` | Radios en mosaico; columnas en `--cols` |
| check | `createCheck` | `.check` | `onChange(marcado)` |
| kpi | `createKpi` | `.kpi`, `.kpi--main` | `meter` opcional |
| empty-state | `createEmptyState` | `.empty-state` | `title`, `text`, `action` |
| brand | `createBrand` | `.brand` | `sede` = "Parqueadero ABC · Medellín" (desde la BD) |
| shift | `createShift` | `.shift` | Fecha y hora reales (America/Bogota), se actualizan cada minuto |
| toast | `createToast` · `showToast` | `.toast`, `--success/--error/--info` | Región `aria-live` fija abajo a la derecha |
| alert | `createAlert` · `setAlert` | `.alert`, `--error/--success` | Mensaje en línea de formularios |
| panel | `createPanel` | `.panel`, `.panel-head`, `.panel-body` | `actions`, `flush` |
| page-head | `createPageHead` | `.page-head` | Subtítulo se muestra como `// …` |
| data-list | `createDataList` | `.data-list` | `items: [{ term, value }]` |
| user-menu | `createUserMenu` | `.user-menu` | Esc devuelve el foco al botón |
| search-box | `createSearchBox` | `.search-box`, `.filters` | Debounce + Enter; `transform` (p. ej. normalizar placa) |
| pagination | `createPagination` | `.pagination` | Anterior / "Página X de Y · N registros" / Siguiente |
| user-picker | `createUserPicker` · `setUserPickerError` | `.user-picker` | Busca por documento con la función `buscar` que le pasa la página; el id viaja en un input oculto |
| space | `createSpace` | `.space`, `--free/--occupied/--reserved/--out/--accessible/--moto`, `.is-selected` | Celda del mapa (sección 5 de la maqueta); placa solo si la API la envía |
| level-tabs | `createLevelTabs` | `.level-tabs`, `.level-tab.is-active` | `role="tablist"`, `aria-selected`, flechas/Inicio/Fin |
| map-legend | `createMapLegend` | `.map-legend`, `.lg-*` | Leyenda fija de la maqueta |
| live-status | `createLiveStatus` · `setLiveStatus` | `.live-status--conectando/--en-vivo/--reconectando` | Estado de la conexión SSE |
| photo-input | `createPhotoInput` | `.photo-input` | `name="foto"` + `quitar_foto`; vista previa y validación JPG/PNG ≤ 2 MB |

## Organisms (`js/components/organisms/`)

| Componente | Función | Clase(s) | Notas |
|---|---|---|---|
| header | `createHeader` | `.header`, `.header-inner` | brand + shift + `extra` (campana, Fase 5) + user-menu |
| navbar | `createNavbar` | `.navbar`, `.navbar-item.is-active` | Recibe solo ítems permitidos (`utils/navegacion.js`); ≤ 760 px se vuelve desplegable |
| modal | `createModal` · `openModal` · `closeModal` | `.modal-overlay`, `.modal`, `.modal-head/-body/-foot` | `aria-modal`, Esc, clic en el fondo, foco atrapado y devuelto; `.modal-body--split` = formulario + ticket |
| footer | `createFooter` | `.footer` | Datos de la sede |
| parking-map | `createParkingMap` | `.parking-map`, `.level`, `.level-title`, `.lot`, `.row--top/--bottom` (`--cols`), `.lane` | Solo se ve el piso activo; en móvil el lote hace scroll |
| space-detail | `createSpaceDetail` · `formatearDuracion` | `.space-hero`, `.detail-block`, `.vehicle-line`, `.detail-actions` | Sin celda: empty-state. Mensaje distinto para libre/reservado/fuera de servicio (reto 5) |
| kpis | `createKpis` | `.kpis` | Fila de `kpi` de la maqueta (5 columnas; 2 en ≤ 1180 px) |
| ticket | `createTicket` · `updateTicket` | `.ticket`, `.ticket-head`, `.barcode`, `.ticket-note` | Vista previa en vivo y ticket emitido (sección 8) |
| entry-modal | `createEntryModal` · `abrirEntryModal` | `.modal-body--split`, `.entry-client`, `.alert--grande` | "Registrar ingreso": recibe las funciones de la página (`previsualizar`, `registrar`, `registrarVisitante`); maneja los errores por código |
| movement-log | `createMovementLog` | `.bottom`, `.log`, `.move--in/--out` | "Últimos movimientos" (sección 7) |
| data-table | `createDataTable` | `.data-table`, `.log`, `.row-actions`, `.cell-*` | Estilo bitácora de la maqueta; orden (`aria-sort`), paginación, estado vacío, carga y scroll horizontal (`minWidth`) |

## Templates (`js/components/templates/`)

| Plantilla | Función | Estructura |
|---|---|---|
| app-layout | `createAppLayout` | skip-link → header → navbar → hazard-strip → `main.page` (page-head + contenido) → footer |
| auth-layout | `createAuthLayout` | concreto + panel centrado con `panel-head` oscuro (marca) + hazard-strip |
| public-layout | `createPublicLayout` | header (marca + acciones) → hazard-strip → contenido → footer |

Las páginas internas usan `js/pages/comun/montar-app.js`, que exige sesión, carga la sede y arma el
`app-layout` con header y navbar según los permisos.

## Cómo crear un componente nuevo

1. Elige el nivel (¿usa otros componentes? entonces no es atom).
2. Crea la carpeta `js/components/<nivel>/<nombre>/` con `<nombre>.js` y `<nombre>.css`.
3. En el JS exporta `create<Nombre>(props)` que devuelva un `HTMLElement`; construye con `el()` y documenta las props con JSDoc.
4. En el CSS usa solo tokens (`var(--…)`), `border-radius: 0` y sin sombras decorativas. Si la maqueta ya tiene la clase, copia sus valores tal cual.
5. Agrega `@import url('../js/components/<nivel>/<nombre>/<nombre>.css');` en `styles/main.css` (en su bloque de nivel).
6. Agrega una muestra en `js/pages/catalogo.js` y una fila en este README.

```js
// js/components/atoms/badge/badge.js
import { el } from '../../../utils/dom.js';

export function createBadge({ text, variant = 'default' }) {
  return el('span', { className: variant === 'default' ? 'badge' : `badge badge--${variant}`, text });
}
```
