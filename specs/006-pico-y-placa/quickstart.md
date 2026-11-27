# Guía rápida — 006-pico-y-placa

Contrato: [contracts/openapi.yaml](contracts/openapi.yaml) · Modelo: [data-model.md](data-model.md).

## Preparación y pruebas

Igual que en las specs anteriores (`npm run db:reset`, `npm run dev`). Sin variables nuevas ni cambios de esquema.

```bash
npm test            # incluye tests/integration/restricciones.test.js y tests/unit/restricciones.reglas.test.js
npm run lint
npm run test:api    # carpeta Postman «006 Pico y placa»
```

## Escenarios manuales (curl, token de Administrador salvo indicación)

| HU | Petición | Resultado esperado |
|---|---|---|
| HU-29 E1 | `POST /restricciones-placa` `{"diaSemana":6,"tipoVehiculo":"carro","digitos":[6,9],"horaInicio":"05:00","horaFin":"20:00"}` | 201 activa |
| HU-29 E2 | la misma otra vez | 409 `RESTRICCION_SUPERPUESTA` con el id de la existente |
| HU-29 E3 | `"digitos":[12]` o `"horaFin":"04:00"` | 422 en el campo |
| HU-29 E5 | Operador: `POST /restricciones-placa` | 403 |
| HU-30 E1 | Operador o Cliente: `GET /restricciones-placa/hoy` | dígitos por tipo y franja (lunes a viernes en la semilla) |
| HU-30 E2 | un sábado o domingo (o tras eliminar las de hoy) | `mensaje: "Sin restricción hoy"` |

## Interfaz (prueba manual)

1. Administrador: Configuración › Pico y placa. La tabla semanal muestra lunes a domingo para carros y motos; crear la del sábado, editarla y eliminarla.
2. Intentar crear otra para un día ya configurado: aparece el aviso con «Editar la existente».
3. Operador (Celdas) y Cliente (Disponibilidad, Mis vehículos): el aviso «Pico y placa hoy» muestra los dígitos y la franja, o «Sin restricción hoy».
4. Repetir en 375 px y solo con teclado.

## Colección Postman (carpeta «006 Pico y placa»)

| Petición | Éxito | Error |
|---|---|---|
| GET /restricciones-placa | 200 tabla semanal | 401 sin token · 422 `dia=9` |
| POST /restricciones-placa | 201 | 409 superpuesta · 422 dígito 12 / hora fin · 403 operador |
| GET /restricciones-placa/hoy | 200 operador y cliente | 401 sin token |
| PUT /restricciones-placa/:id | 200 | 404 · 422 · 403 operador |
| DELETE /restricciones-placa/:id | 200 inactiva | 404 · 403 operador |
