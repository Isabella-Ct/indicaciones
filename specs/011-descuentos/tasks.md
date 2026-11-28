# Tareas: Beneficios y descuentos

**Entrada**: documentos de diseño en `specs/011-descuentos/` (spec, plan, research, data-model, contracts, quickstart, frontend-integration)

**Pruebas**: obligatorias (constitución §VI): cada escenario de HU-49..HU-51 tiene su prueba Jest y su caso Postman (la aplicación en la liquidación, que necesita mover el reloj, solo en Jest).

**Organización**: por historia de usuario; `[P]` = se puede hacer en paralelo (archivos distintos).

## Fase 1: Preparación

- [X] T001 `backend/database/generar-seed.js` + `seed.sql`: 3 descuentos (research R-08); `npm run db:reset`; nota en `CAMBIOS.md` (sin cambios de esquema)

## Fase 2: Fundacional

- [X] T002 [P] `backend/src/modules/descuentos/descuentos.reglas.js` (`corresponde`, `valorDe`, `elegir`, `situacion`) + `backend/tests/unit/descuentos.reglas.test.js`
- [X] T003 [P] `aplicarDescuento` en `backend/src/modules/liquidaciones/liquidaciones.reglas.js` + casos en `backend/tests/unit/liquidaciones.reglas.test.js`

## Fase 3: US1 — Configurar (P1) — HU-49

- [X] T004 [US1] `backend/tests/integration/descuentos.test.js` bloque HU-49 E1–E4
- [X] T005 [US1] `backend/src/modules/descuentos/` validator (data-model.md Descuento.nombre, Descuento.tipo, Descuento.valor, Descuento.aplica_tipo_cliente, Descuento.aplica_tipo_vehiculo, Descuento.minutos_minimos, Descuento.vigente_desde, Descuento.vigente_hasta, Descuento.estado), repository, service, controller y rutas (GET, POST, PUT); registro en `rutasProtegidas()`

## Fase 4: US2 — Aplicar en la liquidación (P1) — HU-50

- [X] T006 [US2] Bloque HU-50 E1–E4 en `descuentos.test.js` (incluye la factura y el PDF)
- [X] T007 [US2] `descuentosRepositorio.candidatos` y `liquidaciones.service.calcularPara` con el descuento (R-02; data-model.md Liquidacion.id_descuento, Liquidacion.valor_descuento); `liquidaciones.repository.insertar` guarda `id_descuento`; la guardada se muestra con su descuento; `factura.pdf.js` con el nombre

## Fase 5: US3 — Activar o inactivar (P2) — HU-51

- [X] T008 [US3] Bloque HU-51 E1–E2 en `descuentos.test.js`
- [X] T009 [US3] Service `cambiarEstado` (R-05) y `PATCH /descuentos/:id/estado`

## Fase 6: Interfaz (Atomic Design)

- [ ] T010 [P] Átomo `ponerChipDescuento`; fila del descuento en `moleculas/cobro.js` y `organismos/comprobante.js` (+ marcado en `paginas-007.js` y `paginas-009.js`)
- [ ] T011 [P] Servicio `js/services/descuentos.service.js`
- [ ] T012 `herramientas/paginas-011.js` + regenerar: menú «Descuentos» (`descuentos.ver`, Configuración)
- [ ] T013 [US1] [US3] `descuentos.html` + `views/descuentos.view.js` (listado, nuevo, editar, activar/inactivar con confirmación)

## Fase 7: Pulido

- [ ] T014 Carpeta Postman `casos/011-descuentos.js`; `npm run test:api` en verde dos veces seguidas
- [ ] T015 [P] `README.md` (endpoints y pantallas)
- [ ] T016 Cobertura de los services ≥ 80 %, lint, `herramientas/verificar-front.js`, revisión de que no queden textos en inglés y prueba manual en escritorio y a 375 px
- [ ] T017 Verificar que cada escenario HU-49..HU-51 tenga su prueba (y su caso Postman cuando no depende del reloj) y marcar `[X]`

## Dependencias

- T001–T003 antes de todo. US1 → US2 → US3.
- La interfaz (T010–T013) después de las fases 3–5; T010 y T011 en paralelo.

## Estrategia

MVP = US1 + US2 (configurar y aplicar). US3 cierra el ciclo de la promoción.
