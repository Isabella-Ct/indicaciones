# Integración con el frontend — 005-vehiculos

## 1. Inventario

| Pantalla (SRS B.2) | Página | Vista (página) | Servicio → endpoint |
|---|---|---|---|
| Vehículos (listado, filtros, nuevo) | `vehiculos.html` | `views/vehiculos.view.js` | `listarVehiculos`, `crearVehiculo` |
| Vehículos › Detalle (propietario, historial, movimientos) y Editar | `vehiculo-detalle.html` | `views/vehiculo-detalle.view.js` | `obtenerVehiculo`, `actualizarVehiculo`, `asignarPropietario` |
| Usuarios › Detalle › Vehículos (Agregar vehículo) | `usuario-detalle.html` (sección nueva) | `views/usuario-detalle.view.js` | `listarVehiculos({ propietario })`, `listarVehiculos({ q: placa })`, `asignarPropietario`, `crearVehiculo` |
| Panel del cliente › Mis vehículos | `mis-vehiculos.html` | `views/mis-vehiculos.view.js` | `misVehiculos` → GET /usuarios/me/vehiculos |

Servicio: `js/services/vehiculos.service.js`.

## 2. Componentes por nivel (Atomic Design)

| Nivel | Componente | Clase CSS | Uso |
|---|---|---|---|
| Átomo | `atomos/placa.js` · `ponerPlaca(nodo, placa)` (nuevo) | `atom-plate` | placa con el formato visual «ABC 123» (el dato sigue siendo ABC123) |
| Molécula | `moleculas/campo.js` (existente) | `molecule-field` | errores por campo |
| Molécula | `moleculas/selector-tipo.js` · `conectarSelectorTipo(grupo, { onCambio })` (nuevo) | `molecule-tiles` | mosaicos Carro / Moto con `role="radiogroup"` |
| Organismo | `organismos/tabla-datos.js`, `modal.js` (existentes) | — | listados, formulario de vehículo y de propietario |
| Plantilla | `plantillas/marco-app.js` | `template-app-layout` | — |
| Página | las vistas de arriba | — | las únicas que llaman a `services/` |

## 3. Reglas de la interfaz

- La placa se escribe en el campo amarillo grande (`atom-input--plate`) en mayúsculas; el servidor normaliza igual.
- El formulario valida el formato según el tipo elegido antes de enviar, con el mismo mensaje del servidor.
- «Asociar propietario» solo aparece si el vehículo no tiene; «Reasignar» y «Quitar propietario» solo con `vehiculos.editar`; «Editar» solo con `vehiculos.editar`.
- El menú «Vehículos» exige `vehiculos.ver`; «Mis vehículos», `perfil.ver` y se oculta a quien tiene `vehiculos.ver`.

## 4. Errores

- `PLACA_DUPLICADA`, `VALIDACION` → junto al campo;
- `VEHICULO_NO_ENCONTRADO` en «Agregar vehículo» → aviso y formulario de registro con la placa precargada;
- `USUARIO_NO_ENCONTRADO`, `USUARIO_INACTIVO` → junto al documento;
- `SOLO_ADMIN_REASIGNA`, `VEHICULO_DENTRO` → alerta del formulario.

## 5. Checklist por historia

| HU | Pantalla | Estados | Prueba manual |
|---|---|---|---|
| HU-25 | vehiculos | botón en espera / errores 409 y 422 | registrar con placa en minúsculas |
| HU-26 | vehiculo-detalle, usuario-detalle | — | asociar por documento; placa inexistente ofrece registrar |
| HU-27 | vehiculo-detalle | — | editar color; reasignar y ver el historial |
| HU-28 | vehiculos, mis-vehiculos | carga / vacío | búsqueda, filtros; el Cliente solo ve los suyos |
