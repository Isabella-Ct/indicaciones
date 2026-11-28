# Integración con el frontend — 013-incidencias

## 1. Inventario

| Pantalla (SRS B.2) | Página | Vista (página) | Servicio → endpoint |
|---|---|---|---|
| Incidencias (listado) y Nueva incidencia | `incidencias.html` | `views/incidencias.view.js` | `listarIncidencias`, `registrarIncidencia` |
| Incidencias › Detalle (Seguimiento y Cierre) | `incidencia.html?id=` | `views/incidencia.view.js` | `obtenerIncidencia`, `descargarEvidencia`, `agregarSeguimiento`, `cerrarIncidencia` |

Servicio: `js/services/incidencias.service.js`.

## 2. Componentes por nivel (Atomic Design)

| Nivel | Componente | Clase CSS | Uso |
|---|---|---|---|
| Átomo | `atomos/chip-estado.js` · `ponerChipIncidencia(chip, estado)` (nuevo) | `atom-status-chip--occupied/reserved/free` | abierta / en seguimiento / cerrada |
| Átomo | `atomos/placa.js` (existente) | `atom-plate` | placa |
| Molécula | `moleculas/foto.js` (existente, vista previa) | `molecule-photo-input` | evidencia en el formulario |
| Organismo | `organismos/tabla-datos.js`, `modal.js` (existentes) | — | listado, formulario y confirmación del cierre |
| Página | las vistas de arriba | — | las únicas que llaman a `services/` |

## 3. Reglas de la interfaz

- Nueva incidencia: tipo (`<select>` con los 4 tipos), placa (`atom-input--plate`), tipo de vehículo (solo si la placa no está registrada), fecha y hora del evento (`datetime-local`, máximo ahora, por defecto ahora), descripción (10–500 con contador) y evidencia (JPG/PNG ≤ 5 MB con vista previa).
- La evidencia se pide con el token y se muestra como imagen (`URL.createObjectURL`); sin evidencia, el texto «Sin evidencia».
- Seguimiento y cierre solo con `incidencias.editar`; cerrada, se ocultan los formularios y se muestra la solución.
- Menú «Incidencias» con `incidencias.ver`.

## 4. Errores

- `VALIDACION` → junto al campo (tipo, placa, tipo de vehículo, fecha, descripción, evidencia, nota, solución);
- `INCIDENCIA_CERRADA`, `INCIDENCIA_NO_ENCONTRADA` → alerta o estado vacío.

## 5. Checklist por historia

| HU | Pantalla | Estados | Prueba manual |
|---|---|---|---|
| HU-56 | incidencias | placa nueva, fecha futura, foto grande | registrar con y sin foto |
| HU-57 | incidencias, incidencia | vacío, sin evidencia | filtros y detalle |
| HU-58 | incidencia | cerrada | nota y cierre |
