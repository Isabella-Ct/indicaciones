# Investigación — 009-facturacion-pagos

**Fecha**: 2026-11-27 · **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Precedencia: rúbrica → constitución → SRS v2.0 → HU → spec → `CLAUDE.md`. Las tablas `liquidacion`, `factura`, `pago`, `cierre_caja` y `alerta` ya existen (2.0.0) con sus `UNIQUE` y `CHECK`: **sin cambios de esquema**. `pdfkit` ya está en las dependencias (justificado en la spec 001).

---

## R-01 · Tres módulos

- **Decisión**:
  - `modules/liquidaciones/` (reglas de cálculo y `GET /movimientos/:id/liquidacion`, montada en el router de movimientos);
  - `modules/facturas/` (`POST /pagos`, `POST /facturas`, `GET /facturas`, `GET /facturas/:id`, `GET /facturas/:id/pdf`, `PATCH /facturas/:id/anulacion` y `GET /usuarios/me/facturas`, con `factura.pdf.js` para el PDF);
  - `modules/caja/` (`GET /caja/turno-actual`, `POST /caja/cierres`, `GET /caja/cierres`).
  Cada uno con capas; las rutas son las de B.1 §4.9.

## R-02 · Cálculo (RN-20) — `liquidaciones.reglas.js`

- **Decisión**: función pura `calcular({ minutos, tarifa, cubiertoPorMembresia })`:
  1. `cubiertoPorMembresia` → total 0, explicación «Cubierto por membresía»;
  2. `minutos ≤ minutosGracia` → 0, «Dentro del tiempo de gracia (N min)»;
  3. `valorTramo(m) = m === 0 ? 0 : primeraHora + ⌈max(0, m − 60) / minutosFraccion⌉ × valorFraccion`;
  4. sin tope: `bruto = valorTramo(minutos)`; con tope: `dias = ⌊minutos / 1440⌋`, `resto = minutos mod 1440`, `bruto = dias × min(tope, valorTramo(1440)) + min(tope, valorTramo(resto))`;
  5. explicación legible: «$ 4.000 + 5 fracciones × $ 1.000 = $ 9.000», o «1 día × tope $ 30.000 + …».
  Devuelve `{ minutos, primeraHora, fracciones, valorFracciones, dias, topeAplicado, valorBruto, valorDescuento: 0, cubiertoPorMembresia, total, explicacion }`.
- **Redondeo**: los valores son enteros en pesos en la práctica; se guardan con 2 decimales.

## R-03 · Liquidar un movimiento (RF-FAC-01..04)

- **Decisión**: `liquidacionesService.liquidar(idMovimiento, { conexion })`:
  - **abierto** → vista previa con `minutos = reloj − entrada` (no se guarda; `persistida: false`);
  - **cerrado** → si ya existe la liquidación, se devuelve; si no, se calcula con `minutos_estadia` y se inserta (`UNIQUE uq_liquidacion_movimiento`; bitácora `liquidar`);
  - **anulado** → 409 `MOVIMIENTO_ANULADO`.
- **Tarifa y membresía**: `tarifasService.vigenteEn({ tipoVehiculo, tipoCliente: tipoClienteDe(vehículo), fechaHora: entrada })`. Membresía: `SELECT … FROM membresia WHERE id_vehiculo = ? AND estado = 'activa' AND fecha de entrada BETWEEN fecha_inicio AND fecha_fin`.
- **Sin tarifa**: 409 `SIN_TARIFA` «No hay tarifa vigente para moto» y una `alerta` `sin_tarifa` con `referencia = 'movimiento:<id>'` (si ya hay una sin leer con esa referencia, no se repite). La alerta se inserta fuera de la transacción que falla.
- **Salida**: la spec 007 devolvía `liquidacion: null`; ahora `registrarSalida` llama a `liquidar` después de cerrar. Si no hay tarifa, la salida igual queda registrada y la respuesta trae `liquidacion: null` con `liquidacionError` (código y mensaje).

## R-04 · Pago + factura (RF-FAC-05..09, RN-22)

- **Decisión**: `POST /pagos` `{ idMovimiento, metodo, valorRecibido?, referencia?, tercero? }` (`facturas.crear`). En una transacción:
  1. liquidación persistida (la crea si falta, R-03) del movimiento cerrado; si no está cerrado → 409 `MOVIMIENTO_NO_CERRADO`;
  2. `FOR UPDATE` de la liquidación; si ya tiene factura → 409 `YA_PAGADO` «El servicio ya fue pagado»;
  3. efectivo: `valorRecibido ≥ total` (si no → 422 en `valorRecibido` «Faltan $ 1.000»), `cambio = recibido − total`; otros métodos: `referencia` obligatoria (4–40) y `valorRecibido` = total;
  4. `siguienteConsecutivo('factura')` → `FV-000001`; insertar factura (`id_cliente` = propietario del vehículo; tercero si viene) y pago (`fecha` = reloj, `id_cierre` NULL); bitácora `registrar_pago`.
- **Respuesta**: `{ pago: { idPago, metodo, valor, valorRecibido, cambio, referencia, fecha }, factura: <detalle> }`.
- **Carrera**: `ER_DUP_ENTRY` de `uq_factura_liquidacion` o `uq_pago_factura` → 409 `YA_PAGADO`.

## R-05 · Emitir el comprobante (RF-FAC-10..12)

- **Decisión**: `POST /facturas` `{ idFactura, tercero? }` (`facturas.crear`):
  - con `tercero` guarda documento (5–20) y razón social (3–100), solo si la factura aún no se envió por correo (si no → 409 `FACTURA_YA_ENVIADA`);
  - si el cliente tiene correo, envía el PDF adjunto (`enviarCorreo` con `adjuntos`) y responde el correo enmascarado; si no, `enviadaA: null`;
  - anulada → 409.
  El envío se marca en la bitácora (`enviar_factura`); `enviada` se calcula de la bitácora.
- **Integración de correo**: `enviarCorreo` acepta `adjuntos: [{ nombre, contenido, tipo }]` (nodemailer `attachments`); el transporte en memoria guarda el nombre de los adjuntos para las pruebas.
- **Electrónica**: `electronica = { estado: cufe ? 'enviada' : 'pendiente', cufe }`.

## R-06 · PDF de 80 mm (RF-FAC-10)

- **Decisión**: `factura.pdf.js` con pdfkit: página de 226,77 pt de ancho (80 mm) y alto según el contenido; encabezado PARKO y el parqueadero, número, fecha, cliente o tercero, placa, entrada, salida, tiempo, tarifa, detalle del cálculo, descuento, total, método, recibido y cambio; «ANULADA» si corresponde; nota «Comprobante interno · facturación electrónica pendiente (TBD-02)». `GET /facturas/:id/pdf` responde `application/pdf`.
- **Acceso**: `facturas.ver`, o el Cliente dueño de la factura (`id_cliente` = sesión); otro → 403.

## R-07 · Anulación (RF-FAC-13, RF-FAC-14)

- **Decisión**: `PATCH /facturas/:id/anulacion` `{ motivo }` (10–200), permiso `facturas.anular` (solo Administrador en la semilla). Estado `emitida` → `anulada` con motivo, usuario y fecha; ya anulada → 409 `FACTURA_ANULADA`. Nada se borra; el pago queda, pero los totales (listado, cuadre, reportes) cuentan solo las facturas `emitida`.

## R-08 · Listado (RF-FAC-15, RF-FAC-16)

- **Decisión**: `GET /facturas?q&desde&hasta&metodo&estado&page&limit`: `q` busca número, placa, nombre o documento del cliente o del tercero; `desde`/`hasta` son fechas `AAAA-MM-DD` (día completo, Bogotá); orden por fecha descendente. `meta.sumaTotal` = suma de las facturas **emitidas** del filtro. `GET /usuarios/me/facturas` (`perfil.ver`) = las del cliente de la sesión, con la misma forma.

## R-09 · Caja (RF-FAC-17..19)

- **Decisión**: turno abierto del operador = sus pagos con `id_cierre` NULL.
  - **`GET /caja/turno-actual`** (`caja.ver`): `{ inicio, servicios, totalesPorMetodo: { efectivo, tarjeta, transferencia, qr }, total, efectivoEsperado }`. Solo cuenta las facturas emitidas; las anuladas se informan aparte en `anuladas`.
  - **`POST /caja/cierres`** `{ efectivoContado, observaciones? }` (`caja.crear`): transacción con `FOR UPDATE` de los pagos abiertos del operador. Sin pagos → 409 `TURNO_SIN_PAGOS`. Inserta el cierre (`inicio` = primer pago, `fin` = reloj, `total_sistema_por_metodo`, `diferencia = contado − esperado`) y asigna `id_cierre` a esos pagos; bitácora `cerrar_caja`.
  - **`GET /caja/cierres`**: el rol Administrador ve todos; los demás, solo los suyos. Cada cierre trae sus facturas (número, placa, método, total, estado).

## R-10 · Pruebas

- **Decisión**: Jest con el reloj fijado y la sede de prueba (`tests/setup/sede.js`); movimientos de 135 min, 8 min y 30 h; membresía insertada por SQL (plan + membresía, la spec 010 aún no existe); tarifa inexistente con una tarifa de moto inactivada temporalmente dentro de la prueba (y restaurada). El correo usa el transporte en memoria (adjunto PDF). La colección Postman crea su entrada y su salida con placas libres según el pico y placa de hoy.
