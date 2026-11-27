# Modelo de datos — 006-pico-y-placa

**Fuente**: SRS v2.0 §6.1 (4.6), `backend/database/schema.sql` y [research.md](research.md). **Sin cambios de esquema**; la semilla agrega 10 restricciones.

## Tabla `restriccion_placa` (6.1 *RestriccionPlaca*)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_restriccion | INT UNSIGNED | PK | — |
| dia_semana | TINYINT UNSIGNED | NOT NULL, `CHECK 1..7` | 1 lunes … 7 domingo |
| tipo_vehiculo | ENUM('carro','moto') | NOT NULL | — |
| digitos | VARCHAR(20) | NOT NULL, `CHECK '^[0-9](,[0-9])*$'` | 1–5 dígitos distintos, ordenados (R-02) |
| posicion_digito | ENUM('ultimo','primero') | DEFAULT 'ultimo' | por defecto `ultimo` (carro) y `primero` (moto) |
| hora_inicio | TIME | NOT NULL | `HH:MM` |
| hora_fin | TIME | NOT NULL, `CHECK hora_fin > hora_inicio` | franja `[inicio, fin)` (R-03) |
| vigente_desde | DATE | NOT NULL | por defecto hoy (Bogotá) |
| vigente_hasta | DATE | NULL, `CHECK ≥ vigente_desde` | NULL = indefinida |
| estado | ENUM('activo','inactivo') | DEFAULT 'activo' | solo las activas cuentan (R-04, R-05) |

Índice `idx_restriccion_dia (dia_semana, tipo_vehiculo, estado)` para la superposición, la evaluación y la consulta de hoy.

**Regla de superposición (RN-14)**: no puede haber dos filas activas con el mismo `(dia_semana, tipo_vehiculo)` cuyas vigencias se crucen.

## Representación en la API

```json
{
  "idRestriccion": 1, "diaSemana": 1, "nombreDia": "lunes", "tipoVehiculo": "carro",
  "digitos": [6, 9], "posicionDigito": "ultimo", "horaInicio": "05:00", "horaFin": "20:00",
  "vigenteDesde": "2026-01-01", "vigenteHasta": null, "estado": "activo"
}
```

## Evaluación (RN-13)

`evaluar({ placa, tipo, fechaHora })` → `{ restringido: boolean, motivo: string | null, restriccion: Restriccion | null }`, con fecha, día y hora en America/Bogota.
