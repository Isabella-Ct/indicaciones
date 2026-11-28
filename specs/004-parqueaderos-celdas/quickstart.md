# Guía rápida — 004-parqueaderos-celdas

Contrato: [contracts/openapi.yaml](contracts/openapi.yaml) · Modelo: [data-model.md](data-model.md).

## Preparación y pruebas

Igual que en las specs anteriores (`npm run db:reset`, `npm run dev`). Sin variables nuevas.

```bash
npm test            # incluye tests/integration/parqueaderos.test.js y celdas.test.js (HU-17..HU-24)
npm run lint
npm run test:api    # carpeta Postman «004 Parqueaderos y celdas»
```

## Escenarios manuales (curl)

| HU | Petición (con token de Administrador salvo indicación) | Resultado esperado |
|---|---|---|
| HU-17 E1 | `POST /parqueaderos` `{"nombre":"Sede Norte","direccion":"Calle 50 # 40-20","pisos":3}` | 201 activo |
| HU-17 E2 | el mismo nombre en minúsculas | 409 `PARQUEADERO_DUPLICADO` |
| HU-18 E3 | `DELETE /parqueaderos/1` con un vehículo dentro (spec 007) | 409 `PARQUEADERO_CON_VEHICULOS` |
| HU-18 E4 | `PUT /parqueaderos/1` con `"pisos":1` | 409 `PISOS_CON_CELDAS` |
| HU-19 E3 | `GET /parqueaderos/1/puertas?uso=entrada` | sin «Calle 48» (salida) |
| HU-20 E4 | `POST /celdas/lote` `{"idParqueadero":1,"prefijo":"M-","desde":1,"hasta":20,"tipoVehiculo":"moto","piso":1}` | creadas M-13..M-20, omitidas M-01..M-12 |
| HU-21 E4 | `PATCH /celdas/1/estado` `{"estado":"ocupada"}` | 409 `CAMBIO_ESTADO_NO_PERMITIDO` |
| HU-22 E3 | `GET /celdas?estado=ocupada` como Cliente | `ocupante: null` |
| HU-24 E1 | `GET /disponibilidad` sin token | 200 por parqueadero y tipo, sin placas |

## Interfaz (prueba manual)

1. Administrador: Configuración › Parqueaderos. Crear, editar, inactivar y reactivar (las celdas cambian de estado), y gestionar las puertas en el detalle.
2. Celdas: elegir parqueadero y piso, filtrar por tipo y estado, crear una celda y un rango, inhabilitar y habilitar. Al abrir una celda ocupada, el Operador ve la placa.
3. Abrir el mapa en dos pestañas y cambiar el estado de una celda: la otra pestaña lo refleja en ≤ 10 s.
4. Cliente: Disponibilidad muestra las celdas libres por piso y área, sin placas.
5. Página de inicio sin sesión: tarjetas de disponibilidad con «Lleno» si corresponde y la hora de actualización.
6. Repetir en 375 px (el mapa hace scroll dentro de su contenedor) y solo con teclado.

## Colección Postman (carpeta «004 Parqueaderos y celdas»)

| Petición | Éxito | Error |
|---|---|---|
| POST /parqueaderos | 201 | 409 duplicado · 422 pisos 0 |
| GET /parqueaderos | 200 | 403 cliente |
| GET /parqueaderos/:id | 200 | 404 |
| PUT /parqueaderos/:id | 200 horario | 409 reducir pisos |
| DELETE /parqueaderos/:id | 200 inactivar (el creado) | 404 |
| GET /parqueaderos/:id/puertas | 200 `uso=entrada` | 404 |
| POST /parqueaderos/:id/puertas | 201 | 409 duplicada |
| PUT /puertas/:id | 200 | 422 tipo inválido |
| POST /celdas | 201 | 409 duplicada · 422 piso fuera de rango |
| POST /celdas/lote | 201 | 422 rango inválido |
| GET /celdas | 200 | 401 sin token |
| GET /celdas/:id | 200 | 404 |
| PUT /celdas/:id | 200 | 409 duplicada |
| PATCH /celdas/:id/estado | 200 inhabilitar y habilitar | 409 manual a ocupada · 422 sin motivo |
| DELETE /celdas/:id | 200 | 404 |
| GET /disponibilidad | 200 sin token | — (público; error: 404 en ruta inexistente) |
