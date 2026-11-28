# Prompt — Plan de implementación del backend · Parqueadero ABC (v2)

> **Cómo usarlo:** guarda este archivo en el repo como `docs/prompts/prompt-plan-backend.md`, ajusta una sola vez las rutas de la sección 0 y, en cada rama de módulo (`001-roles-permisos`, `002-gestion-usuarios`, …), ejecuta en Claude Code:
> `/speckit.plan Lee y sigue al pie de la letra docs/prompts/prompt-plan-backend.md. Módulo: el de la rama actual.`
> Lo marcado como **[AJUSTABLE]** es una decisión por defecto que puedes cambiar.

---

## 0. Rutas del proyecto (un solo repositorio)

| Qué | Ruta |
|---|---|
| Constitución | `.specify/memory/constitution.md` |
| Spec del módulo | `specs/<rama-actual>/spec.md` |
| Índice de specs y dependencias | `specs/README.md` |
| SRS v2.0 | `docs/SRS-Parking_Lot-v2.0.md` |
| Historias de usuario (66 HU) | `docs/historias-usuario-Parking_Lot.md` |
| Frontend existente | `frontend/` |
| Backend | `backend/` |
| Esquema MySQL, migraciones y seeds | `backend/database/` |
| Colección de pruebas de la API | `docs/api/` |

---

## 1. Rol

Actúa como **ingeniero de software backend senior** especializado en Node.js, Express y MySQL, con experiencia en arquitectura monolítica por capas, diseño de APIs REST, seguridad de aplicaciones (OWASP Top 10), integración con frontends en JavaScript vanilla y desarrollo guiado por especificaciones con GitHub spec-kit.

---

## 2. Objetivo

Producir, con `/speckit.plan`, el **plan técnico de implementación del backend** del módulo de la rama activa, de forma que:

- cubra el 100 % de los RF, RN e historias de la spec del módulo, con trazabilidad explícita;
- respete el contrato de API del SRS (Apéndice B.1) y el modelo lógico de datos (sección 6.1);
- sea coherente con los módulos ya planificados o implementados (mismas convenciones, utilidades y esquema);
- incluya una **guía para adaptar el frontend existente** a los endpoints del módulo;
- quede listo para `/speckit.tasks` sin decisiones técnicas abiertas, o con las abiertas listadas como preguntas concretas.

En esta fase **no se escribe código de la aplicación**: solo los artefactos del plan.

---

## 3. Contexto

### 3.1 Proyecto
- **Sistema de Gestión de Parqueadero** para Parqueadero ABC (Medellín, operación 24/7, carros y motos). Proyecto académico SENA.
- Roles base: **Administrador**, **Operador**, **Cliente**. Además actúan el **Visitante** (sin sesión) y el **Servicio de reconocimiento de placas** (clave de integración).
- 15 módulos, uno por rama spec-kit, en el orden y con las dependencias de `specs/README.md`. Antes de planificar, verifica que los módulos de la columna "Depende de" ya estén implementados en `backend/`; si no lo están, detente y avísame.
- Monolito: **un solo servidor Node.js/Express expone la API REST y sirve el frontend** (SRS 2.1).

### 3.2 Fuentes de verdad y precedencia
1. Decisiones del equipo (sección 3.3 de este documento).
2. Constitución.
3. `spec.md` del módulo.
4. SRS v2.0: sección 4 (RF), sección 5 (RNF y RN), 6.1 (modelo lógico de datos) y Apéndice B.1 (contrato de API).
5. Historias de usuario (criterios Dado/Cuando/Entonces).
6. Frontend existente (estructura y forma de los datos de prueba).

- Si dos fuentes se contradicen, **no elijas en silencio**: regístralo en `research.md` y pregúntame.
- Los IDs `RF-`, `RNF-`, `RN-`, `HU-` y `TBD-` son la trazabilidad: úsalos en todos los artefactos.
- El Apéndice B.1 es la base del contrato. Algunas filas son notas y no endpoints ("efecto de…", "tarea programada", "parámetro formato"): interprétalas así. Un endpoint que haga falta y no esté en B.1 se marca `[Propuesta]`.
- Respeta la plantilla de spec-kit (`.specify/templates/plan-template.md`); este documento la complementa, no la reemplaza.

### 3.3 Decisiones del equipo (prevalecen sobre el SRS)
Cuando el plan toque un RF afectado por estas decisiones, regístralo en `research.md` como **"cambio pendiente de reflejar en SRS/spec"**. No edites la spec.

| # | Decisión | RF/RNF afectados |
|---|---|---|
| D-01 | **TBD-05 resuelto: el Cliente inicia sesión solo con su número de documento, sin contraseña.** Administrador y Operador usan documento + contraseña. | RF-ACC-05, RF-ACC-07 (autorregistro sin contraseña), RF-ACC-10–12 (recuperación solo para Administrador y Operador), RF-USR-05 (contraseña temporal solo para Administrador y Operador), supuesto 2.7 |
| D-02 | **Sin validez DIAN:** el sistema emite comprobantes internos con numeración consecutiva. `cufe` y el estado "pendiente de envío" no se usan. | RF-FAC-12, TBD-02 |
| D-03 | **Node.js 22 LTS.** RNF-TEC-01 pide Node 20, pero Node 20 dejó de recibir soporte en abril de 2026. **[AJUSTABLE]** si el instructor exige 20. | RNF-TEC-01 |
| D-04 | **MySQL 8** (no MariaDB). | RNF-TEC-02 |

Mitigaciones obligatorias de D-01: el mismo bloqueo por intentos (RN-07), límite de peticiones por IP en el login del Cliente, token con alcance mínimo de rol Cliente y verificación estricta de propiedad de los datos (RNF-PRI-02). En la tabla de usuarios, `contrasena_hash` admite nulo solo para el rol Cliente.

### 3.4 Stack técnico (completa así el *Technical Context* del plan)

| Campo | Valor |
|---|---|
| **Language/Version** | JavaScript ES2022+ con ES Modules (`"type": "module"`) sobre Node.js 22 LTS (fijar en `.nvmrc` y `engines`) |
| **Primary Dependencies** | Express 5 · `mysql2/promise` · `zod` · `jsonwebtoken` · `bcrypt` · `helmet` · `express-rate-limit` · `pino` + `pino-http` · `multer` · `nodemailer` · `pdfkit` · `node-cron` · `swagger-ui-express` |
| **Storage** | MySQL 8.0+ (recomendado 8.4 LTS), InnoDB, `utf8mb4` / `utf8mb4_0900_ai_ci`, base `parqueaderodb`. Pool de `mysql2/promise`, consultas parametrizadas, **sin ORM** (RNF-TEC-02) |
| **Testing** | Vitest + Supertest, base de pruebas `parqueaderodb_test`, servidor SMTP de pruebas (Mailpit o Ethereal) para los RF con "entorno de pruebas de correo", y colección Postman en `docs/api/` con al menos un caso de éxito y uno de error por endpoint (RNF-CAL-03) **[AJUSTABLE: archivos `.http`]** |
| **Target Platform** | Un proceso Node que sirve la API y el frontend; navegadores Chrome, Edge, Firefox y Safari (dos últimas versiones) |
| **Project Type** | web — `backend/` + `frontend/` en el mismo repositorio, mismo origen |
| **Performance Goals** | RNF-REN-01: entrada y salida con liquidación ≤ 2 s p95 (20 usuarios concurrentes, 50 000 movimientos) · RNF-REN-02: listados y búsquedas ≤ 1 s p95 con 50 000 registros · RNF-REN-03: retraso de disponibilidad ≤ 10 s (polling) |
| **Constraints** | RNF-SEG-01…07 · RNF-PRI-01…03 · RNF-SAF-01…02 · RNF-CAL-01 (99 %) · RNF-CAL-02 (respaldo diario, 30 días) · solo español, COP, America/Bogota |
| **Scale/Scope** | 1 sede (el modelo admite varios parqueaderos), 20 usuarios concurrentes, 50 000 movimientos |

Calidad de código: ESLint (flat config) + Prettier.

### 3.5 Arquitectura: monolito por capas

```
backend/
├─ src/
│  ├─ app.js               # configura Express: API en /api/v1 + estáticos de ../frontend
│  ├─ server.js            # listen, jobs y apagado ordenado (cierra servidor, cron y pool)
│  ├─ config/              # variables de entorno validadas con zod al arrancar
│  ├─ db/                  # pool mysql2, withTransaction(), generador de consecutivos
│  ├─ middlewares/         # authenticate, authorize, apiKey, validate, upload,
│  │                       # errorHandler, notFound, requestId
│  ├─ shared/              # AppError y subclases, respuesta { ok, data, meta, error },
│  │                       # paginación, fecha/hora Bogotá, bitácora, normalizadores (placa)
│  ├─ integrations/        # adaptadores: mailer, pdf, paymentProvider (manual), plateReader
│  ├─ modules/
│  │  └─ <modulo>/
│  │     ├─ <modulo>.routes.js
│  │     ├─ <modulo>.controller.js
│  │     ├─ <modulo>.service.js
│  │     ├─ <modulo>.repository.js
│  │     └─ <modulo>.schemas.js
│  └─ jobs/                # tareas programadas (sección 3.9)
├─ database/               # schema.sql, migrations/, seeds/
├─ tests/                  # unit/, integration/
├─ .env.example
└─ package.json
```

**Reglas de dependencia (obligatorias):**
- Flujo único: `routes → controller → service → repository → db`. Sin saltar capas ni dependencias en sentido inverso.
- **Rutas:** solo declaran el endpoint y sus middlewares (`authenticate`, `authorize('modulo.accion')`, `validate(schema)`).
- **Controladores:** traducen HTTP ↔ servicio. Sin SQL y sin reglas de negocio.
- **Servicios:** reglas de negocio (RN-xx), orquestación, transacciones, bitácora y notificaciones. No conocen `req` ni `res`.
- **Repositorios:** único lugar con SQL. Mapean `snake_case` (BD) ↔ `camelCase` (JSON) y aceptan una conexión opcional para participar en transacciones.
- **Funciones puras**, testeables sin BD: liquidación (RN-20, RN-21, RN-25), pico y placa (RN-13), validación y normalización de placas (RN-11), solapamiento de reservas y de vigencias (RN-14, RN-18, RN-26) y minutos de estadía (RN-16).

### 3.6 Convenciones de la API REST (SRS Apéndice B.1)
- Base `/api/v1`, JSON. Rutas y métodos tal como en B.1 (`PUT` para actualizar, `PATCH …/estado`, `PATCH …/anulacion`, `/usuarios/me/...`).
- Formato de respuesta:
  - éxito: `{ "ok": true, "data": …, "meta": { "page": 1, "limit": 10, "total": 134 } }`
  - error: `{ "ok": false, "error": { "code": "PLACA_RESTRINGIDA", "message": "…", "details": [ { "campo": "placa", "mensaje": "…" } ] } }`
  - `code` es estable y en MAYÚSCULAS por cada regla de negocio. `details` va por campo para que el frontend muestre el error junto al campo afectado (RNF-USA-03).
- Listados: `?page=1&limit=10&q=texto` más filtros propios; `limit` máximo 100.
- Códigos HTTP: `200`, `201`, `204`; `400` validación, `401` sin token o token inválido, `403` sin permiso (RNF-SEG-04), `404`, `409` conflicto (duplicado, celda ocupada, solapamiento), `422` regla de negocio, `423` documento bloqueado por intentos fallidos, `429` exceso de peticiones.
- Endpoints públicos (sin JWT): login, autorregistro, recuperar, restablecer y disponibilidad (RNF-SEG-03). `POST /lecturas-placa` usa clave de integración (`X-Api-Key`), no JWT.
- Fechas en ISO 8601 con offset `-05:00`. Dinero en pesos como número (DECIMAL(12,2) en BD, nunca FLOAT). El formato colombiano (`$ 12.500`, dd/mm/aaaa, 12 h) lo aplica el frontend.
- Exportaciones con `?formato=csv|pdf` (RF-REP-05, RF-REP-12). Factura PDF y ticket en 80 mm (RF-MOV-07, RF-FAC-10).
- Express 5: los errores de handlers `async` llegan solos al `errorHandler` (no usar `express-async-errors`); `req.query` es de solo lectura, así que los datos validados se guardan en `req.validated`.

### 3.7 Seguridad y datos personales
- **JWT** en `Authorization: Bearer`, con expiración de 8 h (RNF-SEG-03). Payload: `sub`, `rol`, `permisos` y `jti`. Los permisos se fijan al iniciar sesión (RF-ACC-01, RF-ROL-10).
- **Revocación en servidor:** cada sesión se guarda por `jti`. El middleware rechaza tokens revocados y usuarios inactivos. Así se cumplen el cierre de sesión (RF-ACC-13) y la inactivación de usuarios (RF-USR-13).
- **Autorización por permisos** con códigos `modulo.accion` del catálogo (`ver`, `crear`, `editar`, `cambiar_estado`, `anular`, `exportar`). Seeds: los tres roles base con sus permisos (RF-ROL-01, RF-ROL-02) y un Administrador inicial cuyas credenciales salen de `.env`.
- **Propiedad de los datos (RNF-PRI-02):** el Cliente solo accede a lo suyo; el Operador solo gestiona y consulta Clientes (RF-USR-04, RF-USR-08). Se valida en el servicio, no solo en la ruta (previene IDOR).
- **Login:** mensaje genérico ante credenciales incorrectas (RF-ACC-02); bloqueo de 15 min tras 5 fallos en 15 min, persistido en `intento_acceso` (RN-07); contraseña temporal con cambio obligatorio en el primer ingreso, sin acceso a ningún otro endpoint hasta cambiarla (RF-ACC-04); token de recuperación hasheado, de un solo uso y válido 30 min, con la misma respuesta exista o no el documento (RN-08, RF-ACC-11). Ver D-01 para el Cliente.
- Contraseñas con `bcrypt` (costo ≥ 10); nunca en respuestas ni en logs (RNF-SEG-02).
- `helmet` y límite de tamaño del body. CORS desactivado en producción porque todo sale del mismo origen; solo se habilita en desarrollo si el frontend se sirve aparte.
- Archivos: foto de usuario y evidencias solo en JPG/PNG, ≤ 2 MB, nombre aleatorio y fuera de la carpeta pública; se entregan por un endpoint autenticado (RNF-PRI-03).
- **Ley 1581:** `acepta_tratamiento_datos` obligatorio con fecha (RNF-PRI-01, RF-ACC-09). Documento, correo y celular no van en logs ni en URLs; el documento del login viaja en el body.
- **Bitácora (RNF-SEG-07, RF-USR-11, RF-VEH-09):** usuario, fecha y hora, acción, registro afectado, valor anterior y nuevo, escrita **en la misma transacción** que el cambio.
- Secretos solo en `.env` (no versionado). `.env.example` documenta todas las variables. La configuración se valida al arrancar y el proceso falla si falta algo.

### 3.8 Datos, concurrencia y tiempo
- El esquema global vive en `backend/database/schema.sql`. Se construye en un paso aparte a partir de `parqueaderodb.sql` y del modelo lógico 6.1 del SRS: snake_case, claves `id_<entidad>`, `created_at` y `updated_at` en todas las tablas. `data-model.md` lo referencia y **no redefine** tablas; si el módulo necesita algo nuevo, lo propone como **migración nueva** con justificación y RF de origen.
- **Invariantes también en BD:** PK, FK con `ON DELETE` explícito (por defecto `RESTRICT`), `UNIQUE`, `CHECK` y `NOT NULL`. RNF-SAF-01 (un movimiento abierto por placa y un vehículo por celda) se garantiza con un índice único sobre una columna generada, además de la validación en el servicio.
- **Sin borrado físico** de movimientos, pagos, facturas, incidencias ni bitácora (RNF-SAF-02). Los `DELETE` del contrato son inactivación lógica.
- **Transacciones** (`withTransaction`) con `SELECT … FOR UPDATE` en:
  - la entrada: celda disponible de menor código o la elegida, respetando reservas (RF-MOV-04, RF-RES-07, RF-RES-08);
  - la salida con su liquidación;
  - el pago con su factura (un pago por liquidación, RF-FAC-08);
  - la creación de reservas;
  - la suscripción y renovación de membresías;
  - el cierre de caja.
- **Consecutivos sin huecos** (`T-000123`, `FV-000245`, `INC-000031`, código de reserva): tabla de consecutivos bloqueada dentro de la misma transacción. No usar `AUTO_INCREMENT` para esto, porque deja huecos cuando se revierte una transacción.
- **Hora oficial `America/Bogota`** (UTC−05:00, sin horario de verano):
  - el proceso corre con `TZ=America/Bogota`;
  - el pool usa `timezone: '-05:00'` y la sesión MySQL `time_zone = '-05:00'`;
  - los `DATETIME` se guardan en hora de Bogotá;
  - la hora de los movimientos la toma siempre el servidor (RN-16) desde un único helper.
- Índices para la caseta y los reportes (placa, estado de movimiento, estado de celda, fechas, número de factura). Sin consultas N+1.

### 3.9 Tareas programadas (`node-cron`, una sola instancia, idempotentes)
| Frecuencia | Tarea | RF |
|---|---|---|
| Cada minuto | Pasar a reservadas las celdas cuya reserva inicia y vencer las reservas no cumplidas, notificando al cliente | RF-RES-08, RF-RES-09 |
| Cada 15 min | Alertas por permanencias de más de 24 h y ocupación superior al 90 % | RF-MON-04, RF-MOV-14 |
| Cada 5 min | Reintentar correos fallidos (máximo 3 intentos) | RF-MON-07 |
| Diaria (00:05) | Vencer membresías y avisar las que vencen en 5 días | RF-MEM-08, RF-MON-06 |

### 3.10 Integraciones
- **Correo (TBD-09):** `nodemailer` con SMTP configurable por `.env`; en desarrollo, Mailpit o Ethereal. Cada envío deja también la notificación en la aplicación.
- **Pagos (TBD-02):** tarjeta, transferencia y QR se registran manualmente con su referencia (RF-FAC-07), detrás de una interfaz `PaymentProvider`. No hay pasarela.
- **Reconocimiento de placas (TBD-01):** en esta versión solo se construye el receptor `POST /lecturas-placa` (RF-MON-01…03); no hay motor OCR.
- **PDF:** `pdfkit` para la factura, el ticket de 80 mm y las exportaciones. El CSV se genera sin librería.

### 3.11 Integración con el frontend existente
El frontend está hecho en **HTML semántico, CSS y JavaScript vanilla con atomic design** (átomos, moléculas, organismos, plantillas, páginas) y hoy funciona con **datos de prueba**. En esta fase **no lo modifiques**. Para cada módulo, genera `specs/<rama>/frontend-integration.md` como guía para que el equipo conecte el frontend a mano:

1. **Inventario:** busca en `frontend/` los datos de prueba del módulo (arrays, objetos o JSON simulados) y arma la tabla *archivo/componente con mock → endpoint B.1 → campo del mock ↔ campo de la API*. Señala las diferencias de forma y propón un mapper cuando no coincidan.
2. **Servido por Express:** el backend sirve `frontend/` como estáticos. Las rutas `/api/v1/*` nunca caen en los estáticos y un 404 de la API responde JSON. Si el frontend tiene su propio servidor Node de desarrollo, indica cómo dejarlo servido por Express o, solo en desarrollo, cómo usar CORS.
3. **Capa de servicios del frontend (propuesta de estructura):**
   - `frontend/js/services/http.js`: cliente `fetch` único. Pone `Authorization: Bearer`, envía y recibe JSON, desarma `{ ok, data, meta, error }`, aplica un timeout con `AbortController`, redirige al login ante un `401` y muestra un aviso ante un `403`.
   - `frontend/js/services/<modulo>.service.js`: una función por endpoint del módulo.
4. **Reglas de atomic design:** átomos y moléculas nunca llaman a la API. Las páginas y plantillas (o los organismos contenedores) llaman a los servicios y pasan los datos hacia abajo. Cambiar un mock por la API no debe obligar a tocar átomos ni moléculas.
5. **Errores y formularios:** pinta `error.details` junto a cada campo (RNF-USA-03) y traduce `error.code` a mensajes de usuario.
6. **Seguridad en el cliente:** guarda el token en `sessionStorage` y bórralo al cerrar sesión llamando a `/auth/logout`. Nunca insertes datos de la API con `innerHTML`; usa `textContent` o `createElement` (previene XSS). El menú se arma con los permisos del token, aunque la autorización real es la del servidor.
7. **Tiempo real:** polling cada 10 s para celdas y disponibilidad (RF-CLD-21), pausado cuando la pestaña no está visible (`document.visibilityState`).
8. **Formatos colombianos:** `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })` y `Intl.DateTimeFormat('es-CO', { hour12: true, timeZone: 'America/Bogota' })`.
9. **Checklist por historia:** pantalla (SRS B.2) → servicio → endpoint → estados de carga, vacío y error → prueba manual.

### 3.12 Calidad y pruebas
- Cada criterio Dado/Cuando/Entonces de la spec tiene al menos una prueba de integración con Supertest, nombrada con su ID (`HU-31 rechaza la entrada de una placa restringida`).
- Pruebas unitarias de las funciones puras, con casos borde: gracia exacta, primera hora exacta, fracción iniciada, tope por cada 24 h, cruce de medianoche, pico y placa en el límite de la franja, motos con el primer dígito, solapamiento exacto de reservas.
- Cobertura objetivo ≥ 80 % en servicios.
- Scripts npm: `dev` (`node --watch`), `start`, `test`, `test:coverage`, `lint`, `format`, `db:migrate`, `db:seed`, `db:reset:test`.
- `GET /api/v1/health` con ping a la BD.

### 3.13 Primer módulo: fundación
Si la rama es la primera en implementarse (`001-roles-permisos`) o `backend/` aún no existe, el plan incluye las fases **Setup** y **Foundational** antes de las historias:
- esqueleto, configuración, pool, consecutivos y `withTransaction`;
- manejo de errores, respuesta estándar y logger;
- middlewares de autenticación (con revocación), autorización, validación y subida de archivos;
- bitácora, health, servido de `frontend/`, infraestructura de pruebas, OpenAPI base y colección Postman base;
- seeds de roles, permisos y Administrador;
- un `POST /api/v1/auth/login` mínimo para Administrador y Operador, porque sin él no se pueden probar los endpoints protegidos de 001 y 002. `003-gestion-acceso` completa el resto del acceso.

En los módulos siguientes: lee `backend/src` y los `plan.md` anteriores, reutiliza lo existente y no dupliques utilidades.

### 3.14 Puntos que debe cubrir el esquema
El modelo 6.1 del SRS no los resuelve. Verifica que `schema.sql` los cubra y, si no, propón una migración:
- tabla de **bitácora** (RNF-SEG-07);
- **sesiones** por `jti` (RF-ACC-13, RF-USR-13);
- **consecutivos** (RN-22);
- **turno de caja abierto**, porque los pagos deben pertenecer a un turno para que RF-FAC-18 funcione;
- datos del **tercero** en la factura (RF-FAC-11);
- **intentos de ingreso rechazados** por pico y placa (RF-REP-06);
- relación factura ↔ membresía sin FK circular;
- **festivos** de pico y placa (TBD-03);
- conflicto entre RF-TAR-07 (tarifas públicas, HU-38 con Visitante) y RNF-SEG-03 (que no lista ese endpoint como público): pregúntame.

---

## 4. Lo que NO debes hacer

- No escribir código de la aplicación ni ejecutar `/speckit.tasks` o `/speckit.implement` en esta fase.
- No modificar `spec.md`, el SRS, las historias ni la constitución, ni reescribirlos con `/speckit.specify`. Reporta errores, vacíos y los cambios que generan las decisiones D-01 a D-04.
- No modificar el frontend: solo leerlo y producir `frontend-integration.md`.
- No cambiar el stack: nada de TypeScript, ORM (Sequelize, Prisma, TypeORM), MongoDB, NestJS, GraphQL, WebSockets, frameworks de frontend ni microservicios. Docker no es requisito.
- No inventar requisitos, endpoints, campos ni tablas. Toda adición técnica necesaria se marca `[Propuesta]`, con justificación y el RF/RNF de origen.
- No resolver ambigüedades suponiendo en silencio: márcalas `[NEEDS CLARIFICATION]` y pregunta.
- No poner reglas de negocio en rutas o controladores, ni SQL fuera de los repositorios.
- No concatenar SQL, no usar `SELECT *` en repositorios, no usar `FLOAT` para dinero, no usar `AUTO_INCREMENT` para consecutivos visibles ni tomar la hora de una fuente distinta al helper del servidor.
- No guardar secretos en el repositorio, contraseñas en texto plano ni datos personales en logs o URLs.
- No borrar físicamente registros transaccionales.
- No implementar integración con la DIAN, pasarela de pagos ni motor OCR.
- No agregar dependencias fuera de la sección 3.4 sin justificarlas en `research.md`; prefiere lo nativo de Node (`node --watch`, `crypto.randomUUID`, `crypto.createHash`).
- No crear commits, ramas ni hacer push sin mi confirmación.

---

## 5. Resultado esperado

Al terminar, en `specs/<rama-actual>/`:

1. **`plan.md`**: Technical Context completo (3.4), Constitution Check aprobado (o violaciones justificadas en *Complexity Tracking*), carpetas afectadas y fases por historia en orden de prioridad (P1 = MVP del módulo). Incluye:
   - **matriz de trazabilidad**: HU → RF → RN → endpoint → servicio → prueba(s);
   - **tabla de cumplimiento de RNF**: cómo y dónde se cumple cada RNF aplicable;
   - **permisos** del módulo (código `modulo.accion` y roles que lo tienen en el seed);
   - **riesgos técnicos** y su mitigación.
2. **`research.md`**: cada decisión con *Decisión / Justificación / Alternativas descartadas*; contradicciones entre fuentes; cambios pendientes por D-01 a D-04; `[NEEDS CLARIFICATION]` pendientes.
3. **`data-model.md`**: tablas que usa, crea o modifica; columnas con tipo MySQL; PK, FK y `ON DELETE`; `UNIQUE`, `CHECK` e índices; estados con sus transiciones válidas (diagrama o tabla); mapeo tabla ↔ recurso API; migraciones propuestas.
4. **`contracts/openapi.yaml`** (OpenAPI 3.1): por endpoint, método y ruta de B.1, permiso requerido, roles con acceso, esquema del request, respuestas de éxito y de error con su `code`, y ejemplos.
5. **`quickstart.md`**: cómo levantar, migrar, sembrar y probar el módulo, con ejemplos curl por historia y los casos que se agregan a la colección Postman.
6. **`frontend-integration.md`**: la guía de la sección 3.11 para este módulo.

Cierra en el chat con: un resumen de máximo 5 líneas, la lista numerada de preguntas abiertas y la confirmación de que esperas mi aprobación antes de `/speckit.tasks`.

---

## 6. Forma de trabajo

1. **Lee, en este orden:** este documento → constitución → spec del módulo → secciones del SRS que la spec cita (4.x, 5, 6.1, B.1, B.2) → historias del módulo → `specs/README.md` → `backend/` existente y `backend/database/schema.sql` → archivos de `frontend/` relacionados con el módulo.
2. **Pregunta antes de redactar** solo lo que cambia el diseño: hasta 5 preguntas concretas, cada una con tu opción recomendada. Para lo demás, usa los valores por defecto de este documento y regístralos en `research.md`.
3. **Redacta** los artefactos de la sección 5.
4. **Autoverifica** antes de entregar: todos los RF y RN del módulo trazados; todos los criterios de aceptación con su prueba; todos los endpoints con permiso asignado y con caso de éxito y de error en la colección; nada fuera de alcance; consistencia con los módulos previos y con el esquema.
