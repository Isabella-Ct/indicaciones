# Modelo de datos — 005-vehiculos

**Fuente**: SRS v2.0 §6.1 (4.5), `backend/database/schema.sql` y [research.md](research.md). **Esquema 2.1.0**: se agrega `historial_propietario` `[Propuesta]` (R-05); la semilla agrega 6 vehículos.

## Tablas

### `vehiculo` (6.1 *Vehiculo*, sin cambios)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_vehiculo | INT UNSIGNED | PK | — |
| placa | VARCHAR(7) | NOT NULL, `UNIQUE uq_vehiculo_placa`, `CHECK ck_vehiculo_placa` | normalizada (R-02); carro `AAA123`, moto `AAA12` / `AAA12A` |
| tipo | ENUM('carro','moto') | NOT NULL | define el formato de la placa |
| color | VARCHAR(30) | NOT NULL | 2–30, recortado |
| marca | VARCHAR(40) | NOT NULL | 2–40, recortado |
| modelo | SMALLINT UNSIGNED | NOT NULL, `CHECK ≥ 1950` | 1950..año actual + 1 (R-04) |
| id_propietario | INT UNSIGNED | NULL, FK → usuario RESTRICT | usuario activo al asociar (RN-12); NULL = vehículo ocasional |
| estado | ENUM('activo','inactivo') | DEFAULT 'activo' | sin uso en esta spec |

### `historial_propietario` `[Propuesta]` (nueva, R-05)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_historial | INT UNSIGNED | PK | — |
| id_vehiculo | INT UNSIGNED | FK → vehiculo RESTRICT | — |
| id_usuario | INT UNSIGNED | FK → usuario RESTRICT | propietario del periodo |
| fecha_desde | DATETIME | NOT NULL | hora del servidor |
| fecha_hasta | DATETIME | NULL | NULL = periodo vigente; `CHECK fecha_hasta ≥ fecha_desde` |
| id_usuario_registro | INT UNSIGNED | NULL, FK → usuario | quién hizo la asociación (NULL en la semilla) |
| vehiculo_abierto | INT UNSIGNED | generada `IF(fecha_hasta IS NULL, id_vehiculo, NULL)`, `UNIQUE` | un solo periodo abierto por vehículo |

Índice `(id_usuario, fecha_desde)` para consultar los vehículos de un usuario por periodo.

### Lecturas

- `movimiento` (spec 007): `vehiculo_abierto` para `dentro` y la celda actual; los 10 últimos por `idx_movimiento_vehiculo (id_vehiculo, fecha_hora_entrada)`.
- `usuario` (spec 002): nombre, documento y estado del propietario.

## Representación en la API

```json
{
  "idVehiculo": 1, "placa": "ABC123", "tipo": "carro", "color": "Rojo", "marca": "Chevrolet", "modelo": 2018,
  "estado": "activo", "dentro": false, "celdaActual": null,
  "propietario": { "idUsuario": 4, "nombre": "Andrea Salcedo Ríos", "tipoDocumento": "CC", "numeroDocumento": "1000000004", "estado": "activo" }
}
```

El detalle agrega `historialPropietarios: [{ idUsuario, nombre, desde, hasta }]` y `ultimosMovimientos: [{ idMovimiento, fechaHoraEntrada, fechaHoraSalida, minutosEstadia, celda, estado }]`.

## Transiciones del propietario (R-06)

| Propietario actual | Pedido | Permiso necesario | Efecto |
|---|---|---|---|
| ninguno | usuario activo | `vehiculos.crear` | abre periodo |
| A | A | `vehiculos.crear` | sin cambios |
| A | B (activo) | `vehiculos.editar` | cierra el de A, abre el de B |
| A | ninguno (`null`) | `vehiculos.editar` | cierra el de A |
| cualquiera | usuario inactivo | — | 409 `USUARIO_INACTIVO` |
| cualquiera | usuario inexistente | — | 404 `USUARIO_NO_ENCONTRADO` |
