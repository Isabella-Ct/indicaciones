# Modelo de datos — 010-membresias

**Fuente**: SRS v2.0 §6.1 (4.10), `backend/database/schema.sql` y [research.md](research.md). **Sin cambios de esquema**; la semilla agrega 5 planes.

## Tablas

### `plan_membresia` (6.1 *PlanMembresia*)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_plan | INT UNSIGNED | PK | — |
| nombre | VARCHAR(60) | NOT NULL, `UNIQUE uq_plan_nombre` | 3–60, recortado |
| tipo_vehiculo | ENUM('carro','moto') | NOT NULL | debe coincidir con el vehículo (RN-23) |
| valor_mensual | DECIMAL(12,2) | `CHECK > 0` | valor del plan por periodo |
| dias_vigencia | SMALLINT UNSIGNED | DEFAULT 30, `CHECK > 0` | 1–366 |
| beneficios | VARCHAR(300) | NULL | — |
| estado | ENUM('activo','inactivo') | DEFAULT 'activo' | inactivo: no admite suscripciones ni renovaciones (RF-MEM-02) |

### `membresia` (6.1 *Membresia*)

| Columna | Tipo | Restricciones | Regla |
|---|---|---|---|
| id_membresia | INT UNSIGNED | PK | — |
| id_plan | INT UNSIGNED | FK → plan_membresia | activo al suscribir |
| id_cliente | INT UNSIGNED | FK → usuario | propietario del vehículo |
| id_vehiculo | INT UNSIGNED | FK → vehiculo | — |
| fecha_inicio, fecha_fin | DATE | `CHECK fin ≥ inicio` | fin = inicio + días − 1 (R-02) |
| estado | ENUM('activa','vencida','cancelada') | DEFAULT 'activa' | vence a diario (R-05) |
| motivo_cancelacion | VARCHAR(200) | NULL | 10–200 al cancelar |
| vehiculo_activa | generada, `UNIQUE` | — | una activa por vehículo (RN-23) |

### `factura` (spec 009)

La del plan lleva `id_membresia` (y `id_liquidacion` NULL); una por suscripción y una por cada renovación.

## Representación en la API

```json
{
  "idMembresia": 3, "estado": "activa",
  "plan": { "idPlan": 1, "nombre": "Mensual carro", "valorMensual": 180000, "diasVigencia": 30 },
  "cliente": { "idUsuario": 4, "nombre": "Andrea Salcedo Ríos" },
  "vehiculo": { "idVehiculo": 1, "placa": "ABC123", "tipo": "carro" },
  "fechaInicio": "2026-11-16", "fechaFin": "2026-12-15", "diasRestantes": 30, "avisoRenovacion": false,
  "motivoCancelacion": null
}
```

## Transiciones

| Desde | Acción | Hacia |
|---|---|---|
| — | suscribir con pago | `activa` |
| `activa` | renovar con pago | `activa` (fin + días) |
| `vencida` | renovar con pago | `activa` (desde hoy) |
| `activa` | cancelar con motivo | `cancelada` |
| `activa` | proceso diario, fin < hoy | `vencida` |
| `cancelada` | renovar | 409 |
