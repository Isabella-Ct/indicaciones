# FASE 1 — Usuarios y vehículos

## Contexto
La Fase 0 ya está hecha (estructura, BD, login, roles, componentes base). Ahora construyes la gestión de usuarios y vehículos. Respeta `CLAUDE.md` (capas, Atomic Design, permisos §6).

## Lee primero
- `CLAUDE.md` §4, §5, §6.
- `docs/requerimientos.md`: REQ-USR-1 a 8 y REQ-CAR-1 a 3.
- `docs/wireframes/02-registro-vehiculo.png` y sus correcciones en `requerimientos.md` §C.
- Revisa el código existente de `backend/src/modules/auth` y los componentes de `frontend/js/components` para reutilizarlos.

Muestra tu plan antes de codificar.

## Tareas

### Backend — módulo `usuarios`
- `GET /api/v1/usuarios` (admin; filtros: rol, estado, búsqueda por documento/nombre; paginado).
- `GET /api/v1/usuarios/:id` (admin, o el propio usuario).
- `POST /api/v1/usuarios` (admin/operador; REQ-USR-2). El operador **no** puede crear administradores. Foto opcional con multer (jpg/png ≤ 2 MB). Contraseña temporal + `debe_cambiar_contrasena = true`.
- `PUT /api/v1/usuarios/:id` (admin; REQ-USR-5).
- `PATCH /api/v1/usuarios/:id/estado` (solo admin; REQ-USR-3). Un admin no puede inactivarse a sí mismo.
- `GET /api/v1/usuarios/me` y `PUT /api/v1/usuarios/me` (cualquier rol; REQ-USR-4): solo nombres, correo, celular, foto y contraseña (no rol ni estado). Al guardar → crea notificación para **todos los administradores** con los campos cambiados.
- Validaciones: documento y correo únicos (409 con mensaje claro), celular colombiano de 10 dígitos, correo válido.

### Backend — módulo `vehiculos`
- `GET /api/v1/vehiculos` (admin/operador; filtros: placa, tipo, propietario, sin propietario).
- `GET /api/v1/vehiculos/placa/:placa` (admin/operador; se usará en entradas/salidas).
- `POST /api/v1/vehiculos` (admin/operador; REQ-CAR-1): placa, tipo, color, marca, modelo, usuario_id opcional. Normaliza y valida la placa según el tipo (`CLAUDE.md` §4).
- `PUT /api/v1/vehiculos/:id` (solo admin; REQ-CAR-2).
- `PATCH /api/v1/vehiculos/:id/propietario`:
  - Admin/operador pueden asignar propietario a un vehículo **sin propietario** (REQ-USR-6).
  - Solo admin puede **cambiar** el propietario existente (REQ-CAR-3). Guarda el cambio en `vehiculos_historial_propietario`.
- `GET /api/v1/usuarios/me/vehiculos` (cliente: sus vehículos).

### Frontend
- Nuevos componentes que necesites (respeta niveles y el estilo PARKO): molecules `search-box`, `pagination`, `user-picker` (busca usuario por documento); organism `data-table` (basado en la tabla `log` de la maqueta, con encabezados en `--font-display` y celdas en `--font-mono`). Para la placa usa `input--plate` y para mostrarla el atom `plate`. Reutiliza el `modal` de la Fase 0.
- `app/usuarios.html`: tabla con filtros, crear/editar en modal, botón activar/inactivar (solo admin), vista previa de foto.
- `app/vehiculos.html`: tabla + formulario (wireframe 02 corregido: placa, tipo, color, marca, modelo, propietario con buscador), asignar/reasignar propietario.
- `app/mi-cuenta.html` (todos los roles): editar mis datos y cambiar contraseña; para clientes, lista "Mis vehículos" (solo lectura).
- Los botones/acciones que el rol no puede usar **no se muestran**, y además el backend los rechaza.

### Tests
- Operador intenta crear un admin → 403. Operador intenta reasignar vehículo con propietario → 403.
- Documento duplicado → 409. Placa inválida para el tipo → 422.
- Usuario edita sus datos → se crea notificación a los admins.

## Criterios de aceptación
- [ ] Cubre REQ-USR-2 a 6 y REQ-CAR-1 a 3, probado con los 3 roles.
- [ ] El historial de cambio de propietario queda guardado.
- [ ] La foto se sube, se muestra y se rechaza si no es jpg/png o pesa más de 2 MB.
- [ ] Las pantallas usan los componentes PARKO (tablas con estilo `log` dentro de un `panel`, formularios con `field`, placas con el atom `plate`) y funcionan a 375 px.
- [ ] `npm test` y `npm run lint` pasan; README actualizado con los endpoints nuevos.

## Al terminar
Commit + resumen (qué REQ quedaron cubiertos, cómo probarlo). **No empieces la Fase 2.**
