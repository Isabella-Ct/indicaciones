# Plan de implementación: Gestión de acceso

**Rama**: `003-gestion-acceso` | **Fecha**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de `specs/003-gestion-acceso/spec.md`

## Resumen

Completa el acceso al sistema (HU-12 a HU-16; RF-ACC-01 a RF-ACC-13; RN-06, RN-07, RN-08) con los 6 endpoints de B.1 §4.3:
- bloqueo por documento (5 fallos en 15 min → 429) persistido en `intento_acceso`;
- cambio obligatorio de la contraseña temporal, aplicado en `authenticate`;
- autorregistro de Clientes;
- recuperación con token SHA-256 de un solo uso y 30 minutos;
- cierre de sesión que revoca el `jti`.

En el frontend: cinco pantallas de acceso y el marco con redirecciones y cierre de sesión real. Sin cambios de esquema. Decisiones en [research.md](research.md).

## Contexto técnico

**Lenguaje/Versión**: JavaScript (ES2022) en CommonJS sobre Node.js 20 LTS

**Dependencias principales**: las de las specs 001 y 002 (`bcrypt`, `jsonwebtoken`, `express-rate-limit`, `nodemailer`). Sin dependencias nuevas; el hash del token usa `node:crypto`.

**Almacenamiento**: MySQL 8: `intento_acceso`, `token_recuperacion`, `usuario`, `sesion`, `bitacora`.

**Pruebas**: Jest + Supertest (`tests/integration/acceso.test.js`, `tests/unit/acceso.reglas.test.js`) y Postman/Newman (`docs/postman/casos/003-gestion-acceso.js`).

**Plataforma objetivo**: la misma.

**Tipo de proyecto**: aplicación web monolítica.

**Metas de rendimiento**: inicio de sesión ≤ 2 s p95 (bcrypt costo 10 ≈ 70 ms); conteo de intentos sobre el índice `(numero_documento, fecha)`.

**Restricciones**: RNF-SEG-02 (hash de contraseñas y tokens), RNF-SEG-03 (público o con token), RNF-SEG-05 (bloqueo), RNF-PRI-01 (autorización en el registro).

**Escala/Alcance**: inicios de sesión de unos 20 usuarios concurrentes; clientes que se registran solos.

## Verificación de la constitución (Constitution Check)

*COMPUERTA: pasa antes de la fase 0 y se vuelve a verificar después del diseño.*

| Principio | Cumplimiento en 003 | Estado |
|---|---|---|
| I. La especificación manda | 6 aclaraciones con su fuente; contradicciones registradas (423 frente a 429, Cliente sin contraseña) | ✅ |
| II. Monolito por capas y REST | rutas de B.1 §4.3; capas del módulo `auth`; sobre `{ok}`; 401/403/409/422/429 | ✅ |
| III. Seguridad y privacidad | bcrypt; SHA-256 del token; mismo mensaje en recuperar; bloqueo + límite por IP; revocación; Ley 1581 en el registro | ✅ |
| IV. Integridad de datos | transacciones en registro, cambio y restablecimiento con bitácora; `FOR UPDATE` del token | ✅ |
| V. Frontend vanilla y accesible (Atomic Design) | molécula `contrasena` nueva; plantilla de autenticación reutilizada; sin llamadas a la API desde componentes | ✅ |
| VI. Pruebas | escenario → Jest + Postman (restablecimiento exitoso solo en Jest, justificado en quickstart) | ✅ |
| VII. Simplicidad | sin tablas ni dependencias nuevas | ✅ |

**Re-evaluación después de la fase 1**: sin violaciones. **COMPUERTA: PASA.**

## Estructura del proyecto

```text
backend/
├── .env.example                         # + URL_PUBLICA
├── src/
│   ├── config/{env.js, constantes.js}   # URL_PUBLICA; LOGIN_MAX_FALLIDOS, LOGIN_VENTANA_MIN, TOKEN_RECUPERACION_MIN
│   ├── middlewares/authenticate.js      # debe_cambiar_contrasena → 403; variante permitirCambioPendiente
│   └── modules/
│       ├── auth/
│       │   ├── auth.routes.js           # login, contrasena, registro, recuperar, restablecer, logout
│       │   ├── auth.controller.js
│       │   ├── auth.service.js          # RN-07, RN-08, RF-ACC-04/07..13
│       │   ├── auth.repository.js       # intento_acceso, token_recuperacion, sesion
│       │   ├── auth.validator.js        # contraseña nueva, registro, recuperar, restablecer
│       │   └── auth.reglas.js           # hashToken, generarToken, contraseñaCumple
│       └── usuarios/usuarios.repository.js   # insertar acepta debeCambiarContrasena
├── docs/postman/casos/003-gestion-acceso.js
└── tests/{unit/acceso.reglas.test.js, integration/acceso.test.js}

frontend/
├── login.html                           # enlaces a recuperar y registro
├── registro.html · recuperar.html · restablecer.html     # template-auth-layout
├── cambiar-contrasena.html              # marco de la app
├── index.html                           # enlace «Crear cuenta»
└── js/
    ├── api/http.js                      # CAMBIO_CONTRASENA_REQUERIDO → cambiar-contrasena.html
    ├── services/auth.service.js
    ├── components/
    │   ├── moleculas/contrasena.js      # nuevo
    │   └── plantillas/marco-app.js      # redirecciones + pageshow
    └── views/{cambiar-contrasena, registro, recuperar, restablecer}.view.js + alSalir en las vistas existentes
```

**Decisión de estructura**: la misma de las specs anteriores; se completa el módulo `auth`.

## Fases

| Fase | Contenido | Entregable |
|---|---|---|
| 1 · Preparación | `URL_PUBLICA` (env, `.env.example`), constantes | lint |
| 2 · Fundacional | `authenticate` con el cambio pendiente; `auth.reglas.js`; `insertar` con `debeCambiarContrasena` | pruebas unitarias; suites 001 y 002 en verde |
| 3 · US1 (P1) HU-12 | bloqueo por intentos, `PUT /auth/contrasena` | HU-12 E1–E5 |
| 4 · US2 (P1) HU-13 | Cliente: permisos y 403 (ya cubierto por authorize); prueba | HU-13 E1–E3 |
| 5 · US4 (P1) HU-15 | recuperar y restablecer | HU-15 E1–E4 |
| 6 · US5 (P1) HU-16 | logout | HU-16 E1–E2 |
| 7 · US3 (P2) HU-14 | autorregistro | HU-14 E1–E5 |
| 8 · Interfaz | molécula `contrasena`, páginas, marco y `alSalir` en todas las vistas | prueba manual |
| 9 · Pulido | Postman 003, README, revisión de que todo esté en español | `npm test`, `lint`, `test:api` |

## Matriz de trazabilidad

| HU | RF | RN | Endpoint | Servicio | Pruebas (`tests/integration/acceso.test.js` + Postman) |
|---|---|---|---|---|---|
| HU-12 | RF-ACC-01..04 | RN-06, RN-07 | POST /auth/login · PUT /auth/contrasena | `iniciarSesion`, `cambiarContrasena` | `HU-12 E1 operador 200` · `E2 genérico 401` · `E3 6.º intento 429 y libera tras 15 min` · `E4 temporal → 403 en otras rutas` · `E5 cambio ok / actual errada 401 / reglas 422` |
| HU-13 | RF-ACC-05, 06 | — | POST /auth/login | `iniciarSesion` | `HU-13 E1 cliente 200 con sus permisos` · `E2 documento inexistente 401` · `E3 GET /usuarios 403` |
| HU-14 | RF-ACC-07..09 | RN-05 | POST /auth/registro | `registrarme` | `HU-14 E1 201 Cliente y puede entrar` · `E2 documento 409 CUENTA_EXISTENTE / correo 409` · `E3 sin autorización 422` · `E4 contraseña débil o distinta 422` · `E5 idRol 422` |
| HU-15 | RF-ACC-10..12 | RN-08 | POST /auth/recuperar · POST /auth/restablecer | `recuperar`, `restablecer` | `HU-15 E1 correo con enlace de 30 min` · `E2 mismo cuerpo, sin correo` · `E3 restablece, revoca sesiones y entra` · `E4 usado/vencido/reemplazado/inventado 409` |
| HU-16 | RF-ACC-13 | — | POST /auth/logout | `cerrarSesion` | `HU-16 E1 204` · `E2 token anterior 401 en todo` |

## Cumplimiento de RNF

| RNF | Cómo | Dónde |
|---|---|---|
| RNF-SEG-02 | bcrypt; `sha256(token)`; la bitácora sin contraseña ni token | `auth.service`, `auth.reglas` |
| RNF-SEG-03 | públicos: login, registro, recuperar, restablecer; logout y contraseña con token; revocación por `jti` | `auth.routes`, `authenticate` |
| RNF-SEG-05 | 5 fallos / 15 min por documento → 429 durante 15 min | `auth.service.iniciarSesion` |
| RNF-PRI-01 | autorización obligatoria con fecha y aviso de privacidad en `registro.html` | `auth.validator`, `registro.html` |
| RNF-USA-03/04 | errores por campo; foco; «Mostrar contraseña» | páginas y molécula `contrasena` |
| RNF-CAL-03 | Postman 003 (éxito y error) | `casos/003-gestion-acceso.js` |

## Permisos del módulo

Los endpoints de acceso no usan permisos del catálogo: login, registro, recuperar y restablecer son públicos; contraseña y logout solo exigen un token válido (aun con contraseña temporal pendiente).

## Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Enumeración de documentos (por la respuesta o por el tiempo) | mismo cuerpo; correo enviado sin esperar; bloqueo también para documentos inexistentes |
| Bloqueo permanente de cuentas de prueba (Postman) | los casos de error usan documentos inexistentes y aleatorios |
| Token de recuperación filtrado | solo su hash en la BD; un solo uso; 30 min; cada solicitud invalida las anteriores |
| Usuario atrapado con contraseña temporal sin poder salir | `logout` permitido con el cambio pendiente |
| Pruebas de la 001 y la 002 afectadas por el bloqueo | cada prueba de bloqueo usa su propio documento |

## Seguimiento de complejidad (Complexity Tracking)

Sin violaciones ni dependencias nuevas.
