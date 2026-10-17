# FASE 5 — Incidencias y notificaciones

## Contexto
Fases 0–4 terminadas. Ya existe la tabla `notificaciones` y varios módulos ya insertan avisos (edición de datos, pico y placa, membresías). En esta fase construyes el módulo de **incidencias** y toda la **experiencia de notificaciones** (campana, bandeja, envío manual).

## Lee primero
- `CLAUDE.md` §7: **Incidencias** y **Notificaciones**.
- `docs/requerimientos.md`: REQ-INCD-1, REQ-NOT-1, REQ-USR-4.
- `docs/wireframes/06-incidentes.png` y `08-notificaciones.png` con sus correcciones.
- Busca en el código todos los lugares que ya crean notificaciones (`grep -r "notificaciones"`) y unifícalos en un solo servicio.

Muestra tu plan antes de codificar.

## Tareas

### Backend — `notificaciones`
- Servicio único `notificar({ destinatarios | rol, titulo, mensaje, tipo })` y refactoriza los módulos anteriores para que lo usen.
- `GET /api/v1/notificaciones/mias` (paginado, filtro leídas/no leídas), `GET /mias/conteo` (no leídas), `PATCH /:id/leida`, `PATCH /mias/leer-todas`.
- `POST /api/v1/notificaciones` (admin): mensaje manual a un usuario, a un rol completo o a todos.
- SSE `GET /api/v1/notificaciones/stream`: avisa al usuario conectado cuando le llega una notificación nueva (reutiliza el emisor de `backend/src/realtime/`, filtrando por usuario).

### Backend — `incidencias`
- `GET /api/v1/tipos-incidencia` y CRUD de tipos (admin).
- `POST /api/v1/incidencias` (admin/operador; REQ-INCD-1): tipo, placa del vehículo afectado (debe existir), celda opcional, descripción. El servidor genera el código `INC-AAAAMMDD-0001` y la fecha/hora. Notifica a los administradores y al propietario del vehículo si tiene.
- `GET /api/v1/incidencias` (admin/operador; filtros por tipo, placa y rango de fechas), `GET /:id`.
- Cliente: `GET /api/v1/usuarios/me/incidencias` (incidencias de sus vehículos).

### Frontend
- Organism `notification-bell` en el header: contador de no leídas que se actualiza en vivo (SSE), desplegable con las últimas 5 y enlace "Ver todas".
- `app/notificaciones.html`: bandeja con pestañas Todas / No leídas, marcar como leída o todas como leídas. Admin: formulario de envío (wireframe 08 corregido: destinatario = usuario con buscador | rol | todos; título; mensaje).
- `app/incidencias.html` (wireframe 06 corregido): formulario (tipo, placa con autocompletar, celda opcional, descripción) + tabla filtrable con detalle en modal.
- `app/mi-cuenta.html`: sección "Incidencias de mis vehículos" para el cliente.

### Tests
- Crear incidencia genera código único y notifica a los admins y al propietario.
- Un usuario no puede marcar como leída una notificación ajena (403/404).
- El envío por rol llega a todos los usuarios activos de ese rol.

## Criterios de aceptación
- [ ] Cubre REQ-INCD-1 y REQ-NOT-1; REQ-USR-4 sigue notificando usando el servicio unificado.
- [ ] La campana se actualiza sin recargar la página.
- [ ] `npm test` y `npm run lint` pasan; README actualizado.

## Al terminar
Commit + resumen. **No empieces la Fase 6.**
