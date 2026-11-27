# Modelo de datos — 004-parqueaderos-celdas

**Fuente**: SRS v2.0 §6.1 (4.4), `backend/database/schema.sql` 2.0.0 y [research.md](research.md). **Sin cambios de esquema**; la semilla agrega parqueaderos, puertas y celdas.

## Tablas

### `parqueadero` (6.1 *Parqueadero*)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_parqueadero | INT UNSIGNED | PK | — |
| nombre | VARCHAR(60) | NOT NULL, `UNIQUE uq_parqueadero_nombre` | 3–60, recortado (R-02) |
| direccion | VARCHAR(120) | NOT NULL | 5–120 |
| pisos | TINYINT UNSIGNED | NOT NULL, `CHECK 1..20` | no menor que el piso más alto con celdas (R-04) |
| horario | VARCHAR(60) | NOT NULL, DEFAULT '24 horas' | ≤ 60 |
| estado | ENUM('activo','inactivo') | DEFAULT 'activo' | R-03 |

### `puerta_acceso` (6.1 *PuertaAcceso*)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_puerta | INT UNSIGNED | PK | — |
| id_parqueadero | INT UNSIGNED | FK → parqueadero RESTRICT | el parqueadero debe estar activo para crear |
| nombre | VARCHAR(40) | NOT NULL, `UNIQUE (id_parqueadero, nombre)` | 2–40 |
| tipo | ENUM('entrada','salida','mixta') | NOT NULL | `uso=entrada` → entrada+mixta; `uso=salida` → salida+mixta |
| estado | ENUM('activo','inactivo') | DEFAULT 'activo' | — |

### `celda` (6.1 *Celda*)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_celda | INT UNSIGNED | PK | — |
| id_parqueadero | INT UNSIGNED | FK → parqueadero; índice `(id_parqueadero, tipo_vehiculo, estado)` | — |
| codigo | VARCHAR(10) | NOT NULL, `UNIQUE (id_parqueadero, codigo)` | mayúsculas, `^[A-Z0-9-]{1,10}$` |
| tipo_vehiculo | ENUM('carro','moto') | NOT NULL | igual al del vehículo al ocupar |
| piso | TINYINT UNSIGNED | NOT NULL | 1..parqueadero.pisos |
| area | VARCHAR(20) | NULL | ≤ 20 |
| estado | ENUM('disponible','ocupada','reservada','inhabilitada') | DEFAULT 'disponible' | máquina de estados R-05 |
| motivo_inhabilitacion | VARCHAR(200) | NULL | obligatorio (3–200) al inhabilitar; NULL al habilitar |
| id_vehiculo_actual | INT UNSIGNED | FK → vehiculo; `UNIQUE`; `CHECK (estado='ocupada') = (id_vehiculo_actual IS NOT NULL)` | RNF-SAF-01 |

### Solo lectura

`vehiculo` (placa, tipo) y `movimiento` (`fecha_hora_entrada` del movimiento `abierto` de la celda) para el ocupante (R-07).

### `bitacora`

Acciones `crear`, `editar` y `cambiar_estado` sobre las entidades `parqueadero`, `puerta` y `celda`, con el valor anterior y el nuevo de los campos cambiados.

## Estados de la celda

```text
            inhabilitar (motivo)                ocupar (entrada, spec 007)
 disponible ───────────────────▶ inhabilitada    disponible ──────────────▶ ocupada
     ▲        habilitar          │                   ▲   liberar (salida/anulación)│
     └───────────────────────────┘                   └─────────────────────────────┘
 disponible ⇄ reservada: solo la spec 012 (reserva confirmada / vencida o cumplida)
 reservada ──ocupar──▶ ocupada (entrada del vehículo reservado)
```

## Recursos de la API

- `Parqueadero`: `{ idParqueadero, nombre, direccion, pisos, horario, estado, celdas: { carro, moto, total }, createdAt, updatedAt }`
- `ParqueaderoDetalle` = `Parqueadero` + `{ puertas: [Puerta], resumen: [{ piso, tipoVehiculo, total, disponibles, ocupadas, reservadas, inhabilitadas }] }`
- `Puerta`: `{ idPuerta, idParqueadero, nombre, tipo, estado }`
- `Celda`: `{ idCelda, idParqueadero, parqueadero, codigo, tipoVehiculo, piso, area, estado, motivoInhabilitacion, ocupante: { placa, tipo, fechaHoraEntrada } | null }`
- `Disponibilidad`: ver research R-09.

## Datos semilla

Ver research R-11. Las celdas inhabilitadas de la semilla: A-12 («Mantenimiento de la demarcación») y las 4 del anexo («Parqueadero inactivo»).
