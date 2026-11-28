# Modelo de datos — 012-reservas

**Fuente**: SRS v2.0 §6.1 (4.12), `backend/database/schema.sql` y [research.md](research.md). **Sin cambios de esquema**; la semilla no agrega reservas.

## Tablas

### `reserva` (6.1 *Reserva*)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_reserva | INT UNSIGNED | PK | — |
| codigo | VARCHAR(12) | `UNIQUE uq_reserva_codigo` | consecutivo `R-000001` |
| id_cliente | INT UNSIGNED | FK → usuario | propietario del vehículo (RN-26) |
| id_vehiculo | INT UNSIGNED | FK → vehiculo | activo, con propietario; sin cruces con otra confirmada |
| id_celda | INT UNSIGNED | FK → celda | del tipo del vehículo; libre en la franja; puede reasignarse al iniciar (R-07) |
| fecha_hora_inicio | DATETIME | NOT NULL | futura, ≤ `RESERVA_ANTICIPACION_DIAS` (7) |
| minutos_espera | SMALLINT UNSIGNED | DEFAULT 30 | copia de `RESERVA_MINUTOS_ESPERA` al crear |
| estado | ENUM('confirmada','cumplida','cancelada','vencida') | DEFAULT 'confirmada' | transiciones abajo |
| id_movimiento | INT UNSIGNED | FK → movimiento, NULL | al cumplirse |

**Franja**: `[fecha_hora_inicio, fecha_hora_inicio + minutos_espera]` (extremos incluidos).

### `celda` (spec 004)

`estado = 'reservada'` durante la franja de su reserva confirmada (R-07); vuelve a `disponible` al vencer.

### `notificacion`

Tipo `reserva`, canal `ambos`: al crear, cancelar, reasignar y vencer; `enviada` al salir el correo.

## Representación en la API

```json
{
  "idReserva": 1, "codigo": "R-000001", "estado": "confirmada",
  "fechaHoraInicio": "2026-11-28T08:00:00-05:00", "minutosEspera": 30, "finEspera": "2026-11-28T08:30:00-05:00",
  "cliente": { "idUsuario": 4, "nombre": "Andrea Salcedo Ríos" },
  "vehiculo": { "idVehiculo": 1, "placa": "ABC123", "tipo": "carro" },
  "celda": { "idCelda": 3, "codigo": "A-03", "parqueadero": "Parqueadero ABC" },
  "idMovimiento": null
}
```

## Transiciones

| Desde | Acción | Hacia |
|---|---|---|
| — | reservar | `confirmada` |
| `confirmada` | cancelar antes del inicio | `cancelada` |
| `confirmada` | entrada del vehículo en la franja | `cumplida` |
| `confirmada` | control, `ahora > fin de la espera` | `vencida` (celda `disponible`) |
| `cumplida` / `vencida` / `cancelada` | cancelar | 409 |
