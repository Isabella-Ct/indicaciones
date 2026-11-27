# Integración con el frontend — 004-parqueaderos-celdas

## 1. Inventario

La v1 tenía `app/celdas.html` (mapa con SSE, fila superior e inferior por `fila_mapa`) y la disponibilidad en `index.html` (tag `v0.9.0-legado`). Se reconstruyen sobre la v2 con consulta periódica y agrupación por piso y área.

| Pantalla (SRS B.2) | Página | Vista (página) | Servicio → endpoint |
|---|---|---|---|
| Configuración › Parqueaderos (listado, nuevo, editar, inactivar) | `parqueaderos.html` | `views/parqueaderos.view.js` | `listarParqueaderos`, `crearParqueadero`, `actualizarParqueadero`, `inactivarParqueadero` |
| Configuración › Parqueaderos › Detalle › Puertas | `parqueadero-detalle.html` | `views/parqueadero-detalle.view.js` | `obtenerParqueadero`, `listarPuertas`, `crearPuerta`, `actualizarPuerta` |
| Celdas (mapa por piso, nueva, por rango, editar, inhabilitar y habilitar) | `celdas.html` | `views/celdas.view.js` | `listarCeldas`, `obtenerCelda`, `crearCelda`, `crearLote`, `actualizarCelda`, `cambiarEstadoCelda` |
| Panel del cliente › Disponibilidad | `disponibilidad.html` | `views/disponibilidad.view.js` | `listarCeldas({ estado: 'disponible' })` |
| Página pública de disponibilidad | `index.html` | `views/inicio.view.js` | `consultarDisponibilidad` → GET /disponibilidad (público) |

Servicios: `js/services/parqueaderos.service.js`, `celdas.service.js` y `disponibilidad.service.js`.

## 2. Componentes por nivel (Atomic Design)

| Nivel | Componente | Clase CSS | Uso |
|---|---|---|---|
| Átomo | `atomos/chip-estado.js` · `ponerChipCelda(chip, estado)` (nuevo) | `atom-status-chip--free/occupied/reserved/out` | estado de la celda en tablas y detalle |
| Molécula | `moleculas/consulta-periodica.js` · `consultarCada(fn, ms)` (nuevo) | — | refresco cada 10 s, en pausa con la pestaña oculta (RF-CLD-21) |
| Molécula | `moleculas/pestanas.js` · `conectarPestanas(lista, { onCambio })` (nuevo) | `molecule-level-tabs`, `molecule-level-tab` | pisos del mapa (`role="tablist"`, flechas del teclado) |
| Molécula | `moleculas/kpi.js` · `ponerKpi(raiz, { valor, nota, medidor })` (nuevo) | `molecule-kpi`, `atom-meter` | disponibilidad por tipo («Lleno») |
| Organismo | `organismos/mapa-celdas.js` · `conectarMapa(raiz, { onSeleccionar })` (nuevo) | `organism-parking-map`, `molecule-space--*` | mapa por piso y área con la leyenda de estados |
| Organismo | `organismos/tabla-datos.js`, `modal.js` (existentes) | — | listados y diálogos |
| Plantilla | `plantillas/marco-app.js` | `template-app-layout` | — |
| Página | las vistas de arriba | — | las únicas que llaman a `services/` |

## 3. Reglas de la interfaz

- El mapa muestra la placa solo si la API envía `ocupante` (Operador y Administrador). El Cliente usa `disponibilidad.html`, que solo pide celdas disponibles.
- Estados con color **y** texto (RF-CLD-16): «LIBRE», placa u «OCUPADA», «RESERVADA», «INHABILITADA».
- Acciones según los permisos de la sesión: crear y lote (`celdas.crear`), editar (`celdas.editar`), inhabilitar y habilitar (`celdas.cambiar_estado`).
- En 375 px el mapa hace scroll horizontal dentro de su contenedor.

## 4. Errores

Traducción de `code`:
- `PARQUEADERO_DUPLICADO`, `PUERTA_DUPLICADA`, `CELDA_DUPLICADA` → el campo nombre o código;
- `PARQUEADERO_CON_VEHICULOS`, `PISOS_CON_CELDAS`, `CELDA_OCUPADA`, `CELDA_RESERVADA`, `CAMBIO_ESTADO_NO_PERMITIDO`, `PARQUEADERO_INACTIVO` → aviso con el mensaje;
- `VALIDACION` → `details` junto al campo.

## 5. Checklist por historia

| HU | Pantalla | Estados | Prueba manual |
|---|---|---|---|
| HU-17/18 | parqueaderos | carga / vacío / errores 409 y 422 | crear, editar, inactivar y reactivar |
| HU-19 | parqueadero-detalle | — | agregar y editar puertas |
| HU-20/21 | celdas | botón en espera / errores | celda, rango, editar, inhabilitar |
| HU-22 | celdas, disponibilidad | carga / «sin celdas» | filtros; placa solo para el personal |
| HU-23 | celdas | — | dos pestañas abiertas; refresco ≤ 10 s |
| HU-24 | index | «Lleno» | sin sesión |
