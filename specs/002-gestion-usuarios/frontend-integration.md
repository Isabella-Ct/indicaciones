# Integración con el frontend — 002-gestion-usuarios

Guía para conectar las pantallas de usuarios (prompt §3.11, constitución §V) con los componentes por **niveles de Atomic Design** que dejó la spec 001.

## 1. Inventario

La v1 tenía `app/usuarios.html` y `app/mi-cuenta.html` (en el tag `v0.9.0-legado`), con otra API y otros campos: `primer_nombre`…`segundo_apellido`, `pagina/limite`, cookie. Se reconstruyen sobre la v2:

| Pantalla (SRS B.2) | Página | Vista (nivel página) | Servicio → endpoint |
|---|---|---|---|
| Usuarios (listado) + Nuevo + Editar + Cambiar estado | `frontend/usuarios.html` | `js/views/usuarios.view.js` | `listarUsuarios` → GET /usuarios · `crearUsuario` → POST · `actualizarUsuario` → PUT /:id · `cambiarEstadoUsuario` → PATCH /:id/estado |
| Usuarios › Detalle | `frontend/usuario-detalle.html` | `js/views/usuario-detalle.view.js` | `obtenerUsuario` → GET /:id · `obtenerFoto` → GET /:id/foto |
| Mi perfil | `frontend/mi-perfil.html` | `js/views/mi-perfil.view.js` | `misDatos` → GET /me · `actualizarMisDatos` → PUT /me |

Diferencias de forma v1 → v2: el nombre pasa de cuatro campos a `nombreCompleto`; `rol` pasa de texto a `{ idRol, nombre }`; la foto pasa de URL pública a `fotoUrl` autenticada. No hace falta un adaptador.

## 2. Servicios

`js/services/usuarios.service.js` tiene una función por endpoint. Con foto arma un `FormData`; sin foto envía JSON. `js/api/http.js` agrega:
- `solicitar(ruta, { body: FormData })`, que no pone `Content-Type` para que el navegador ponga el `boundary`;
- `solicitarArchivo(ruta)`, que devuelve un `Blob` con el token Bearer, para las fotos.

## 3. Componentes por nivel (Atomic Design)

| Nivel | Componente | Clase CSS | Uso en esta spec |
|---|---|---|---|
| Átomo | `atomos/avatar.js` · `ponerAvatar(nodo, { iniciales, blob })` | `atom-avatar` | foto o iniciales en el listado, el detalle y el perfil |
| Átomo | `atomos/chip-estado.js` (spec 001) | `atom-status-chip` | estado activo/inactivo |
| Átomo | `atomos/boton.js` (spec 001) | `atom-button` | botones en espera |
| Molécula | `moleculas/foto.js` · `conectarFoto(raiz, { onCambio })` | `molecule-photo-input` | vista previa, validación de JPG/PNG ≤ 2 MB y quitar foto |
| Molécula | `moleculas/campo.js`, `alerta.js`, `aviso.js`, `buscador.js` (spec 001) | `molecule-field`, `molecule-alert`, `molecule-toast`, `molecule-search-box` | formularios, errores y búsqueda |
| Organismo | `organismos/tabla-datos.js`, `modal.js`, `navbar.js` (spec 001) | `organism-data-table`, `organism-modal`, `organism-navbar` | tabla, diálogo de usuario, confirmación y menú |
| Plantilla | `plantillas/marco-app.js` (spec 001) | `template-app-layout` | marco con sesión y permisos |
| Página | `views/usuarios.view.js`, `usuario-detalle.view.js`, `mi-perfil.view.js` | — | **las únicas que llaman a `services/`** |

ESLint impide que un componente importe niveles superiores o servicios. La foto se carga en la página y se le pasa el `Blob` al átomo.

## 4. Errores y formularios

`details[].campo` se pinta junto a cada control (`tipoDocumento`, `numeroDocumento`, `nombreCompleto`, `correo`, `celular`, `idRol`, `aceptaTratamientoDatos`, `foto`). Traducción de `code`:
- `DOCUMENTO_DUPLICADO` → campo número de documento;
- `CORREO_DUPLICADO` → campo correo;
- `AUTOINACTIVACION` → aviso;
- `SIN_PERMISO` → aviso (lo maneja `http.js`).

Validación en línea con las mismas reglas de research R-07.

## 5. Seguridad y privacidad

- El aviso de privacidad (Ley 1581) va visible en el formulario de registro y en Mi perfil, con la casilla obligatoria al registrar.
- El documento, el código y el rol son de solo lectura en Mi perfil.
- El Operador solo ve el rol Cliente en el selector: la vista lo fija, aunque el servidor también lo exige.

## 6. Checklist por historia

| HU | Pantalla | Estados: cargando / vacío / error | Prueba manual |
|---|---|---|---|
| HU-07 | `usuarios.html` › diálogo Nuevo usuario | botón en espera / — / errores por campo, 409 en el campo | crear con foto; documento repetido; Operador sin roles distintos de Cliente |
| HU-08 | `usuarios.html`, `usuario-detalle.html` | capa de carga / «No se encontraron usuarios» / 404 | buscar por documento, nombre o correo; filtros; detalle con foto |
| HU-09 | `usuarios.html` › diálogo Editar | igual | cambiar celular y rol; correo duplicado |
| HU-10 | `usuarios.html` › Cambiar estado (`<dialog>`) | aviso con el mensaje 409 | inactivar y activar; propia cuenta |
| HU-11 | `mi-perfil.html` | botón en espera / — / errores por campo | cambiar celular y foto; campos de solo lectura |
