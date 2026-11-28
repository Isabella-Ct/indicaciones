# Guía rápida — 013-incidencias

Contrato: [contracts/openapi.yaml](contracts/openapi.yaml) · Modelo: [data-model.md](data-model.md).

## Preparación y pruebas

Igual que en las specs anteriores (`npm run db:reset`, `npm run dev`). Sin variables nuevas ni cambios de esquema; la evidencia se guarda en `backend/uploads/incidencias/`.

```bash
npm test            # incluye tests/integration/incidencias.test.js y tests/unit/incidencias.reglas.test.js
npm run lint
npm run test:api    # carpeta Postman «013 Incidencias»
```

## Escenarios manuales (curl)

| HU | Petición | Resultado esperado |
|---|---|---|
| HU-56 E1 | Operador: `POST /incidencias` `{"tipo":"rayon","placa":"ABC123","fechaHoraEvento":"<hoy>T09:40","descripcion":"Rayón en la puerta del conductor"}` | 201 abierta `INC-000001` y alerta |
| HU-56 E3 | fecha de mañana | 422 en `fechaHoraEvento` |
| HU-56 E4 | `curl -F tipo=choque -F placa=ABC123 -F fechaHoraEvento=… -F descripcion=… -F evidencia=@foto.jpg` | 201 con `tieneEvidencia: true` |
| HU-57 E1 | `GET /incidencias?q=ABC123` | sus incidencias con código, tipo, fecha, estado y operador |
| HU-58 E1 | Administrador: `POST /incidencias/1/seguimientos` `{"nota":"Se llamó al cliente"}` | 201, en seguimiento |
| HU-58 E2 | `PATCH /incidencias/1/cierre` `{"solucion":"Se pagó la reparación de la puerta"}` | 200 cerrada; otra nota → 409 |

## Interfaz (prueba manual)

1. Operador: Incidencias › Nueva incidencia (tipo, placa, fecha y hora, descripción y foto); filtros del listado.
2. Administrador: Detalle con la evidencia, notas de seguimiento y cierre.
3. Repetir en 375 px y solo con teclado.

## Colección Postman (carpeta «013 Incidencias»)

| Petición | Éxito | Error |
|---|---|---|
| POST /incidencias | 201 JSON · 201 con evidencia | 422 sin tipo · 422 fecha futura · 422 placa nueva sin tipo · 403 cliente |
| GET /incidencias | 200 por placa | 403 cliente |
| GET /incidencias/:id | 200 | 404 |
| GET /incidencias/:id/evidencia | 200 imagen | 404 sin evidencia |
| POST /incidencias/:id/seguimientos | 201 | 403 operador · 409 cerrada |
| PATCH /incidencias/:id/cierre | 200 | 422 sin solución · 409 ya cerrada |
