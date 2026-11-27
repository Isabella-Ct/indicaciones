# Tareas: Control de ingreso y salida

**Entrada**: documentos de diseño en `specs/007-control-ingreso-salida/` (spec, plan, research, data-model, contracts, quickstart, frontend-integration)

**Pruebas**: obligatorias (constitución §VI): cada escenario de HU-31..HU-35 tiene su prueba Jest y su caso Postman.

**Organización**: por historia de usuario; `[P]` = se puede hacer en paralelo (archivos distintos).

## Fase 1: Preparación

- [ ] T001 `backend/database/schema.sql` 2.2.0: `ticket.extraviado` (data-model.md Ticket.extraviado) y tabla `ingreso_rechazado` (data-model.md IngresoRechazado.placa, IngresoRechazado.motivo, IngresoRechazado.fecha_hora); `migrations/002_ingresos_rechazados_y_ticket_extraviado.sql`; entrada 2.2.0 en `CAMBIOS.md`; `npm run db:reset`
- [ ] T002 [P] `backend/src/utils/reloj.js` (`ahora()`) y su uso documentado para las pruebas

## Fase 2: Fundacional

- [ ] T003 [P] `backend/src/modules/movimientos/movimientos.reglas.js` (`minutosEstadia`, `masDe24h`, `puedeAnularOperador(entrada, ahora)`, `mensajePicoPlaca(placa, restriccion)`, `enmascararCorreo`) + `backend/tests/unit/movimientos.reglas.test.js`

## Fase 3: US1 — Registrar la entrada (P1) — HU-31

- [ ] T004 [US1] `backend/tests/integration/movimientos.test.js` bloque HU-31 E1–E6 (reloj fijado; parqueadero propio de la prueba)
- [ ] T005 [US1] `backend/src/modules/movimientos/` validator (data-model.md Movimiento.id_puerta_entrada, Movimiento.id_celda; placa y tipo como en la spec 005), repository (insertar movimiento y ticket, abierto por vehículo, obtener con joins, insertar intento rechazado), service `registrarEntrada` (R-03, R-04), controller y `POST /movimientos`; `obtenerPorPlaca` en `vehiculos.repository`; registro en `rutasProtegidas()`

## Fase 4: US2 — Ticket (P1) — HU-32

- [ ] T006 [US2] `backend/tests/integration/tickets.test.js` HU-32 E1–E3 (correo con el transporte en memoria)
- [ ] T007 [US2] `backend/src/modules/tickets/` (R-05): `GET /tickets/:codigo` y `POST /tickets/:codigo/envio`

## Fase 5: US3 — Registrar la salida (P1) — HU-33

- [ ] T008 [US3] Bloque HU-33 E1–E5 en `movimientos.test.js` (entrada a las 08:10 y salida a las 10:25 con el reloj)
- [ ] T009 [US3] Service `registrarSalida` (R-06; data-model.md Movimiento.minutos_estadia, Movimiento.fecha_hora_salida, Movimiento.id_puerta_salida, Ticket.extraviado) y `POST /movimientos/:id/salida`

## Fase 6: US4 — Vehículos dentro (P2) — HU-34

- [ ] T010 [US4] Bloque HU-34 E1–E3 en `movimientos.test.js`
- [ ] T011 [US4] Repository `listar({ estado, placa, q, limit, offset })` y service `listar` con `minutosTranscurridos` y `masDe24h` (R-07); `GET /movimientos`

## Fase 7: US5 — Anular una entrada (P2) — HU-35

- [ ] T012 [US5] Bloque HU-35 E1–E4 en `movimientos.test.js`
- [ ] T013 [US5] Service `anular` (R-08; data-model.md Movimiento.motivo_anulacion, Movimiento.id_usuario_anulacion, Movimiento.fecha_anulacion, Ticket.valido) y `PATCH /movimientos/:id/anulacion`

## Fase 8: Interfaz (Atomic Design)

- [ ] T014 [P] Organismo `organismos/ticket.js` (`ponerTicket`), CSS de la fila de más de 24 h e impresión de 80 mm
- [ ] T015 [P] Servicios `js/services/movimientos.service.js` y `tickets.service.js`; `formatearDuracion` en `utils/formato.js`
- [ ] T016 `herramientas/paginas-007.js` + regenerar: menú «Movimientos» (`movimientos.ver`, primero); `MENU` en `config.js`
- [ ] T017 [US1] [US2] [US3] [US4] [US5] `movimientos.html` + `views/movimientos.view.js` (aviso de pico y placa, entrada con búsqueda del vehículo, ticket, salida por placa o ticket, vehículos dentro, anular)
- [ ] T018 [P] [US2] `ticket.html` + `views/ticket.view.js` (vista de 80 mm, imprimir, enviar por correo)

## Fase 9: Pulido

- [ ] T019 Carpeta Postman `casos/007-control-ingreso-salida.js` (placas libres o restringidas según `/restricciones-placa/hoy`); `npm run test:api` en verde dos veces seguidas
- [ ] T020 [P] `README.md` (endpoints, pantallas, esquema 2.2.0)
- [ ] T021 Cobertura de los services ≥ 80 %, lint, `herramientas/verificar-front.js`, revisión de que no queden textos en inglés, medición de entrada y salida (RNF-REN-01) y prueba manual en escritorio y a 375 px
- [ ] T022 Verificar que cada escenario HU-31..HU-35 tenga su prueba y su caso Postman, y marcar `[X]`

## Dependencias

- T001–T003 antes de todo. US1 → US2 → US3 → US4 → US5 (comparten `movimientos.test.js` y el service; el ticket y la salida necesitan entradas).
- La interfaz (T014–T018) después de las fases 3–7; T014 y T015 en paralelo.

## Estrategia

MVP = US1 + US2 + US3 (entrada con ticket y salida), que es lo que necesita la spec 009 para liquidar. US4 y US5 completan la operación de la caseta.
