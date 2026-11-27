# Guía rápida — 002-gestion-usuarios

Cómo comprobar la spec de punta a punta. Contrato: [contracts/openapi.yaml](contracts/openapi.yaml) · Modelo: [data-model.md](data-model.md).

## Preparación

Igual que en la spec 001 (`npm install`, `.env`, `.env.test`, `npm run db:reset`, `npm run dev`). Variables nuevas en `backend/.env` (ver `.env.example`):

```bash
CORREO_TRANSPORTE=archivo      # smtp | archivo | memoria
CORREO_REMITENTE="Parking Lot ABC <no-responder@parqueaderoabc.co>"
# Solo con CORREO_TRANSPORTE=smtp:
SMTP_HOST=  SMTP_PUERTO=587  SMTP_SEGURO=false  SMTP_USUARIO=  SMTP_CLAVE=
```

Con `archivo`, cada correo (contraseña temporal, aviso al Administrador) queda como `.eml` en `backend/correos/` y se abre con cualquier cliente de correo. En `.env.test` va `CORREO_TRANSPORTE=memoria`.

## Pruebas automatizadas

```bash
npm test            # incluye tests/integration/usuarios.test.js (HU-07..HU-11)
npm run lint
npm run test:api    # carpeta Postman «002 Gestión de usuarios»
```

## Escenarios manuales (curl)

```bash
API=http://localhost:3000/api/v1
login() { curl -s $API/auth/login -H 'Content-Type: application/json' -d "{\"tipoDocumento\":\"CC\",\"numeroDocumento\":\"$1\",\"contrasena\":\"$2\"}" | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.token'; }
ADMIN=$(login 1000000001 'Admin2026*'); OPER=$(login 1000000002 'Operador2026*'); CLI=$(login 1000000004 'Cliente2026*')
```

| HU | Petición | Resultado esperado |
|---|---|---|
| HU-07 E1 | `curl -H "Authorization: Bearer $ADMIN" -F tipoDocumento=CC -F numeroDocumento=1020304050 -F 'nombreCompleto=María Ríos' -F correo=maria@correo.co -F celular=3104567890 -F idRol=3 -F aceptaTratamientoDatos=true -F foto=@foto.png $API/usuarios` | 201, `correoEnviado:true`, `.eml` en `backend/correos/` |
| HU-07 E2 | el mismo POST otra vez | 409 `DOCUMENTO_DUPLICADO` |
| HU-07 E3 | POST con `correo=malo` y sin `celular` | 422 con `details` de `correo` y `celular` |
| HU-07 E5 | POST como `$OPER` con `idRol=2` | 403 `SIN_PERMISO` |
| HU-08 E2 | `curl -H "Authorization: Bearer $ADMIN" "$API/usuarios?q=salcedo"` | 200, Andrea Salcedo |
| HU-08 E5 | `curl -H "Authorization: Bearer $OPER" "$API/usuarios?rol=1"` | 200, solo Clientes |
| HU-08 E5 | `curl -H "Authorization: Bearer $OPER" $API/usuarios/1` | 403 |
| HU-09 E1 | `PUT /usuarios/5` como `$ADMIN` con otro celular | 200 y bitácora `editar` |
| HU-09 E2 | `PUT /usuarios/5` con el correo de otro usuario | 409 `CORREO_DUPLICADO` |
| HU-10 E1 | `PATCH /usuarios/6/estado` `{"estado":"inactivo"}` | 200; el token de ese usuario ya responde 401 |
| HU-10 E2 | `login 1000000009 'Cliente2026*'` | 401 `USUARIO_INACTIVO` |
| HU-10 E5 | `PATCH /usuarios/1/estado` como `$ADMIN` | 409 `AUTOINACTIVACION` |
| HU-11 E2 | `curl -X PUT -H "Authorization: Bearer $CLI" -H 'Content-Type: application/json' -d '{"nombreCompleto":"Andrea Salcedo Ríos","correo":"andrea.salcedo@correo.co","celular":"3109998877"}' $API/usuarios/me` | 200; notificación + `.eml` para el Administrador |
| HU-11 E4 | `PUT /usuarios/5` como `$CLI` | 403 |
| HU-11 E5 | `PUT /usuarios/me` con `"numeroDocumento":"1"` | 422 |

## Interfaz (prueba manual)

1. Como Administrador: Usuarios › Nuevo usuario con foto. Aparece el aviso «Usuario registrado — código N». Buscar, filtrar, abrir el detalle (foto, vehículos, membresía), editar e inactivar con confirmación.
2. Como Operador: el menú muestra Usuarios, el filtro de rol solo ofrece Cliente y el formulario no ofrece otros roles.
3. Como Cliente: entra a Mi perfil, cambia el celular y la foto; documento, código y rol se ven como solo lectura.
4. Repetir en 375 px y solo con teclado.

## Colección Postman (carpeta «002 Gestión de usuarios»)

| Petición | Éxito | Error |
|---|---|---|
| POST /usuarios | 201 (JSON) · 201 (multipart con foto) | 409 documento · 422 campos · 403 operador con rol Administrador |
| GET /usuarios | 200 búsqueda | 403 cliente · 422 limit |
| GET /usuarios/:id | 200 | 404 · 403 operador con un Administrador |
| PUT /usuarios/:id | 200 | 409 correo duplicado · 403 operador |
| PATCH /usuarios/:id/estado | 200 inactivar/activar | 409 autoinactivación · 422 estado |
| GET /usuarios/me | 200 | 401 sin token |
| PUT /usuarios/me | 200 | 422 documento enviado |
| GET /usuarios/:id/foto | 200 imagen | 404 sin foto |
