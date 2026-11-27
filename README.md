# Sistema de Gestión de Parqueadero · Parking Lot ABC

Aplicación web para el **Parqueadero ABC** (Carrera 43 # 47-53, Medellín, servicio 24 horas para carros y motos). Es un monolito **Node.js 20 + Express + MySQL 8** que expone la API REST `/api/v1` y sirve un frontend en HTML, CSS y JavaScript vanilla con el sistema de diseño **PARKO**.

Se construye con **Spec-Driven Development (GitHub spec-kit)** y **Gitflow**, una spec por módulo:

| Fuente | Ruta |
|---|---|
| Constitución | [.specify/memory/constitution.md](.specify/memory/constitution.md) |
| Requerimientos (SRS v2.0) | [docs/SRS-Parking_Lot-v2.0.md](docs/SRS-Parking_Lot-v2.0.md) |
| Historias de usuario (66 HU) | [docs/historias-usuario-Parking_Lot.md](docs/historias-usuario-Parking_Lot.md) |
| Specs, planes y tareas | [specs/](specs/) |
| Esquema de BD y cambios | [backend/database/](backend/database/) · [CAMBIOS.md](backend/database/CAMBIOS.md) |
| Colección de pruebas de la API | [backend/docs/postman/](backend/docs/postman/) |

## Estado de las specs

| Spec | Módulo | Estado |
|---|---|---|
| `001-roles-permisos` | Roles y permisos + fundación del backend v2 | ✅ implementada |
| `002-gestion-usuarios` | Usuarios, foto, mis datos y avisos al administrador | ✅ implementada |
| `003-gestion-acceso` | Bloqueo por intentos, cambio de contraseña, autorregistro, recuperación y cierre de sesión | ✅ implementada |
| `004-parqueaderos-celdas` | Parqueaderos, puertas, celdas, mapa por piso y disponibilidad pública | ✅ implementada |
| `005-vehiculos` | Vehículos, propietario con historial y «Mis vehículos» (esquema 2.1.0) | ✅ implementada |
| `006`–`015` | pico y placa, movimientos, tarifas, facturación, membresías, descuentos, reservas, incidencias, monitoreo, reportes | pendientes |
| `016-festivos-pico-placa` | API externa Nager.Date (festivos para pico y placa, TBD-03) | pendiente |

La versión anterior (PARKO v1, trazabilidad `REQ-`) se conserva en el tag `v0.9.0-legado`.

## Requisitos

- **Node.js 20 LTS**, 20.19 o superior (ver `backend/.nvmrc`; con nvm-windows: `nvm install 20 && nvm use 20`). ESLint 10 pide 20.19+.
- **MySQL 8** en `localhost:3306` (MySQL Server o XAMPP con MySQL 8).
- Git. Para la colección de pruebas: `npm i -g newman`.

> **Certificados TLS:** si el antivirus o el proxy de la red inspecciona HTTPS y `npm install` falla con `UNABLE_TO_GET_ISSUER_CERT`, exporta el certificado raíz de la red y ejecuta `npm config set cafile <ruta.pem>`.

## Instalación

```bash
cd backend
npm install
cp .env.example .env          # completa DB_PASSWORD y JWT_SECRET (≥ 32 caracteres)
cp .env.example .env.test     # mismo contenido con NODE_ENV=test y DB_NAME=parqueaderodb_test
npm run db:reset              # crea parqueaderodb con schema.sql + seed.sql
npm run dev                   # http://localhost:3000 (API en /api/v1)
```

Genera el `JWT_SECRET` con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Variables de entorno (`backend/.env`)

| Variable | Uso | Ejemplo |
|---|---|---|
| `PORT` | Puerto HTTP | `3000` |
| `NODE_ENV` | `development`, `test` o `production` | `development` |
| `TZ` | Zona horaria del proceso (no cambiar) | `America/Bogota` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` | Conexión a MySQL | `127.0.0.1`, `3306`, `root` |
| `DB_NAME` | Base de datos (`*_test` en pruebas) | `parqueaderodb` |
| `JWT_SECRET` | Firma de los tokens (≥ 32 caracteres) | — |
| `JWT_EXPIRES_IN` | Vigencia del token (RNF-SEG-03) | `8h` |
| `BCRYPT_COSTO` | Costo de bcrypt (≥ 10) | `10` |
| `CORS_ORIGIN` | Solo si el frontend se sirve desde otro origen | vacío |
| `TRUST_PROXY` | Proxies HTTPS delante de Express | `0` |
| `LOGIN_LIMITE_IP` | Peticiones por IP cada 15 min a login, registro, recuperar y restablecer (en desarrollo, 200 para correr Newman varias veces) | `20` |
| `URL_PUBLICA` | Base de los enlaces de recuperación que llegan por correo | `http://localhost:3000` |
| `CORREO_TRANSPORTE` | `smtp`, `archivo` (`.eml` en `backend/correos/`) o `memoria` (pruebas) | `archivo` |
| `CORREO_REMITENTE` | Remitente de los correos | `Parking Lot ABC <no-responder@…>` |
| `SMTP_HOST`, `SMTP_PUERTO`, `SMTP_SEGURO`, `SMTP_USUARIO`, `SMTP_CLAVE` | Servidor SMTP (solo con `smtp`; TBD-09) | — |

`.env` y `.env.test` nunca se suben al repositorio.

## Usuarios de prueba

Todos inician sesión con **tipo y número de documento + contraseña**.

| Rol | Documento | Contraseña | Nombre | Nota |
|---|---|---|---|---|
| Administrador | CC 1000000001 | `Admin2026*` | Laura Gómez Restrepo | todos los permisos |
| Operador | CC 1000000002 | `Operador2026*` | Juan Pérez Álvarez | operación diaria |
| Supervisor de turno | CC 1000000003 | `Operador2026*` | Sebastián Duque Mejía | rol no base |
| Cliente | CC 1000000004 | `Cliente2026*` | Andrea Salcedo Ríos | |
| Cliente | CE 1000000005 | `Cliente2026*` | Carlos Medina Toro | |
| Cliente | CC 1000000006 | `Cliente2026*` | Valentina Ospina Gil | debe cambiar la contraseña (spec 003) |
| Cliente inactivo | CC 1000000009 | `Cliente2026*` | Mateo Cardona Ruiz | no puede iniciar sesión |

Para regenerar los hashes de la semilla: `npm run db:seed:generar`.

Los usuarios que registra el administrador u operador reciben por correo una **contraseña temporal** y, hasta cambiarla, la API solo les permite cambiarla o cerrar sesión (403 `CAMBIO_CONTRASENA_REQUERIDO`). Cualquier persona puede crear su cuenta de cliente en `/registro.html` y recuperar la contraseña en `/recuperar.html` (el enlace dura 30 minutos y sirve una sola vez). Con `CORREO_TRANSPORTE=archivo`, ese correo queda en `backend/correos/*.eml` (ábralo con cualquier cliente de correo).

## Scripts (`backend/`)

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor con recarga (`node --watch`) |
| `npm start` | Servidor en producción |
| `npm test` | Pruebas Jest + Supertest (recrea `parqueaderodb_test`) |
| `npm run test:cobertura` | Pruebas con cobertura (services ≥ 80 %) |
| `npm run test:api` | Colección Postman con Newman (servidor en marcha y BD recién sembrada) |
| `npm run postman:generar` | Regenera la colección desde `docs/postman/casos/*.js` |
| `npm run lint` / `npm run format` | ESLint y Prettier (backend y `frontend/js`) |
| `npm run db:reset` | Borra y recrea la BD de `DB_NAME` (bloqueado en producción) |

## API v1

Respuesta común: `{ "ok": true, "data": …, "meta": { "page", "limit", "total" } }` o `{ "ok": false, "error": { "code", "message", "details": [{ "campo", "mensaje" }] } }`.

Códigos HTTP:
- `200`/`201`/`204` éxito;
- `400` JSON mal formado;
- `401` sin sesión válida;
- `403` sin permiso;
- `404` no existe;
- `409` conflicto o regla de negocio;
- `422` validación de campos;
- `429` demasiados intentos;
- `500` error interno sin traza.

Autenticación con `Authorization: Bearer <token>`. Listados con `?page&limit&q`.

| Método | Ruta | Permiso | HU |
|---|---|---|---|
| GET | `/api/v1/health` | público | — |
| POST | `/api/v1/auth/login` | público (bloqueo: 5 fallos en 15 min → 429) | HU-12, HU-13 |
| PUT | `/api/v1/auth/contrasena` | token (también con contraseña temporal) | HU-12 |
| POST | `/api/v1/auth/registro` | público | HU-14 |
| POST | `/api/v1/auth/recuperar` | público | HU-15 |
| POST | `/api/v1/auth/restablecer` | público | HU-15 |
| POST | `/api/v1/auth/logout` | token | HU-16 |
| GET | `/api/v1/roles?page&limit&q&estado` | `roles.ver` | HU-01, HU-03 |
| POST | `/api/v1/roles` | `roles.crear` | HU-02 |
| GET | `/api/v1/roles/:id` | `roles.ver` | HU-03 |
| PUT | `/api/v1/roles/:id` | `roles.editar` | HU-04 |
| PATCH | `/api/v1/roles/:id/estado` | `roles.cambiar_estado` | HU-05 |
| GET | `/api/v1/permisos` | `roles.ver` | HU-06 |
| POST | `/api/v1/usuarios` (JSON o multipart con `foto`) | `usuarios.crear` (Operador: solo Clientes) | HU-07 |
| GET | `/api/v1/usuarios?page&limit&q&rol&estado` | `usuarios.ver` | HU-08 |
| GET | `/api/v1/usuarios/:id` | `usuarios.ver` | HU-08 |
| GET | `/api/v1/usuarios/:id/foto` `[Propuesta]` | propia o `usuarios.ver` | HU-08 |
| PUT | `/api/v1/usuarios/:id` | `usuarios.editar` | HU-09 |
| PATCH | `/api/v1/usuarios/:id/estado` | `usuarios.cambiar_estado` | HU-10 |
| GET | `/api/v1/usuarios/me` | `perfil.ver` | HU-11 |
| PUT | `/api/v1/usuarios/me` | `perfil.editar` | HU-11 |
| POST | `/api/v1/parqueaderos` | `parqueaderos.crear` | HU-17 |
| GET | `/api/v1/parqueaderos?page&limit&q&estado` | `parqueaderos.ver` | HU-17 |
| GET | `/api/v1/parqueaderos/:id` (con puertas y resumen por piso) | `parqueaderos.ver` | HU-17 |
| PUT | `/api/v1/parqueaderos/:id` (`estado` exige `parqueaderos.cambiar_estado`) | `parqueaderos.editar` | HU-18 |
| DELETE | `/api/v1/parqueaderos/:id` (inactiva) | `parqueaderos.cambiar_estado` | HU-18 |
| GET | `/api/v1/parqueaderos/:id/puertas?uso&estado` | `parqueaderos.ver` | HU-19 |
| POST | `/api/v1/parqueaderos/:id/puertas` | `parqueaderos.editar` | HU-19 |
| PUT | `/api/v1/puertas/:id` | `parqueaderos.editar` | HU-19 |
| POST | `/api/v1/celdas` | `celdas.crear` | HU-20 |
| POST | `/api/v1/celdas/lote` (máximo 200) | `celdas.crear` | HU-20 |
| GET | `/api/v1/celdas?parqueadero&piso&tipo&estado&q&page&limit` | `celdas.ver` (placa solo con `movimientos.ver`) | HU-22 |
| GET | `/api/v1/celdas/:id` | `celdas.ver` | HU-22 |
| PUT | `/api/v1/celdas/:id` | `celdas.editar` | HU-21 |
| PATCH | `/api/v1/celdas/:id/estado` | `celdas.cambiar_estado` | HU-21 |
| DELETE | `/api/v1/celdas/:id` (inhabilita) | `celdas.cambiar_estado` | HU-21 |
| GET | `/api/v1/disponibilidad?parqueadero` | público, `Cache-Control: no-store` | HU-24 |
| POST | `/api/v1/vehiculos` (placa normalizada; `idPropietario` opcional) | `vehiculos.crear` | HU-25 |
| GET | `/api/v1/vehiculos?page&limit&q&tipo&propietario&dentro` (`propietario=ninguno`) | `vehiculos.ver` | HU-28 |
| GET | `/api/v1/vehiculos/:id` (historial y últimos 10 movimientos) | `vehiculos.ver` | HU-28 |
| PUT | `/api/v1/vehiculos/:id` | `vehiculos.editar` | HU-27 |
| PATCH | `/api/v1/vehiculos/:id/propietario` (reasignar o quitar exige `vehiculos.editar`) | `vehiculos.crear` | HU-26, HU-27 |
| GET | `/api/v1/usuarios/me/vehiculos` | `perfil.ver` | HU-28 |

Pantallas de la 004: `celdas.html` (mapa por piso que se refresca cada 10 s; personal), `parqueaderos.html`, `parqueadero-detalle.html` (puertas), `disponibilidad.html` (Cliente) y la portada `index.html` (cupos por tipo con «Lleno», sin sesión). El paso de la celda a ocupada y a disponible con cada entrada y salida (HU-23) lo usan los movimientos de la spec 007.

Pantallas de la 005: `vehiculos.html` (búsqueda, filtros y registro), `vehiculo-detalle.html` (propietario, edición, historial y movimientos), «Agregar vehículo» en `usuario-detalle.html` y `mis-vehiculos.html` (Cliente). El esquema pasa a **2.1.0** (`historial_propietario`); para una BD existente se aplica `backend/database/migrations/001_historial_propietario.sql`.

El contrato completo de cada spec está en `specs/NNN-*/contracts/openapi.yaml`.

## Pruebas

- **Jest + Supertest** (`backend/tests/`): unitarias de funciones puras e integración por escenario de aceptación, nombradas `HU-xx Ey …`.
- **Postman + Newman** (`backend/docs/postman/`): una carpeta por spec, con caso de éxito y de error por endpoint (RNF-CAL-03).

```bash
cd backend
npm test
npm run db:reset && npm run dev   # en otra terminal:
npm run test:api
```

## Estructura

```
.specify/                    # spec-kit: constitución, plantillas y scripts
specs/NNN-modulo/            # spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md, tasks.md
docs/                        # SRS, historias de usuario, diseño PARKO, prompts
backend/
  src/{app.js, server.js, config/, middlewares/, utils/}
  src/modules/<modulo>/      # .routes · .controller · .service · .repository · .validator
  database/                  # schema.sql, seed.sql, CAMBIOS.md, reset.js
  docs/postman/              # colección y entorno de Newman (generada desde casos/*.js)
  tests/{unit, integration, setup}
frontend/
  index.html, login.html, <pantalla>.html
  css/                       # tokens, base, átomos, moléculas, organismos, plantillas (PARKO)
  js/{config, api, services, utils}
  js/components/{atomos, moleculas, organismos, plantillas}   # Atomic Design: sin llamadas a la API
  js/views/                  # nivel PÁGINA: una vista por pantalla, llama a services/
  assets/                    # íconos (sprite SVG) y favicon
```

Capas del backend: `routes → controller → service → repository`. El SQL vive solo en los repositorios y las reglas de negocio en los servicios.

## Flujo de trabajo (spec-kit + Gitflow)

1. Rama `NNN-modulo` creada desde `develop`.
2. `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`, con un commit por paso.
3. PR `NNN-modulo` → `develop`, revisado.
4. Al final: `release/1.0.0` → `main` y el tag `v1.0.0`.

Formato de los commits: `feat(<modulo>): <descripción> [HU-xx][RF-XXX-yy]`.

## Seguridad y datos personales

- Contraseñas con bcrypt (costo 10); nunca se devuelven ni se guardan en la bitácora.
- JWT Bearer de 8 h con sesión revocable por `jti`; los usuarios inactivos no pueden iniciar sesión.
- Permiso verificado en el servidor en cada endpoint (403 aunque la opción esté oculta); validación zod; SQL parametrizado; `helmet`; límite de intentos de login.
- Bitácora de cambios en la misma transacción (RNF-SEG-07).
- Ley 1581 de 2012: autorización de tratamiento de datos obligatoria en usuarios.

## Fuera de alcance

Facturación electrónica DIAN, pasarela de pagos, motor OCR de placas y control de hardware (barreras). Ver SRS §1.4.

## Herramientas de desarrollo

- `node herramientas/armar-paginas.js "$(pwd)/frontend"`: vuelve a escribir las páginas internas con el marco común (encabezado, navbar, pie, diálogos). Cada spec agrega su `paginas-NNN.js`.
- `node herramientas/verificar-front.js "$(pwd)/frontend"`: comprueba que los imports y exports de `frontend/js` existan y que cada vista use ids presentes en su página.
