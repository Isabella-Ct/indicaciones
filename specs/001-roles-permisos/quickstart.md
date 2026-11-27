# Guía rápida — 001-roles-permisos

Guía para comprobar que la spec funciona de punta a punta. El contrato está en [contracts/openapi.yaml](contracts/openapi.yaml) y el modelo en [data-model.md](data-model.md).

## Requisitos

- Node.js 20 LTS (`nvm use` lee `.nvmrc`) y MySQL 8 en `localhost:3306`.
- `newman` instalado globalmente (`npm i -g newman`) para la colección Postman.

## Preparación

```bash
cd backend
cp .env.example .env            # completar DB_PASSWORD y JWT_SECRET (≥ 32 caracteres)
cp .env.example .env.test       # mismo contenido con DB_NAME=parqueaderodb_test y NODE_ENV=test
npm install
npm run db:reset                # recrea parqueaderodb con schema.sql + seed.sql
npm run dev                     # node --watch src/server.js → http://localhost:3000
```

Comprobación: `curl http://localhost:3000/api/v1/health` responde `{"ok":true,"data":{"estado":"ok","baseDatos":"ok",…}}`.

Usuarios semilla: los documentos y las contraseñas de prueba están en `backend/README.md`. El Administrador es `CC 1000000001`.

## Pruebas automatizadas

```bash
npm test                        # Jest + Supertest; globalSetup recrea parqueaderodb_test
npm run test:cobertura          # cobertura de services ≥ 80 %
npm run lint
npm run test:api                # Newman: backend/docs/postman/*.json contra el servidor en marcha
```

Resultado esperado: todas las pruebas `HU-01 …` a `HU-06 …` en verde, sin errores de lint, y la carpeta Newman «001 Roles y permisos» con cada petición verde (éxito y error).

## Escenarios manuales (curl)

```bash
API=http://localhost:3000/api/v1
TOKEN=$(curl -s $API/auth/login -H 'Content-Type: application/json' \
  -d '{"tipoDocumento":"CC","numeroDocumento":"1000000001","contrasena":"Admin2026*"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.token')
H="Authorization: Bearer $TOKEN"
```

| HU | Petición | Resultado esperado |
|---|---|---|
| HU-01 E1 | `curl -H "$H" "$API/roles?q=&limit=10"` | 200. Aparecen Administrador, Operador y Cliente con `esBase:true` y `estado:"activo"` |
| HU-01 E5 | `curl -X PATCH -H "$H" -H 'Content-Type: application/json' -d '{"estado":"inactivo"}' $API/roles/2/estado` | 409 `ROL_BASE_INMUTABLE` |
| HU-02 E1 | `curl -X POST -H "$H" -H 'Content-Type: application/json' -d '{"nombre":"Supervisor","permisos":[1,2]}' $API/roles` | 201, `estado:"activo"`, `esBase:false` |
| HU-02 E2 | el mismo POST con `"nombre":" supervisor "` | 409 `ROL_DUPLICADO` |
| HU-02 E3 | POST con `"permisos":[]` | 422 `VALIDACION`, `details[0].campo = "permisos"` |
| HU-03 E2 | `curl -H "$H" "$API/roles?q=oper"` | 200, solo los nombres que contienen «oper» |
| HU-03 E4 | `curl -H "$H" $API/roles/9999` | 404 `ROL_NO_ENCONTRADO` |
| HU-04 E1 | `PUT /roles/{idSupervisor}` con un permiso más | 200. El usuario de ese rol lo ve solo al volver a iniciar sesión |
| HU-04 E4 | `PUT /roles/1` sin `roles.editar` | 409 `PERMISOS_ADMIN_PROTEGIDOS` |
| HU-05 E2 | `PATCH /roles/{idSupervisorDeTurno}/estado` `{"estado":"inactivo"}` | 409 `ROL_CON_USUARIOS_ACTIVOS`, «El rol tiene 1 usuarios activos» |
| HU-05 E4 | `PATCH /roles/{idAuditor}/estado` `{"estado":"activo"}` | 200 |
| HU-06 E1 | `curl -H "$H" $API/permisos` | 200, grupos por `modulo` |
| HU-06 E2 | la misma consulta con el token de un Operador | 403 `SIN_PERMISO` |
| — | `curl $API/roles` sin token | 401 `NO_AUTENTICADO` |

## Interfaz (prueba manual)

1. Abrir `http://localhost:3000/login.html` e iniciar sesión como Administrador. El navbar muestra **Configuración › Roles / Permisos**.
2. Roles: buscar «oper», paginar, abrir un detalle, crear «Supervisor» (sin permisos debe aparecer el mensaje junto a la lista), editar e inactivar con el diálogo de confirmación.
3. Iniciar sesión como Operador. La opción no aparece en el menú, y si se abre `roles.html` a mano se muestra el aviso de 403.
4. Repetir en 375 px de ancho y solo con el teclado (foco visible, Enter y Esc).

## Colección Postman (carpeta «001 Roles y permisos»)

| Petición | Éxito | Error |
|---|---|---|
| POST /auth/login | 200 Admin | 401 contraseña errada · 422 sin documento |
| GET /roles | 200 con meta | 401 sin token · 403 Operador · 422 `limit=500` |
| POST /roles | 201 | 409 duplicado · 422 sin permisos |
| GET /roles/:id | 200 | 404 |
| PUT /roles/:id | 200 | 409 renombrar rol base · 409 quitar permisos protegidos al Administrador · 422 |
| PATCH /roles/:id/estado | 200 | 409 rol base · 409 con usuarios activos · 422 estado inválido |
| GET /permisos | 200 | 403 Operador |
| GET /health | 200 | — |

## Rendimiento (SC-004 · RNF-REN-02) — medido el 2026-11-27

Con 50 007 filas en `usuario` (base `parqueaderodb_test`) y 40 peticiones seguidas a `GET /api/v1/roles?q=o&limit=10`:

| Métrica | Resultado | Meta |
|---|---|---|
| p95 | **56 ms** | ≤ 1 000 ms |
| mediana | 51 ms | — |
| `EXPLAIN` | `rol` por PRIMARY (7 filas) · `usuario` por `idx_usuario_rol_estado` (ref) | sin recorrido completo |

El conteo de usuarios por rol se hace en una sola consulta con `LEFT JOIN … GROUP BY`, sin N+1.
