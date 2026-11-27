<!--
Sync Impact Report
- Versión: 1.0.0 (ratificación inicial)
- Principios: I–VII definidos
- Plantillas a revisar: .specify/templates/plan-template.md (Constitution Check), spec-template.md, tasks-template.md
- Pendientes: ninguno
-->

# Constitución del proyecto Sistema de Gestión de Parqueadero (Parking Lot ABC)

Esta constitución fija los principios no negociables con los que se especifica, planifica e implementa el sistema usando GitHub spec-kit (Spec-Driven Development). Ubicación esperada en el repositorio: `.specify/memory/constitution.md`. Toda `plan.md`, `tasks.md` e implementación debe pasar la verificación de esta constitución (*Constitution Check*); `/speckit.analyze` reporta cualquier violación como CRÍTICA.

## Principios fundamentales (Core Principles)

### I. La especificación manda (Spec-Driven)

- Ningún código se escribe sin una spec aprobada en `specs/NNN-modulo/spec.md`. Las specs derivan del SRS v2.0 (`docs/SRS-Parking_Lot-v2.0.md`) y de `docs/historias-usuario-Parking_Lot.md`, que son la fuente de verdad de requerimientos.
- Toda ambigüedad se marca `[NEEDS CLARIFICATION: …]` y se resuelve con `/speckit.clarify` y con el Product Owner (instructor). Está prohibido inventar reglas de negocio, campos o estados que no estén en la spec.
- La trazabilidad es obligatoria: los IDs `HU-`, `RF-`, `RN-` y `FR-` aparecen en `plan.md`, `tasks.md`, en el nombre de las pruebas y en los mensajes de commit.
- Si la implementación revela un error de requerimientos, primero se corrige la spec (y el SRS), después el código.

### II. Monolito modular con API REST por capas

- El sistema es **una sola aplicación Node.js + Express** (monolito) que expone una API REST bajo `/api/v1` y sirve el frontend estático. Un solo despliegue, una sola base de datos MySQL.
- Organización por módulo de dominio (uno por spec) y por capas: `routes → controllers → services → repositories`. Los controladores no contienen SQL ni reglas de negocio; los servicios contienen las reglas (`RN-`); los repositorios contienen solo SQL.
- Diseño REST: recursos en plural y kebab-case (`/api/v1/<recursos>`, `/api/v1/<recursos>/:id`), verbos HTTP con su semántica (GET consulta, POST crea → 201, PUT/PATCH actualiza → 200, DELETE elimina → 204). Las acciones de estado usan `PATCH /<recursos>/:id/estado`.
- Respuesta uniforme `{ "ok": true|false, "data": …, "meta": { "page", "limit", "total" }, "error": { "code", "message", "details" } }`. Códigos: 400 petición mal formada, 401 sin token o token inválido, 403 sin permiso, 404 no existe, 409 conflicto (duplicado, estado inválido, regla de negocio), 422 validación de campos, 500 error interno (sin trazas al cliente).
- Listados siempre paginados: `?page` (desde 1) y `?limit` (por defecto 10, máximo 100), búsqueda `?q` y filtros explícitos de la spec.
- La eliminación es **lógica** (cambio de `estado`) cuando la entidad tiene historia o relaciones; la física solo en tablas intermedias o cuando la spec lo diga.

### III. Seguridad y privacidad por defecto

- Autenticación con JWT (Bearer) emitido al iniciar sesión, con expiración configurable (por defecto 8 h) y secreto en variables de entorno. Contraseñas con bcrypt (costo ≥ 10); nunca se devuelven ni se registran en bitácoras.
- Autorización por **roles y permisos** con política de denegación por defecto: cada endpoint declara el permiso que exige mediante un middleware. Roles del sistema: Administrador, Operador, Cliente.
- Toda entrada se valida en el servidor (express-validator, Joi o Zod) aunque el frontend también valide. Consultas SQL siempre parametrizadas.
- `helmet`, `cors` restringido a los orígenes configurados, límite de intentos de inicio de sesión, `.env` fuera del repositorio y `.env.example` documentado.
- Datos personales tratados según la **Ley 1581 de 2012** (Habeas Data): aviso de privacidad y autorización en los formularios que capturan datos personales, mínimo dato necesario y acceso restringido por rol.

### IV. Integridad de datos y reglas de negocio en el servidor

- MySQL 8 (InnoDB, `utf8mb4`), acceso con `mysql2/promise` y pool de conexiones, **sin ORM**. Nombres en `snake_case`, PK `id_<entidad>`, FK con integridad referencial, `UNIQUE` para los campos que la spec declara únicos y columnas `created_at` / `updated_at`.
- Las operaciones que tocan varias tablas (encabezado + detalle, movimiento + saldo, etc.) se ejecutan en una **transacción**.
- Fechas y horas en ISO-8601 con zona `America/Bogota`; la hora del servidor es la fuente de verdad para registros de tiempo. Valores monetarios en pesos colombianos (COP) con `DECIMAL(12,2)`.
- Cada regla de negocio `RN-` tiene al menos una prueba que demuestra que se cumple y una que demuestra que se rechaza su violación (409 o 422).

### V. Frontend vanilla, accesible y responsive

- HTML5 + CSS3 + JavaScript ES2020 con módulos ES. **Sin frameworks, sin librerías, sin npm ni bundlers** en el frontend.
- Estructura `index.html`, `css/`, `js/{config,api,services,views,components,utils}`, `assets/`. Un único cliente `fetch` en `js/api/` agrega el token, interpreta el sobre de respuesta y redirige al inicio de sesión ante 401.
- Datos del usuario siempre con `textContent` (nunca `innerHTML` con datos externos). Confirmaciones con `<dialog>`. Validación en línea con mensajes junto al campo y mapeo de errores 409/422 del backend a los campos.
- Responsive de 360 a 1920 px, navegable con teclado, etiquetas `<label>` asociadas, foco visible y contraste mínimo 4.5:1 (WCAG 2.1 AA básico).
- Menú y rutas según los permisos del usuario autenticado; ocultar una opción no reemplaza la verificación del backend.

### VI. Pruebas y verificabilidad (no negociable)

- Cada escenario de aceptación de una spec se convierte en al menos una prueba: colección Postman/Insomnia (ejecutable con Newman) o pruebas automatizadas de API (p. ej. Jest + Supertest), con caso de éxito y caso de error.
- Datos semilla (`database/seed.sql`) con al menos 5 registros realistas por recurso y un usuario por rol.
- `tasks.md` ordena las pruebas antes o junto con la implementación de cada historia; una historia no está terminada si sus escenarios no pasan.

### VII. Simplicidad e incrementos verticales

- Cada spec se entrega como una rebanada vertical (base de datos + API + pantalla) desplegable y demostrable en la Sprint Review; primero las historias P1, luego P2 y P3.
- Sin abstracciones prematuras ni dependencias innecesarias. Dependencias de backend permitidas: `express`, `mysql2`, `dotenv`, `bcrypt`/`bcryptjs`, `jsonwebtoken`, `helmet`, `cors`, una librería de validación y, opcionalmente, `morgan` y `nodemailer`. Cualquier otra se justifica en `plan.md` (*Complexity Tracking*).

## Restricciones tecnológicas

| Capa | Decisión |
|---|---|
| Backend | Node.js 20 LTS + Express, arquitectura por capas, ES Modules o CommonJS de forma consistente |
| Base de datos | MySQL 8.x, script `database/schema.sql` + `database/seed.sql`, cambios documentados en `database/CAMBIOS.md` |
| Frontend | HTML5, CSS3, JavaScript vanilla (ES2020, módulos ES), servido como estático por Express en producción |
| Autenticación | JWT + bcrypt, permisos por rol |
| Pruebas | Postman/Insomnia (+ Newman) y/o Jest + Supertest |
| Control de versiones | Git + GitHub, una rama por spec (`NNN-modulo`), Pull Request revisado por otro integrante |
| Configuración | Variables de entorno (`PORT`, `DB_*`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `SMTP_*`) |

Estructura sugerida del repositorio:

```
/
├── .specify/memory/constitution.md
├── specs/NNN-modulo/{spec.md, plan.md, tasks.md}
├── backend/
│   ├── src/{app.js, server.js, config/, middlewares/, utils/}
│   ├── src/modules/<modulo>/{<modulo>.routes.js, .controller.js, .service.js, .repository.js, .validator.js}
│   ├── database/{schema.sql, seed.sql, CAMBIOS.md}
│   └── docs/postman/
├── frontend/{index.html, css/, js/, assets/}
├── .env.example
└── README.md
```

## Contexto del dominio — Parking Lot ABC

Módulos (una spec por módulo):

| Spec | Módulo | Código RF |
|---|---|---|
| `001-roles-permisos` | Roles y permisos | ROL |
| `002-gestion-usuarios` | Gestión de usuarios | USR |
| `003-gestion-acceso` | Gestión de acceso | ACC |
| `004-parqueaderos-celdas` | Parqueaderos y celdas | CLD |
| `005-vehiculos` | Vehículos | VEH |
| `006-pico-y-placa` | Restricción de pico y placa | PYP |
| `007-control-ingreso-salida` | Control de ingreso y salida | MOV |
| `008-tarifas` | Tarifas | TAR |
| `009-facturacion-pagos` | Facturación y pagos | FAC |
| `010-membresias` | Membresías | MEM |
| `011-descuentos` | Beneficios y descuentos | DES |
| `012-reservas` | Reservas | RES |
| `013-incidencias` | Incidencias | INC |
| `014-monitoreo-alertas` | Monitoreo, placas y alertas | MON |
| `015-reportes-indicadores` | Reportes e indicadores | REP |

Reglas transversales del dominio:

- Placas normalizadas en mayúsculas sin espacios ni guiones: carro `AAA123` (3 letras + 3 dígitos), moto `AAA12A` o `AAA12` (3 letras + 2 dígitos + letra opcional). La placa es única en todo el sistema.
- Una placa solo puede tener un movimiento abierto (entrada sin salida) a la vez, y una celda solo puede estar ocupada por un vehículo.
- La hora de entrada y de salida la fija el servidor; el operador no la digita. Los movimientos, pagos, facturas e incidencias nunca se eliminan: se anulan con motivo y usuario.
- El valor a cobrar lo calcula siempre el backend (tarifa vigente + fracciones + descuentos + membresía); el frontend solo lo muestra.
- Estados de celda: `disponible`, `ocupada`, `reservada`, `inhabilitada`. Estados de usuario, rol, tarifa, plan y descuento: `activo` / `inactivo`.

## Flujo de desarrollo y calidad

- Marco SCRUM con sprints de 2 semanas. Product Owner: instructor; el equipo prioriza el Sprint Backlog a partir de las historias P1 de las specs.
- Flujo spec-kit por módulo: `/speckit.clarify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.analyze` → `/speckit.implement`. El *Constitution Check* del plan debe pasar antes de generar tareas.
- Commits con Conventional Commits y trazabilidad: `feat(<modulo>): <descripción> [HU-xx][RF-XXX-yy]`. Ramas cortas, PR con revisión de al menos otro integrante y sin secretos.
- **Definición de Terminado**: escenarios de aceptación en verde; validación en servidor y cliente; reglas de negocio probadas; pantalla responsive y accesible; README y colección de pruebas actualizados; desplegado en el entorno de demostración.

## Gobernanza

- Esta constitución prevalece sobre cualquier otra práctica del equipo. Un `plan.md` que la contradiga debe justificar la excepción en *Complexity Tracking* y contar con la aprobación del Product Owner.
- Las enmiendas se hacen por Pull Request que actualice este archivo, el *Sync Impact Report* y la versión: MAYOR si se elimina o redefine un principio, MENOR si se agrega uno, PARCHE para aclaraciones.
- `/speckit.analyze` y la revisión de código verifican el cumplimiento en cada spec.

**Version**: 1.0.0 | **Ratified**: 2026-11-21 | **Last Amended**: 2026-11-21
