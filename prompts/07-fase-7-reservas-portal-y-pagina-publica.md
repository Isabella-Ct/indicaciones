# FASE 7 — Reservas, portal del cliente y página web pública

## Contexto
Fases 0–6 terminadas. Falta la cara hacia el cliente: **reservas**, un **portal del cliente** unificado y la **página web pública** del parqueadero.

## Lee primero
- `CLAUDE.md` §5, §6 y §7 (**Reservas**).
- `docs/requerimientos.md`: REQ-RES-1, REQ-CLD-02, REQ-WEB-1.
- `docs/ficha-proyecto.md` (información del negocio para la página pública).
- Revisa `app/mi-cuenta.html`: hoy tiene secciones sueltas agregadas en fases anteriores; en esta fase se reorganiza.

Muestra tu plan antes de codificar.

## Tareas

### Backend — `reservas`
- `POST /api/v1/reservas` (cliente para sus vehículos; admin/operador para cualquiera): vehículo + celda disponible del mismo tipo. En una transacción: celda → `reservada`, reserva `confirmada` con `fecha_hora_expiracion = ahora + configuracion.reserva_minutos_expiracion`. Reglas: máximo una reserva activa por vehículo; no se puede reservar si el vehículo ya está dentro; no se puede reservar si el vehículo tiene pico y placa **en ese momento** (avisa del motivo).
- `PATCH /api/v1/reservas/:id/cancelar` (el dueño o admin/operador): libera la celda.
- `GET /api/v1/reservas` (admin/operador, filtros) y `GET /api/v1/usuarios/me/reservas`.
- Job (en `backend/src/jobs/`, cada minuto): marca `expirada` las reservas vencidas, libera la celda, emite SSE y notifica al cliente.
- Verifica que la entrada de la Fase 3 sigue marcando la reserva `cumplida`.

### Frontend — portal del cliente
- Reorganiza la navegación del rol **usuario** con estas pantallas:
  - `app/inicio.html` (dashboard del cliente, ya existe).
  - `app/disponibilidad.html`: el `parking-map` en solo lectura (REQ-CLD-02, sin placas ajenas); al tocar una celda libre del tipo de alguno de sus vehículos, el panel de detalle muestra el botón **Reservar**, que abre un `modal` para elegir el vehículo y confirmar, con cuenta regresiva del tiempo para llegar. Sus propias reservas y su celda de mensualidad se resaltan con `is-selected`.
  - `app/mis-movimientos.html`: estadías, facturas (PDF) y membresías en pestañas.
  - `app/mi-cuenta.html`: datos personales, contraseña, mis vehículos y notificaciones.
- Admin/operador: `app/reservas.html` con tabla de reservas y botón cancelar.

### Frontend — página pública `frontend/index.html` (REQ-WEB-1)
Usa el template `public-layout` con el **mismo lenguaje visual PARKO** (header asfalto con `brand`, `hazard-strip`, fondo concreto, títulos condensados en mayúsculas, bloques `panel`, botones amarillos, cero sombras). Crea los organisms que falten (`hero`, `feature-grid`, `pricing-table`, `availability-widget`, `contact-section`). Secciones:
1. **Hero:** fondo `--asphalt` con franja de peligro, marca **PARKO** con el subtítulo "Parqueadero ABC · Medellín" y título grande "24 horas en el corazón de Medellín", botones "Ver disponibilidad" (amarillo) e "Ingresar" (`btn--ghost` claro).
2. **Disponibilidad en vivo:** cupos libres de carros y motos (`/publico/disponibilidad/stream`) en tarjetas tipo `kpi` con `meter`, e indicador "en vivo".
3. **Tarifas** vigentes (`/publico/tarifas`) explicadas en lenguaje simple (valor por minuto, tope diario) y mensualidades.
4. **Servicios:** 24 h, carros y motos, membresías, reservas, seguridad y registro de incidentes.
5. **Pico y placa hoy:** dígitos restringidos hoy por tipo (endpoint público nuevo que no exponga nada más).
6. **Ubicación y contacto:** dirección Carrera 43 # 47-53, Medellín; mapa embebido de OpenStreetMap (iframe, sin API key).
7. Footer en `--asphalt` con `hazard-strip` arriba, dirección, horario 24 h y enlaces.

Requisitos de la página: responsive (360 px en adelante), `<title>` y meta description, Open Graph básico, imágenes con `alt`, Lighthouse ≥ 90 en Accesibilidad y Buenas prácticas.

### Tests
- Reserva con vehículo ajeno → 403. Segunda reserva activa → 409. Reserva expirada libera la celda.
- Los endpoints públicos no exponen placas, nombres ni documentos.

## Criterios de aceptación
- [ ] Cubre REQ-RES-1, REQ-CLD-02 y REQ-WEB-1.
- [ ] Flujo completo: el cliente reserva → el operador registra la entrada → la reserva queda `cumplida` y ocupa la celda reservada.
- [ ] La página pública muestra la disponibilidad y las tarifas reales y se actualiza en vivo.
- [ ] `npm test` y `npm run lint` pasan; README actualizado.

## Al terminar
Commit + resumen. **No empieces la Fase 8.**
