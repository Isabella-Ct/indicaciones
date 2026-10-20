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
| 1 | Usuarios y vehículos (REQ-USR-2..6, REQ-CAR-1..3), Mi cuenta, fotos | ✅ |
| 2 | Celdas y mapa en tiempo real (REQ-CLD-01..03), puertas, disponibilidad pública | ✅ |
| 3 | Pico y placa, entradas, salidas, tickets PDF e historial (REQ-CAR-4, REQ-INEX-1..4, REQ-PLA-1, REQ-TCK-1) | ✅ |
| 4 | Tarifas, descuentos, membresías, cobro y facturas PDF (REQ-TAR-1/2, REQ-FAC-1/2, REQ-MEM-1, REQ-DES-1) | ✅ |
| 5–8 | Reservas, incidencias, notificaciones, reportes, portal, entrega | Pendiente |

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
- `backend/database/migrations/` — cambios posteriores numerados, para BD creadas antes de cada fase
  (`db:reset` ya los incluye). Se aplican a mano en orden, por ejemplo con MySQL Workbench:
  - `001_permiso_usuarios_buscar.sql` (Fase 1): `usuarios.ver` queda solo para el administrador y se
    crea `usuarios.buscar` (administrador y operador).
  - `002_permiso_puertas.sql` (Fase 2): permiso `puertas.gestionar` (administrador).
  - `003_facturas_consecutivos.sql` (Fase 4): `facturas.tarifa_id` y `facturas.detalle_calculo` (JSON con
    el cálculo aplicado) y la tabla `consecutivos` (numeración FAC-000001 sin huecos ni duplicados).

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
| `/app/celdas.html` | Control de espacios: indicadores, mapa en vivo, **Registrar ingreso**, salida por placa/ticket, detalle de la celda y últimos movimientos (cliente: solo lectura, sin placas) |
| `/app/pico-placa.html` | Reglas de pico y placa (las de hoy resaltadas) |
| `/app/historial.html` | Historial de movimientos con filtros, PDF del ticket y exportación CSV |
| `/app/usuarios.html` | Usuarios: listado, edición y estado (administrador); solo registro (operador) |
| `/app/vehiculos.html` | Vehículos: registro, edición, propietario e historial |
| `/app/mi-cuenta.html` | Mis datos, cambio de contraseña y (clientes) mis vehículos |
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
| GET | `/roles` | Permiso `usuarios.crear` | Lista de roles (formulario de usuarios) |
| GET | `/usuarios` | `usuarios.ver` (admin) | Listado. Filtros: `q` (documento/nombre/correo), `rol`, `estado`, `orden`, `dir`, `pagina`, `limite` |
| GET | `/usuarios/buscar?documento=` | `usuarios.buscar` (admin, operador) | Clientes activos cuyo documento empieza así (id, documento, nombre) |
| GET | `/usuarios/me` | Sesión | Mis datos |
| PUT | `/usuarios/me` | `perfil.editar` | Multipart: nombres, `correo`, `celular`, `foto`, `quitar_foto`. Notifica a los administradores los campos cambiados (REQ-USR-4) |
| GET | `/usuarios/me/vehiculos` | Sesión | Mis vehículos |
| GET | `/usuarios/:id` | Admin, o el propio usuario | Detalle |
| POST | `/usuarios` | `usuarios.crear` | Multipart: documento, nombres, `correo`, `celular`, `rol_id`, `contrasena_temporal`, `foto` opcional. El operador no puede crear administradores (403) |
| PUT | `/usuarios/:id` | `usuarios.editar` (admin) | Multipart, mismos datos sin contraseña + `quitar_foto` |
| PATCH | `/usuarios/:id/estado` | `usuarios.cambiar_estado` (admin) | `{ estado: "activo" | "inactivo" }`. No sobre sí mismo (409) |
| GET | `/vehiculos` | `vehiculos.ver` | Filtros: `placa`, `tipo`, `propietario=con|sin`, `usuario_id`, `q` (documento/nombre del dueño), `activo`, orden y paginación |
| GET | `/vehiculos/placa/:placa` | `vehiculos.ver` | Búsqueda exacta (la placa se normaliza) |
| GET | `/vehiculos/:id` · `/vehiculos/:id/historial` | `vehiculos.ver` | Detalle · historial de propietarios |
| POST | `/vehiculos` | `vehiculos.crear` | `{ placa, tipo, color, marca, modelo, usuario_id? }`. Placa validada según el tipo (422) y única (409) |
| PUT | `/vehiculos/:id` | `vehiculos.editar` (admin) | `{ placa, tipo, color, marca, modelo, activo }` |
| PATCH | `/vehiculos/:id/propietario` | `vehiculos.crear` | `{ usuario_id | null, motivo? }`. Sin dueño → admin u operador (REQ-USR-6); con dueño → solo admin (REQ-CAR-3). Queda en el historial |

| GET | `/pisos` | `celdas.ver` | Pisos con los tramos del carril (`carril: [...]`) |
| GET | `/celdas` | `celdas.ver` | Filtros: `piso_id`, `area`, `tipo`, `estado`, `accesible=0|1`, `incluir_inactivas=1` (admin). Placas, titulares y tickets **solo** para admin/operador |
| GET | `/celdas/resumen` | `celdas.ver` | Totales por estado, tipo, piso y área; `ocupacion_pct` = ocupadas / habilitadas |
| GET | `/celdas/stream` | `celdas.ver` | SSE: `celda-actualizada`, `resumen-actualizado` (heartbeat cada 25 s). Cada conexión recibe los datos filtrados según su rol |
| GET | `/celdas/:id` | `celdas.ver` | Detalle |
| POST · PUT | `/celdas` · `/celdas/:id` | `celdas.gestionar` (admin) | `{ codigo, piso_id, area, tipo, es_accesible, fila_mapa, posicion }` (crear admite `estado` inicial y `nota`). 409 si el código o la posición ya existen |
| PATCH | `/celdas/:id/estado` | `celdas.cambiar_estado` (admin, operador) | `{ estado, vehiculo_id?, nota? }` — ver reglas abajo (REQ-CLD-03) |
| PATCH | `/celdas/:id/activa` | `celdas.gestionar` | `{ activa }`. Solo celdas libres o fuera de servicio y sin mensualidad/reserva |
| GET | `/puertas` | Sesión | Puertas activas (admin: `?incluir_inactivas=1`) |
| POST · PUT · PATCH | `/puertas` · `/puertas/:id` · `/puertas/:id/activa` | `puertas.gestionar` (admin) | `{ nombre, tipo: entrada|salida|mixta }`; debe quedar al menos una activa |
| GET | `/publico/disponibilidad` | Público | `{ carro: { disponibles, habilitadas }, moto: {…}, actualizado_en }` — sin celdas ni personas |
| GET | `/publico/disponibilidad/stream` | Público | SSE con el evento `disponibilidad` (los mismos totales) |

| GET | `/pico-placa` · `/pico-placa/hoy` | `pico_placa.ver` | Reglas (filtros `tipo_vehiculo`, `dia_semana`, `activa`) · reglas activas de hoy |
| POST · PUT · PATCH | `/pico-placa` · `/pico-placa/:id` · `/pico-placa/:id/activa` | `pico_placa.gestionar` (admin, operador) | `{ tipo_vehiculo, dia_semana 1–7, digito 0–9, hora_inicio, hora_fin }`. 409 si se cruza con otra regla |
| GET | `/estadias/previsualizar?placa=` | `movimientos.registrar` | Para el modal: vehículo, tipo de cliente, celda sugerida, pico y placa de hoy |
| POST | `/estadias/entrada` | `movimientos.registrar` | Multipart: `puerta_id`, `placa`, `celda_id?`, `requiere_accesible`, `confirmar_accesible`, `observaciones_entrada`, `deja_llaves`, `foto?`. Respuesta: ticket. Errores: 404 `VEHICULO_NO_REGISTRADO`, 403 `PICO_Y_PLACA`, 409 `ESTADIA_ABIERTA` / `SIN_CUPO` / `CELDA_ACCESIBLE` / `CONFIRMAR_ACCESIBLE` |
| POST | `/estadias/salida` | `movimientos.registrar` | `{ puerta_id, placa \| codigo_ticket }` → liquidación con dinero: `{ estadia, minutos, tiempo, tarifa, membresia, descuentos, cobro }`; **no** cierra |
| POST | `/estadias/:id/liquidar` | `movimientos.registrar` | `{ descuento_id? }` → recalcula el cobro de una estadía abierta (detalle en vivo y selector de descuento) |
| POST | `/estadias/:id/pagar` | `facturas.cobrar` | `{ puerta_id, metodo_pago, descuento_id? }` → `{ estadia, factura }`. El total lo calcula el servidor (se ignora cualquier total enviado). 409 si ya se cobró |
| POST | `/estadias/:id/cerrar` | — | **Retirado en la Fase 4**: responde 410 `ENDPOINT_RETIRADO` (usar `/pagar`) |
| GET | `/estadias/en-curso` · `/estadias/ultimos-movimientos?limite=10` | `movimientos.ver` | Vehículos dentro · bitácora de entradas y salidas |
| GET | `/estadias` | `movimientos.ver` | Historial: `placa`, `desde`, `hasta` (AAAA-MM-DD), `puerta_id`, `estado`, paginado |
| GET | `/estadias/:id/ticket` · `/estadias/:id/ticket.pdf` | `movimientos.ver` | Ticket (JSON) · PDF de 80 mm con código de barras Code 39 |
| GET | `/accesos-denegados` | `reportes.ver` (admin) | Entradas rechazadas (`placa`, `desde`, `hasta`, paginado) |
| GET | `/usuarios/me/estadias` | Sesión | Historial de los vehículos del usuario en sesión |

| GET | `/tarifas` | Sesión | `{ vigentes: { carro, moto } }`; admin: `?historial=1` agrega el historial |
| POST | `/tarifas` | `tarifas.gestionar` (admin) | `{ tipo_vehiculo, valor_fraccion, minutos_fraccion, minutos_gracia, valor_dia_maximo }`: nueva vigente; desactiva la anterior del tipo |
| POST | `/tarifas/simular` | `tarifas.ver` | `{ tipo_vehiculo, minutos, tarifa? }` → `{ tarifa, cobro }` (con la vigente o con valores propuestos) |
| GET | `/publico/tarifas` | Público | Tarifas vigentes sin datos internos |
| GET | `/descuentos` | `descuentos.ver` | Admin: todos (`?activos=1`); operador: solo activos |
| POST · PUT · PATCH | `/descuentos` · `/descuentos/:id` · `/descuentos/:id/activo` | `descuentos.gestionar` (admin) | `{ nombre, descripcion?, porcentaje 0–100 }` · `{ activo }`. 409 `NOMBRE_DUPLICADO` |
| GET | `/membresias` · `/membresias/:id` | `membresias.ver` | Filtros `estado`, `usuario_id`, `placa`, `q` (documento o nombre), paginado |
| GET | `/membresias/cotizar?vehiculo_id=&tipo=&fecha_inicio=` | `membresias.ver` | `{ fecha_fin, valor }` calculados (valor desde `configuracion`) |
| POST | `/membresias` | `membresias.gestionar` (admin) | `{ usuario_id, vehiculo_id, tipo, fecha_inicio, celda_asignada_id?, metodo_pago }`: crea la membresía y su factura. 409 `MEMBRESIA_TRASLAPADA` / `CELDA_CON_MENSUALIDAD` |
| PATCH | `/membresias/:id/cancelar` | `membresias.gestionar` | Cancela y libera la celda fija |
| GET | `/facturas` | `facturas.ver` | Admin: `desde`, `hasta`, `metodo_pago`, `concepto`, `placa`; operador: solo las de hoy. `meta.suma_total` = total del período |
| GET | `/facturas/resumen-hoy` | `facturas.ver` | KPIs: `recaudo`, `salidas_cobradas`, `permanencia_promedio_min` (visitantes) |
| GET | `/facturas/:id` · `/facturas/:id/pdf` | Sesión | Personal: cualquiera; cliente: solo las suyas (403 las ajenas) |
| GET | `/usuarios/me/facturas` · `/usuarios/me/membresias` | Sesión | Facturas y membresías del usuario en sesión |

**Reglas de la Fase 4 (cobro, facturas y membresías)**
- Cobro (`calcularCobro`, función pura en `modules/tarifas/tarifas.calculo.js`): gracia → `ceil(min / minutos_fraccion) × valor_fraccion` → tope `valor_dia_maximo` por cada bloque de 24 h → membresía activa = $0 → descuento (uno por factura) redondeado a la centena. Devuelve `detalle[]` con cada paso.
- `/pagar` hace todo en **una transacción**: bloquea la estadía, recalcula con la hora del servidor, toma el siguiente número de `consecutivos` (`FOR UPDATE`), crea la factura, cierra la estadía y libera la celda (o la deja `reservada` si es celda fija).
- Cada factura guarda `tarifa_id` y `detalle_calculo`: **cambiar una tarifa no altera las facturas anteriores**.
- Membresía: fecha fin = inicio + 1 mes / 1 año (MySQL); valor en `configuracion` (`membresia_valor_{mensual|anual}_{carro|moto}`); no se traslapan para el mismo vehículo ni para la misma celda fija. Se cobra con factura propia (`concepto = membresia`).
- Job horario (`src/jobs/membresias.job.js`): vence membresías, libera o reserva celdas fijas y avisa al cliente 3 días antes de vencer (una sola vez).
- Pantallas: Control de espacios (valor a pagar en vivo cada minuto, modal "Registrar salida y cobrar", KPIs de recaudo y permanencia), Tarifas (con simulador), Descuentos, Membresías, Facturación y Mi cuenta (Mis membresías, Mis facturas).

**Reglas de la Fase 3 (entradas y salidas)**
- Ninguna fecha u hora de movimiento viene del cliente: entrada, salida, lectura de placa y acceso denegado usan la hora del servidor.
- Cada intento de entrada guarda una lectura en `lecturas_placa` (REQ-PLA-1), aunque se rechace.
- Pico y placa: carro = último dígito, moto = primer dígito; el horario incluye el inicio y excluye el fin. Si aplica, se guarda en `accesos_denegados` y se notifica a los administradores. Las mensualidades no están exentas.
- Celda: primero la reserva vigente o la celda fija de la mensualidad; si no, la elegida por el operador o la primera libre del tipo (piso, fila, posición). Las accesibles van primero a quien las requiere; los demás solo las usan si no queda otra y el operador confirma (`confirmar_accesible`).
- Minutos de estadía = minutos completos (16:05 → 18:42 = 157 min).
- Al cerrar, la celda vuelve a `disponible` (o a `reservada` si es celda fija de una mensualidad o tiene reserva).
- El stream `/celdas/stream` emite también `movimiento-registrado` (solo personal) para la bitácora en vivo.

**Reglas de la Fase 2 (estado de celdas)**
- `ocupada`: exige un vehículo activo del mismo tipo que la celda (422 `TIPO_INCOMPATIBLE`) y que no esté en otra celda (409 `VEHICULO_YA_UBICADO`). En una celda reservada solo entra el vehículo titular.
- `disponible`: nunca con una estadía en curso (409 `ESTADIA_EN_CURSO`: se debe registrar la salida). Si es la celda fija de una mensualidad vigente (o tiene reserva activa) vuelve a `reservada` (`meta.estado_final`).
- `fuera_servicio`: exige nota; no sobre una celda ocupada.
- `reservada` no se asigna a mano (422): la ponen las mensualidades y las reservas.
- Tiempo real: cualquier módulo que cambie una celda llama a `publicarCambioCelda(id)` de `backend/src/realtime/celdas-tiempo-real.js`.

**Reglas de la Fase 1**
- Solo los **clientes activos** pueden ser propietarios de un vehículo.
- El operador **no** ve el listado de usuarios: solo los registra y busca clientes por documento al asignar vehículos.
- Fotos: solo JPG/PNG (se verifica la firma real del archivo) y máximo 2 MB. Se guardan en `backend/uploads/usuarios/`
  con nombre aleatorio y `/uploads/…` solo se sirve con sesión iniciada.
- Errores de duplicado: `409 DOCUMENTO_DUPLICADO`, `CORREO_DUPLICADO`, `PLACA_DUPLICADA`.

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
│   │   ├── modules/          auth, salud, parqueadero, roles, usuarios, vehiculos, notificaciones,
│   │   │                     pisos, celdas, puertas, publico, pico-placa, estadias
│   │   │                     (routes → controller → service → repository)
│   │   ├── utils/            errores, paginación, placas, archivos, fechas (Bogotá), pdf (ticket)
│   │   └── realtime/         emisor (pub/sub), helper SSE y publicación de cambios de celdas
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
