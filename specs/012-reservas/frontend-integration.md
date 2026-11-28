# Integración con el frontend — 012-reservas

## 1. Inventario

| Pantalla (SRS B.2) | Página | Vista (página) | Servicio → endpoint |
|---|---|---|---|
| Panel del cliente › Reservar y Mis reservas | `mis-reservas.html` | `views/mis-reservas.view.js` | `misReservas`, `reservar`, `cancelarReserva`, `celdasDisponibles` + `misVehiculos` |
| Reservas (listado del día) | `reservas.html` | `views/reservas.view.js` | `listarReservas`, `cancelarReserva` |
| Movimientos › Registrar entrada (aviso de reserva) | `movimientos.html` | `views/movimientos.view.js` | la entrada de la spec 007 (`reserva` en la respuesta) |

Servicio: `js/services/reservas.service.js`.

## 2. Componentes por nivel (Atomic Design)

| Nivel | Componente | Clase CSS | Uso |
|---|---|---|---|
| Átomo | `atomos/chip-estado.js` · `ponerChipReserva(chip, estado)` (nuevo) | `atom-status-chip--reserved/free/out` | confirmada / cumplida / cancelada / vencida |
| Átomo | `atomos/placa.js` (existente) | `atom-plate` | placa en las filas |
| Molécula | `moleculas/campo.js`, `alerta.js`, `aviso.js` (existentes) | — | errores y avisos |
| Organismo | `organismos/tabla-datos.js`, `modal.js` (existentes) | — | listados, formulario y confirmación |
| Página | las vistas de arriba | — | las únicas que llaman a `services/` |

## 3. Reglas de la interfaz

- Reservar: vehículo (los propios), fecha y hora (`datetime-local`, mínimo ahora y máximo 7 días) y celda (`<select>` con «Asignar automáticamente» y las de `GET /celdas/disponibles`, que se recargan al cambiar el vehículo o la hora).
- Sin vehículos: aviso «Registre primero un vehículo» con enlace a Mis vehículos (HU-52 E4).
- Ante `CELDA_NO_DISPONIBLE` se muestra el mensaje y se preselecciona la sugerida.
- Cancelar pide confirmación; solo para confirmadas que no han iniciado.
- Menú «Reservas» con `reservas.ver`; «Mis reservas» con `perfil.ver` (oculto con `reservas.ver`).

## 4. Errores

- `VALIDACION` → junto al campo (fecha, vehículo, celda);
- `CELDA_NO_DISPONIBLE`, `RESERVA_VEHICULO_CRUZADA`, `SIN_CELDAS`, `RESERVA_NO_CANCELABLE`, `RESERVA_INICIADA` → alerta del formulario o aviso.

## 5. Checklist por historia

| HU | Pantalla | Estados | Prueba manual |
|---|---|---|---|
| HU-52 | mis-reservas | sin vehículos, celda ocupada | reservar con celda elegida y automática |
| HU-53 | mis-reservas | — | cancelar |
| HU-54 | reservas | vacío, filtro | fecha de hoy y de mañana |
| HU-55 | movimientos | aviso de reserva | entrada con reserva |
