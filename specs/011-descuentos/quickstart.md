# Guía rápida — 011-descuentos

Contrato: [contracts/openapi.yaml](contracts/openapi.yaml) · Modelo: [data-model.md](data-model.md).

## Preparación y pruebas

Igual que en las specs anteriores (`npm run db:reset`, `npm run dev`). Sin variables nuevas ni cambios de esquema.

```bash
npm test            # incluye tests/integration/descuentos.test.js y tests/unit/descuentos.reglas.test.js
npm run lint
npm run test:api    # carpeta Postman «011 Descuentos»
```

## Escenarios manuales (curl)

| HU | Petición | Resultado esperado |
|---|---|---|
| HU-49 E1 | Administrador: `POST /descuentos` `{"nombre":"Motos diciembre","tipo":"porcentaje","valor":20,"aplicaTipoVehiculo":"moto","vigenteDesde":"2026-12-01","vigenteHasta":"2026-12-31"}` | 201 activo, de 00:00 del 1 a 23:59:59 del 31 |
| HU-49 E2 | `"valor":120` | 422 «El porcentaje debe estar entre 1 y 100.» |
| HU-49 E3 | Operador: el mismo POST | 403 |
| HU-50 E1 | Moto con valor bruto de $ 9.000 que sale en la vigencia del 20 % | `GET /movimientos/:id/liquidacion`: `valorDescuento` 1800, `total` 7200 y `descuento.nombre` |
| HU-51 E1 | `PATCH /descuentos/:id/estado` `{"estado":"inactivo"}` | 200; las salidas siguientes no lo aplican |
| HU-51 E2 | activar uno vencido | 422 en `vigenteHasta` |

## Interfaz (prueba manual)

1. Administrador: Configuración › Descuentos. Crear, editar, inactivar (con confirmación) y activar.
2. Operador: Movimientos › salida de un vehículo con descuento: la fila «Descuento» con el nombre y el valor en el cobro y en el comprobante.
3. Repetir en 375 px y solo con teclado.

## Colección Postman (carpeta «011 Descuentos»)

| Petición | Éxito | Error |
|---|---|---|
| GET /descuentos | 200 operador | 403 cliente |
| POST /descuentos | 201 porcentaje · 201 valor fijo | 422 porcentaje 120 · 422 fijo 0 · 422 fin antes del inicio · 409 duplicado · 403 operador |
| PUT /descuentos/:id | 200 | 404 |
| PATCH /descuentos/:id/estado | 200 inactivar | 422 activar vencido · 404 |
| GET /movimientos/:id/liquidacion | 200 con `descuento` | — (la aplicación con el reloj se prueba en Jest) |
