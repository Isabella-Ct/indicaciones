# Plan de implementación: Facturación y pagos

**Rama**: `009-facturacion-pagos` | **Fecha**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de `specs/009-facturacion-pagos/spec.md`

## Resumen

Del movimiento cerrado al recaudo cuadrado (HU-39 a HU-44; RF-FAC-01 a RF-FAC-19; RN-19 a RN-22). Abarca los 12 endpoints de B.1 §4.9:
- **Liquidación (RN-20):** con la tarifa vigente a la hora de entrada, la membresía y la alerta «sin tarifa». Se guarda una vez por movimiento; los abiertos dan una vista previa. La salida de la spec 007 ya la devuelve.
- **Pago:** efectivo con cambio y otros métodos con referencia. Crea en la misma transacción la factura con su número consecutivo.
- **Comprobante:** datos de un tercero, PDF de 80 mm con pdfkit, envío al correo del cliente y la marca «pendiente de envío electrónico» (TBD-02).
- **Anulación:** solo el Administrador.
- **Consultas:** listado con total filtrado y «Mis facturas».
- **Caja:** cuadre del turno abierto y cierre con diferencia.

En el frontend: cobro en la caseta, Facturación, Comprobante, Caja y Mis facturas. Sin cambios de esquema. Decisiones en [research.md](research.md).

## Contexto técnico

**Lenguaje/Versión**: JavaScript (ES2022) en CommonJS sobre Node.js 20 LTS

**Dependencias principales**: las existentes (`pdfkit` para el PDF, `nodemailer` para el correo); sin dependencias nuevas.

**Almacenamiento**: MySQL 8: `liquidacion`, `factura`, `pago`, `cierre_caja`, `alerta` (inserción), `consecutivo`, lectura de `movimiento`, `vehiculo`, `tarifa`, `membresia`, más `bitacora`.

**Pruebas**: Jest + Supertest (`tests/integration/{liquidaciones,pagos,facturas,caja}.test.js`, `tests/unit/liquidaciones.reglas.test.js`) con el reloj fijado; Postman/Newman (`casos/009-facturacion-pagos.js`).

**Plataforma objetivo / Tipo de proyecto**: los mismos.

**Metas de rendimiento**: RNF-REN-01: salida con liquidación ≤ 2 s p95.

**Restricciones**: RN-22 (consecutivo sin huecos), RNF-SAF-02 (nada se borra), RNF-PRI-02 (el Cliente solo lo suyo; correos enmascarados), hora de Bogotá.

**Escala/Alcance**: cientos de facturas por día; 50 000 movimientos (RNF-REN-01).

## Verificación de la constitución (Constitution Check)

*COMPUERTA: pasa antes de la fase 0 y se vuelve a verificar después del diseño.*

| Principio | Cumplimiento en 009 | Estado |
|---|---|---|
| I. La especificación manda | 8 aclaraciones con su fuente; la relación pago → factura sigue el modelo 6.1 | ✅ |
| II. Monolito por capas y REST | 3 módulos con capas; rutas de B.1; sobre `{ok}`; PDF como `application/pdf` | ✅ |
| III. Seguridad y privacidad | permisos por endpoint; el PDF solo para el personal o el dueño; correos enmascarados | ✅ |
| IV. Integridad de datos | transacciones con `FOR UPDATE`; `UNIQUE` de liquidación, factura y pago; consecutivo sin huecos; bitácora | ✅ |
| V. Frontend vanilla y accesible (Atomic Design) | 1 átomo (variante), 1 molécula y 1 organismo nuevos; cambio en vivo con `aria-live`; impresión de 80 mm | ✅ |
| VI. Pruebas | escenario → Jest + Postman (éxito y error por endpoint); pruebas unitarias del cálculo | ✅ |
| VII. Simplicidad | sin tablas ni dependencias nuevas | ✅ |

**Re-evaluación después de la fase 1**: sin violaciones. **COMPUERTA: PASA.**

## Estructura del proyecto

```text
backend/
├── src/integrations/correo.js                       # + adjuntos
├── src/modules/
│   ├── liquidaciones/ liquidaciones.{controller,service,repository,reglas}.js  (ruta en movimientos.routes.js)
│   ├── facturas/      facturas.{routes,controller,service,repository,validator}.js + factura.pdf.js  (pagos y facturas)
│   ├── caja/          caja.{routes,controller,service,repository,validator}.js
│   └── movimientos/movimientos.service.js           # la salida devuelve la liquidación
├── docs/postman/casos/009-facturacion-pagos.js
└── tests/{unit/liquidaciones.reglas.test.js, integration/{liquidaciones,pagos,facturas,caja}.test.js}

frontend/
├── facturas.html · factura.html · caja.html · mis-facturas.html · movimientos.html (cobro)
└── js/
    ├── services/{facturas, caja}.service.js
    ├── views/{facturas, factura, caja, mis-facturas, movimientos}.view.js
    └── components/
        ├── atomos/chip-estado.js                     # + ponerChipFactura
        ├── moleculas/cobro.js
        └── organismos/comprobante.js
herramientas/paginas-009.js
```

**Decisión de estructura**: la misma; tres módulos nuevos.

## Fases

| Fase | Contenido |
|---|---|
| 1 · Preparación | adjuntos en `integrations/correo.js`; nota en `CAMBIOS.md` |
| 2 · Fundacional | `liquidaciones.reglas.js` (`calcular`, explicación) + pruebas unitarias (gracia, fracción exacta e iniciada, tope, varios días, membresía) |
| 3 · US1 (P1) HU-39 | GET /movimientos/:id/liquidacion; la salida la incluye; alerta sin tarifa |
| 4 · US2 (P1) HU-40 | POST /pagos (factura numerada en la misma transacción) |
| 5 · US3 (P1) HU-41 | POST /facturas, GET /facturas/:id, GET /facturas/:id/pdf |
| 6 · US4 (P2) HU-42 | PATCH /facturas/:id/anulacion |
| 7 · US5 (P2) HU-43 | GET /facturas, GET /usuarios/me/facturas |
| 8 · US6 (P2) HU-44 | GET /caja/turno-actual, POST /caja/cierres, GET /caja/cierres |
| 9 · Interfaz | componentes, cobro en la caseta, páginas facturas, factura, caja y mis-facturas, menú |
| 10 · Pulido | Postman 009, README, rendimiento, revisión de que todo esté en español |

## Matriz de trazabilidad

| HU | RF | RN | Endpoint | Servicio | Pruebas |
|---|---|---|---|---|---|
| HU-39 | RF-FAC-01..04 | RN-19, RN-20, RN-21 | GET /movimientos/:id/liquidacion | `liquidacionesService.liquidar` | `HU-39 E1–E6` |
| HU-40 | RF-FAC-05..08 | — | POST /pagos | `facturasService.pagar` | `HU-40 E1–E5` |
| HU-41 | RF-FAC-09..12 | RN-22 | POST /facturas · GET /facturas/:id · GET /facturas/:id/pdf | `emitir`, `obtener`, `pdf` | `HU-41 E1–E4` |
| HU-42 | RF-FAC-13, 14 | RN-02, RN-22 | PATCH /facturas/:id/anulacion | `anular` | `HU-42 E1–E3` |
| HU-43 | RF-FAC-15, 16 | — | GET /facturas · GET /usuarios/me/facturas | `listar`, `misFacturas` | `HU-43 E1–E3` |
| HU-44 | RF-FAC-17..19 | — | GET /caja/turno-actual · POST/GET /caja/cierres | `cajaService.turnoActual/cerrar/listar` | `HU-44 E1–E4` |

## Cumplimiento de RNF

| RNF | Cómo | Dónde |
|---|---|---|
| RNF-REN-01 | la liquidación son 3 consultas indexadas; medición de la salida | `liquidaciones.service` |
| RNF-SAF-02 | sin DELETE; anulación con motivo, usuario y fecha | `facturas.service` |
| RNF-SEG-04 | `authorize('facturas.*' / 'caja.*')`; PDF con verificación del dueño | rutas, `facturas.service` |
| RNF-SEG-07 | bitácora de liquidar, pagar, enviar, anular y cerrar caja | services |
| RNF-PRI-02 | el Cliente solo sus facturas; correos enmascarados | `facturas.service` |
| RNF-CAL-03 | Postman 009 | `casos/009-facturacion-pagos.js` |

## Permisos del módulo

| Código | Operaciones | Roles en el seed |
|---|---|---|
| `movimientos.ver` | GET /movimientos/:id/liquidacion | Administrador, Operador |
| `facturas.ver` | GET /facturas, /:id, /:id/pdf | Administrador, Operador |
| `facturas.crear` | POST /pagos, POST /facturas | Administrador, Operador |
| `facturas.anular` | PATCH /facturas/:id/anulacion | Administrador |
| `perfil.ver` | GET /usuarios/me/facturas; PDF de sus facturas | todos |
| `caja.ver` | GET /caja/turno-actual, GET /caja/cierres | Administrador, Operador |
| `caja.crear` | POST /caja/cierres | Administrador, Operador |

## Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Error en el cálculo (dinero) | función pura con pruebas de cada caso de RN-20 |
| Doble pago o hueco en la numeración | `UNIQUE` + `FOR UPDATE` + consecutivo dentro de la transacción |
| Salida bloqueada por falta de tarifa | la salida se registra igual; la liquidación queda pendiente con alerta |
| Factura de otro cliente | verificación del dueño en el servicio; prueba HU-43 E3 |
| PDF dependiente de fuentes del sistema | se usan las fuentes estándar de pdfkit (Helvetica) |

## Seguimiento de complejidad (Complexity Tracking)

Sin violaciones ni dependencias nuevas (`pdfkit` ya estaba justificado en la spec 001).
