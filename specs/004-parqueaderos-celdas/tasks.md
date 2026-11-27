---
description: "Lista de tareas de 004-parqueaderos-celdas"
---

# Tareas: Parqueaderos y celdas

**Entrada**: documentos de diseño de `specs/004-parqueaderos-celdas/`

**Prerrequisitos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/openapi.yaml](contracts/openapi.yaml), [quickstart.md](quickstart.md), [frontend-integration.md](frontend-integration.md)

**Pruebas**: obligatorias (constitución §VI): Jest + Supertest por escenario (`HU-xx Ey`) y Postman con éxito y error por endpoint.

**Organización**: US1 = HU-17, US2 = HU-18, US3 = HU-19, US4 = HU-20, US5 = HU-21, US6 = HU-22, US7 = HU-23, US8 = HU-24. Orden: P1 (US1, US4, US6, US7, US8) y luego P2 (US2, US3, US5).

## Formato: `[ID] [P?] [Historia] Descripción`

---

## Fase 1: Preparación

- [ ] T001 `backend/database/generar-seed.js` + `seed.sql`: Parqueadero ABC (activo, 2 pisos), Zona anexa (inactiva), 4 puertas y 40 celdas según research R-11 (data-model.md Parqueadero.pisos, Celda.codigo, Celda.estado, Celda.motivo_inhabilitacion); `npm run db:reset`

## Fase 2: Fundacional

- [ ] T002 [P] `backend/src/modules/celdas/celdas.reglas.js` (`normalizarCodigo`, `codigosDelRango(prefijo, desde, hasta)` con relleno de ceros, `transicionManual(estadoActual, pedido)` según la tabla R-05) + `backend/tests/unit/celdas.reglas.test.js`

**Punto de control**: suites 001–003 en verde con la semilla nueva.

---

## Fase 3: Historia de usuario 1 — Registrar un parqueadero (Prioridad: P1) 🎯 MVP · HU-17

- [ ] T003 [US1] `backend/tests/integration/parqueaderos.test.js` bloque HU-17 E1–E5
- [ ] T004 [US1] `backend/src/modules/parqueaderos/` validator (data-model.md Parqueadero.nombre, Parqueadero.direccion, Parqueadero.pisos, Parqueadero.horario, Parqueadero.estado), repository (listar con conteo de celdas por tipo, obtener, resumen por piso y tipo, insertar), service (crear con bitácora y 409 `PARQUEADERO_DUPLICADO`, listar, obtener con puertas y resumen), controller y rutas `POST /`, `GET /`, `GET /:id`; registro en `rutasProtegidas()`

## Fase 4: Historia de usuario 4 — Registrar celdas (Prioridad: P1) · HU-20

- [ ] T005 [US4] `backend/tests/integration/celdas.test.js` bloque HU-20 E1–E5
- [ ] T006 [US4] `backend/src/modules/celdas/` validator (data-model.md Celda.codigo, Celda.tipo_vehiculo, Celda.piso, Celda.area), repository, service `crear` (parqueadero activo, piso en 1..pisos → 422, duplicada → 409 `CELDA_DUPLICADA`) y `crearLote` (≤ 200, creadas y omitidas, transacción), rutas `POST /celdas` y `POST /celdas/lote`

## Fase 5: Historia de usuario 6 — Ver el mapa (Prioridad: P1) · HU-22

- [ ] T007 [US6] Bloque HU-22 E1–E4 en `celdas.test.js` (incluye ocupante visible para el Operador y `null` para el Cliente, con una celda ocupada por SQL)
- [ ] T008 [US6] Repository `listar({ idParqueadero, piso, tipo, estado, q, limit, offset })` con `LEFT JOIN` a vehículo y movimiento abierto; service `listar`/`obtener` con el ocupante según `movimientos.ver` (R-07); rutas `GET /celdas` y `GET /celdas/:id`

## Fase 6: Historia de usuario 7 — Estado con cada movimiento (Prioridad: P1) · HU-23

- [ ] T009 [US7] Bloque HU-23 E1–E3 y E5 en `celdas.test.js` (ocupar y liberar en `withTransaction` con un vehículo de prueba; rollback; celda ocupada, inhabilitada o de otro tipo → 409; un vehículo en dos celdas → error)
- [ ] T010 [US7] `celdas.service.ocupar(conexion, { idCelda, idVehiculo, tipoVehiculo })`, `liberar(conexion, idCelda)` y `sugerir(conexion, { idParqueadero, tipoVehiculo })` (R-06) con `FOR UPDATE` / `SKIP LOCKED`

## Fase 7: Historia de usuario 8 — Disponibilidad (Prioridad: P1) · HU-24

- [ ] T011 [US8] `backend/tests/integration/disponibilidad.test.js` HU-24 E1–E3 (incluye «Lleno» con las motos inhabilitadas temporalmente)
- [ ] T012 [US8] `backend/src/modules/disponibilidad/` (consulta agrupada R-09, filtro opcional `?parqueadero` con validación 422), montado público en `backend/src/app.js` con `Cache-Control: no-store`

**Punto de control**: historias P1 en verde.

## Fase 8: Historia de usuario 2 — Actualizar o inactivar (Prioridad: P2) · HU-18

- [ ] T013 [US2] Bloque HU-18 E1–E5 en `parqueaderos.test.js` (vehículos dentro simulados ocupando una celda por SQL)
- [ ] T014 [US2] Service `actualizar` (pisos ≥ piso máximo con celdas → 409 `PISOS_CON_CELDAS`; el cambio de estado exige `parqueaderos.cambiar_estado`) e `inactivar`/`reactivar` (R-03) con `FOR UPDATE`; rutas `PUT /:id` y `DELETE /:id`

## Fase 9: Historia de usuario 3 — Puertas (Prioridad: P2) · HU-19

- [ ] T015 [US3] Bloque HU-19 E1–E4 en `parqueaderos.test.js`
- [ ] T016 [US3] Puertas en `modules/parqueaderos/` (data-model.md PuertaAcceso.nombre, PuertaAcceso.tipo, PuertaAcceso.estado): `GET/POST /parqueaderos/:id/puertas` (`uso`, `estado`) y `PUT /puertas/:id` (router `puertasRouter`), 409 `PUERTA_DUPLICADA` y `PARQUEADERO_INACTIVO`

## Fase 10: Historia de usuario 5 — Editar o inhabilitar celdas (Prioridad: P2) · HU-21

- [ ] T017 [US5] Bloque HU-21 E1–E6 en `celdas.test.js`
- [ ] T018 [US5] Service `actualizar` (no ocupada → si no, 409 `CELDA_OCUPADA` con la placa), `cambiarEstado` (R-05, motivo obligatorio al inhabilitar) e `inhabilitar` (DELETE); rutas `PUT /celdas/:id`, `PATCH /celdas/:id/estado` y `DELETE /celdas/:id`

**Punto de control**: las 8 historias en verde en la API.

## Fase 11: Interfaz (Atomic Design)

- [ ] T019 [P] Átomo `ponerChipCelda` en `atomos/chip-estado.js`; moléculas `moleculas/consulta-periodica.js`, `pestanas.js` y `kpi.js`; organismo `organismos/mapa-celdas.js`, con el CSS que haga falta por nivel
- [ ] T020 [P] Servicios `js/services/parqueaderos.service.js`, `celdas.service.js` y `disponibilidad.service.js`
- [ ] T021 `herramientas/paginas-004.js` + regenerar: menú «Celdas» (`celdas.ver` con `movimientos.ver`), «Parqueaderos» (`parqueaderos.ver`) y «Disponibilidad» (Cliente); `MENU` en `config.js`
- [ ] T022 [US1] [US2] `parqueaderos.html` + `views/parqueaderos.view.js` (listado, nuevo, editar, inactivar y reactivar)
- [ ] T023 [US3] `parqueadero-detalle.html` + vista (datos, resumen y puertas con diálogo)
- [ ] T024 [US4] [US5] [US6] [US7] `celdas.html` + `views/celdas.view.js` (selector de parqueadero, pestañas por piso, filtros, mapa, detalle con el ocupante, nueva, rango, editar, inhabilitar y habilitar, consulta cada 10 s)
- [ ] T025 [P] [US6] `disponibilidad.html` + vista del Cliente (celdas disponibles por piso y área, consulta cada 10 s)
- [ ] T026 [P] [US8] `index.html` + `views/inicio.view.js` (tarjetas por tipo con «Lleno» y la hora, consulta cada 10 s)

## Fase 12: Pulido y transversales

- [ ] T027 Carpeta Postman `casos/004-parqueaderos-celdas.js`; `npm run test:api` en verde dos veces seguidas
- [ ] T028 [P] `README.md` (endpoints, pantallas) y `CAMBIOS.md` (semilla 2.0.0 con la infraestructura)
- [ ] T029 Cobertura de los services ≥ 80 %, lint, `node --check`, `herramientas/verificar-front.js`, revisión de que no queden textos en inglés, medición de `GET /celdas` y `/disponibilidad` y prueba manual en escritorio y a 375 px
- [ ] T030 Verificar que cada escenario HU-17..HU-24 tenga su prueba y su caso Postman, y marcar `[X]`

## Dependencias y orden de ejecución

- Preparación → Fundacional → US1 → US4 → US6 → US7 → US8 → US2 → US3 → US5 → Interfaz → Pulido.
- US4, US6, US7 y US5 comparten `modules/celdas/` y `celdas.test.js` (secuenciales). US2 y US3 comparten `modules/parqueaderos/`.
- Paralelismo: T019 ∥ T020 · T025 ∥ T026.
