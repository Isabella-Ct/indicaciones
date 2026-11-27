# Tareas: Facturación y pagos

**Entrada**: documentos de diseño en `specs/009-facturacion-pagos/` (spec, plan, research, data-model, contracts, quickstart, frontend-integration)

**Pruebas**: obligatorias (constitución §VI): cada escenario de HU-39..HU-44 tiene su prueba Jest y su caso Postman.

**Organización**: por historia de usuario; `[P]` = se puede hacer en paralelo (archivos distintos).

## Fase 1: Preparación

- [X] T001 `backend/src/integrations/correo.js`: `adjuntos` en `enviarCorreo` (nodemailer `attachments`; el transporte en memoria guarda sus nombres); nota en `CAMBIOS.md` (sin cambios de esquema)

## Fase 2: Fundacional

- [X] T002 [P] `backend/src/modules/liquidaciones/liquidaciones.reglas.js` (`calcular`, `valorTramo`, `explicacion`; research R-02) + `backend/tests/unit/liquidaciones.reglas.test.js` (gracia, 60 min, fracción exacta e iniciada, tope, varios días, sin tope, membresía)

## Fase 3: US1 — Liquidar (P1) — HU-39

- [X] T003 [US1] `backend/tests/integration/liquidaciones.test.js` HU-39 E1–E6 (membresía insertada por SQL; tarifa de moto inactivada y restaurada dentro de la prueba)
- [X] T004 [US1] `backend/src/modules/liquidaciones/` repository (liquidación por movimiento, insertar, membresía vigente, alerta sin tarifa), service `liquidar` (R-03; data-model.md Liquidacion.minutos_cobrados, Liquidacion.valor_bruto, Liquidacion.cubierto_por_membresia, Liquidacion.valor_total), controller y `GET /movimientos/:id/liquidacion` en `movimientos.routes.js`; la salida de `movimientos.service` devuelve la liquidación

## Fase 4: US2 — Pago (P1) — HU-40

- [X] T005 [US2] `backend/tests/integration/pagos.test.js` HU-40 E1–E5
- [X] T006 [US2] `backend/src/modules/facturas/` validator (data-model.md Pago.metodo, Pago.valor_recibido, Pago.referencia, Factura.tercero_documento, Factura.tercero_nombre), repository y service `pagar` (R-04 con `FOR UPDATE` y consecutivo); `POST /pagos` (router `pagosRouter`); registro en `rutasProtegidas()`

## Fase 5: US3 — Comprobante (P1) — HU-41

- [X] T007 [US3] `backend/tests/integration/facturas.test.js` bloque HU-41 E1–E4 (correo en memoria con el PDF adjunto)
- [X] T008 [US3] `factura.pdf.js` (R-06), service `obtener`, `emitir` (R-05) y `pdf` (dueño o `facturas.ver`); `POST /facturas`, `GET /facturas/:id`, `GET /facturas/:id/pdf`

## Fase 6: US4 — Anular (P2) — HU-42

- [X] T009 [US4] Bloque HU-42 E1–E3 en `facturas.test.js`
- [X] T010 [US4] Service `anular` (R-07; data-model.md Factura.estado, Factura.motivo_anulacion); `PATCH /facturas/:id/anulacion`

## Fase 7: US5 — Consultar (P2) — HU-43

- [X] T011 [US5] Bloque HU-43 E1–E3 en `facturas.test.js`
- [X] T012 [US5] Repository `listar` (R-08) con `sumaTotal`; service `listar`, `misFacturas`; `GET /facturas` y `GET /usuarios/me/facturas` (antes de `/:id` en `usuarios.routes.js`)

## Fase 8: US6 — Caja (P2) — HU-44

- [X] T013 [US6] `backend/tests/integration/caja.test.js` HU-44 E1–E4 (operador propio de la prueba para aislar su turno)
- [X] T014 [US6] `backend/src/modules/caja/` (R-09; data-model.md CierreCaja.total_sistema_por_metodo, CierreCaja.efectivo_contado, CierreCaja.diferencia, Pago.id_cierre): `GET /caja/turno-actual`, `POST /caja/cierres`, `GET /caja/cierres`

## Fase 9: Interfaz (Atomic Design)

- [ ] T015 [P] Átomo `ponerChipFactura`, molécula `moleculas/cobro.js`, organismo `organismos/comprobante.js` (+ CSS por nivel)
- [ ] T016 [P] Servicios `js/services/facturas.service.js` y `caja.service.js`
- [ ] T017 `herramientas/paginas-009.js` + regenerar: menú «Facturación» (`facturas.ver`), «Caja» (`caja.ver`), «Mis facturas» (`perfil.ver`, oculto con `facturas.ver`); panel de cobro en `movimientos.html`
- [ ] T018 [US1] [US2] Cobro en `movimientos.view.js` (liquidación tras la salida, método, cambio en vivo, referencia, tercero, enlace al comprobante)
- [ ] T019 [US3] `factura.html` + `views/factura.view.js` (80 mm, PDF, envío, tercero)
- [ ] T020 [US4] [US5] `facturas.html` + `views/facturas.view.js` (filtros, total filtrado, anular)
- [ ] T021 [P] [US5] `mis-facturas.html` + `views/mis-facturas.view.js`
- [ ] T022 [US6] `caja.html` + `views/caja.view.js` (cuadre, cierre, cierres)

## Fase 10: Pulido

- [ ] T023 Carpeta Postman `casos/009-facturacion-pagos.js`; `npm run test:api` en verde dos veces seguidas
- [ ] T024 [P] `README.md` (endpoints y pantallas)
- [ ] T025 Cobertura de los services ≥ 80 %, lint, `herramientas/verificar-front.js`, revisión de que no queden textos en inglés, medición de la salida con liquidación (RNF-REN-01) y prueba manual en escritorio y a 375 px
- [ ] T026 Verificar que cada escenario HU-39..HU-44 tenga su prueba y su caso Postman, y marcar `[X]`

## Dependencias

- T001–T002 antes de todo. US1 → US2 → US3 → US4 → US5 → US6 (el pago necesita la liquidación; la factura, el pago; la caja, los pagos).
- La interfaz (T015–T022) después de las fases 3–8; T015 y T016 en paralelo.

## Estrategia

MVP = US1 + US2 + US3 (liquidar, cobrar y emitir), que cierra el ciclo de la caseta. US4–US6 completan el control financiero.
