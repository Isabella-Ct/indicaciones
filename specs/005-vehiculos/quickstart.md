# Guía rápida — 005-vehiculos

Contrato: [contracts/openapi.yaml](contracts/openapi.yaml) · Modelo: [data-model.md](data-model.md).

## Preparación y pruebas

`npm run db:reset` recrea la BD con el esquema 2.1.0 (incluye `historial_propietario`). Para una BD existente sin borrar datos: aplicar `backend/database/migrations/001_historial_propietario.sql`. Sin variables nuevas.

```bash
npm test            # incluye tests/integration/vehiculos.test.js y tests/unit/vehiculos.reglas.test.js
npm run lint
npm run test:api    # carpeta Postman «005 Vehículos»
```

## Escenarios manuales (curl)

| HU | Petición | Resultado esperado |
|---|---|---|
| HU-25 E1 | Operador: `POST /vehiculos` `{"placa":"xyz 987","tipo":"carro","color":"Rojo","marca":"Chevrolet","modelo":2018}` | 201, placa `XYZ987` |
| HU-25 E2 | otra vez con `"placa":"XYZ-987"` | 409 `PLACA_DUPLICADA` |
| HU-25 E3 | `"placa":"AB1234","tipo":"carro"` | 422 «Formato de placa inválido para carro (AAA123)» |
| HU-25 E4 | `GET /vehiculos?propietario=ninguno` | incluye MNP908 y el nuevo |
| HU-26 E1 | Operador: `PATCH /vehiculos/:id/propietario` `{"tipoDocumento":"CC","numeroDocumento":"1000000004"}` | 200, propietario Andrea |
| HU-26 E4 | Operador: el mismo con el documento de Carlos | 403 `SOLO_ADMIN_REASIGNA` |
| HU-27 E2 | Administrador: lo mismo | 200; el historial muestra el periodo de Andrea cerrado |
| HU-28 E1 | Operador: `GET /vehiculos?q=abc1` | ABC123 con propietario y `dentro` |
| HU-28 E3 | Cliente Andrea: `GET /usuarios/me/vehiculos` | solo ABC123 y QWE45A; `GET /vehiculos` → 403 |

## Interfaz (prueba manual)

1. Operador: Vehículos › Nuevo vehículo con la placa en minúsculas y con espacios; se ve «Vehículo registrado» y la placa normalizada.
2. Vehículos › Detalle: asociar propietario por documento; intentar reasignarlo (botón oculto para el Operador; la API responde 403).
3. Administrador: editar el color, reasignar a otro cliente y ver el historial de propietarios.
4. Usuarios › Detalle: sección «Vehículos» y «Agregar vehículo» por placa (si la placa no existe, ofrece registrarla).
5. Cliente: Mis vehículos muestra solo los suyos.
6. Repetir en 375 px y solo con teclado.

## Colección Postman (carpeta «005 Vehículos»)

| Petición | Éxito | Error |
|---|---|---|
| POST /vehiculos | 201 placa normalizada | 409 duplicada · 422 formato · 403 cliente |
| GET /vehiculos | 200 `q`, `propietario=ninguno` | 403 cliente · 422 `dentro=quizas` |
| GET /vehiculos/:id | 200 con historial | 404 |
| PATCH /vehiculos/:id/propietario | 200 asociar · 200 reasignar (admin) | 404 vehículo · 404 usuario · 409 inactivo · 403 operador reasigna |
| PUT /vehiculos/:id | 200 color | 409 placa duplicada · 403 operador |
| GET /usuarios/me/vehiculos | 200 cliente | 401 sin token |
