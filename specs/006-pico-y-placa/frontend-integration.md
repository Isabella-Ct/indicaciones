# Integración con el frontend — 006-pico-y-placa

## 1. Inventario

| Pantalla (SRS B.2) | Página | Vista (página) | Servicio → endpoint |
|---|---|---|---|
| Configuración › Pico y placa (tabla semanal, nueva, editar, eliminar) | `pico-placa.html` | `views/pico-placa.view.js` | `listarRestricciones`, `crearRestriccion`, `actualizarRestriccion`, `eliminarRestriccion` |
| Aviso «Pico y placa hoy» (caseta y cliente) | `celdas.html`, `disponibilidad.html`, `mis-vehiculos.html` (bloque nuevo) | sus vistas | `restriccionHoy` → GET /restricciones-placa/hoy |

Servicio: `js/services/restricciones.service.js`. Cuando exista la spec 007, el mismo aviso va en Movimientos.

## 2. Componentes por nivel (Atomic Design)

| Nivel | Componente | Clase CSS | Uso |
|---|---|---|---|
| Átomo | `atomos/digitos.js` · `ponerDigitos(nodo, digitos)` (nuevo) | `atom-plate` (variante `atom-plate--digit`) | dígitos restringidos «6 · 9» |
| Molécula | `moleculas/aviso-pico-placa.js` · `ponerPicoPlaca(raiz, hoy)` (nuevo) | `molecule-alert--info`, `molecule-data-list` | aviso de hoy por tipo, o «Sin restricción hoy» |
| Organismo | `organismos/tabla-semanal.js` · `conectarTablaSemanal(raiz, { onEditar, onEliminar })` (nuevo) | `organism-log-table` | 7 filas (días) × 2 columnas (carro, moto) |
| Organismo | `organismos/modal.js` (existente) | — | formulario de la restricción |
| Página | las vistas de arriba | — | las únicas que llaman a `services/` |

## 3. Reglas de la interfaz

- Casillas 0–9 para los dígitos (máximo 5), con el contador junto al campo.
- La posición del dígito se propone según el tipo (carro → último, moto → primero) y se puede cambiar.
- Con 409 `RESTRICCION_SUPERPUESTA`, la alerta ofrece el botón «Editar la existente» (abre el formulario con esa restricción).
- Botones Nueva / Editar / Eliminar según `restricciones.crear`, `restricciones.editar` y `restricciones.cambiar_estado`.
- El menú «Pico y placa» (grupo Configuración) exige `restricciones.crear` (solo el Administrador configura); el aviso exige `restricciones.ver`.

## 4. Errores

- `VALIDACION` → junto al campo (`digitos`, `horaFin`, `vigenteHasta`…);
- `RESTRICCION_SUPERPUESTA` → alerta del formulario con «Editar la existente»;
- `RESTRICCION_NO_ENCONTRADA` → aviso y recarga.

## 5. Checklist por historia

| HU | Pantalla | Estados | Prueba manual |
|---|---|---|---|
| HU-29 | pico-placa | carga / días sin restricción / errores 409 y 422 | crear, editar, eliminar; superpuesta ofrece editar |
| HU-30 | celdas, disponibilidad, mis-vehiculos | con restricción / «Sin restricción hoy» | ver el aviso del día |
