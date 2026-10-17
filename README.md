# PARKO · Sistema de gestión del Parqueadero ABC

Aplicación web para gestionar el **Parqueadero ABC** (Carrera 43 # 47-53, Medellín): entradas y salidas,
celdas, pico y placa, cobro, membresías, reservas, incidencias, notificaciones y reportes.

- Backend: Node.js + Express + MySQL 8 (`mysql2/promise`, SQL plano, sin ORM).
- Frontend: HTML + CSS + JavaScript vanilla (ES modules, sin frameworks ni bundler), **Atomic Design**,
  con el sistema de diseño **PARKO** (`docs/diseno-parko/`). Express lo sirve como estático.

Contexto completo del proyecto: [`CLAUDE.md`](CLAUDE.md). Requerimientos: [`docs/requerimientos.md`](docs/requerimientos.md).

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Base del proyecto, BD consolidada, login con roles y permisos, componentes base | ✅ |
| 1–8 | Usuarios y vehículos, celdas, movimientos, cobro, incidencias, reportes, portal, entrega | Pendiente |

## Requisitos

- **Node.js** 20 LTS o superior (probado con Node 24).
- **MySQL 8** (MySQL Server o XAMPP con MySQL 8) en ejecución.
- Git.

## Instalación

```bash
cd backend
npm install
cp .env.example .env        # en Windows: copy .env.example .env
```

Edita `backend/.env`:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto HTTP (API + frontend) | `3000` |
| `NODE_ENV` | `development`, `test` o `production` | `development` |
| `TZ` | Zona horaria del proceso (no cambiar) | `America/Bogota` |
| `DB_HOST` / `DB_PORT` | Servidor MySQL | `127.0.0.1` / `3306` |
| `DB_USER` / `DB_PASSWORD` | Usuario de MySQL con permiso para crear bases de datos | `root` / *(tu clave)* |
| `DB_NAME` | Nombre de la base de datos | `parking_lot_abc` |
| `JWT_SECRET` | Cadena aleatoria de 32+ caracteres para firmar las sesiones | ver abajo |
| `JWT_EXPIRES_IN` | Duración de la sesión | `8h` |

Para generar `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Base de datos

```bash
npm run db:reset     # BORRA y recrea la BD: ejecuta database/schema.sql + database/seed.sql
```

- `backend/database/schema.sql` — modelo consolidado (fuente de verdad). Al final explica qué se tomó de
  cada borrador de `docs/bd-referencia/` y qué se corrigió.
- `backend/database/seed.sql` — datos de prueba. **Se genera** con `npm run db:seed:generar`
  (`database/generar-seed.js`): calcula los hashes bcrypt y escribe fechas relativas a `CURDATE()`,
  así el historial siempre corresponde a las últimas 2 semanas.
- `backend/database/migrations/` — cambios posteriores numerados (`001_*.sql`).

La semilla incluye: 3 roles y 34 permisos, 9 usuarios, la sede con 2 puertas (Norte y Sur), 2 sótanos con
**44 celdas** (la distribución de la maqueta: A-01…A-12 y B-01…B-12 en Sótano 1; C-01…C-08 y M-01…M-12 en
Sótano 2; A-01/B-01 accesibles; A-09 fuera de servicio), 12 vehículos (10 de clientes + 2 de visitantes),
3 mensualidades (A-04 y B-09 con celda fija), 7 estadías en curso, ~115 estadías y facturas de los últimos
14 días, reglas de pico y placa, tarifas (carro $120/min tope $28.000; moto $60/min tope $12.000),
3 descuentos, 4 tipos de incidencia y parámetros de `configuracion`.

## Ejecutar

```bash
npm run dev          # http://localhost:3000 (nodemon)
npm start            # sin recarga automática
```

| URL | Pantalla |
|---|---|
| `/` | Página pública (provisional) |
| `/login.html` | Inicio de sesión |
| `/app/inicio.html` | Inicio del panel interno |
| `/app/cambiar-contrasena.html` | Cambio de contraseña (obligatorio en el primer acceso) |
| `/app/_catalogo.html` | Catálogo de componentes (**solo desarrollo**; en producción responde 404) |

## Usuarios de prueba

Todos inician sesión con **tipo de documento + número de documento + contraseña**.

| Rol | Tipo | Documento | Contraseña | Nombre | Observación |
|---|---|---|---|---|---|
| Administrador | CC | `1000000001` | `Admin2026*` | Laura Gómez | |
| Operador | CC | `1000000002` | `Operador2026*` | Juan Pérez | |
| Operador | CC | `1000000003` | `Operador2026*` | Sebastián Duque | |
| Cliente | CC | `1000000004` | `Cliente2026*` | Andrea Salcedo | Mensualidad con celda fija A-04 |
| Cliente | CC | `1000000005` | `Cliente2026*` | Paula Giraldo | Mensualidad con celda fija B-09 (vence en 2 días) |
| Cliente | CC | `1000000006` | `Cliente2026*` | Hernán Quintero | Mensualidad sin celda fija |
| Cliente | CE | `1000000007` | `Cliente2026*` | Lucía Ortega | |
| Cliente | CC | `1000000008` | `Cliente2026*` | Camilo Restrepo | **Debe cambiar la contraseña** al entrar |
| Cliente | CC | `1000000009` | `Cliente2026*` | Felipe Mora | **Inactivo**: no puede iniciar sesión |

> Si Camilo cambia su contraseña, `npm run db:reset` la restaura (y `npm test` la necesita así).

## Pruebas y calidad

```bash
npm test             # Jest + supertest (requiere la BD cargada con npm run db:reset)
npm run lint         # ESLint sobre backend/ y frontend/js/
npm run format       # Prettier
```

## API (`/api/v1`)

Respuestas: éxito `{ "data": … }`; error `{ "error": { "codigo", "mensaje", "detalles"? } }`.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/salud` | Público | `{ estado: "ok", bd: "ok" }` (503 si no hay BD) |
| GET | `/parqueadero` | Público | Datos de la sede y sus puertas activas |
| POST | `/auth/login` | Público (5 intentos fallidos / 15 min por IP + documento) | `{ tipo_documento, numero_documento, contrasena }` → cookie `parko_sesion` (httpOnly, SameSite=Strict, 8 h) + usuario y permisos |
| POST | `/auth/logout` | Público | Borra la cookie de sesión |
| GET | `/auth/me` | Sesión | Usuario en sesión y sus permisos |
| POST | `/auth/cambiar-contrasena` | Sesión | `{ contrasena_actual, contrasena_nueva }` (mín. 8) |
| GET | `/roles` | Permiso `usuarios.ver` | Lista de roles |

Mientras un usuario tenga la contraseña temporal (`debe_cambiar_contrasena`), cualquier ruta protegida
distinta de `/auth/me`, `/auth/logout` y `/auth/cambiar-contrasena` responde `403 DEBE_CAMBIAR_CONTRASENA`.

## Estructura

```
/
├── CLAUDE.md                 contexto permanente del proyecto
├── docs/                     requerimientos, ficha, diseño PARKO, wireframes, borradores de BD
├── backend/
│   ├── src/
│   │   ├── app.js            Express: helmet (CSP), json, cookies, rate limit, /api/v1, estáticos, errores
│   │   ├── server.js         arranque y apagado ordenado
│   │   ├── config/           env (validado con zod), pool MySQL, constantes
│   │   ├── middlewares/      auth, require-permiso, validate, rate-limit, error-handler
│   │   ├── modules/          auth, salud, parqueadero, roles (routes → controller → service → repository)
│   │   ├── utils/            errores
│   │   └── realtime/         (SSE de celdas, Fase 2)
│   ├── database/             schema.sql, seed.sql, generar-seed.js, reset.js, migrations/
│   ├── tests/                Jest + supertest
│   └── uploads/              fotos (ignorado por git)
└── frontend/
    ├── index.html · login.html · 404.html
    ├── app/                  páginas internas (inicio, cambiar-contrasena, _catalogo)
    ├── assets/               icons.svg (sprite), favicon.svg
    ├── styles/               tokens.css, base.css, main.css, catalogo.css
    └── js/
        ├── components/       atoms · molecules · organisms · templates (ver su README.md)
        ├── pages/            un controlador por página (+ comun/montar-app.js)
        ├── services/         api.js (fetch) + un servicio por módulo
        └── utils/            dom, formato (COP, fechas Bogotá), placa, sesión/rol, navegación, almacén
```
