# Modelo de datos — 007-control-ingreso-salida

**Fuente**: SRS v2.0 §6.1 (4.7), `backend/database/schema.sql` y [research.md](research.md). **Esquema 2.2.0**: `ticket.extraviado` y la tabla `ingreso_rechazado`, ambos `[Propuesta]` (R-04, R-05).

## Tablas

### `movimiento` (6.1 *Movimiento*, sin cambios)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_movimiento | INT UNSIGNED | PK | — |
| id_vehiculo | INT UNSIGNED | FK → vehiculo | — |
| id_celda | INT UNSIGNED | FK → celda | ocupada con el vehículo mientras está abierto |
| id_puerta_entrada | INT UNSIGNED | FK → puerta_acceso | puerta activa de tipo `entrada` o `mixta` |
| fecha_hora_entrada | DATETIME | NOT NULL | reloj del servidor (RN-16) |
| id_operador_entrada | INT UNSIGNED | FK → usuario | usuario de la sesión |
| id_puerta_salida | INT UNSIGNED | NULL, FK | puerta de tipo `salida` o `mixta`, del parqueadero de la celda |
| fecha_hora_salida | DATETIME | NULL | reloj del servidor |
| minutos_estadia | INT UNSIGNED | NULL | `floor((salida − entrada) / 60 s)` |
| id_operador_salida | INT UNSIGNED | NULL, FK | — |
| estado | ENUM('abierto','cerrado','anulado') | DEFAULT 'abierto' | solo `abierto` → `cerrado` (salida) o `anulado` |
| motivo_anulacion | VARCHAR(200) | NULL | 10–200 al anular |
| id_usuario_anulacion, fecha_anulacion | INT, DATETIME | NULL | quién y cuándo anuló (RF-MOV-17) |
| vehiculo_abierto | generada, `UNIQUE` | — | un movimiento abierto por vehículo (RN-15) |

### `ticket` (6.1 *Ticket*)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_ticket | INT UNSIGNED | PK | — |
| id_movimiento | INT UNSIGNED | FK, `UNIQUE` | un ticket por movimiento |
| codigo | VARCHAR(12) | `UNIQUE` | `T-` + 6 dígitos, consecutivo sin huecos |
| fecha_emision | DATETIME | NOT NULL | = entrada |
| impreso | BOOLEAN | DEFAULT FALSE | sin uso (la vista de impresión es del navegador) |
| valido | BOOLEAN | DEFAULT TRUE | FALSE al anular |
| extraviado | BOOLEAN | DEFAULT FALSE | **nuevo** `[Propuesta]`: TRUE si la salida fue sin ticket (HU-33 E4) |

### `ingreso_rechazado` `[Propuesta]` (nueva)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_ingreso_rechazado | INT UNSIGNED | PK | — |
| placa | VARCHAR(7) | NOT NULL | normalizada |
| tipo_vehiculo | ENUM('carro','moto') | NOT NULL | — |
| id_vehiculo | INT UNSIGNED | NULL, FK → vehiculo | NULL si la placa no estaba registrada |
| id_puerta | INT UNSIGNED | FK → puerta_acceso | — |
| fecha_hora | DATETIME | NOT NULL, índice | reloj del servidor |
| motivo | VARCHAR(200) | NOT NULL | motivo de `evaluar` |
| id_operador | INT UNSIGNED | FK → usuario | — |

## Representación en la API

```json
{
  "idMovimiento": 12, "estado": "abierto",
  "vehiculo": { "idVehiculo": 1, "placa": "ABC123", "tipo": "carro", "ocasional": false },
  "parqueadero": { "idParqueadero": 1, "nombre": "Parqueadero ABC" },
  "celda": { "idCelda": 1, "codigo": "A-01", "piso": 1 },
  "puertaEntrada": { "idPuerta": 1, "nombre": "Carrera 43" }, "fechaHoraEntrada": "2026-11-30T07:30:00-05:00",
  "operadorEntrada": { "idUsuario": 2, "nombre": "Juan Pérez Álvarez" },
  "puertaSalida": null, "fechaHoraSalida": null, "operadorSalida": null, "minutosEstadia": null,
  "minutosTranscurridos": 0, "masDe24h": false,
  "ticket": { "codigo": "T-000001", "valido": true, "extraviado": false },
  "anulacion": null
}
```

La salida agrega `liquidacion: null` (spec 009). `GET /tickets/:codigo` → `{ codigo, fechaEmision, valido, extraviado, tieneCorreo, parqueadero: { nombre, direccion }, movimiento }`.

## Transiciones del movimiento

| Desde | Acción | Hacia | Efectos |
|---|---|---|---|
| — | entrada | `abierto` | celda `ocupada`, ticket válido |
| `abierto` | salida | `cerrado` | celda `disponible`, minutos, ticket extraviado (opcional) |
| `abierto` | anulación | `anulado` | celda `disponible`, ticket inválido, motivo/usuario/fecha |
| `cerrado` / `anulado` | cualquiera | — | 404 (salida) o 409 (anulación) |
