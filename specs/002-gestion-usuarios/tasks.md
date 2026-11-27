---
description: "Lista de tareas de 002-gestion-usuarios"
---

# Tareas: Gestión de usuarios

**Entrada**: documentos de diseño de `specs/002-gestion-usuarios/`

**Prerrequisitos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/openapi.yaml](contracts/openapi.yaml), [quickstart.md](quickstart.md), [frontend-integration.md](frontend-integration.md)

**Pruebas**: obligatorias (constitución §VI): una prueba Jest + Supertest por escenario, nombrada `HU-xx Ey`, y casos de éxito y de error por endpoint en Postman.

**Organización**: por historia de usuario. US1 = HU-07, US2 = HU-08, US3 = HU-09, US4 = HU-10, US5 = HU-11. Se implementan en este orden de prioridad: US1, US2, US4, US3, US5.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivo distinto y sin depender de tareas pendientes)
- **[Historia]**: US1…US5

---

## Fase 1: Preparación

**Propósito**: dependencia de correo y configuración (research R-01)

- [X] T001 Instalar `nodemailer` en `backend/package.json`; agregar `backend/correos/` y `backend/uploads/usuarios/` a `.gitignore` (con `.gitkeep` para uploads)
- [X] T002 [P] Variables `CORREO_TRANSPORTE`, `CORREO_REMITENTE`, `SMTP_HOST`, `SMTP_PUERTO`, `SMTP_SEGURO`, `SMTP_USUARIO`, `SMTP_CLAVE` en `backend/.env.example` (documentadas), `backend/.env` y `backend/.env.test` (`memoria`); validarlas en `backend/src/config/env.js` (con `smtp`, `SMTP_HOST` es obligatorio)

---

## Fase 2: Fundacional (bloquea las historias)

- [X] T003 [P] `backend/src/integrations/correo.js`: `enviarCorreo({ para, asunto, texto })` con transportes `smtp` / `archivo` (`.eml` en `backend/correos/`) / `memoria` (`bandejaMemoria()`, `vaciarBandeja()`); devuelve `true`/`false` sin lanzar (R-01)
- [X] T004 [P] `backend/src/utils/archivos.js` (`guardarFoto(buffer, ext)` → clave `usuarios/<uuid>.<ext>`, `rutaFoto(clave)`, `borrarFoto(clave)` sin error si no existe) y `backend/src/middlewares/subir-foto.js` (multer en memoria, 2 MB, un archivo `foto`, firma JPG/PNG → `req.foto = { buffer, ext, mime }`; errores → 422 con campo `foto`) (R-03)
- [X] T005 Ajustar `backend/src/modules/auth/auth.service.js`: contraseña correcta + usuario inactivo → 401 `USUARIO_INACTIVO` «Usuario inactivo. Comuníquese con el administrador.» (R-05); actualizar `backend/tests/integration/auth-login.test.js` y el caso «401 usuario inactivo» de `backend/docs/postman/casos/000-fundacion.js`
- [X] T006 [P] Pruebas unitarias `backend/tests/unit/correo.test.js` (memoria guarda; error de transporte → false) y `backend/tests/unit/subir-foto.test.js` (PNG y JPG válidos; GIF, PNG falso y > 2 MB → 422)
- [X] T007 [P] `frontend/js/api/http.js`: cuerpo `FormData` sin `Content-Type` manual y `solicitarArchivo(ruta)` → `Blob` (R-11)

**Punto de control**: la suite de la 001 sigue en verde con el login ajustado.

---

## Fase 3: Historia de usuario 1 — Registrar un usuario (Prioridad: P1) 🎯 MVP · HU-07

**Objetivo**: alta de usuarios con contraseña temporal por correo, foto opcional y alcance del Operador.

**Prueba independiente**: POST como Administrador → 201, con correo en la bandeja de memoria; documento repetido → 409; Operador con rol Administrador → 403.

### Pruebas de la historia 1

- [X] T008 [P] [US1] `backend/tests/unit/usuarios.reglas.test.js`: `normalizarDocumento` (puntos, espacios, PAS), `normalizarNombre`, `normalizarCorreo`, `normalizarCelular`, `generarContrasenaTemporal` (12 caracteres con los 4 tipos, sin ambiguos) y `diferencias`
- [X] T009 [US1] `backend/tests/integration/usuarios.test.js` bloque HU-07: E1 (201, código, `debeCambiarContrasena`, correo con contraseña que permite iniciar sesión, bitácora `crear` sin contraseña), E2 (documento y correo 409), E3 (422 por campo, sin autorización de datos), E4 (multipart PNG → `fotoUrl`; > 2 MB y GIF → 422 sin crear), E5 (Operador con rol 2 → 403; con rol 3 → 201), E6 (rol 5 inactivo y rol 999 → 422)

### Implementación de la historia 1

- [X] T010 [P] [US1] `backend/src/modules/usuarios/usuarios.reglas.js` (funciones de T008, según `data-model.md` Usuario.numero_documento, Usuario.nombre_completo, Usuario.correo y Usuario.celular)
- [X] T011 [P] [US1] `backend/src/modules/usuarios/usuarios.validator.js`: `usuarioEntrada` (data-model.md Usuario.tipo_documento, Usuario.numero_documento, Usuario.nombre_completo, Usuario.correo, Usuario.celular, Usuario.id_rol, Usuario.acepta_tratamiento_datos con conversión de multipart), `usuarioEdicion`, `perfilEntrada` (strict), `listar` (paginación + `rol` + `estado`), `params`, `cambioEstado`
- [X] T012 [US1] `backend/src/modules/usuarios/usuarios.repository.js`: `insertar`, `obtenerPorId` (sin hash, con rol), `rolAsignable(conexion, idRol)` con `FOR UPDATE`, `idRolCliente()`, mapeo a camelCase con `fotoUrl`
- [X] T013 [US1] `backend/src/modules/usuarios/usuarios.service.js` `crear(datos, foto, actor)`: alcance (R-08), rol activo, contraseña temporal + bcrypt, `withTransaction` + bitácora, traducción de `ER_DUP_ENTRY` (`uq_usuario_documento` → DOCUMENTO_DUPLICADO, `uq_usuario_correo` → CORREO_DUPLICADO), foto (borrar si falla la transacción), correo después del commit, `correoEnviado`
- [X] T014 [US1] `backend/src/modules/usuarios/usuarios.controller.js` + `usuarios.routes.js` (`POST /` con `authorize('usuarios.crear')`, `subirFoto`, `validate`) y registro en `rutasProtegidas()` de `backend/src/app.js`

**Punto de control**: HU-07 en verde.

---

## Fase 4: Historia de usuario 2 — Consultar y buscar usuarios (Prioridad: P1) · HU-08

**Objetivo**: listado con búsqueda y filtros, detalle con vehículos y membresía, foto autenticada; el Operador solo ve Clientes.

**Prueba independiente**: `?q=salcedo`, `?rol=&estado=`; detalle sin hash; el Operador con un Administrador → 403.

- [X] T015 [US2] Bloque HU-08 en `backend/tests/integration/usuarios.test.js`: E1–E6 y `GET /usuarios/:id/foto` (200 con imagen del propio usuario, 404 sin foto, 403 de un Cliente con la foto de otro)
- [X] T016 [US2] Repositorio: `listar({ q, idRol, estado, limit, offset })` con `LIKE` escapado sobre documento, nombre y correo, más `contar`; `vehiculosDe(id)` y `membresiaVigente(id)` (data-model.md § Solo lectura)
- [X] T017 [US2] Servicio: `listar` (alcance del Operador fuerza el rol Cliente), `obtener` (404 y 403 por alcance), `foto(id, actor)` (propia con `perfil.ver`, o con `usuarios.ver` dentro del alcance)
- [X] T018 [US2] Rutas `GET /`, `GET /:id`, `GET /:id/foto` (`authorize('usuarios.ver')`; la foto con verificación de alcance en el servicio) en `backend/src/modules/usuarios/usuarios.routes.js`

**Punto de control**: HU-07 y HU-08 en verde.

---

## Fase 5: Historia de usuario 4 — Activar o inactivar un usuario (Prioridad: P1) · HU-10

**Objetivo**: cambio de estado con revocación de sesiones, bitácora y protección de la propia cuenta.

**Prueba independiente**: inactivar un Cliente con token vigente → ese token da 401 y el login da 401 `USUARIO_INACTIVO`; reactivar → login 200.

- [X] T019 [US4] Bloque HU-10 en `backend/tests/integration/usuarios.test.js`: E1–E6
- [X] T020 [US4] Repositorio `cambiarEstado` y `revocarSesiones(conexion, idUsuario)`; servicio `cambiarEstado(id, estado, actor)` (404, 409 `AUTOINACTIVACION`, sin cambios → 200, bitácora) (data-model.md Usuario.estado)
- [X] T021 [US4] Ruta `PATCH /:id/estado` (`authorize('usuarios.cambiar_estado')`)

**Punto de control**: HU-07, HU-08 y HU-10 en verde.

---

## Fase 6: Historia de usuario 3 — Actualizar cualquier usuario (Prioridad: P2) · HU-09

- [X] T022 [US3] Bloque HU-09 en `backend/tests/integration/usuarios.test.js`: E1–E5 (incluye el reemplazo de la foto y `quitarFoto`)
- [X] T023 [US3] Repositorio `actualizar`; servicio `actualizar(id, datos, foto, actor)`: 404, rol activo (bloqueado), diferencias → bitácora `editar` solo con los campos cambiados, duplicados → 409, foto nueva / quitar (borrar la anterior después del commit)
- [X] T024 [US3] Ruta `PUT /:id` (`authorize('usuarios.editar')`, `subirFoto`, `validate`)

---

## Fase 7: Historia de usuario 5 — Actualizar mis datos personales (Prioridad: P2) · HU-11

- [X] T025 [US5] Bloque HU-11 en `backend/tests/integration/usuarios.test.js`: E1–E6 (notificaciones en la tabla `notificacion` y correo en la bandeja de memoria para el Administrador)
- [X] T026 [US5] Repositorio `administradoresActivos()`, `insertarNotificaciones(conexion, …)`, `marcarNotificacionEnviada`; servicio `misDatos(actor)` y `actualizarMisDatos(datos, foto, actor)` (diferencias → bitácora `editar_perfil` + notificaciones en la transacción; correo después del commit; sin cambios → no notifica) (data-model.md § notificacion)
- [X] T027 [US5] Rutas `GET /me` (`perfil.ver`) y `PUT /me` (`perfil.editar`, `subirFoto`, `validate`), declaradas antes de `/:id`

**Punto de control**: las 5 historias en verde en la API.

---

## Fase 8: Interfaz (Atomic Design)

- [X] T028 [P] Átomo `frontend/js/components/atomos/avatar.js` (`ponerAvatar(nodo, { nombre, blob })`: `<img>` con object URL o iniciales; libera la URL anterior) y molécula `frontend/js/components/moleculas/foto.js` (`conectarFoto(raiz)`: vista previa, validación de JPG/PNG ≤ 2 MB, quitar; expone `archivo()` y `quitada()`), con el CSS que haga falta en `frontend/css/atomos.css` y `moleculas.css`
- [X] T029 [P] `frontend/js/services/usuarios.service.js` (una función por endpoint; FormData cuando hay foto)
- [X] T030 `frontend/js/config/config.js` (MENU con Usuarios y Mi perfil; `paginaInicial`), navbar y menú de usuario («Mi perfil») actualizados en `frontend/roles.html`, `rol-detalle.html` y `permisos.html`
- [X] T031 [US1] [US2] [US3] [US4] `frontend/usuarios.html` + `frontend/js/views/usuarios.view.js`: tabla con avatar, búsqueda y filtros de rol y estado (el Operador solo ve Cliente), diálogo Nuevo/Editar con foto, aviso de privacidad y autorización, código de solo lectura, confirmación de cambio de estado, mensaje «Usuario registrado — código N» y advertencia si `correoEnviado` es falso
- [X] T032 [P] [US2] `frontend/usuario-detalle.html` + `frontend/js/views/usuario-detalle.view.js`: datos, foto, vehículos, membresía vigente y 404
- [X] T033 [P] [US5] `frontend/mi-perfil.html` + `frontend/js/views/mi-perfil.view.js`: documento, código y rol de solo lectura; nombre, correo, celular y foto editables; aviso de privacidad

---

## Fase 9: Pulido y transversales

- [X] T034 Carpeta Postman `backend/docs/postman/casos/002-gestion-usuarios.js` (con `archivos/foto.png` y soporte de `formdata` en `generar-coleccion.js`); `npm run test:api` en verde dos veces seguidas
- [X] T035 [P] `README.md`: endpoints de usuarios, variables de correo, carpeta `backend/correos/`, pantallas
- [X] T036 SC-004: medir `GET /usuarios?q=` con 50 000 usuarios (p95 ≤ 1 s) y documentarlo en `quickstart.md`
- [ ] T037 Cobertura de `usuarios.service.js` ≥ 80 %, `npm run lint` sin errores, `node --check` del frontend, verificación de imports e ids, revisión de que no queden textos en inglés y prueba manual en escritorio y a 375 px — **Hecho:** cobertura de usuarios.service 96 %, lint, `node --check`, imports e ids verificados y revisión de textos en inglés. **Pendiente:** prueba manual en navegador (escritorio y 375 px).
- [X] T038 Verificar que cada escenario HU-07..HU-11 tenga su prueba `HU-xx Ey` y su caso Postman, y marcar `[X]`

---

## Dependencias y orden de ejecución

- Preparación → Fundacional → US1 → US2 → US4 → US3 → US5 → Interfaz → Pulido.
- US2 a US5 reutilizan el validador, el repositorio y el servicio de US1 (mismos archivos, así que son secuenciales).
- T005 (login) bloquea HU-10 E2.

### Oportunidades de paralelismo

- T003 ∥ T004 ∥ T006 ∥ T007 · T008 ∥ T010 ∥ T011 · T028 ∥ T029 · T032 ∥ T033.

## Estrategia de implementación

1. Fases 1 y 2 → **punto de control** (la suite de la 001 en verde).
2. US1 (MVP: registrar clientes desde la caseta) → **detenerse y validar**.
3. US2 y US4 (P1), luego US3 y US5 (P2), cada una con su punto de control.
4. Interfaz, pulido y PR `002-gestion-usuarios` → `develop`.
