# Integración con el frontend — 003-gestion-acceso

## 1. Inventario

La v1 tenía `login.html` y `app/cambiar-contrasena.html` con cookie. La v2 ya tiene `login.html` (spec 001). Esta spec agrega:

| Pantalla (SRS B.2) | Página | Vista (nivel página) | Servicio → endpoint |
|---|---|---|---|
| Inicio de sesión | `login.html` (enlaces nuevos) | `views/login.view.js` | `iniciarSesion` → POST /auth/login |
| Cambiar contraseña | `cambiar-contrasena.html` (marco de la app) | `views/cambiar-contrasena.view.js` | `cambiarContrasena` → PUT /auth/contrasena |
| Registro de cliente | `registro.html` (marco público de autenticación) | `views/registro.view.js` | `registrarme` → POST /auth/registro |
| Recuperar contraseña | `recuperar.html` | `views/recuperar.view.js` | `recuperarContrasena` → POST /auth/recuperar |
| Restablecer contraseña | `restablecer.html?token=` | `views/restablecer.view.js` | `restablecerContrasena` → POST /auth/restablecer |
| Menú de usuario › Cerrar sesión | todas las páginas internas | `alSalir: cerrarSesion` | `cerrarSesion` → POST /auth/logout |

## 2. Servicio `js/services/auth.service.js`

- `iniciarSesion` guarda la sesión.
- `cerrarSesion` llama a `/auth/logout` y siempre borra `sessionStorage`, aunque la API falle.
- `cambiarContrasena` actualiza `debeCambiarContrasena = false` en la sesión guardada.
- `registrarme`, `recuperarContrasena` y `restablecerContrasena` son públicos (`publica: true`), así un 401 no redirige.

## 3. Atomic Design

| Nivel | Pieza | Uso |
|---|---|---|
| Plantilla | `plantillas/marco-app.js` | redirige a `cambiar-contrasena.html` si hay contraseña temporal; redirige a `paginaInicial` sin permiso (HU-13 E3); escucha `pageshow` para el botón Atrás (HU-16 E2); recibe `alSalir` |
| Plantilla | `template-auth-layout` (CSS de la spec 001) | registro, recuperar y restablecer, con el mismo panel del inicio de sesión |
| Molécula | `moleculas/campo.js`, `alerta.js`, `aviso.js` | errores por campo y avisos |
| Molécula (nueva) | `moleculas/contrasena.js` · `conectarContrasena(input, casilla)` | casilla «Mostrar contraseña» e indicador en línea de las reglas (8–64, letra y número) |
| Átomo | `atomos/boton.js` | botón en espera |
| Página | las vistas de arriba | las únicas que llaman a `services/` |

## 4. Errores

Traducción de `code`:
- `CREDENCIALES_INVALIDAS`, `USUARIO_INACTIVO`, `CUENTA_BLOQUEADA` → alerta del inicio de sesión;
- `CONTRASENA_ACTUAL_INCORRECTA` → campo de la contraseña actual;
- `CUENTA_EXISTENTE` → campo documento, con un enlace a «Recuperar contraseña»;
- `CORREO_DUPLICADO` → campo correo;
- `ENLACE_INVALIDO` → alerta con enlace a «Solicitar un enlace nuevo»;
- `CAMBIO_CONTRASENA_REQUERIDO` → `http.js` redirige a `cambiar-contrasena.html`;
- `VALIDACION` → `details` junto a cada campo.

## 5. Checklist por historia

| HU | Pantalla | Estados | Prueba manual |
|---|---|---|---|
| HU-12 | login, cambiar-contrasena | botón en espera / alerta / errores por campo | credenciales erradas, bloqueo, contraseña temporal |
| HU-13 | login → Mi perfil | — | Cliente abre /usuarios.html y vuelve a Mi perfil |
| HU-14 | registro | botón en espera / 409 en el campo / casilla obligatoria | registrar, repetir el documento |
| HU-15 | recuperar, restablecer | mensaje genérico / enlace inválido | flujo completo con `.eml` |
| HU-16 | menú de usuario | — | cerrar sesión y botón Atrás |
