# Sistema de diseño PARKO (diseño visual oficial)

Esta carpeta contiene la **maqueta estática** que define el aspecto visual de toda la aplicación: estilo **plano industrial** (concreto, asfalto, amarillo de seguridad, franjas de peligro, tipografía condensada en mayúsculas, esquinas rectas y cero sombras).

| Archivo | Qué es | Cómo se usa |
|---|---|---|
| `styles.css` | Tokens y estilos de todos los componentes | **Fuente de verdad visual.** Se reparte en `frontend/styles/tokens.css` y en el CSS de cada componente. Los valores (colores, fuentes, tamaños, bordes) se copian tal cual. |
| `index.html` | Pantalla "Control de espacios" con datos de ejemplo | Referencia de estructura y marcado. Los datos son **de mentira**: en la app real todo viene de la API. |
| `script.js` | Solo comentarios: lista de interacciones esperadas (retos 1–8) | Checklist de comportamiento del mapa, del detalle y del modal de ingreso. |

## Lo que NO se copia de la maqueta
- Subtítulo "Torre Norte · Bogotá" → en la app la marca sigue siendo **PARKO**, pero el subtítulo es la sede real **"Parqueadero ABC · Medellín"** (sale de la tabla `parqueaderos`).
- Datos fijos (placas, horas, KPIs, opciones del select, "J. Pérez", hora 18:42) → vienen de la API y del usuario en sesión; el reloj es real.
- Atributos `data-*` con todos los datos de la celda → la app guarda los datos en JS (estado de la página), no en el DOM.
- Tarifas escritas en el texto → salen de la tabla `tarifas`.
- Campo "Hora de entrada" editable del modal → la hora la pone el servidor (se muestra en solo lectura).
- "Accesible" como tipo de vehículo → en la app es una **característica de la celda** (`es_accesible`) y una casilla "requiere celda accesible" en la entrada; el tipo de vehículo sigue siendo moto/carro.
- Estilos en línea (`style="..."`) → pasan a clases o a variables CSS (`--v`, `--cols`).

## Mapeo a Atomic Design
| Nivel | Componentes (clases de la maqueta) |
|---|---|
| Atoms | `btn` (+ `--dark`, `--ghost`, `--block`), `icon-button`, `icon` (sprite SVG), `plate`, `input`, `input--plate`, `select`, `textarea`, `label-caps`, `status-chip`, `meter`, `move` (entrada/salida), `brand-mark`, `hazard-strip` |
| Molecules | `field`, `tiles`/`tile` (radio en mosaico), `check`, `kpi`, `map-legend`, `level-tabs`, `data-list`, `charge`, `vehicle-line`, `empty-state`, `brand`, `shift` (fecha/hora/turno) |
| Organisms | `header`, `kpis`, `parking-map` (`level` → `lot` → `row` + `lane` → `space`), `space-detail` (`space-hero`, `detail-block`, `detail-actions`), `col-chart`, `log` (tabla), `modal` (`modal-head/body/foot`), `ticket` |
| Templates | `app-layout` (header + hazard-strip + navbar + `page` con `page-head`), `auth-layout`, `public-layout` |
| Pages | Control de espacios (= esta maqueta), y el resto de pantallas con los mismos componentes |
