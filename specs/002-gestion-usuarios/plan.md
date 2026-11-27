# Plan de implementación: Gestión de usuarios

**Rama**: `002-gestion-usuarios` | **Fecha**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de `specs/002-gestion-usuarios/spec.md`

## Resumen

CRUD de usuarios con alcance por rol y gestión de mis datos (HU-07 a HU-11; RF-USR-01 a RF-USR-17; RN-02, RN-05, RN-06):
- los 7 endpoints de B.1 §4.2 y `GET /usuarios/:id/foto` `[Propuesta]`;
- contraseña temporal por correo (`nodemailer` con transportes `smtp`/`archivo`/`memoria`);
- foto JPG/PNG ≤ 2 MB privada (multer);
- revocación de sesiones al inactivar;
- aviso al Administrador cuando un usuario cambia sus datos;
- bitácora con el valor anterior y el nuevo.

Reutiliza toda la fundación de la spec 001 y sus componentes de Atomic Design. Decisiones en [research.md](research.md).

## Contexto técnico

**Lenguaje/Versión**: JavaScript (ES2022) en CommonJS sobre Node.js 20 LTS

**Dependencias principales**: las de la spec 001 + `nodemailer` (permitida por la constitución §VII). `multer` ya estaba justificada en la 001.

**Almacenamiento**: MySQL 8, tablas `usuario`, `sesion`, `notificacion`, `bitacora` (sin cambios de esquema). Fotos en `backend/uploads/usuarios/` (privado, en `.gitignore`).

**Pruebas**: Jest + Supertest (`tests/unit/usuarios.reglas.test.js`, `tests/integration/usuarios.test.js`, con correo en transporte `memoria`) y Postman/Newman (`docs/postman/casos/002-gestion-usuarios.js`, con una foto PNG de prueba).

**Plataforma objetivo**: la misma de la 001.

**Tipo de proyecto**: aplicación web monolítica.

**Metas de rendimiento**: RNF-REN-02. La búsqueda por documento, nombre o correo responde en ≤ 1 s p95 con 50 000 usuarios (SC-004).

**Restricciones**:
- RNF-SEG-02: sin contraseñas en respuestas, bitácora ni avisos;
- RNF-SEG-04: 403 en el servidor;
- RNF-SEG-07: bitácora;
- RNF-PRI-01: aviso de privacidad y autorización;
- RNF-PRI-02: alcance del Operador y del Cliente;
- RNF-PRI-03: foto.

**Escala/Alcance**: decenas de empleados y miles de clientes; 50 000 usuarios como referencia de carga.

## Verificación de la constitución (Constitution Check)

*COMPUERTA: pasa antes de la fase 0 y se vuelve a verificar después del diseño.*

| Principio | Cumplimiento en 002 | Estado |
|---|---|---|
| I. La especificación manda | spec con su sección Aclaraciones (5 decisiones con fuente); trazabilidad HU/RF/RN/FR en la matriz, en las pruebas y en los commits; endpoint de la foto marcado `[Propuesta]` | ✅ |
| II. Monolito por capas y REST | `routes → controller → service → repository`; rutas de B.1, `PATCH /usuarios/:id/estado`, sobre `{ok}`, 409/422, paginación `page/limit/q` + `rol`/`estado`; inactivación lógica | ✅ |
| III. Seguridad y privacidad | `authorize` por permiso + alcance en el servicio (anti-IDOR); bcrypt; contraseña temporal fuera de la respuesta; foto privada; Ley 1581 | ✅ |
| IV. Integridad de datos | `UNIQUE` documento y correo + traducción a 409; transacciones con bitácora; rol bloqueado al asignar; hora del servidor | ✅ |
| V. Frontend vanilla y accesible (Atomic Design) | átomo `avatar`, molécula `foto` nuevos; páginas con `<template>`; `<dialog>`; errores junto al campo; 360–1920 px | ✅ |
| VI. Pruebas | cada escenario → Jest `HU-xx Ey` + Postman (éxito y error) | ✅ |
| VII. Simplicidad | sin tablas nuevas; `nodemailer` es una dependencia permitida | ✅ |

**Re-evaluación después de la fase 1**: sin violaciones. **COMPUERTA: PASA.**

## Estructura del proyecto

### Documentación (esta funcionalidad)

```text
specs/002-gestion-usuarios/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md · frontend-integration.md
├── contracts/openapi.yaml
├── checklists/requirements.md
└── tasks.md
```

### Código fuente (raíz del repositorio)

```text
backend/
├── .env.example                        # + CORREO_TRANSPORTE, CORREO_REMITENTE, SMTP_*
├── src/
│   ├── config/env.js                   # nuevas variables validadas
│   ├── integrations/correo.js          # nodemailer: smtp | archivo | memoria (R-01)
│   ├── middlewares/subir-foto.js       # multer 2 MB + firma JPG/PNG → 422 (R-03)
│   ├── utils/archivos.js               # guardar/borrar/ruta de fotos privadas
│   └── modules/
│       ├── auth/auth.service.js        # USUARIO_INACTIVO con contraseña correcta (R-05)
│       └── usuarios/
│           ├── usuarios.routes.js      # /usuarios, /usuarios/me, /:id, /:id/estado, /:id/foto
│           ├── usuarios.controller.js
│           ├── usuarios.service.js     # RN-02/05/06, RF-USR-04/08/13/14/16/17, bitácora, correo
│           ├── usuarios.repository.js
│           ├── usuarios.validator.js
│           └── usuarios.reglas.js      # normalizaciones, contraseña temporal, diferencias
├── docs/postman/{casos/002-gestion-usuarios.js, archivos/foto.png}
└── tests/{unit/usuarios.reglas.test.js, integration/usuarios.test.js}

frontend/
├── usuarios.html · usuario-detalle.html · mi-perfil.html
├── roles.html · rol-detalle.html · permisos.html      # navbar con los ítems nuevos
└── js/
    ├── api/http.js                      # FormData + solicitarArchivo
    ├── config/config.js                 # MENU: Usuarios, Mi perfil
    ├── services/usuarios.service.js
    ├── views/{usuarios, usuario-detalle, mi-perfil}.view.js     # nivel PÁGINA
    └── components/
        ├── atomos/avatar.js             # atom-avatar (nuevo)
        └── moleculas/foto.js            # molecule-photo-input (nuevo)
```

**Decisión de estructura**: la misma de la spec 001. Se agregan el módulo `usuarios` y la integración de correo.

## Fases

| Fase | Contenido | Entregable verificable |
|---|---|---|
| 1 · Preparación | `nodemailer`; variables de correo en `.env.example`, `.env.test` (`memoria`) y `env.js`; `backend/correos/` en `.gitignore` | `npm install` y lint en verde |
| 2 · Fundacional | `integrations/correo.js`; `middlewares/subir-foto.js` + `utils/archivos.js`; `http.js` con FormData y Blob; ajuste del login para `USUARIO_INACTIVO` (R-05) y actualización de las pruebas y el Postman de la 001 | pruebas unitarias del correo y del middleware; suite de la 001 en verde |
| 3 · US1 (P1) HU-07 | `POST /usuarios` | HU-07 E1–E6 |
| 4 · US2 (P1) HU-08 | `GET /usuarios`, `GET /usuarios/:id`, `GET /usuarios/:id/foto` | HU-08 E1–E6 |
| 5 · US4 (P1) HU-10 | `PATCH /usuarios/:id/estado` + revocación | HU-10 E1–E6 |
| 6 · US3 (P2) HU-09 | `PUT /usuarios/:id` | HU-09 E1–E5 |
| 7 · US5 (P2) HU-11 | `GET/PUT /usuarios/me` + notificación + correo | HU-11 E1–E6 |
| 8 · Interfaz | átomo `avatar`, molécula `foto`, páginas y vistas, navbar en todas las páginas | prueba manual |
| 9 · Pulido | Postman 002, README, rendimiento SC-004, revisión de que todo esté en español | `npm test`, `lint`, `test:api` en verde |

## Matriz de trazabilidad

| HU | RF | RN | Endpoint | Servicio | Pruebas (`tests/integration/usuarios.test.js` + Postman) |
|---|---|---|---|---|---|
| HU-07 | RF-USR-01..05, RF-ROL-14 | RN-05 | POST /usuarios | `usuariosService.crear` | `HU-07 E1 crea activo con código, correo con contraseña temporal y debe cambiarla` · `E2 documento/correo duplicado 409` · `E3 campos inválidos 422` · `E4 foto PNG ok; >2MB y GIF 422` · `E5 operador solo Cliente 403` · `E6 rol inactivo 422` |
| HU-08 | RF-USR-06..08 | — | GET /usuarios · GET /usuarios/:id · GET /usuarios/:id/foto | `listar`, `obtener`, `foto` | `HU-08 E1 tabla paginada` · `E2 búsqueda por documento/nombre/correo y vacío` · `E3 filtros` · `E4 detalle sin hash con vehículos y membresía` · `E5 operador solo Clientes y 403` · `E6 404` |
| HU-09 | RF-USR-09..11 | RN-02, RN-05 | PUT /usuarios/:id | `actualizar` | `HU-09 E1 celular y rol + bitácora con diferencias` · `E2 correo/documento duplicado 409` · `E3 operador/cliente 403` · `E4 código no editable 422` · `E5 404` |
| HU-10 | RF-USR-12..14 | RN-02, RN-06 | PATCH /usuarios/:id/estado | `cambiarEstado` | `HU-10 E1 inactiva, revoca sesión y bitácora` · `E2 login inactivo 401 USUARIO_INACTIVO` · `E3 reactiva y puede entrar` · `E4 operador/cliente 403` · `E5 autoinactivación 409` · `E6 conserva datos` |
| HU-11 | RF-USR-15..17 | RN-05 | GET/PUT /usuarios/me | `misDatos`, `actualizarMisDatos` | `HU-11 E1 ve sus datos` · `E2 cambia celular, notificación y correo al Admin` · `E3 correo inválido 422 / duplicado 409` · `E4 PUT /usuarios/:otro 403` · `E5 documento/rol/estado 422` · `E6 sin cambios no notifica` |

## Cumplimiento de RNF

| RNF | Cómo | Dónde |
|---|---|---|
| RNF-SEG-02 | el repositorio nunca selecciona `contrasena_hash` fuera del login; `limpiar()` de la bitácora; correo sin hash | `usuarios.repository`, `utils/bitacora`, `usuarios.service` |
| RNF-SEG-04 | `authorize('usuarios.*' / 'perfil.*')` + alcance en el servicio | `usuarios.routes`, `usuarios.service` |
| RNF-SEG-06 | zod (con conversión de multipart) y SQL parametrizado | `usuarios.validator`, `usuarios.repository` |
| RNF-SEG-07 | bitácora en la transacción (crear, editar, editar_perfil, cambiar_estado) | `usuarios.service` |
| RNF-PRI-01 | `aceptaTratamientoDatos` obligatorio y `fecha_autorizacion`; aviso de privacidad en los formularios | validador, `usuarios.html`, `mi-perfil.html` |
| RNF-PRI-02 | alcance del Operador; Mi perfil sin id en la ruta | `usuarios.service` |
| RNF-PRI-03 | multer 2 MB + firma JPG/PNG; almacenamiento privado; endpoint autenticado | `subir-foto.js`, `utils/archivos.js` |
| RNF-REN-02 | `LIKE` sobre columnas con índice (documento y correo `UNIQUE`, nombre `idx_usuario_nombre`) y conteo en una consulta | `usuarios.repository.listar` |
| RNF-USA-03/04 | errores junto al campo, `<dialog>`, foco y teclado | páginas y componentes |
| RNF-CAL-03 | Postman 002 con éxito y error por endpoint | `docs/postman/casos/002-gestion-usuarios.js` |

## Permisos del módulo

| Código | Operaciones | Roles en el seed |
|---|---|---|
| `usuarios.ver` | GET /usuarios, GET /usuarios/:id, GET /usuarios/:id/foto | Administrador, Operador (alcance Cliente), Supervisor de turno |
| `usuarios.crear` | POST /usuarios | Administrador, Operador (solo rol Cliente), Supervisor de turno |
| `usuarios.editar` | PUT /usuarios/:id; también define el alcance completo (R-08) | Administrador |
| `usuarios.cambiar_estado` | PATCH /usuarios/:id/estado | Administrador |
| `perfil.ver` / `perfil.editar` | GET/PUT /usuarios/me, GET /usuarios/{propio}/foto | Administrador, Operador, Cliente, Supervisor de turno |

## Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| SMTP no disponible o lento | transporte `archivo` por defecto; envío fuera de la transacción; `correoEnviado: false` |
| Archivos huérfanos si se revierte la transacción | la foto se escribe antes, y si la transacción falla se borra; el archivo viejo se borra solo después del commit |
| Subida de archivos maliciosos | firma de contenido, extensión según la firma, nombre UUID, carpeta fuera de los estáticos, 2 MB |
| IDOR (consultar o editar otra cuenta) | alcance en el servicio; `/usuarios/me` sin id; pruebas E5 de HU-08 y E4 de HU-11 |
| Cambio de comportamiento del login de la 001 | se actualizan su prueba y su caso Postman en la misma rama (R-05) |
| Rol inactivado durante la asignación | `SELECT … FOR UPDATE` del rol en la transacción |

## Seguimiento de complejidad (Complexity Tracking)

Sin violaciones nuevas. `nodemailer` está en la lista de la constitución §VII y `multer` se justificó en la spec 001.
