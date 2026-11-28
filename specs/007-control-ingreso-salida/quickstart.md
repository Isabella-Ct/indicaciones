# Guía rápida — 007-control-ingreso-salida

Contrato: [contracts/openapi.yaml](contracts/openapi.yaml) · Modelo: [data-model.md](data-model.md).

## Preparación y pruebas

`npm run db:reset` crea el esquema 2.2.0. Para una BD existente: aplicar `backend/database/migrations/002_ingresos_rechazados_y_ticket_extraviado.sql`. Sin variables nuevas (el correo del ticket usa la configuración de la spec 003).

```bash
npm test            # incluye tests/integration/movimientos.test.js, tickets.test.js y tests/unit/movimientos.reglas.test.js
npm run lint
npm run test:api    # carpeta Postman «007 Control de ingreso y salida»
```

> El pico y placa de la semilla restringe de lunes a viernes de 05:00 a 20:00. Para probar a mano una entrada libre, use una placa cuyo dígito no esté en el aviso «Pico y placa hoy».

## Escenarios manuales (curl, token de Operador)

| HU | Petición | Resultado esperado |
|---|---|---|
| HU-31 E1 | `POST /movimientos` `{"placa":"fgh678","idPuerta":1}` | 201, celda de menor código, ticket `T-000001` |
| HU-31 E2 | una placa cuyo dígito está restringido hoy, dentro de la franja | 409 `PICO_Y_PLACA`; fila nueva en `ingreso_rechazado` |
| HU-31 E3 | la misma placa de E1 otra vez | 409 `VEHICULO_DENTRO` «… (celda A-01)» |
| HU-31 E4 | `{"placa":"ZZZ12A","tipo":"moto","idPuerta":1}` | 201; el vehículo queda ocasional |
| HU-32 E3 | `GET /tickets/T-000001` | 200 con el movimiento |
| HU-33 E1 | `POST /movimientos/1/salida` `{"idPuerta":3}` | 200 cerrado con `minutosEstadia` |
| HU-33 E3 | otra vez | 404 `MOVIMIENTO_NO_ABIERTO` |
| HU-34 E1 | `GET /movimientos?estado=abierto` | del más antiguo al más reciente |
| HU-35 E1 | `PATCH /movimientos/2/anulacion` `{"motivo":"Placa mal digitada"}` | 200 anulado; celda disponible |

## Interfaz (prueba manual)

1. Operador: Movimientos. Registrar entrada: escribir la placa (si ya existe se muestra el vehículo; si no, elegir Carro o Moto), elegir la puerta y, si quiere, la celda; ver el ticket y abrir «Imprimir» (vista de 80 mm).
2. Intentar la entrada de una placa restringida hoy: aparece el motivo y no cambia el mapa.
3. Registrar salida por ticket y por placa (con «El conductor no tiene el ticket»); ver el tiempo de estadía.
4. Vehículos dentro: buscar una placa, ver el resaltado de más de 24 h (cambiando la fecha de entrada en la BD) y anular una entrada reciente.
5. Repetir en 375 px y solo con teclado.

## Colección Postman (carpeta «007 Control de ingreso y salida»)

| Petición | Éxito | Error |
|---|---|---|
| POST /movimientos | 201 placa registrada · 201 placa nueva ocasional | 409 dentro · 409 pico y placa · 422 sin tipo · 409 puerta de salida · 403 cliente |
| GET /tickets/:codigo | 200 | 404 |
| POST /tickets/:codigo/envio | 200 con propietario | 409 sin correo (ocasional) |
| GET /movimientos | 200 abiertos · 200 por placa | 401 · 422 estado inválido |
| POST /movimientos/:id/salida | 200 cerrado · 200 extraviado | 404 no abierto · 409 puerta de entrada |
| PATCH /movimientos/:id/anulacion | 200 | 422 motivo corto · 409 cerrado · 403 cliente |
