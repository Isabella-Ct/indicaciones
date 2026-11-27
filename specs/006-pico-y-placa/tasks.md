# Tareas: Restricción de pico y placa

**Entrada**: documentos de diseño en `specs/006-pico-y-placa/` (spec, plan, research, data-model, contracts, quickstart, frontend-integration)

**Pruebas**: obligatorias (constitución §VI): cada escenario de HU-29 y HU-30 tiene su prueba Jest y su caso Postman.

**Organización**: por historia de usuario; `[P]` = se puede hacer en paralelo (archivos distintos).

## Fase 1: Preparación

- [X] T001 `backend/database/generar-seed.js` + `seed.sql`: 10 restricciones (research R-08); `npm run db:reset`; nota en `CAMBIOS.md` (sin cambios de esquema)

## Fase 2: Fundacional

- [X] T002 [P] `backend/src/modules/restricciones/restricciones.reglas.js` (`digitosATexto`, `textoADigitos`, `digitoEvaluado(placa, posicion)`, `vigenciasSeCruzan`, `restringe(restriccion, momento)`, `motivo(restriccion)`) + `backend/tests/unit/restricciones.reglas.test.js` (límites de franja, posiciones, vigencias)

## Fase 3: US1 — Configurar la restricción (P1) — HU-29

- [X] T003 [US1] `backend/tests/integration/restricciones.test.js` bloque HU-29 E1–E5
- [X] T004 [US1] `backend/src/modules/restricciones/` validator (data-model.md RestriccionPlaca.dia_semana, RestriccionPlaca.tipo_vehiculo, RestriccionPlaca.digitos, RestriccionPlaca.posicion_digito, RestriccionPlaca.hora_inicio, RestriccionPlaca.hora_fin, RestriccionPlaca.vigente_desde, RestriccionPlaca.vigente_hasta, RestriccionPlaca.estado), repository, service `listar`, `crear`, `actualizar`, `eliminar` (superposición R-04 con `FOR UPDATE`, bitácora), controller y rutas; registro en `rutasProtegidas()`

## Fase 4: US2 — Consultar la restricción vigente (P2) — HU-30

- [X] T005 [US2] Bloque HU-30 E1–E3 en `restricciones.test.js` (E3 con `evaluar` y fechas fijas)
- [X] T006 [US2] Service `hoy()` (R-06) y `evaluar({ placa, tipo, fechaHora }, { conexion })` (R-05); ruta `GET /restricciones-placa/hoy` antes de `/:id`

## Fase 5: Interfaz (Atomic Design)

- [ ] T007 [P] Átomo `atomos/digitos.js`, molécula `moleculas/aviso-pico-placa.js` y organismo `organismos/tabla-semanal.js`, con el CSS que haga falta por nivel
- [ ] T008 [P] Servicio `js/services/restricciones.service.js`
- [ ] T009 `herramientas/paginas-006.js` + `partes-pico-placa.js` + regenerar: menú «Pico y placa» (`restricciones.crear`, grupo Configuración); aviso en `celdas.html`, `disponibilidad.html` y `mis-vehiculos.html`
- [ ] T010 [US1] `pico-placa.html` + `views/pico-placa.view.js` (tabla semanal, nueva, editar, eliminar, «Editar la existente» con 409)
- [ ] T011 [US2] Aviso de hoy en `celdas.view.js`, `disponibilidad.view.js` y `mis-vehiculos.view.js`

## Fase 6: Pulido

- [ ] T012 Carpeta Postman `casos/006-pico-y-placa.js`; `npm run test:api` en verde dos veces seguidas
- [ ] T013 [P] `README.md` (endpoints y pantallas)
- [ ] T014 Cobertura del service ≥ 80 %, lint, `herramientas/verificar-front.js`, revisión de que no queden textos en inglés, medición de `GET /hoy` y prueba manual en escritorio y a 375 px
- [ ] T015 Verificar que cada escenario de HU-29 y HU-30 tenga su prueba y su caso Postman, y marcar `[X]`

## Dependencias

- T001–T002 antes de todo. US1 → US2 (comparten `restricciones.test.js` y el service).
- La interfaz (T007–T011) después de las fases 3 y 4; T007 y T008 en paralelo.

## Estrategia

MVP = US1 (configuración) + `evaluar`, que es lo que necesita la spec 007. El aviso de hoy (US2) completa la historia.
