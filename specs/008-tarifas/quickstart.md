# Guía rápida — 008-tarifas

Contrato: [contracts/openapi.yaml](contracts/openapi.yaml) · Modelo: [data-model.md](data-model.md).

## Preparación y pruebas

Igual que en las specs anteriores (`npm run db:reset`, `npm run dev`). Sin variables nuevas ni cambios de esquema.

```bash
npm test            # incluye tests/integration/tarifas.test.js y tests/unit/tarifas.reglas.test.js
npm run lint
npm run test:api    # carpeta Postman «008 Tarifas»
```

## Escenarios manuales (curl, token de Administrador salvo indicación)

| HU | Petición | Resultado esperado |
|---|---|---|
| HU-38 E1 | sin token: `GET /tarifas?vigentes=true` | las 4 tarifas de la semilla con `situacion: vigente` |
| HU-36 E2 | `POST /tarifas` carro ocasional desde mañana | 409 `TARIFA_SUPERPUESTA` (choca con la de la semilla) |
| HU-36 E1 | lo mismo con `"cerrarAnterior": true` | 201 programada; la de la semilla termina mañana |
| HU-38 E2 | `GET /tarifas?vigentes=true` | la nueva con `situacion: programada` |
| HU-36 E3 | `"valorPrimeraHora": 0` o `"topeDiario": 1000` | 422 en el campo |
| HU-37 E3 | `PATCH /tarifas/4/estado` `{"estado":"inactivo"}` | 409 `UNICA_TARIFA_VIGENTE`; con `"confirmar": true` → 200 |
| HU-36 E4 | Operador: `POST /tarifas` | 403 |

## Interfaz (prueba manual)

1. Visitante: la página de inicio muestra la sección «Tarifas» con las vigentes y las programadas.
2. Administrador: Configuración › Tarifas. Crear una tarifa superpuesta: aparece la opción «Cerrar la anterior y crear»; editar una sin uso; inactivar la única vigente pide confirmación.
3. Operador y Cliente: ven el listado en solo lectura (sin botones de crear, editar ni cambiar estado).
4. Repetir en 375 px y solo con teclado.

## Colección Postman (carpeta «008 Tarifas»)

| Petición | Éxito | Error |
|---|---|---|
| GET /tarifas?vigentes=true | 200 sin token | 422 `tipoVehiculo=bus` |
| GET /tarifas | 200 administrador | 401 sin token |
| POST /tarifas | 201 con `cerrarAnterior` | 409 superpuesta · 422 primera hora 0 · 403 operador |
| PUT /tarifas/:id | 200 sin uso | 404 · 422 tope menor · 403 operador |
| PATCH /tarifas/:id/estado | 200 inactivar con confirmación | 409 única vigente · 404 |
