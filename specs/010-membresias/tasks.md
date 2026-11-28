# Tareas: Membresías

**Entrada**: documentos de diseño en `specs/010-membresias/` (spec, plan, research, data-model, contracts, quickstart, frontend-integration)

**Pruebas**: obligatorias (constitución §VI): cada escenario de HU-45..HU-48 tiene su prueba Jest y su caso Postman.

**Organización**: por historia de usuario; `[P]` = se puede hacer en paralelo (archivos distintos).

## Fase 1: Preparación

- [X] T001 `backend/database/generar-seed.js` + `seed.sql`: 5 planes (research R-08); `npm run db:reset`; nota en `CAMBIOS.md` (sin cambios de esquema)
- [X] T002 `facturas.service.cobrar(conexion, …)` reutilizable (validación del pago y factura + pago) usado por `pagar`; factura con `membresia` en `facturas.repository.js` y en `factura.pdf.js` (research R-03, R-07)

## Fase 2: Fundacional

- [X] T003 [P] `backend/src/modules/membresias/membresias.reglas.js` (`finDe`, `periodoRenovacion`, `diasRestantes`, `avisoRenovacion`) + `backend/tests/unit/membresias.reglas.test.js`

## Fase 3: US1 — Planes (P1) — HU-45

- [X] T004 [US1] `backend/tests/integration/planes.test.js` HU-45 E1–E4
- [X] T005 [US1] `backend/src/modules/planes/` validator (data-model.md PlanMembresia.nombre, PlanMembresia.tipo_vehiculo, PlanMembresia.valor_mensual, PlanMembresia.dias_vigencia, PlanMembresia.beneficios, PlanMembresia.estado), repository, service, controller y rutas; registro en `rutasProtegidas()`

## Fase 4: US2 — Suscribir (P1) — HU-46

- [X] T006 [US2] `backend/tests/integration/membresias.test.js` bloque HU-46 E1–E5
- [X] T007 [US2] `backend/src/modules/membresias/` validator, repository, service `suscribir` (R-03; data-model.md Membresia.fecha_inicio, Membresia.fecha_fin, Membresia.estado) y `listar`; `POST /membresias` y `GET /membresias`

## Fase 5: US3 — Renovar y cancelar (P2) — HU-47

- [X] T008 [US3] Bloque HU-47 E1–E4 en `membresias.test.js` (incluye `vencer` y la liquidación en tarifa normal después de cancelar)
- [X] T009 [US3] Service `renovar`, `cancelar` (R-04; data-model.md Membresia.motivo_cancelacion) y `vencer` (R-05); `src/tareas/programador.js` y arranque en `server.js`; rutas

## Fase 6: US4 — Mi membresía (P3) — HU-48

- [X] T010 [US4] Bloque HU-48 E1–E3 en `membresias.test.js`
- [X] T011 [US4] Service `mias` (R-06); `GET /usuarios/me/membresias` antes de `/:id` en `usuarios.routes.js`

## Fase 7: Interfaz (Atomic Design)

- [X] T012 [P] Átomo `ponerChipMembresia`, molécula `moleculas/vigencia.js`, organismo `organismos/formulario-pago.js`
- [X] T013 [P] Servicio `js/services/membresias.service.js`
- [X] T014 `herramientas/paginas-010.js` + `partes-pago.js` + regenerar: menú «Membresías» (`membresias.ver`), «Planes» (`planes.crear`, Configuración), «Mi membresía» (`perfil.ver`, oculto con `membresias.ver`)
- [X] T015 [US1] `planes.html` + `views/planes.view.js`
- [X] T016 [US2] [US3] `membresias.html` + `views/membresias.view.js` (listado, nueva suscripción, renovar, cancelar)
- [X] T017 [US4] `mi-membresia.html` + `views/mi-membresia.view.js` (vigencia, aviso, facturas, planes y suscripción)

## Fase 8: Pulido

- [ ] T018 Carpeta Postman `casos/010-membresias.js`; `npm run test:api` en verde dos veces seguidas
- [ ] T019 [P] `README.md` (endpoints y pantallas)
- [ ] T020 Cobertura de los services ≥ 80 %, lint, `herramientas/verificar-front.js`, revisión de que no queden textos en inglés y prueba manual en escritorio y a 375 px
- [ ] T021 Verificar que cada escenario HU-45..HU-48 tenga su prueba y su caso Postman, y marcar `[X]`

## Dependencias

- T001–T003 antes de todo. US1 → US2 → US3 → US4.
- La interfaz (T012–T017) después de las fases 3–6; T012 y T013 en paralelo.

## Estrategia

MVP = US1 + US2 (planes y suscripción con pago), que ya hacen que la liquidación de la 009 dé $ 0. US3 y US4 completan el ciclo.
