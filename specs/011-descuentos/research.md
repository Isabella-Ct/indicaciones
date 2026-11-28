# Investigación — 011-descuentos

**Fecha**: 2026-11-27 · **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Precedencia: rúbrica → constitución → SRS v2.0 → HU → spec → `CLAUDE.md`. La tabla `descuento` ya existe (2.0.0) con `UNIQUE uq_descuento_nombre`, `CHECK` del valor (porcentaje 1–100 o fijo > 0) y de la vigencia (`hasta > desde`); `liquidacion.id_descuento` y `liquidacion.valor_descuento` ya existen: **sin cambios de esquema**.

---

## R-01 · Un módulo y una regla pura

- **Decisión**: `modules/descuentos/` (`/descuentos`) con capas y `descuentos.reglas.js`:
  - `corresponde(descuento, { tipoVehiculo, tipoCliente, minutos, fecha })`: activo, vigente (`desde ≤ fecha ≤ hasta`), tipo de cliente y de vehículo («todos» o igual) y minutos mínimos;
  - `valorDe(descuento, bruto)`: porcentaje → `round(bruto × valor / 100)`; fijo → `min(valor, bruto)`;
  - `elegir(candidatos, bruto)`: el de mayor `valorDe`; empate → menor `idDescuento`; `null` si el bruto es 0;
  - `situacion(descuento, ahora)`: vigente | programado | vencido | inactivo (para el listado).

## R-02 · Aplicación en la liquidación (RF-DES-03, RF-DES-04, RN-21, RN-25)

- **Decisión**: `liquidaciones.service.calcularPara` calcula el bruto con `calcular` (spec 009) y, si no está cubierto por membresía y el bruto es > 0, pide a `descuentosRepositorio.candidatos({ tipoVehiculo, tipoCliente, fecha }, { conexion })` los activos vigentes, filtra con `corresponde` (minutos) y aplica `elegir`. `liquidaciones.reglas.aplicarDescuento(calculo, descuento, valor)` deja `valorDescuento`, `total = bruto − valor` y agrega a la explicación «− «Motos fin de semana» 20 % ($ 1.800) = $ 7.200».
- **Fecha de evaluación**: la salida del movimiento (`fecha_hora_salida`); en la vista previa de un abierto, `reloj.ahora()`.
- **Persistencia**: la liquidación guarda `id_descuento` y `valor_descuento` (una sola vez, spec 009). La guardada se muestra con su descuento y su valor guardados (RF-DES-05), aunque el descuento cambie después.
- **Respuesta**: la liquidación agrega `descuento: { idDescuento, nombre, tipo, valor } | null`.

## R-03 · Vigencia con fechas sin hora

- **Decisión**: el validador acepta `AAAA-MM-DD` o `AAAA-MM-DDTHH:MM` (Bogotá). Sin hora, `vigenteDesde` = 00:00:00 y `vigenteHasta` = 23:59:59 de ese día. La vigencia es cerrada en ambos extremos. `vigenteHasta > vigenteDesde` (422).

## R-04 · Validación y edición (RF-DES-01, RF-DES-02)

- **Decisión**: nombre 3–60 (409 `DESCUENTO_DUPLICADO` por `uq_descuento_nombre`); `tipo` porcentaje | valor_fijo; `valor` con 2 decimales como máximo, porcentaje 1–100 («El porcentaje debe estar entre 1 y 100.»), fijo > 0; `aplicaTipoCliente` todos | ocasional | registrado (por defecto todos); `aplicaTipoVehiculo` todos | carro | moto (por defecto todos); `minutosMinimos` 1–10.080 o null. `PUT` reemplaza todos los campos (bitácora solo con las diferencias). Editar no toca liquidaciones guardadas.

## R-05 · Estado (RF-DES-05)

- **Decisión**: `PATCH /descuentos/:id/estado { estado }`. Activar con `vigenteHasta < ahora` → 422 en `vigenteHasta` «Amplíe la vigencia del descuento antes de activarlo». Inactivar siempre se permite (la interfaz pide confirmación). Bitácora `cambiar_estado`.

## R-06 · Listado (HU-49)

- **Decisión**: `GET /descuentos?q&estado&tipoVehiculo&tipoCliente&page&limit` (`descuentos.ver`) con `situacion` y `usado` (si alguna liquidación lo aplicó, informativo).

## R-07 · Factura y comprobante (RF-DES-04)

- **Decisión**: la factura ya devuelve su `liquidacion` (spec 009): el PDF imprime «Descuento: <nombre>» y el valor; el organismo `comprobante` y la molécula `cobro` muestran la fila del descuento cuando lo hay.

## R-08 · Semilla

- **Decisión**: 3 descuentos (spec § Supuestos). Ninguno es vigente en noviembre de 2026, así que las pruebas de las specs 007–010 (que liquidan en noviembre de 2026) no cambian.

## R-09 · Pruebas

- **Decisión**:
  - unitarias de `descuentos.reglas` y de `aplicarDescuento`;
  - integración con el reloj fijado en fechas de fin de semana de noviembre de 2026 (sin pico y placa y sin tarifas programadas de otras pruebas). Cada prueba crea descuentos con nombre único y los inactiva en `afterEach`, para no cambiar las liquidaciones de otras suites;
  - Postman: crea sus descuentos con nombres aleatorios y vigencia futura, prueba validaciones y estado, y los inactiva al final. La aplicación en la liquidación (que necesita mover el reloj) se cubre con Jest.
