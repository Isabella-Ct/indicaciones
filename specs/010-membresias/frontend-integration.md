# Integración con el frontend — 010-membresias

## 1. Inventario

| Pantalla (SRS B.2) | Página | Vista (página) | Servicio → endpoint |
|---|---|---|---|
| Configuración › Planes de membresía | `planes.html` | `views/planes.view.js` | `listarPlanes`, `crearPlan`, `actualizarPlan`, `cambiarEstadoPlan` |
| Membresías (listado, nueva suscripción, renovar, cancelar) | `membresias.html` | `views/membresias.view.js` | `listarMembresias`, `suscribir`, `renovar`, `cancelar` + `buscarPorPlaca`, `listarPlanes` |
| Panel del cliente › Mi membresía | `mi-membresia.html` | `views/mi-membresia.view.js` | `miMembresia`, `suscribir`, `misVehiculos` |

Servicio: `js/services/membresias.service.js` (planes y membresías).

## 2. Componentes por nivel (Atomic Design)

| Nivel | Componente | Clase CSS | Uso |
|---|---|---|---|
| Átomo | `atomos/chip-estado.js` · `ponerChipMembresia(chip, estado)` (nuevo) | `atom-status-chip--free/reserved/out` | activa / vencida / cancelada |
| Molécula | `moleculas/vigencia.js` · `ponerVigencia(raiz, membresia)` (nuevo) | `molecule-kpi` + `atom-meter` | días restantes con la barra y el aviso de renovación |
| Organismo | `organismos/formulario-pago.js` · `conectarFormularioPago(prefijo)` (nuevo) | `organism-form--grid` | método, valor recibido con cambio en vivo y referencia (suscripción y renovación) |
| Organismo | `organismos/tabla-datos.js`, `modal.js` (existentes) | — | listados y diálogos |
| Página | las vistas de arriba | — | las únicas que llaman a `services/` |

## 3. Reglas de la interfaz

- Nueva suscripción: se escribe la placa y se muestra el propietario; los planes del `<select>` son los activos del tipo del vehículo.
- El pago se arma con `organismos/formulario-pago.js`, igual en la suscripción, la renovación y el panel del cliente (en el panel, solo tarjeta, transferencia o QR).
- «Renovar» y «Cancelar» solo con `membresias.editar`; el menú «Membresías» exige `membresias.ver`, «Planes» exige `planes.crear` (grupo Configuración) y «Mi membresía» exige `perfil.ver` (oculto con `membresias.ver`).

## 4. Errores

- `VALIDACION` → junto al campo (plan, pago);
- `MEMBRESIA_ACTIVA`, `PLAN_INACTIVO`, `MEMBRESIA_CANCELADA`, `MEMBRESIA_NO_ACTIVA`, `PLAN_DUPLICADO` → alerta del formulario.

## 5. Checklist por historia

| HU | Pantalla | Estados | Prueba manual |
|---|---|---|---|
| HU-45 | planes | errores 409 y 422 | crear, editar, inactivar |
| HU-46 | membresias, mi-membresia | pago inválido | suscribir con efectivo y con tarjeta |
| HU-47 | membresias | — | renovar y cancelar |
| HU-48 | mi-membresia | sin membresía / aviso a 5 días | días restantes y facturas |
