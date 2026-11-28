# Modelo de datos — 009-facturacion-pagos

**Fuente**: SRS v2.0 §6.1 (4.9), `backend/database/schema.sql` y [research.md](research.md). **Sin cambios de esquema.**

## Tablas

### `liquidacion` (6.1 *Liquidacion*)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_liquidacion | INT UNSIGNED | PK | — |
| id_movimiento | INT UNSIGNED | FK, `UNIQUE` | una por movimiento cerrado |
| id_tarifa | INT UNSIGNED | NULL, FK → tarifa | la vigente a la hora de entrada (RN-19) |
| minutos_cobrados | INT UNSIGNED | NOT NULL | = `movimiento.minutos_estadia` |
| valor_bruto | DECIMAL(12,2) | DEFAULT 0 | RN-20 |
| id_descuento, valor_descuento | INT, DECIMAL | NULL / 0 | spec 011 |
| cubierto_por_membresia | BOOLEAN | DEFAULT FALSE | RN-21 |
| valor_total | DECIMAL(12,2) | `CHECK ≥ 0` | — |

### `factura` (6.1 *Factura*)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_factura | INT UNSIGNED | PK | — |
| numero | VARCHAR(20) | `UNIQUE` | `FV-` + 6 dígitos, consecutivo sin huecos (RN-22) |
| id_liquidacion | INT UNSIGNED | NULL, `UNIQUE`, FK | una factura por liquidación |
| id_membresia | INT UNSIGNED | NULL, FK | spec 010; `CHECK` exactamente uno de los dos |
| id_cliente | INT UNSIGNED | NULL, FK → usuario | propietario del vehículo (NULL si es ocasional) |
| tercero_documento, tercero_nombre | VARCHAR(20), VARCHAR(100) | NULL | RF-FAC-11 |
| total | DECIMAL(12,2) | `CHECK ≥ 0` | = `liquidacion.valor_total` |
| fecha_emision | DATETIME | NOT NULL | reloj del servidor |
| estado | ENUM('emitida','anulada') | DEFAULT 'emitida' | solo las emitidas suman |
| motivo_anulacion, id_usuario_anulacion, fecha_anulacion | — | NULL | RF-FAC-14 |
| cufe | VARCHAR(100) | NULL | sin uso (TBD-02) → `electronica.estado = 'pendiente'` |

### `pago` (6.1 *Pago*)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_pago | INT UNSIGNED | PK | — |
| id_factura | INT UNSIGNED | FK, `UNIQUE` | un pago por factura (RF-FAC-08) |
| metodo | ENUM('efectivo','tarjeta','transferencia','qr') | NOT NULL | — |
| valor | DECIMAL(12,2) | `CHECK ≥ 0` | = total |
| valor_recibido, cambio | DECIMAL(12,2) | `CHECK` efectivo: recibido ≥ valor | RF-FAC-06 |
| referencia | VARCHAR(40) | `CHECK` obligatoria salvo efectivo | 4–40 (RF-FAC-07) |
| id_operador | INT UNSIGNED | FK | sesión |
| fecha | DATETIME | NOT NULL | reloj del servidor |
| id_cierre | INT UNSIGNED | NULL, FK → cierre_caja | NULL = turno abierto |

### `cierre_caja` (6.1 *CierreCaja*)

| Columna | Tipo | Regla |
|---|---|---|
| id_cierre | INT UNSIGNED PK | — |
| id_operador | FK → usuario | dueño del turno |
| inicio_turno, fin_turno | DATETIME, `CHECK fin ≥ inicio` | primer pago del turno · reloj al cerrar |
| total_sistema_por_metodo | JSON | `{ efectivo, tarjeta, transferencia, qr }` de facturas emitidas |
| efectivo_contado, diferencia | DECIMAL(12,2) | `diferencia = contado − efectivo esperado` |
| observaciones | VARCHAR(200) NULL | — |

### `alerta` (spec 014; aquí solo se inserta)

`tipo = 'sin_tarifa'`, `mensaje` «No hay tarifa vigente para moto (movimiento 12)», `referencia = 'movimiento:12'`, `fecha` = reloj.

## Representación en la API

**Liquidación**

```json
{
  "idMovimiento": 12, "persistida": true, "minutos": 135,
  "tarifa": { "idTarifa": 1, "nombre": "Carro ocasional", "valorPrimeraHora": 4000, "minutosFraccion": 15, "valorFraccion": 1000, "topeDiario": 30000, "minutosGracia": 10 },
  "tipoCliente": "ocasional", "fracciones": 5, "dias": 0, "valorBruto": 9000, "valorDescuento": 0,
  "cubiertoPorMembresia": false, "total": 9000, "explicacion": "$ 4.000 + 5 fracciones × $ 1.000 = $ 9.000",
  "pagada": false, "idFactura": null
}
```

**Factura**: `{ idFactura, numero, estado, fechaEmision, total, cliente, tercero, parqueadero, movimiento: { placa, tipo, entrada, salida, minutos }, liquidacion, pago, anulacion, electronica: { estado, cufe }, enviada }`.

## Transiciones de la factura

| Desde | Acción | Hacia |
|---|---|---|
| — | `POST /pagos` | `emitida` (con su pago) |
| `emitida` | `POST /facturas` | `emitida` (tercero y envío) |
| `emitida` | `PATCH …/anulacion` | `anulada` |
| `anulada` | anular otra vez | 409 |
