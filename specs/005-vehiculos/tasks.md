# Tareas: Vehículos

**Entrada**: documentos de diseño en `specs/005-vehiculos/` (spec, plan, research, data-model, contracts, quickstart, frontend-integration)

**Pruebas**: obligatorias (constitución §VI): cada escenario de HU-25..HU-28 tiene su prueba Jest y su caso Postman.

**Organización**: por historia de usuario; `[P]` = se puede hacer en paralelo (archivos distintos).

## Fase 1: Preparación

- [X] T001 `backend/database/schema.sql` 2.1.0: tabla `historial_propietario` (data-model.md HistorialPropietario.fecha_desde, HistorialPropietario.fecha_hasta, HistorialPropietario.vehiculo_abierto); `backend/database/migrations/001_historial_propietario.sql`; entrada 2.1.0 en `CAMBIOS.md`
- [X] T002 `backend/database/generar-seed.js` + `seed.sql`: 6 vehículos y sus periodos abiertos (research R-11); `npm run db:reset`; placas de la semilla excluidas en `tests/setup/infraestructura.js`

## Fase 2: Fundacional

- [X] T003 [P] `backend/src/modules/vehiculos/vehiculos.reglas.js` (`normalizarPlaca`, `placaValida(placa, tipo)`, `mensajeFormato(tipo)`, `modeloValido(anio, anioActual)`) + `anioActualBogota` en `utils/fechas.js` + `backend/tests/unit/vehiculos.reglas.test.js`

## Fase 3: US1 — Registrar un vehículo (P1) — HU-25

- [X] T004 [US1] `backend/tests/integration/vehiculos.test.js` bloque HU-25 E1–E5
- [X] T005 [US1] `backend/src/modules/vehiculos/` validator (data-model.md Vehiculo.placa, Vehiculo.tipo, Vehiculo.color, Vehiculo.marca, Vehiculo.modelo, Vehiculo.id_propietario), repository (insertar, obtener con propietario y `dentro`), service `crear` (409 `PLACA_DUPLICADA`, propietario opcional con su periodo, bitácora), controller y `POST /vehiculos`; registro en `rutasProtegidas()`

## Fase 4: US2 — Asociar un vehículo a su propietario (P1) — HU-26

- [X] T006 [US2] Bloque HU-26 E1–E4 en `vehiculos.test.js`
- [X] T007 [US2] Service `asignarPropietario(id, { idUsuario | tipoDocumento+numeroDocumento }, actor)` con `FOR UPDATE`, reglas de data-model.md § Transiciones (403 `SOLO_ADMIN_REASIGNA`, 404 `VEHICULO_NO_ENCONTRADO` / `USUARIO_NO_ENCONTRADO`, 409 `USUARIO_INACTIVO`), periodos en `historial_propietario` y bitácora; `PATCH /vehiculos/:id/propietario`

## Fase 5: US4 — Consultar vehículos (P1) — HU-28

- [X] T008 [US4] Bloque HU-28 E1–E3 en `vehiculos.test.js` (movimiento abierto insertado por SQL para `dentro`)
- [X] T009 [US4] Repository `listar({ q, tipo, propietario, dentro, limit, offset })` (R-08), `historial(id)`, `ultimosMovimientos(id)`; service `listar`, `obtener`, `misVehiculos`; rutas `GET /vehiculos`, `GET /vehiculos/:id` y `GET /usuarios/me/vehiculos` (antes de `/:id` en `usuarios.routes.js`)

## Fase 6: US3 — Actualizar o reasignar un vehículo (P2) — HU-27

- [X] T010 [US3] Bloque HU-27 E1–E5 en `vehiculos.test.js`
- [X] T011 [US3] Service `actualizar` (solo diferencias en la bitácora; 409 `VEHICULO_DENTRO` al cambiar placa o tipo dentro; `idPropietario` usa `asignarPropietario`); `PUT /vehiculos/:id`

## Fase 7: Interfaz (Atomic Design)

- [ ] T012 [P] Átomo `atomos/placa.js` (`ponerPlaca`) y molécula `moleculas/selector-tipo.js` (`conectarSelectorTipo`)
- [ ] T013 [P] Servicio `js/services/vehiculos.service.js`
- [ ] T014 `herramientas/paginas-005.js` + regenerar: menú «Vehículos» (`vehiculos.ver`) y «Mis vehículos» (`perfil.ver`, oculto con `vehiculos.ver`); `MENU` en `config.js`
- [ ] T015 [US1] [US4] `vehiculos.html` + `views/vehiculos.view.js` (listado, búsqueda, filtros tipo/propietario/dentro, nuevo vehículo)
- [ ] T016 [US2] [US3] [US4] `vehiculo-detalle.html` + vista (datos, propietario con asociar, reasignar y quitar, editar, historial y últimos movimientos)
- [ ] T017 [US2] Sección «Vehículos» en `usuario-detalle.html` + `usuario-detalle.view.js` (lista y «Agregar vehículo» por placa; si no existe, registrar y asociar)
- [ ] T018 [P] [US4] `mis-vehiculos.html` + `views/mis-vehiculos.view.js`

## Fase 8: Pulido

- [ ] T019 Carpeta Postman `casos/005-vehiculos.js`; `npm run test:api` en verde dos veces seguidas
- [ ] T020 [P] `README.md` (endpoints, pantallas, esquema 2.1.0)
- [ ] T021 Cobertura del service ≥ 80 %, lint, `herramientas/verificar-front.js`, revisión de que no queden textos en inglés, medición de `GET /vehiculos?q=` y prueba manual en escritorio y a 375 px
- [ ] T022 Verificar que cada escenario HU-25..HU-28 tenga su prueba y su caso Postman, y marcar `[X]`

## Dependencias

- T001–T003 antes de todo. US1 → US2 → US4 → US3 (comparten `vehiculos.test.js` y el service).
- La interfaz (T012–T018) después de las fases 3–6; T012 y T013 en paralelo.

## Estrategia

MVP = US1 + US2 + US4 (registrar, asociar y consultar), que es lo que necesitan las specs 006 y 007. US3 (actualizar y reasignar) completa la historia.
