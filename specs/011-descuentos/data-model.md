# Modelo de datos — 011-descuentos

**Fuente**: SRS v2.0 §6.1 (4.11 y 4.9), `backend/database/schema.sql` y [research.md](research.md). **Sin cambios de esquema**; la semilla agrega 3 descuentos.

## Tablas

### `descuento` (6.1 *Descuento*)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_descuento | INT UNSIGNED | PK | — |
| nombre | VARCHAR(60) | NOT NULL, `UNIQUE uq_descuento_nombre` | 3–60, recortado; repetido → 409 |
| tipo | ENUM('porcentaje','valor_fijo') | NOT NULL | — |
| valor | DECIMAL(12,2) | `CHECK` porcentaje 1–100 o fijo > 0 | máximo 2 decimales |
| aplica_tipo_cliente | ENUM('todos','ocasional','registrado') | DEFAULT 'todos' | ocasional = sin propietario |
| aplica_tipo_vehiculo | ENUM('todos','carro','moto') | DEFAULT 'todos' | — |
| minutos_minimos | INT UNSIGNED | NULL | 1–10.080 |
| vigente_desde, vigente_hasta | DATETIME | NOT NULL, `CHECK hasta > desde` | hora de Bogotá; ambos incluidos (R-03) |
| estado | ENUM('activo','inactivo') | DEFAULT 'activo' | activar exige `hasta ≥ ahora` (R-05) |

### `liquidacion` (spec 009)

| Columna | Uso en 011 |
|---|---|
| id_descuento | FK al descuento aplicado (NULL si ninguno) |
| valor_descuento | valor descontado (0 si ninguno); `valor_total = valor_bruto − valor_descuento` |

## Representación en la API

```json
{
  "idDescuento": 1, "nombre": "Motos fin de semana", "tipo": "porcentaje", "valor": 20,
  "aplicaTipoCliente": "todos", "aplicaTipoVehiculo": "moto", "minutosMinimos": null,
  "vigenteDesde": "2026-12-01T00:00:00-05:00", "vigenteHasta": "2026-12-31T23:59:59-05:00",
  "estado": "activo", "situacion": "programado", "usado": false
}
```

En la liquidación: `"descuento": { "idDescuento": 1, "nombre": "Motos fin de semana", "tipo": "porcentaje", "valor": 20 }`, `"valorDescuento": 1800`, `"total": 7200`.

## Transiciones

| Desde | Acción | Hacia |
|---|---|---|
| — | crear | `activo` |
| `activo` | inactivar | `inactivo` |
| `inactivo` | activar (vigencia sin terminar) | `activo` |
| `inactivo` | activar (vigencia terminada) | 422 |
