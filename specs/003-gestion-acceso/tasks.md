---
description: "Lista de tareas de 003-gestion-acceso"
---

# Tareas: Gestión de acceso

**Entrada**: documentos de diseño de `specs/003-gestion-acceso/`

**Prerrequisitos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/openapi.yaml](contracts/openapi.yaml), [quickstart.md](quickstart.md), [frontend-integration.md](frontend-integration.md)

**Pruebas**: obligatorias (constitución §VI): Jest + Supertest por escenario (`HU-xx Ey`) y Postman con éxito y error por endpoint. El restablecimiento exitoso solo se prueba en Jest (ver quickstart).

**Organización**: US1 = HU-12, US2 = HU-13, US3 = HU-14, US4 = HU-15, US5 = HU-16. Orden: US1 → US2 → US4 → US5 → US3.

## Formato: `[ID] [P?] [Historia] Descripción`

---

## Fase 1: Preparación

- [X] T001 `URL_PUBLICA` en `backend/.env.example` (documentada), `backend/.env` y `backend/.env.test`, y validada en `backend/src/config/env.js` (por defecto `http://localhost:<PORT>`); constantes `LOGIN_MAX_FALLIDOS = 5`, `LOGIN_VENTANA_MIN = 15` y `TOKEN_RECUPERACION_MIN = 30` en `backend/src/config/constantes.js`

---

## Fase 2: Fundacional

- [X] T002 [P] `backend/src/modules/auth/auth.reglas.js`: `generarTokenRecuperacion()` (32 bytes en hexadecimal), `hashToken(token)` (SHA-256) y `contrasenaCumple(texto)` (8–64, letra y dígito); prueba en `backend/tests/unit/acceso.reglas.test.js`
- [X] T003 `backend/src/middlewares/authenticate.js` + `auth.repository.buscarSesionVigente` (incluye `debe_cambiar_contrasena`): 403 `CAMBIO_CONTRASENA_REQUERIDO` salvo con `authenticate.permitirCambioPendiente` (research R-02)
- [X] T004 [P] `backend/src/modules/usuarios/usuarios.repository.js` `insertar` con `debeCambiarContrasena` (por defecto TRUE, así la spec 002 sigue igual)

**Punto de control**: suites 001 y 002 en verde.

---

## Fase 3: Historia de usuario 1 — Iniciar sesión como Administrador u Operador (Prioridad: P1) 🎯 MVP · HU-12

- [X] T005 [US1] `backend/tests/integration/acceso.test.js` bloque HU-12: E1–E5 (el bloqueo con un documento propio de la prueba; la liberación a los 15 min se simula con `UPDATE intento_acceso SET fecha = fecha - INTERVAL 16 MINUTE`)
- [X] T006 [US1] `auth.repository`: `registrarIntento`, `fallosRecientes(numeroDocumento)` (data-model.md § intento_acceso), `hashDeUsuario`, `cambiarContrasena(conexion, id, hash)`; `auth.service.iniciarSesion` con el bloqueo (research R-01) y `cambiarContrasena(datos, actor)` (actual correcta, nueva distinta, bitácora)
- [X] T007 [US1] `auth.validator`: esquema `contrasenaNueva` (data-model.md Usuario.contrasena_hash vía regla R-03) y `cambioContrasena`; ruta `PUT /auth/contrasena` con `authenticate.permitirCambioPendiente` en `auth.routes.js`

---

## Fase 4: Historia de usuario 2 — Iniciar sesión como Cliente (Prioridad: P1) · HU-13

- [X] T008 [US2] Bloque HU-13 en `backend/tests/integration/acceso.test.js`: E1–E3 (permisos del Cliente en el token; 403 en `/usuarios`)

---

## Fase 5: Historia de usuario 4 — Recuperar mi contraseña (Prioridad: P1) · HU-15

- [X] T009 [US4] Bloque HU-15: E1–E4 (correo en la bandeja de memoria con el enlace y la URL pública; cuerpos idénticos; restablecimiento que revoca sesiones; token usado, vencido —se simula con `UPDATE expira_en`—, reemplazado e inventado → 409)
- [X] T010 [US4] `auth.repository`: `invalidarTokens`, `crearToken`, `tokenVigente(conexion, hash)` con `FOR UPDATE`, `marcarTokenUsado`, `revocarSesionesDe` (data-model.md TokenRecuperacion.token_hash, TokenRecuperacion.expira_en, TokenRecuperacion.usado); `auth.service.recuperar` (respuesta fija, correo sin esperar) y `restablecer` (transacción + bitácora)
- [X] T011 [US4] Validadores `recuperar` y `restablecer`; rutas públicas `POST /auth/recuperar` y `POST /auth/restablecer` con el límite por IP

---

## Fase 6: Historia de usuario 5 — Cerrar sesión (Prioridad: P1) · HU-16

- [X] T012 [US5] Bloque HU-16: E1–E2 (204; luego 401 en `/usuarios/me` y en un segundo logout)
- [X] T013 [US5] `auth.repository.revocarSesion(jti)`, `auth.service.cerrarSesion(actor)` y ruta `POST /auth/logout` (`authenticate.permitirCambioPendiente`)

---

## Fase 7: Historia de usuario 3 — Registrarme como cliente (Prioridad: P2) · HU-14

- [X] T014 [US3] Bloque HU-14: E1–E5
- [X] T015 [US3] Validador `registro` (reutiliza los campos de `usuarios.validator`: data-model de la spec 002 Usuario.tipo_documento, Usuario.numero_documento, Usuario.nombre_completo, Usuario.correo, Usuario.celular, Usuario.acepta_tratamiento_datos + contraseña y confirmación; estricto); `auth.service.registrarme` (rol Cliente, `debeCambiarContrasena = FALSE`, 409 `CUENTA_EXISTENTE` / `CORREO_DUPLICADO`, bitácora `autorregistro`); ruta pública `POST /auth/registro`

**Punto de control**: las 5 historias en verde en la API.

---

## Fase 8: Interfaz (Atomic Design)

- [X] T016 [P] Molécula `frontend/js/components/moleculas/contrasena.js` (`conectarContrasena(input, { casillaMostrar, ayuda })`: mostrar/ocultar y estado en línea de las reglas)
- [X] T017 `frontend/js/services/auth.service.js` (`cerrarSesion` con la API, `cambiarContrasena`, `registrarme`, `recuperarContrasena`, `restablecerContrasena`) y `frontend/js/api/http.js` (403 `CAMBIO_CONTRASENA_REQUERIDO` → `cambiar-contrasena.html`)
- [X] T018 `frontend/js/components/plantillas/marco-app.js`: contraseña temporal → `cambiar-contrasena.html`; sin permiso → `paginaInicial`; `pageshow` sin sesión → login; `alSalir: cerrarSesion` en todas las vistas internas
- [X] T019 [US1] [US2] `frontend/login.html` + `login.view.js` (enlaces, `CUENTA_BLOQUEADA`, destino según `debeCambiarContrasena`) y `frontend/cambiar-contrasena.html` + `cambiar-contrasena.view.js`; ítem «Cambiar contraseña» en el menú de usuario de todas las páginas internas
- [X] T020 [P] [US3] `frontend/registro.html` + `registro.view.js` (aviso de privacidad, casilla obligatoria, confirmación; `CUENTA_EXISTENTE` con enlace a recuperar); enlace «Crear cuenta» en `index.html` y `login.html`
- [X] T021 [P] [US4] `frontend/recuperar.html` + `recuperar.view.js` y `frontend/restablecer.html` + `restablecer.view.js`

---

## Fase 9: Pulido y transversales

- [X] T022 Carpeta Postman `backend/docs/postman/casos/003-gestion-acceso.js`; el caso de error de `000-fundacion.js` pasa a un documento aleatorio (evita bloquear al administrador tras 5 corridas); `npm run test:api` en verde dos veces seguidas
- [X] T023 [P] `README.md`: endpoints de acceso, `URL_PUBLICA`, bloqueo y recuperación
- [ ] T024 Cobertura de `auth.service.js` ≥ 80 %, `npm run lint`, `node --check`, verificación de imports e ids, revisión de que no queden textos en inglés y prueba manual en escritorio y a 375 px — **Hecho:** cobertura de auth.service 98,8 %, lint, `node --check`, imports e ids verificados y revisión de textos en inglés. **Pendiente:** prueba manual en navegador (escritorio y 375 px).
- [X] T025 Verificar que cada escenario HU-12..HU-16 tenga su prueba y su caso Postman, y marcar `[X]`

## Dependencias y orden de ejecución

- Preparación → Fundacional → US1 → US2 → US4 → US5 → US3 → Interfaz → Pulido.
- Todas las historias tocan `auth.service.js`, `auth.repository.js` y `acceso.test.js`, así que son secuenciales.
- Paralelismo: T002 ∥ T004 · T016 ∥ T020 ∥ T021.

## Estrategia de implementación

1. Fundacional (autenticación con el cambio pendiente) → **punto de control** (suites 001 y 002).
2. US1 (MVP: bloqueo y cambio de contraseña) → **detenerse y validar**.
3. US2, US4, US5 y US3, cada una con su punto de control; luego interfaz, pulido y PR.
