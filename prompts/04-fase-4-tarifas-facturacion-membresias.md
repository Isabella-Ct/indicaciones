# FASE 4 — Tarifas, facturación, descuentos y membresías

## Contexto
Fases 0–3 terminadas. Ya existen las estadías con entrada/salida y el cálculo de minutos. Ahora agregas **el dinero**: tarifas configurables, cálculo automático del cobro, descuentos, membresías y facturas en PDF. Pagos **simulados**; factura **interna** (no DIAN).

## Lee primero
- `CLAUDE.md` §7: **Salida y cobro**, **Membresías**, **Simulaciones**.
- `docs/requerimientos.md`: REQ-TAR-1/2, REQ-FAC-1/2, REQ-MEM-1, REQ-DES-1.
- `docs/wireframes/04-facturacion.png`, `07-membresias.png`, `09-descuentos.png` con sus correcciones.
- El código actual de `backend/src/modules/estadias` (vas a modificar el flujo de salida).

Muestra tu plan antes de codificar. Explica cómo vas a cambiar `POST /estadias/:id/cerrar` sin romper lo existente.

## Tareas

### Backend — `tarifas`
- `GET /api/v1/tarifas` (autenticados) y `GET /api/v1/publico/tarifas` (sin login).
- `POST /api/v1/tarifas` (admin): crea una nueva tarifa vigente para un tipo de vehículo y desactiva la anterior (se conserva el historial; las facturas viejas no cambian).
- Servicio **puro** `calcularCobro({ minutos, tarifa, membresiaActiva, descuento })` → `{ minutos, fracciones, subtotal, valorDescuento, total, detalle[] }`, implementando exactamente los 5 pasos de `CLAUDE.md` §7. `detalle[]` explica cada paso para mostrarlo en la UI y en el PDF.

### Backend — `descuentos`
- CRUD (admin) + `PATCH /:id/activo`. Porcentaje 0–100. Listado de activos para el operador.

### Backend — `membresias`
- `GET /api/v1/membresias` (admin/operador; filtros: estado, usuario, placa), `POST` (admin): usuario + vehículo del usuario + tipo + celda fija opcional (del tipo del vehículo y sin otra mensualidad activa); `fecha_fin` calculada; valor desde `configuracion`. No se permite traslapar membresías del mismo vehículo. Si tiene celda fija, la celda pasa a `reservada` (etiqueta "MENSUAL" en el mapa) y se libera al vencer o cancelar. Al crearla se genera su factura (`concepto = 'membresia'`).
- `PATCH /api/v1/membresias/:id/cancelar` (admin).
- Tarea programada simple (`setInterval` cada hora al arrancar el servidor, en `backend/src/jobs/`): marca `vencida` las membresías expiradas y crea una notificación al cliente 3 días antes del vencimiento (sin duplicar avisos).
- Cliente: `GET /api/v1/usuarios/me/membresias`.

### Backend — `facturas` y nuevo flujo de salida
- `POST /api/v1/estadias/salida` ahora devuelve la **liquidación con dinero**: tarifa vigente, membresía activa (si hay), descuentos disponibles y `calcularCobro` sin descuento.
- `POST /api/v1/estadias/:id/liquidar` con `descuento_id` opcional → recalcula (para previsualizar en la UI).
- `POST /api/v1/estadias/:id/pagar` (admin/operador): `metodo_pago`, `descuento_id` opcional. En **una transacción**: recalcula en el servidor (nunca confía en el total que manda el cliente), crea la factura con número consecutivo seguro ante concurrencia, cierra la estadía, libera la celda y emite SSE. Reemplaza el `/cerrar` provisional de la Fase 3 (elimínalo o haz que responda 410).
- `GET /api/v1/facturas` (admin: todas, con filtros por fecha, método y concepto; operador: las del día), `GET /api/v1/facturas/:id`, `GET /api/v1/facturas/:id/pdf` (pdfkit: datos del parqueadero, número, fecha, cliente si existe, placa, entrada/salida, tiempo, detalle del cálculo, descuento, total, método de pago, con la leyenda "Documento interno, no válido como factura electrónica").
- Cliente: `GET /api/v1/usuarios/me/facturas` y el PDF de **sus** facturas (403 para las ajenas).

### Frontend
- `app/tarifas.html` (admin): tarifa vigente por tipo, formulario para nueva tarifa con un **simulador** ("si un carro dura X minutos, paga $Y").
- `app/descuentos.html` (admin; wireframe 09).
- `app/membresias.html` (admin/operador; wireframe 07 corregido: buscador de usuario → selector de su vehículo → tipo → fecha de inicio; fecha fin y valor calculados y en solo lectura).
- **Panel de detalle** de la pantalla "Control de espacios" (sección 6 de la maqueta): para celdas ocupadas agrega el `data-list` con tarifa y tope del día, y el bloque `charge` con "Valor a pagar", "% del tope", la barra `meter--orange` y la nota del cálculo ("157 min × $120 = $18.840"), **recalculado cada minuto** (reto 4). Mensualidad → $0 con la nota "Mensualidad activa · <titular>".
- Botón **"Registrar salida y cobrar"** → abre un `modal` de cobro: liquidación oficial del servidor (`detalle[]`), selector de descuento que recalcula en vivo, método de pago con `tiles` (Efectivo / Tarjeta / Transferencia) y botón **Cobrar**. Al confirmar: `toast` de éxito, la celda queda libre en el mapa, se agrega la fila a "Últimos movimientos" con el valor cobrado y aparecen los botones "Imprimir factura" / "Cerrar".
- `kpis`: completa "Recaudo de hoy" (con número de salidas cobradas) y "Permanencia prom." (visitantes de hoy).
- `app/facturacion.html` (wireframe 04 corregido): listado de facturas con filtros y total del período; ver/descargar PDF.
- `app/mi-cuenta.html`: secciones "Mis facturas" y "Mis membresías" para el cliente.

### Tests (obligatorios)
- `calcularCobro` con la tarifa por minuto de la semilla: 157 min de carro = $18.840 (ejemplo de la maqueta); 0 min; tope alcanzado (carro 300 min → $28.000); 25 h (1 tope + 60 min); moto 100 min = $6.000; con membresía ($0); con descuento del 10 % (redondeo a la centena); descuento del 100 %. Además, un caso con `minutos_fraccion = 15` y `minutos_gracia = 10` para comprobar que el modelo por fracción también funciona.
- `/pagar` ignora un `total` manipulado enviado por el cliente.
- Dos pagos simultáneos no generan el mismo número de factura.
- No se pueden traslapar membresías.

## Criterios de aceptación
- [ ] Cubre REQ-TAR-1/2, REQ-FAC-1/2, REQ-MEM-1, REQ-DES-1.
- [ ] Cambiar una tarifa no altera las facturas anteriores.
- [ ] El flujo completo entrada → salida → cobro → PDF funciona de punta a punta en el navegador.
- [ ] `npm test` y `npm run lint` pasan; README actualizado.

## Al terminar
Commit + resumen. **No empieces la Fase 5.**
