# Guía rápida — 003-gestion-acceso

Contrato: [contracts/openapi.yaml](contracts/openapi.yaml) · Modelo: [data-model.md](data-model.md).

## Preparación

Igual que en las specs 001 y 002. Variable nueva en `backend/.env`:

```bash
URL_PUBLICA=http://localhost:3000   # base del enlace de recuperación que llega por correo
```

Con `CORREO_TRANSPORTE=archivo`, el enlace de recuperación queda en el `.eml` más reciente de `backend/correos/`.

## Pruebas automatizadas

```bash
npm test            # incluye tests/integration/acceso.test.js (HU-12..HU-16)
npm run lint
npm run test:api    # carpeta Postman «003 Gestión de acceso»
```

## Escenarios manuales (curl)

```bash
API=http://localhost:3000/api/v1
```

| HU | Petición | Resultado esperado |
|---|---|---|
| HU-12 E1 | `POST /auth/login` con `CC 1000000002 / Operador2026*` | 200 con token y permisos |
| HU-12 E3 | 5 veces `POST /auth/login` con `CC 7000000001 / x`, y una sexta | 401 ×5 y luego 429 `CUENTA_BLOQUEADA` |
| HU-12 E4 | login con `CC 1000000006 / Cliente2026*` (debe cambiarla) y luego `GET /usuarios/me` | 200 con `debeCambiarContrasena:true`; luego 403 `CAMBIO_CONTRASENA_REQUERIDO` |
| HU-12 E5 | `PUT /auth/contrasena` `{"contrasenaActual":"Cliente2026*","contrasenaNueva":"NuevaClave1","confirmacion":"NuevaClave1"}` | 200; `GET /usuarios/me` ya responde 200 |
| HU-13 E3 | login de Cliente y `GET /usuarios` | 403 `SIN_PERMISO` |
| HU-14 E1 | `POST /auth/registro` con datos válidos | 201, rol Cliente |
| HU-14 E2 | el mismo registro con `numeroDocumento: 1000000004` | 409 `CUENTA_EXISTENTE` |
| HU-15 E1/E2 | `POST /auth/recuperar` con `1000000004` y con `9999999999` | ambos 200 con el mismo cuerpo; solo el primero genera un `.eml` |
| HU-15 E3 | `POST /auth/restablecer` con el token del `.eml` | 200; las sesiones anteriores quedan en 401 |
| HU-15 E4 | el mismo token otra vez | 409 `ENLACE_INVALIDO` |
| HU-16 E1/E2 | `POST /auth/logout` con el token y luego `GET /usuarios/me` con el mismo token | 204 y luego 401 |

## Interfaz (prueba manual)

1. `login.html`: tiene los enlaces «¿Olvidó su contraseña?» y «Crear cuenta». Con 5 contraseñas erradas aparece el mensaje de bloqueo.
2. Iniciar sesión con `CC 1000000006` (contraseña temporal): lleva a `cambiar-contrasena.html`, y cualquier otra pantalla vuelve ahí hasta cambiarla.
3. `registro.html`: aviso de privacidad, casilla obligatoria y confirmación de contraseña. Al terminar lleva al inicio de sesión con un aviso.
4. `recuperar.html` → `.eml` → `restablecer.html?token=…` → inicio de sesión.
5. Menú de usuario › Cerrar sesión; con el botón Atrás no se ve la pantalla anterior.
6. Como Cliente, abrir `/usuarios.html` a mano: vuelve a Mi perfil.
7. Repetir en 375 px y solo con teclado.

## Colección Postman (carpeta «003 Gestión de acceso»)

| Petición | Éxito | Error |
|---|---|---|
| POST /auth/login | 200 operador · 200 con contraseña temporal | 401 genérico · 422 |
| PUT /auth/contrasena | 200 (usuario autorregistrado) | 401 contraseña actual · 422 confirmación |
| POST /auth/registro | 201 | 409 documento · 422 sin autorización |
| POST /auth/recuperar | 200 existente · 200 inexistente (mismo cuerpo) | 422 sin documento |
| POST /auth/restablecer | (éxito solo en Jest: el token llega por correo) | 409 enlace inválido · 422 contraseña débil |
| POST /auth/logout | 204 | 401 token ya cerrado |

> El restablecimiento exitoso no se puede automatizar en Newman porque el token solo viaja en el correo y la API guarda su hash. Lo cubre la prueba Jest `HU-15 E3`, que lee el correo de la bandeja en memoria, y se verifica a mano con el `.eml`.
