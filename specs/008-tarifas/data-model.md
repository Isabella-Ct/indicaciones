# Modelo de datos — 008-tarifas

**Fuente**: SRS v2.0 §6.1 (4.8), `backend/database/schema.sql` y [research.md](research.md). **Sin cambios de esquema**; la semilla agrega 5 tarifas.

## Tabla `tarifa` (6.1 *Tarifa*)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_tarifa | INT UNSIGNED | PK | — |
| nombre | VARCHAR(60) | NOT NULL | 3–60, recortado; no único |
| tipo_vehiculo | ENUM('carro','moto') | NOT NULL | — |
| tipo_cliente | ENUM('ocasional','registrado') | NOT NULL | registrado = vehículo con propietario (R-07) |
| valor_primera_hora | DECIMAL(12,2) | `CHECK > 0` | COP |
| minutos_fraccion | SMALLINT UNSIGNED | `CHECK 1..60` | — |
| valor_fraccion | DECIMAL(12,2) | `CHECK ≥ 0` | — |
| tope_diario | DECIMAL(12,2) | NULL, `CHECK ≥ valor_primera_hora` | tope por cada 24 h (RN-20, spec 009) |
| minutos_gracia | SMALLINT UNSIGNED | `CHECK 0..30`, DEFAULT 0 | — |
| vigente_desde | DATETIME | NOT NULL | hora de Bogotá |
| vigente_hasta | DATETIME | NULL, `CHECK > vigente_desde` | NULL = indefinida; vigencia `[desde, hasta)` |
| estado | ENUM('activo','inactivo') | DEFAULT 'activo' | solo las activas cuentan |

Índice `idx_tarifa_vigencia (tipo_vehiculo, tipo_cliente, estado, vigente_desde)` para la superposición y la búsqueda de la vigente.

**Regla de superposición (RN-18)**: no puede haber dos filas activas con el mismo `(tipo_vehiculo, tipo_cliente)` cuyas vigencias se crucen.

**Usada (RF-TAR-04)**: existe una `liquidacion` con `id_tarifa` = la tarifa.

## Representación en la API

```json
{
  "idTarifa": 1, "nombre": "Carro ocasional", "tipoVehiculo": "carro", "tipoCliente": "ocasional",
  "valorPrimeraHora": 4000, "minutosFraccion": 15, "valorFraccion": 1000, "topeDiario": 30000, "minutosGracia": 10,
  "vigenteDesde": "2026-01-01T00:00:00-05:00", "vigenteHasta": null, "estado": "activo",
  "situacion": "vigente", "usada": false
}
```

`situacion`: `vigente` (contiene el instante actual), `programada` (empieza después), `vencida` (terminó) o `inactiva`. La consulta pública omite `estado` y `usada`.

## Transiciones

| Estado | Acción | Resultado |
|---|---|---|
| activa | `PATCH estado=inactivo` | inactiva (si es la única vigente: 409 sin `confirmar`) |
| inactiva | `PATCH estado=activo` | activa (si no se superpone) |
| activa sin uso | `PUT` | todos los campos |
| activa usada | `PUT` | solo `nombre` y cierre de `vigenteHasta` (≥ ahora) |
