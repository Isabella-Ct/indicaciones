# Guía rápida — 009-facturacion-pagos

Contrato: [contracts/openapi.yaml](contracts/openapi.yaml) · Modelo: [data-model.md](data-model.md).

## Preparación y pruebas

Igual que en las specs anteriores (`npm run db:reset`, `npm run dev`). Sin variables nuevas ni cambios de esquema (el correo de la factura usa la configuración de la spec 003).

```bash
npm test            # incluye tests/integration/{liquidaciones,pagos,facturas,caja}.test.js y tests/unit/liquidaciones.reglas.test.js
npm run lint
npm run test:api    # carpeta Postman «009 Facturación y pagos»
```

## Escenarios manuales (curl, token de Operador salvo indicación)

| HU | Petición | Resultado esperado |
|---|---|---|
| HU-39 E1 | entrada y salida de un carro ocasional a los 135 min; `GET /movimientos/:id/liquidacion` | total 9000 y la explicación del cálculo |
| HU-39 E6 | `GET /movimientos/:id/liquidacion` de un abierto | vista previa, `persistida: false` |
| HU-40 E1 | `POST /pagos` `{"idMovimiento":…,"metodo":"efectivo","valorRecibido":10000}` | 201, cambio 1000, factura `FV-000001` |
| HU-40 E4 | el mismo pago otra vez | 409 `YA_PAGADO` |
| HU-41 E2 | `POST /facturas` `{"idFactura":1}` (vehículo con propietario) | 200, `enviadaA` enmascarado; `GET /facturas/1/pdf` → PDF |
| HU-42 E1 | Administrador: `PATCH /facturas/1/anulacion` `{"motivo":"Cobro duplicado"}` | 200 anulada |
| HU-43 E1 | Administrador: `GET /facturas?desde=2026-11-01&hasta=2026-11-30&metodo=efectivo` | lista con `meta.sumaTotal` |
| HU-44 E1 | `GET /caja/turno-actual` | totales por método y efectivo esperado |
| HU-44 E2 | `POST /caja/cierres` `{"efectivoContado":9000}` | 201 con la diferencia |

## Interfaz (prueba manual)

1. Operador: Movimientos › Registrar salida. Tras la salida aparece la liquidación con el detalle; cobrar en efectivo con cambio y en tarjeta con referencia; abrir el comprobante.
2. Comprobante: imprimir en 80 mm, descargar el PDF y enviarlo por correo; factura a nombre de un tercero.
3. Facturación: filtrar por fechas y método (total filtrado); el Administrador anula una factura.
4. Caja: ver el cuadre y cerrar con el efectivo contado; el Administrador ve los cierres de todos.
5. Cliente: Mis facturas, solo las suyas, con descarga del PDF.
6. Repetir en 375 px y solo con teclado.

## Colección Postman (carpeta «009 Facturación y pagos»)

| Petición | Éxito | Error |
|---|---|---|
| GET /movimientos/:id/liquidacion | 200 cerrado (guardada) · 200 abierto (vista previa) | 404 |
| POST /pagos | 201 efectivo con cambio | 409 ya pagado · 422 faltante · 422 sin referencia · 403 cliente |
| POST /facturas | 200 emisión con tercero | 404 · 409 anulada |
| GET /facturas · /:id · /:id/pdf | 200 | 403 cliente · 404 |
| PATCH /facturas/:id/anulacion | 200 administrador | 403 operador · 409 ya anulada · 422 motivo corto |
| GET /usuarios/me/facturas | 200 cliente | 401 |
| GET /caja/turno-actual · POST/GET /caja/cierres | 200 · 201 · 200 | 409 turno sin pagos · 403 cliente |
