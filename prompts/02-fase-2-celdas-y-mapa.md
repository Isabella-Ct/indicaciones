# FASE 2 — Celdas de parqueo y mapa en tiempo real

## Contexto
Fases 0 y 1 terminadas. Ahora gestionas celdas, puertas y la vista de ocupación en tiempo real que usarán operadores, administradores, clientes y la página pública.

## Lee primero
- `CLAUDE.md` §5, §6 y §7 (sección **Celdas**).
- `docs/requerimientos.md`: REQ-CLD-01, 02, 03.
- `docs/diseno-parko/index.html` y `styles.css`, secciones **5. Mapa de niveles** y **6. Panel del espacio**: el mapa se construye **exactamente** con ese diseño. Revisa también los retos 1–3 y 5 de `docs/diseno-parko/script.js`.
- `docs/wireframes/05-espacios.png` y sus correcciones (campos del formulario de celdas).

Muestra tu plan antes de codificar.

## Tareas

### Backend — módulos `celdas` y `puertas`
- `GET /api/v1/pisos` (autenticados): pisos con su texto de carril, para dibujar el mapa.
- `GET /api/v1/celdas` (cualquier usuario autenticado): filtros por piso, área, tipo, estado y accesible. Ordenadas por piso, `fila_mapa` y `posicion`. Incluye la placa del vehículo actual **solo** para admin/operador (el cliente ve el estado, no placas ajenas).
- `GET /api/v1/celdas/resumen`: totales por tipo y estado (disponibles/ocupadas/reservadas/fuera de servicio) y por piso/área.
- `POST /api/v1/celdas` y `PUT /api/v1/celdas/:id` (admin): código único, piso, área, tipo, accesible, fila del mapa y posición. Al pasar a `fuera_servicio` exige una nota.
- `PATCH /api/v1/celdas/:id/estado` (admin/operador; REQ-CLD-03): al pasar a `ocupada` exige `vehiculo_id` (del mismo tipo y sin otra celda ocupada); al pasar a `disponible` limpia `vehiculo_actual_id`. No permite cambiar a `disponible` una celda con estadía en curso: indica que se debe registrar la salida.
- `PATCH /api/v1/celdas/:id/activa` (admin): desactivar en lugar de borrar.
- CRUD simple de `puertas` (admin).
- **Tiempo real:** `GET /api/v1/celdas/stream` (Server-Sent Events). Crea en `backend/src/realtime/` un emisor que publique `celda-actualizada` y `resumen-actualizado` cada vez que cambie el estado de una celda (este emisor lo usarán también entradas, salidas y reservas). Envía un heartbeat cada 25 s.
- `GET /api/v1/publico/disponibilidad` (sin login): solo totales disponibles por tipo, sin datos de celdas individuales. Y `GET /api/v1/publico/disponibilidad/stream` (SSE, solo totales).

### Frontend
- Organism `parking-map` igual a la maqueta: `panel` con `panel-head` "Mapa del parqueadero" y pestañas `level-tabs` (una por piso; solo se ve el piso elegido), leyenda `map-legend` (Libre, Ocupado, Reservado, Accesible, Fuera de servicio) y, por piso, `level-title` con "N ocupados de M" → `lot` → `row--top` + `lane` (textos del carril del piso) + `row--bottom`. Las columnas (`--cols`) se calculan según el número de celdas de cada fila.
- Atom/molecule `space`: código, icono `car-top` o `moto-top` cuando está ocupada, placa en `space-plate`, etiquetas "LIBRE" / "MENSUAL" / "FUERA DE SERVICIO", y modificadores `space--free`, `--occupied`, `--reserved`, `--out`, `--accessible`, `--moto` e `is-selected`. Accesible con `aria-label` ("Espacio A-01, libre").
- Organism `space-detail` (columna derecha `detail-column`): `empty-state` "Selecciona un espacio" hasta que se toca una celda; después, `space-hero` (piso · tipo, código grande, `status-chip`), placa y vehículo, `data-list` (cliente/titular, ticket, hora de entrada, tiempo dentro). Para celdas libres, reservadas o fuera de servicio muestra un mensaje distinto en lugar del cobro (reto 5); para fuera de servicio, la nota. El bloque de cobro se completa en la Fase 4.
- Molecule `kpi` + organism `kpis` (fila de indicadores de la maqueta: ocupación actual con `meter`, espacios libres por piso, vehículos dentro por tipo). Recaudo y permanencia promedio se agregan en la Fase 4.
- `app/celdas.html` ("Control de espacios"):
  - Admin/operador: `page-head` + `kpis` + `workspace` (mapa + detalle). Acciones del detalle según el rol (cambiar estado, marcar fuera de servicio con nota).
  - Admin: además, un botón "Gestionar celdas" que abre un `modal` con el formulario (código, piso, área, tipo, accesible, fila, posición) para crear o editar celdas.
  - Cliente (REQ-CLD-02): el mismo mapa en solo lectura, **sin placas ni titulares** y sin acciones.
- El mapa se actualiza en vivo con `EventSource` sin recargar; si se cae la conexión, reintenta y muestra un indicador "en vivo / reconectando".

### Tests
- Ocupar una celda con un vehículo de otro tipo → 422.
- Un vehículo no puede ocupar dos celdas → 409.
- El cliente no recibe placas en `GET /celdas`.

## Criterios de aceptación
- [ ] Cubre REQ-CLD-01, 02, 03.
- [ ] Con dos navegadores abiertos, cambiar una celda en uno se refleja en el otro en menos de 2 s.
- [ ] El endpoint público no expone placas ni datos personales.
- [ ] Puesto al lado de `docs/diseno-parko/index.html`, el mapa se ve igual (colores, carril, etiquetas, celdas accesibles, fuera de servicio, motos más bajas).
- [ ] El mapa es usable a 375 px (scroll horizontal dentro de `lot`, como en la maqueta).
- [ ] `npm test` y `npm run lint` pasan; README actualizado.

## Al terminar
Commit + resumen. **No empieces la Fase 3.**
