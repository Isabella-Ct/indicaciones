# Integración con el frontend — 011-descuentos

## 1. Inventario

| Pantalla (SRS B.2) | Página | Vista (página) | Servicio → endpoint |
|---|---|---|---|
| Configuración › Descuentos | `descuentos.html` | `views/descuentos.view.js` | `listarDescuentos`, `crearDescuento`, `actualizarDescuento`, `cambiarEstadoDescuento` |
| Movimientos › Registrar salida (detalle del descuento) | `movimientos.html` | `views/movimientos.view.js` (sin cambios de lógica) | la liquidación de la spec 009 |
| Comprobante | `factura.html` | `views/factura.view.js` | la factura de la spec 009 |

Servicio: `js/services/descuentos.service.js`.

## 2. Componentes por nivel (Atomic Design)

| Nivel | Componente | Clase CSS | Uso |
|---|---|---|---|
| Átomo | `atomos/chip-estado.js` · `ponerChipDescuento(chip, situacion)` (nuevo) | `atom-status-chip--free/reserved/out` | vigente / programado / vencido / inactivo |
| Molécula | `moleculas/cobro.js` (ampliada) | `molecule-data-list` | fila «Descuento: <nombre> − $ valor» cuando lo hay |
| Molécula | `moleculas/precio.js` (existente) | — | valor fijo en pesos |
| Organismo | `organismos/comprobante.js` (ampliado) | `organism-ticket` | fila del descuento en el comprobante |
| Organismo | `organismos/tabla-datos.js`, `modal.js` (existentes) | — | listado, formulario y confirmación |
| Página | `views/descuentos.view.js` | — | la única que llama a `services/descuentos.service.js` |

## 3. Reglas de la interfaz

- El campo «Valor» cambia su etiqueta y su ayuda con el tipo: «Porcentaje (%)» (1–100) o «Valor fijo ($)» (> 0).
- Fechas con `<input type="date">` (desde 00:00, hasta 23:59:59, según el contrato).
- Inactivar pide confirmación con el modal (HU-51 E1). Activar uno vencido muestra el error junto a «Vigente hasta».
- Menú «Descuentos» en Configuración con `descuentos.ver`; los botones de crear, editar y estado solo con su permiso.

## 4. Errores

- `VALIDACION` → junto al campo (valor, vigencia);
- `DESCUENTO_DUPLICADO`, `DESCUENTO_NO_ENCONTRADO` → alerta del formulario.

## 5. Checklist por historia

| HU | Pantalla | Estados | Prueba manual |
|---|---|---|---|
| HU-49 | descuentos | errores 409 y 422 | crear porcentaje y valor fijo, editar |
| HU-50 | movimientos, factura | sin descuento / con descuento | salida con descuento vigente |
| HU-51 | descuentos | confirmación, vencido | inactivar y activar |
