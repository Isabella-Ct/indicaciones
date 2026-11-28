# Guía rápida — 010-membresias

Contrato: [contracts/openapi.yaml](contracts/openapi.yaml) · Modelo: [data-model.md](data-model.md).

## Preparación y pruebas

Igual que en las specs anteriores (`npm run db:reset`, `npm run dev`). Sin variables nuevas ni cambios de esquema. El vencimiento diario corre al iniciar el servidor y cada día a las 00:05 (Bogotá).

```bash
npm test            # incluye tests/integration/{planes,membresias}.test.js y tests/unit/membresias.reglas.test.js
npm run lint
npm run test:api    # carpeta Postman «010 Membresías»
```

## Escenarios manuales (curl)

| HU | Petición | Resultado esperado |
|---|---|---|
| HU-45 E1 | Administrador: `POST /planes-membresia` `{"nombre":"Mensual carro VIP","tipoVehiculo":"carro","valorMensual":250000,"diasVigencia":30}` | 201 activo |
| HU-45 E2 | el mismo nombre | 409 `PLAN_DUPLICADO` |
| HU-46 E1 | Operador: `POST /membresias` `{"idVehiculo":1,"idPlan":1,"pago":{"metodo":"efectivo","valorRecibido":200000}}` | 201: activa por 30 días, factura `FV-` y cambio $ 20.000 |
| HU-46 E2 | otra vez | 409 `MEMBRESIA_ACTIVA` con la fecha de fin |
| HU-46 E3 | `{"idVehiculo":2,"idPlan":1,…}` (moto en plan de carros) | 422 |
| HU-47 E1 | `POST /membresias/1/renovacion` `{"pago":{"metodo":"qr","referencia":"QR-1234"}}` | 201, periodo desde el día siguiente al fin |
| HU-47 E2 | `PATCH /membresias/1/cancelacion` `{"motivo":"El cliente vendió el carro"}` | 200 cancelada |
| HU-48 E1 | Cliente (Andrea): `GET /usuarios/me/membresias` | sus membresías con días restantes y facturas |

## Interfaz (prueba manual)

1. Administrador: Configuración › Planes de membresía. Crear, editar e inactivar un plan.
2. Operador: Membresías. Nueva suscripción (buscar la placa, elegir el plan del tipo y pagar), renovar y cancelar.
3. Cliente: Mi membresía, con días restantes, aviso de renovación (a 5 días o menos) y facturas; sin membresía, los planes con «Suscribirme».
4. Repetir en 375 px y solo con teclado.

## Colección Postman (carpeta «010 Membresías»)

| Petición | Éxito | Error |
|---|---|---|
| GET /planes-membresia | 200 cliente | 401 |
| POST /planes-membresia | 201 | 409 duplicado · 422 valor 0 · 403 operador |
| PUT /planes-membresia/:id | 200 | 404 |
| PATCH /planes-membresia/:id/estado | 200 inactivar y activar | 404 |
| POST /membresias | 201 con pago | 409 activa · 422 tipo · 422 sin referencia · 422 sin propietario |
| GET /membresias | 200 operador | 403 cliente |
| POST /membresias/:id/renovacion | 201 | 404 · 422 pago |
| PATCH /membresias/:id/cancelacion | 200 | 409 ya cancelada · 422 motivo corto |
| GET /usuarios/me/membresias | 200 cliente | 401 |
