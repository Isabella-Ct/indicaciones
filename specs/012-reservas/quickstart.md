# Guía rápida — 012-reservas

Contrato: [contracts/openapi.yaml](contracts/openapi.yaml) · Modelo: [data-model.md](data-model.md).

## Preparación y pruebas

Igual que en las specs anteriores (`npm run db:reset`, `npm run dev`). Variables nuevas (opcionales): `RESERVA_ANTICIPACION_DIAS` (7) y `RESERVA_MINUTOS_ESPERA` (30). El control de reservas corre al iniciar el servidor y cada minuto.

```bash
npm test            # incluye tests/integration/reservas.test.js y tests/unit/reservas.reglas.test.js
npm run lint
npm run test:api    # carpeta Postman «012 Reservas»
```

## Escenarios manuales (curl)

| HU | Petición | Resultado esperado |
|---|---|---|
| HU-52 E1 | Cliente (Andrea): `POST /reservas` `{"idVehiculo":1,"fechaHoraInicio":"<mañana>T08:00"}` | 201 confirmada `R-000001` y correo |
| HU-52 E2 | otro cliente, misma celda y hora | 409 «La celda no está disponible en ese horario» con `sugerida` |
| HU-52 E3 | `"fechaHoraInicio":"<en 8 días>T08:00"` | 422 |
| HU-53 E1 | `PATCH /reservas/1/cancelacion` | 200 cancelada y correo |
| HU-54 E1 | Operador: `GET /reservas?fecha=<mañana>&estado=confirmada` | las pendientes ordenadas por hora |
| HU-55 E1 | entrada de la placa dentro de la franja | `reserva.codigo` en la respuesta; reserva cumplida |

## Interfaz (prueba manual)

1. Cliente: Mis reservas › Reservar (vehículo, fecha y hora, celda o «Asignar automáticamente»); cancelar.
2. Operador: Reservas (fecha y estado); entrada de un vehículo con reserva (aviso con el código).
3. Repetir en 375 px y solo con teclado.

## Colección Postman (carpeta «012 Reservas»)

| Petición | Éxito | Error |
|---|---|---|
| GET /celdas/disponibles | 200 | 422 sin tipo |
| POST /reservas | 201 | 422 a más de 7 días · 422 pasada · 409 celda cruzada · 409 vehículo cruzado · 403 vehículo ajeno |
| GET /reservas | 200 operador | 403 cliente |
| GET /usuarios/me/reservas | 200 cliente | 401 |
| PATCH /reservas/:id/cancelacion | 200 | 403 ajena · 409 ya cancelada · 404 |
