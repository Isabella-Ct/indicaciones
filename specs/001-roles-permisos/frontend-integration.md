# Integración con el frontend — 001-roles-permisos

Guía para conectar el frontend con los endpoints de esta spec (prompt §3.11, constitución §V). En 001 además se **reestructura** `frontend/` según la constitución ([research.md](research.md) R-13).

## 1. Inventario del frontend v1

El frontend v1 no usa datos simulados: consume la API v1. Lo que toca a este módulo:

| Archivo v1 | Qué hacía | Destino en v2 |
|---|---|---|
| `frontend/login.html`, `js/pages/login.js` | login con cookie, `{data}` | `frontend/login.html` + `js/views/login.view.js`: Bearer en `sessionStorage`, `{ok,data}` |
| `js/services/api.js` | `fetch` con `credentials:'include'`, lee `error.codigo` | `js/api/http.js`: Bearer, lee `error.code`/`error.details`, timeout |
| `js/pages/comun/marco.js` | header y navbar según rol | `js/components/organismos/navbar.js` + `moleculas/menu-usuario.js` + `plantillas/marco-app.js`: navbar según **permisos** del login |
| `js/pages/comun/plantillas.js` | `cloneNode` de `<template>` | `js/utils/plantillas.js` (se reutiliza la lógica) |
| `js/pages/comun/modales.js` | modales con Esc y foco | `js/components/organismos/modal.js`: confirmación con `<dialog>` (constitución §V) |
| `js/utils/*` (formato COP, fechas) | formatos es-CO | `js/utils/formato.js` |
| `styles/tokens.css`, `base.css`, `atomic/*.css` | sistema PARKO | `css/tokens.css`, `css/base.css`, `css/componentes.css` (los valores no cambian) |
| `js/services/roles.service.js` (`GET /roles` simple) | lista de roles para el select de usuarios | `js/services/roles.service.js` con las 6 funciones de abajo |

No había pantallas de Roles ni de Permisos. Se crean nuevas.

Diferencias de forma de los datos (v1 → v2): `id` → `idRol`; `nombre` igual; se agregan `esBase`, `estado`, `usuariosAsignados` y `usuariosActivos`. El error `codigo/mensaje/detalles[].campo` pasa a `code/message/details[].campo`. No hace falta un adaptador, porque las vistas se escriben directamente contra la forma v2.

## 2. Servido por Express

- `app.js` monta `/api/v1/*` **antes** que `express.static(frontend/)`. Un 404 bajo `/api` responde JSON `{ok:false,error:{code:'RUTA_NO_ENCONTRADA'}}`; fuera de `/api` responde con `frontend/404.html`.
- El frontend y la API comparten origen, así que CORS solo se habilita si `CORS_ORIGIN` está definido (por ejemplo, en desarrollo con Live Server).

## 3. Capa de servicios

`js/api/http.js` es el único cliente `fetch`:

- toma `API_BASE` de `js/config/config.js` (`/api/v1`);
- agrega `Authorization: Bearer <token>` desde `sessionStorage`;
- envía y recibe JSON con un timeout de 15 s mediante `AbortController`;
- si `ok:false`, lanza `ErrorApi { status, code, message, details }`;
- ante un **401**, borra la sesión y redirige a `login.html?vencida=1`;
- ante un **403**, muestra el toast «No tiene permiso para esta acción».

`js/services/roles.service.js`:

| Función | Endpoint |
|---|---|
| `listarRoles({ page, limit, q, estado })` | `GET /roles` → `{ data, meta }` |
| `obtenerRol(id)` | `GET /roles/:id` |
| `crearRol({ nombre, descripcion, permisos })` | `POST /roles` |
| `actualizarRol(id, datos)` | `PUT /roles/:id` |
| `cambiarEstadoRol(id, estado)` | `PATCH /roles/:id/estado` |
| `listarPermisos()` | `GET /permisos` |

`js/services/auth.service.js`: `iniciarSesion({ tipoDocumento, numeroDocumento, contrasena })` → guarda `{ token, usuario, permisos, expiraEn }` en `sessionStorage`.

## 4. Reglas de componentes

- Atomic Design: `js/components/atomos/` → `moleculas/` → `organismos/` → `plantillas/`; cada nivel solo importa niveles inferiores y **ninguno** llama a la API (reciben datos y callbacks). ESLint lo hace cumplir (`no-restricted-imports`).
- `js/views/<pantalla>.view.js` llama a los servicios y pasa los datos a los componentes.
- Los datos de la API se pintan **solo** con `textContent` y clonando `<template>`, nunca con `innerHTML` (constitución §V).

## 5. Errores y formularios

- `details[]` se pinta junto a cada campo (`<p class="molecule-field__error" id="error-<campo>">`, `aria-describedby`) (RNF-USA-03).
- Traducción de `code`:
  - `ROL_DUPLICADO` → error en el campo nombre;
  - `ROL_BASE_INMUTABLE`, `ROL_CON_USUARIOS_ACTIVOS`, `PERMISOS_ADMIN_PROTEGIDOS` → toast de error con `message`;
  - `VALIDACION` → errores por campo.
- Validación en línea antes de enviar: nombre de 3 a 40 caracteres y al menos un permiso («Seleccione al menos un permiso», criterio 3 de HU-02).

## 6. Seguridad en el cliente

- El token va en `sessionStorage` (se borra al cerrar la pestaña). Cerrar sesión llama a `/auth/logout` desde la spec 003; mientras tanto solo borra `sessionStorage`.
- El menú se arma con `permisos[]` del login: «Roles» y «Permisos» requieren `roles.ver`. La autorización real la hace el servidor.

## 7. Tiempo real

No aplica a esta spec (el polling de celdas es de la spec 004).

## 8. Formatos

`js/utils/formato.js`: `Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 })` y `Intl.DateTimeFormat('es-CO', { dateStyle:'short', timeStyle:'short', hour12:true, timeZone:'America/Bogota' })`.

## 9. Checklist por historia

| HU | Pantalla (SRS B.2) | Servicio → endpoint | Estados: cargando / vacío / error | Prueba manual |
|---|---|---|---|---|
| HU-01 | `roles.html` (listado) | `listarRoles` → GET /roles | fila «Cargando…» / «No hay roles» / toast | ver los 3 roles base con etiqueta BASE |
| HU-02 | `roles.html` › diálogo «Nuevo rol» | `listarPermisos`, `crearRol` | botón deshabilitado mientras guarda / — / errores por campo | crear, duplicado, sin permisos |
| HU-03 | `roles.html` (búsqueda, paginación) + `rol-detalle.html?id=` | `listarRoles`, `obtenerRol` | igual + 404 «Rol no encontrado» | buscar «oper», detalle |
| HU-04 | `rol-detalle.html` › Editar | `actualizarRol` | errores 409/422 | editar descripción y permisos |
| HU-05 | `roles.html` › acción Cambiar estado (`<dialog>`) | `cambiarEstadoRol` | toast con el mensaje 409 | inactivar y activar |
| HU-06 | `permisos.html` (solo lectura) | `listarPermisos` | — / — / aviso 403 | como Operador: no aparece en el menú |
