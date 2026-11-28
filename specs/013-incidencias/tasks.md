# Tareas: Incidencias

**Entrada**: documentos de diseño en `specs/013-incidencias/` (spec, plan, research, data-model, contracts, quickstart, frontend-integration)

**Pruebas**: obligatorias (constitución §VI): cada escenario de HU-56..HU-58 tiene su prueba Jest y su caso Postman.

**Organización**: por historia de usuario; `[P]` = se puede hacer en paralelo (archivos distintos).

## Fase 1: Preparación

- [X] T001 `subirImagen({ campo, tamanoMaximo })` en `backend/src/middlewares/subir-foto.js` (sin cambiar `subirFoto`) y carpetas `usuarios | incidencias` en `backend/src/utils/archivos.js` (research R-03); las pruebas de la spec 002 siguen en verde; nota en `CAMBIOS.md`

## Fase 2: Fundacional

- [X] T002 [P] `backend/src/modules/incidencias/incidencias.reglas.js` + `backend/tests/unit/incidencias.reglas.test.js`

## Fase 3: US1 — Registrar (P1) — HU-56

- [X] T003 [US1] `backend/tests/integration/incidencias.test.js` bloque HU-56 E1–E5
- [X] T004 [US1] `backend/src/modules/incidencias/` validator (data-model.md Incidencia.tipo, Incidencia.fecha_hora_evento, Incidencia.descripcion, Incidencia.id_celda, Incidencia.evidencia_url), repository, service `registrar` (R-02), controller y rutas; registro en `rutasProtegidas()`

## Fase 4: US2 — Consultar (P2) — HU-57

- [X] T005 [US2] Bloque HU-57 E1–E2 en `incidencias.test.js`
- [X] T006 [US2] Service `listar`, `obtener` y `evidencia` (R-04); `GET /incidencias`, `GET /:id`, `GET /:id/evidencia`

## Fase 5: US3 — Seguimiento y cierre (P2) — HU-58

- [X] T007 [US3] Bloque HU-58 E1–E3 en `incidencias.test.js`
- [X] T008 [US3] Service `agregarSeguimiento` (data-model.md SeguimientoIncidencia.nota) y `cerrar` (data-model.md Incidencia.solucion, Incidencia.estado) (R-05); rutas

## Fase 6: Interfaz (Atomic Design)

- [X] T009 [P] Átomo `ponerChipIncidencia`; servicio `js/services/incidencias.service.js`
- [X] T010 `herramientas/paginas-013.js` + regenerar: menú «Incidencias» (`incidencias.ver`)
- [X] T011 [US1] [US2] `incidencias.html` + `views/incidencias.view.js` (listado, filtros, nueva incidencia con evidencia)
- [X] T012 [US2] [US3] `incidencia.html` + `views/incidencia.view.js` (detalle, evidencia, seguimiento y cierre)

## Fase 7: Pulido

- [ ] T013 Carpeta Postman `casos/013-incidencias.js` (+ `archivos/evidencia.png`); `npm run test:api` en verde dos veces seguidas
- [ ] T014 [P] `README.md` (endpoints y pantallas)
- [ ] T015 Cobertura de los services ≥ 80 %, lint, `herramientas/verificar-front.js`, revisión de que no queden textos en inglés y prueba manual en escritorio y a 375 px
- [ ] T016 Verificar que cada escenario HU-56..HU-58 tenga su prueba y su caso Postman y marcar `[X]`

## Dependencias

- T001–T002 antes de todo. US1 → US2 → US3.
- La interfaz (T009–T012) después de las fases 3–5.

## Estrategia

MVP = US1 (registrar con código y alerta). US2 y US3 completan la atención del reclamo.
