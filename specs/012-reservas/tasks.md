# Tareas: Reservas

**Entrada**: documentos de diseño en `specs/012-reservas/` (spec, plan, research, data-model, contracts, quickstart, frontend-integration)

**Pruebas**: obligatorias (constitución §VI): cada escenario de HU-52..HU-55 tiene su prueba Jest y su caso Postman (los que necesitan mover el reloj, cumplir y vencer, solo en Jest).

**Organización**: por historia de usuario; `[P]` = se puede hacer en paralelo (archivos distintos).

## Fase 1: Preparación

- [X] T001 `RESERVA_ANTICIPACION_DIAS` y `RESERVA_MINUTOS_ESPERA` en `backend/src/config/env.js` y `.env.example` (research R-02); nota en `CAMBIOS.md` (sin cambios de esquema)

## Fase 2: Fundacional

- [X] T002 [P] `backend/src/modules/reservas/reservas.reglas.js` (`franja`, `seCruzan`, `validarInicio`, `enFranja`, `vencida`) + `backend/tests/unit/reservas.reglas.test.js`

## Fase 3: US1 — Reservar (P1) — HU-52

- [X] T003 [US1] `backend/tests/integration/reservas.test.js` bloque HU-52 E1–E5
- [X] T004 [US1] `backend/src/modules/reservas/` validator (data-model.md Reserva.id_vehiculo, Reserva.id_celda, Reserva.fecha_hora_inicio, Reserva.minutos_espera, Reserva.estado), repository, service `reservar` (R-03) y `disponibles` (R-04), controller y rutas; `GET /celdas/disponibles` antes de `/:id` en `celdas.routes.js`; registro en `rutasProtegidas()`

## Fase 4: US2 — Cancelar (P1) — HU-53

- [X] T005 [US2] Bloque HU-53 E1–E3 en `reservas.test.js`
- [X] T006 [US2] Service `cancelar` (R-05) y `mias`; `PATCH /reservas/:id/cancelacion` y `GET /usuarios/me/reservas` antes de `/:id` en `usuarios.routes.js`

## Fase 5: US3 — Reservas del día (P2) — HU-54

- [X] T007 [US3] Bloque HU-54 E1–E2 en `reservas.test.js`
- [X] T008 [US3] Service `listar` (R-06) y `GET /reservas`

## Fase 6: US4 — Cumplir o vencer (P2) — HU-55

- [X] T009 [US4] Bloque HU-55 E1–E3 en `reservas.test.js` (incluye la reasignación cuando la celda está ocupada)
- [X] T010 [US4] `paraEntrada` y `cumplir` en `reservas.service` y su uso en `movimientos.service.registrarEntrada` (R-08; data-model.md Reserva.id_movimiento); `controlar` (R-07) y `src/tareas/programador.js`

## Fase 7: Interfaz (Atomic Design)

- [ ] T011 [P] Átomo `ponerChipReserva`; servicio `js/services/reservas.service.js`
- [ ] T012 `herramientas/paginas-012.js` + regenerar: menú «Reservas» (`reservas.ver`) y «Mis reservas» (`perfil.ver`, oculto con `reservas.ver`)
- [ ] T013 [US1] [US2] `mis-reservas.html` + `views/mis-reservas.view.js` (reservar, sin vehículos, cancelar)
- [ ] T014 [US3] `reservas.html` + `views/reservas.view.js`; [US4] aviso de reserva en `views/movimientos.view.js`

## Fase 8: Pulido

- [ ] T015 Carpeta Postman `casos/012-reservas.js`; `npm run test:api` en verde dos veces seguidas
- [ ] T016 [P] `README.md` (endpoints, variables y pantallas)
- [ ] T017 Cobertura de los services ≥ 80 %, lint, `herramientas/verificar-front.js`, revisión de que no queden textos en inglés y prueba manual en escritorio y a 375 px
- [ ] T018 Verificar que cada escenario HU-52..HU-55 tenga su prueba (y su caso Postman cuando no depende del reloj) y marcar `[X]`

## Dependencias

- T001–T002 antes de todo. US1 → US2 → US3 → US4.
- La interfaz (T011–T014) después de las fases 3–6.

## Estrategia

MVP = US1 + US2 (reservar y cancelar). US3 y US4 completan la operación en la caseta.
