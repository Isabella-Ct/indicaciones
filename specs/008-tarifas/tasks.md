# Tareas: Tarifas

**Entrada**: documentos de diseño en `specs/008-tarifas/` (spec, plan, research, data-model, contracts, quickstart, frontend-integration)

**Pruebas**: obligatorias (constitución §VI): cada escenario de HU-36..HU-38 tiene su prueba Jest y su caso Postman.

**Organización**: por historia de usuario; `[P]` = se puede hacer en paralelo (archivos distintos).

## Fase 1: Preparación

- [ ] T001 `backend/database/generar-seed.js` + `seed.sql`: 5 tarifas (research R-08); `npm run db:reset`; nota en `CAMBIOS.md` (sin cambios de esquema)

## Fase 2: Fundacional

- [ ] T002 [P] `backend/src/modules/tarifas/tarifas.reglas.js` (`vigenciasSeCruzan`, `situacion(tarifa, ahora)`, `tipoClienteDe(vehiculo)`, `cambiosNoPermitidosEnUsada(actual, nueva)`, `etiqueta(tipoVehiculo, tipoCliente)`) + `backend/tests/unit/tarifas.reglas.test.js`

## Fase 3: US1 — Configurar una tarifa (P1) — HU-36

- [ ] T003 [US1] `backend/tests/integration/tarifas.test.js` bloque HU-36 E1–E4 (reloj fijado)
- [ ] T004 [US1] `backend/src/modules/tarifas/` validator (data-model.md Tarifa.nombre, Tarifa.valor_primera_hora, Tarifa.minutos_fraccion, Tarifa.valor_fraccion, Tarifa.tope_diario, Tarifa.minutos_gracia, Tarifa.vigente_desde, Tarifa.vigente_hasta, Tarifa.tipo_cliente), repository, service `crear` (R-03 con `FOR UPDATE` y `cerrarAnterior`, bitácora), controller y `POST /tarifas`; registro en `rutasProtegidas()`

## Fase 4: US2 — Actualizar o inactivar (P2) — HU-37

- [ ] T005 [US2] Bloque HU-37 E1–E4 en `tarifas.test.js` (liquidación insertada por SQL para «usada»)
- [ ] T006 [US2] Service `actualizar` (R-04; data-model.md Tarifa.estado) y `cambiarEstado` (R-05); `PUT /tarifas/:id` y `PATCH /tarifas/:id/estado`

## Fase 5: US3 — Consultar las vigentes (P2) — HU-38

- [ ] T007 [US3] Bloque HU-38 E1–E3 en `tarifas.test.js`
- [ ] T008 [US3] Service `vigentes()` (R-06), `listar(filtros)` (con `usada` y `situacion`) y `vigenteEn({ tipoVehiculo, tipoCliente, fechaHora }, { conexion })` (R-07); `GET /tarifas` con el router público para `vigentes=true` en `app.js`

## Fase 6: Interfaz (Atomic Design)

- [ ] T009 [P] Átomo `ponerChipTarifa` en `atomos/chip-estado.js`, molécula `moleculas/precio.js` y organismo `organismos/tabla-tarifas.js`
- [ ] T010 [P] Servicio `js/services/tarifas.service.js`
- [ ] T011 `herramientas/paginas-008.js` + regenerar: menú «Tarifas» (`tarifas.ver`, grupo Configuración); `MENU` en `config.js`
- [ ] T012 [US1] [US2] `tarifas.html` + `views/tarifas.view.js` (listado con filtros, nueva, editar, cambiar estado, cierre de la anterior, confirmación)
- [ ] T013 [US3] Sección «Tarifas» en `index.html` + `views/inicio.view.js`

## Fase 7: Pulido

- [ ] T014 Carpeta Postman `casos/008-tarifas.js`; `npm run test:api` en verde dos veces seguidas
- [ ] T015 [P] `README.md` (endpoints y pantallas)
- [ ] T016 Cobertura del service ≥ 80 %, lint, `herramientas/verificar-front.js`, revisión de que no queden textos en inglés, medición de `GET /tarifas?vigentes=true` y prueba manual en escritorio y a 375 px
- [ ] T017 Verificar que cada escenario HU-36..HU-38 tenga su prueba y su caso Postman, y marcar `[X]`

## Dependencias

- T001–T002 antes de todo. US1 → US2 → US3 (comparten `tarifas.test.js` y el service).
- La interfaz (T009–T013) después de las fases 3–5; T009 y T010 en paralelo.

## Estrategia

MVP = US1 + `vigenteEn` (lo que necesita la spec 009). US2 y US3 completan la gestión y la transparencia.
