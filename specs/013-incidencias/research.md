# Investigación — 013-incidencias

**Fecha**: 2026-11-27 · **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Precedencia: rúbrica → constitución → SRS v2.0 → HU → spec → `CLAUDE.md`. Las tablas `incidencia` (con `UNIQUE uq_incidencia_codigo` y `CHECK` de solución al cerrar) y `seguimiento_incidencia` ya existen; `alerta` ya tiene el tipo `incidencia`, y el consecutivo `incidencia` (`INC-`) está en la semilla: **sin cambios de esquema**.

---

## R-01 · Un módulo y reglas puras

- **Decisión**: `modules/incidencias/` (`/incidencias`) con capas y `incidencias.reglas.js`:
  - `fechaEventoValida(fecha, ahora)` (no futura);
  - `estadoTrasNota(estado)` (`abierta` → `en_seguimiento`; si está cerrada, error);
  - `puedeCambiar(estado)` (todo menos `cerrada`);
  - `TIPOS` con sus nombres («Rayón», «Choque», «Atropellamiento», «Golpe contra muro»).

## R-02 · Registro (RF-INC-01..04)

- **Decisión**: `POST /incidencias` (`incidencias.crear`), en JSON o `multipart/form-data` con el archivo en `evidencia`. Cuerpo: `{ tipo, placa, tipoVehiculo?, idCelda?, fechaHoraEvento: 'AAAA-MM-DDTHH:MM', descripcion }`. En una transacción:
  1. fecha no futura (422 en `fechaHoraEvento`);
  2. vehículo por placa normalizada (`FOR UPDATE`); si no existe → se crea ocasional (sin propietario), con `tipoVehiculo` obligatorio (422) y formato de placa del tipo;
  3. celda: la indicada (debe existir, 422) o la del movimiento abierto del vehículo, o ninguna;
  4. `siguienteConsecutivo('incidencia')`, inserción, alerta `incidencia` («Incidencia INC-000001: Rayón de ABC123», referencia `incidencia:<id>`) y bitácora `registrar`.
- La evidencia se guarda antes de la transacción; si la transacción falla, se borra.

## R-03 · Evidencia (RNF-PRI-03)

- **Decisión**: el middleware de la foto (spec 002) se generaliza: `subirImagen({ campo, tamanoMaximo, etiqueta })` (firma JPG/PNG, un archivo); `subirFoto` queda como `subirImagen({ campo: 'foto', 2 MB })` y la evidencia usa `subirImagen({ campo: 'evidencia', 5 MB })`. `utils/archivos.js` guarda en `uploads/<carpeta>/<uuid>.<ext>` (`usuarios` o `incidencias`) y solo acepta claves con esa forma. `GET /incidencias/:id/evidencia` `[Propuesta]` (`incidencias.ver`) responde la imagen con `Cache-Control: private, no-store`.

## R-04 · Consultas (RF-INC-05, RF-INC-06)

- **Decisión**: `GET /incidencias?q&tipo&estado&desde&hasta&page&limit` (`incidencias.ver`): `q` busca por código o placa; `desde`/`hasta` (`AAAA-MM-DD`) filtran la fecha del evento; orden por fecha del evento, la más reciente primero; cada fila trae código, tipo, fecha, estado, placa, celda y operador. `GET /incidencias/:id` agrega descripción, `tieneEvidencia`, solución, fecha de cierre y `seguimientos: [{ fecha, usuario, nota }]` (los más antiguos primero).

## R-05 · Seguimiento y cierre (RF-INC-07, RF-INC-08, RN-28)

- **Decisión**:
  - `POST /incidencias/:id/seguimientos { nota }` (5–500, `incidencias.editar`): incidencia `FOR UPDATE`; cerrada → 409 `INCIDENCIA_CERRADA`; inserta la nota con el usuario y la hora del servidor y pasa `abierta` → `en_seguimiento`; bitácora `seguimiento`. Responde 201 con el detalle.
  - `PATCH /incidencias/:id/cierre { solucion }` (10–500, `incidencias.editar`): cerrada → 409 `INCIDENCIA_CERRADA`; `estado = 'cerrada'`, `solucion`, `fecha_cierre` del servidor; bitácora `cerrar`.
- No hay endpoint de borrado ni de edición de la incidencia (RN-28).

## R-06 · Pruebas

- **Decisión**: Jest con el reloj fijado y vehículos propios (`crearVehiculo`); la evidencia con un PNG mínimo (firma + bytes) y un JPG de más de 5 MB para el 422. Postman con `formdata` para la evidencia (archivo de `docs/postman/archivos/`).
