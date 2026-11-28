# Integración con el frontend — 008-tarifas

## 1. Inventario

| Pantalla (SRS B.2) | Página | Vista (página) | Servicio → endpoint |
|---|---|---|---|
| Configuración › Tarifas (listado, nueva, editar, cambiar estado) | `tarifas.html` | `views/tarifas.view.js` | `listarTarifas`, `crearTarifa`, `actualizarTarifa`, `cambiarEstadoTarifa` |
| Página pública de tarifas | `index.html` (sección nueva) | `views/inicio.view.js` | `tarifasVigentes` → GET /tarifas?vigentes=true (público) |

Servicio: `js/services/tarifas.service.js`.

## 2. Componentes por nivel (Atomic Design)

| Nivel | Componente | Clase CSS | Uso |
|---|---|---|---|
| Átomo | `atomos/chip-estado.js` · `ponerChipTarifa(chip, situacion)` (nuevo) | `atom-status-chip--free/reserved/out` | vigente / programada / vencida / inactiva |
| Molécula | `moleculas/precio.js` · `ponerPrecio(nodo, valor)` (nuevo) | `font-mono` | valor en COP «$ 4.000» |
| Organismo | `organismos/tabla-tarifas.js` · `conectarTablaTarifas(raiz)` (nuevo) | `organism-pricing-table` (maqueta) | tarjetas por tipo de vehículo en la página pública |
| Organismo | `organismos/tabla-datos.js`, `modal.js` (existentes) | — | listado administrativo y formulario |
| Página | las vistas de arriba | — | las únicas que llaman a `services/` |

## 3. Reglas de la interfaz

- Valores en pesos con `formatearCOP` («$ 4.000», sin decimales).
- Con 409 `TARIFA_SUPERPUESTA`, la alerta ofrece «Cerrar la anterior y crear» (reenvía con `cerrarAnterior: true`).
- Si la tarifa está `usada`, el formulario deja editables solo el nombre y «Vigente hasta», con el aviso de crear una nueva para cambiar precios.
- Con 409 `UNICA_TARIFA_VIGENTE`, se muestra la confirmación con el mensaje y se reenvía con `confirmar: true`.
- Botones según `tarifas.crear`, `tarifas.editar` y `tarifas.cambiar_estado`; el menú «Tarifas» (grupo Configuración) exige `tarifas.ver`.

## 4. Errores

- `VALIDACION` → junto al campo;
- `TARIFA_SUPERPUESTA`, `TARIFA_USADA`, `UNICA_TARIFA_VIGENTE` → alerta del formulario o confirmación;
- `TARIFA_NO_ENCONTRADA` → aviso y recarga.

## 5. Checklist por historia

| HU | Pantalla | Estados | Prueba manual |
|---|---|---|---|
| HU-36 | tarifas | errores 409 y 422 | crear programada; superpuesta con cierre |
| HU-37 | tarifas | — | editar sin uso; inactivar la única vigente |
| HU-38 | index | sin tarifas / programadas | ver las tarjetas sin sesión |
