# Integración con el frontend — 009-facturacion-pagos

## 1. Inventario

| Pantalla (SRS B.2) | Página | Vista (página) | Servicio → endpoint |
|---|---|---|---|
| Movimientos › Registrar salida (liquidación y cobro) | `movimientos.html` (panel nuevo) | `views/movimientos.view.js` | `obtenerLiquidacion`, `registrarPago` |
| Facturación (listado, anular) | `facturas.html` | `views/facturas.view.js` | `listarFacturas`, `anularFactura` |
| Facturación › Comprobante (80 mm, PDF, envío, tercero) | `factura.html` | `views/factura.view.js` | `obtenerFactura`, `emitirFactura`, `descargarPdf` |
| Facturación › Cierre de caja | `caja.html` | `views/caja.view.js` | `turnoActual`, `cerrarCaja`, `listarCierres` |
| Panel del cliente › Mis facturas | `mis-facturas.html` | `views/mis-facturas.view.js` | `misFacturas`, `descargarPdf` |

Servicios: `js/services/facturas.service.js` (liquidación, pagos y facturas) y `js/services/caja.service.js`.

## 2. Componentes por nivel (Atomic Design)

| Nivel | Componente | Clase CSS | Uso |
|---|---|---|---|
| Átomo | `atomos/chip-estado.js` · `ponerChipFactura(chip, estado)` (nuevo) | `atom-status-chip--free/out` | emitida / anulada |
| Molécula | `moleculas/precio.js` (existente) | — | valores en COP |
| Molécula | `moleculas/cobro.js` · `ponerCobro(raiz, liquidacion)` (nuevo) | `molecule-charge` (maqueta) | «Valor a pagar», explicación y barra del tope |
| Organismo | `organismos/comprobante.js` · `ponerComprobante(raiz, factura)` (nuevo) | `organism-ticket` (variante factura) | vista de impresión de 80 mm |
| Organismo | `organismos/tabla-datos.js`, `modal.js` (existentes) | — | listados y diálogos |
| Página | las vistas de arriba | — | las únicas que llaman a `services/` |

## 3. Reglas de la interfaz

- Tras registrar la salida, la caseta muestra la liquidación (`ponerCobro`) y el formulario de cobro: método (efectivo, tarjeta, transferencia, QR); el valor recibido solo en efectivo, con el cambio en vivo; la referencia en los otros métodos; tercero opcional.
- Con total $ 0 se muestra «Sin cobro»; el botón «Emitir comprobante en $ 0» es opcional.
- `SIN_TARIFA` en la salida → alerta «No hay tarifa vigente para moto: avise al Administrador».
- El comprobante descarga el PDF con `solicitarArchivo` (token Bearer) y lo abre como `blob:`.
- Anular solo con `facturas.anular`; el menú «Facturación» exige `facturas.ver`, «Caja» exige `caja.ver` y «Mis facturas» exige `perfil.ver` (oculto con `facturas.ver`).

## 4. Errores

- `VALIDACION` → junto al campo (`valorRecibido` con el faltante, `referencia`, tercero);
- `YA_PAGADO`, `MOVIMIENTO_NO_CERRADO`, `SIN_TARIFA`, `FACTURA_ANULADA`, `FACTURA_YA_ENVIADA`, `TURNO_SIN_PAGOS` → alerta con el mensaje;
- 403 al descargar una factura ajena → aviso.

## 5. Checklist por historia

| HU | Pantalla | Estados | Prueba manual |
|---|---|---|---|
| HU-39 | movimientos | $ 0 / membresía / sin tarifa | ver el detalle del cálculo |
| HU-40 | movimientos | cambio en vivo / faltante | efectivo, tarjeta con referencia |
| HU-41 | factura | pendiente electrónica | imprimir, PDF, correo, tercero |
| HU-42 | facturas | — | anular (Administrador) |
| HU-43 | facturas, mis-facturas | vacío / total filtrado | filtros; el Cliente solo ve las suyas |
| HU-44 | caja | turno sin pagos | cuadre y cierre |
