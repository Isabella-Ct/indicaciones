# Modelo de datos — 013-incidencias

**Fuente**: SRS v2.0 §6.1 (4.13), `backend/database/schema.sql` y [research.md](research.md). **Sin cambios de esquema**; la semilla no agrega incidencias.

## Tablas

### `incidencia` (6.1 *Incidencia*)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_incidencia | INT UNSIGNED | PK | — |
| codigo | VARCHAR(12) | `UNIQUE uq_incidencia_codigo` | consecutivo `INC-000001` |
| tipo | ENUM('rayon','choque','atropellamiento','golpe_muro') | NOT NULL | obligatorio |
| id_vehiculo | INT UNSIGNED | FK → vehiculo | por placa; ocasional si no existe |
| id_celda | INT UNSIGNED | FK → celda, NULL | la indicada o la que ocupa el vehículo |
| fecha_hora_evento | DATETIME | NOT NULL | ≤ ahora (servidor) |
| descripcion | VARCHAR(500) | NOT NULL | 10–500 |
| evidencia_url | VARCHAR(255) | NULL | clave `incidencias/<uuid>.<ext>` (JPG/PNG ≤ 5 MB) |
| id_operador | INT UNSIGNED | FK → usuario | quien registra |
| estado | ENUM('abierta','en_seguimiento','cerrada') | DEFAULT 'abierta' | transiciones abajo |
| solucion | VARCHAR(500) | `CHECK` obligatoria si cerrada | 10–500 |
| fecha_cierre | DATETIME | NULL | hora del servidor al cerrar |

### `seguimiento_incidencia` (6.1 *SeguimientoIncidencia*)

| Columna | Tipo | Regla |
|---|---|---|
| id_incidencia | FK | no cerrada |
| nota | VARCHAR(500) | 5–500 |
| id_usuario | FK | Administrador de la sesión |
| fecha | DATETIME | hora del servidor |

### `alerta` (spec 014)

Tipo `incidencia`, mensaje «Incidencia INC-000001: Rayón de ABC123», referencia `incidencia:<id>`.

## Representación en la API

```json
{
  "idIncidencia": 1, "codigo": "INC-000001", "tipo": "rayon", "tipoNombre": "Rayón", "estado": "abierta",
  "fechaHoraEvento": "2026-11-27T09:40:00-05:00", "descripcion": "Rayón en la puerta del conductor…",
  "vehiculo": { "idVehiculo": 1, "placa": "ABC123", "tipo": "carro" },
  "celda": { "idCelda": 3, "codigo": "A-03" },
  "operador": { "idUsuario": 2, "nombre": "Juan Pérez" },
  "tieneEvidencia": true, "solucion": null, "fechaCierre": null,
  "seguimientos": [{ "idSeguimiento": 1, "fecha": "…", "usuario": { "idUsuario": 1, "nombre": "…" }, "nota": "…" }]
}
```

## Transiciones

| Desde | Acción | Hacia |
|---|---|---|
| — | registrar | `abierta` |
| `abierta` | nota | `en_seguimiento` |
| `en_seguimiento` | nota | `en_seguimiento` |
| `abierta` / `en_seguimiento` | cerrar con solución | `cerrada` |
| `cerrada` | nota o cierre | 409 |
