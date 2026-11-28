# Investigación — 005-vehiculos

**Fecha**: 2026-11-27 · **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Precedencia: rúbrica → constitución → SRS v2.0 → HU → spec → `CLAUDE.md`. Se reutiliza la fundación (specs 001–004); la tabla `vehiculo` ya existe en `schema.sql` 2.0.0 con `UNIQUE` de placa y `CHECK` de formato.

---

## R-01 · Un módulo `vehiculos` con capas

- **Decisión**: `modules/vehiculos/` con `routes → controller → service → repository → validator`, más `vehiculos.reglas.js` (funciones puras de placa y modelo). `GET /usuarios/me/vehiculos` se agrega al router de usuarios (antes de `/:id`), pero delega en `vehiculosService.misVehiculos`.
- **Justificación**: constitución §II y B.1 §4.5 (la ruta `/usuarios/me/vehiculos` pertenece a esta spec).

## R-02 · Normalización y formato de la placa (RF-VEH-02, RN-11)

- **Decisión**: `normalizarPlaca(texto)` quita espacios, guiones y puntos y pasa a mayúsculas. `placaValida(placa, tipo)` usa `^[A-Z]{3}\d{3}$` (carro) y `^[A-Z]{3}\d{2}[A-Z]?$` (moto). El validador zod normaliza primero y luego valida, con el mensaje «Formato de placa inválido para carro (AAA123)» o «… para moto (AAA12 o AAA12A)» en el campo `placa`. El `CHECK ck_vehiculo_placa` de la BD es la segunda barrera.
- **Alternativas descartadas**: validar solo en la BD (el mensaje del `CHECK` no se puede mostrar al usuario).

## R-03 · Placa duplicada (RF-VEH-03)

- **Decisión**: el `UNIQUE uq_vehiculo_placa` decide. El servicio traduce `ER_DUP_ENTRY` a 409 `PLACA_DUPLICADA` «La placa ya está registrada», al crear y al editar. Como la placa se guarda normalizada, «abc 123» y «ABC-123» chocan con ABC123.

## R-04 · Modelo (año) (6.1)

- **Decisión**: entero entre 1950 y el año actual + 1, calculado con la hora de Bogotá en cada petición (`anioActualBogota()` en `utils/fechas.js`). Fuera de rango → 422 en `modelo`.

## R-05 · Historial de propietarios `[Propuesta]` (RF-VEH-08)

- **Decisión**: tabla nueva `historial_propietario` (`id_historial`, `id_vehiculo`, `id_usuario`, `fecha_desde`, `fecha_hasta` NULL, `id_usuario_registro`). Restricción: un solo periodo abierto por vehículo, con la columna generada `vehiculo_abierto = IF(fecha_hasta IS NULL, id_vehiculo, NULL)` y `UNIQUE`, igual que en `movimiento` y `membresia`. Al asociar se inserta un periodo abierto; al reasignar o quitar se cierra el vigente (`fecha_hasta = NOW()`) y, si hay nuevo propietario, se abre otro. Todo dentro de la transacción del cambio, con `FOR UPDATE` del vehículo.
- **Justificación**: 6.1 solo guarda el propietario actual; sin historial, al reasignar se perdería a quién pertenecían los movimientos anteriores (criterio 2 de HU-27). La v1 tenía `vehiculos_historial_propietario` por el mismo motivo.
- **Versión del esquema**: 2.1.0, con la migración `migrations/001_historial_propietario.sql` para las BD existentes y su entrada en `CAMBIOS.md`.
- **Alternativas descartadas**: solo la bitácora (sirve como auditoría, pero no para consultar por periodo); copiar el propietario en cada movimiento (6.1 no lo tiene y la 007 todavía no existe).

## R-06 · Asociar frente a reasignar (RF-VEH-04..06, RN-02)

- **Decisión**: `PATCH /vehiculos/:id/propietario` exige `vehiculos.crear`. En el servicio, con `FOR UPDATE` del vehículo:
  - si el vehículo no tiene propietario → se asocia;
  - si ya tiene uno distinto (o se pide quitarlo con `idUsuario: null`) → exige `vehiculos.editar`; si no lo tiene, 403 `SOLO_ADMIN_REASIGNA` «Solo el Administrador puede reasignar el vehículo»;
  - si es el mismo → 200 sin cambios.
  `PUT /vehiculos/:id` (`vehiculos.editar`) acepta además `idPropietario` y usa la misma operación.
- **Cuerpo**: `{ idUsuario }` o `{ tipoDocumento, numeroDocumento }` (exactamente uno de los dos; si no → 422).
- **Errores**: vehículo inexistente → 404 `VEHICULO_NO_ENCONTRADO` «Registre primero el vehículo»; usuario inexistente → 404 `USUARIO_NO_ENCONTRADO` «El usuario no está registrado»; inactivo → 409 `USUARIO_INACTIVO` «El usuario está inactivo».

## R-07 · «Dentro del parqueadero» (RF-VEH-10)

- **Decisión**: `dentro = EXISTS(movimiento abierto del vehículo)`, con el índice `uq_movimiento_abierto (vehiculo_abierto)`. El listado lo calcula con `LEFT JOIN movimiento m ON m.vehiculo_abierto = v.id_vehiculo`, que también da la celda actual. Filtro `?dentro=true|false`.
- **Regla**: con el vehículo dentro, cambiar `placa` o `tipo` → 409 `VEHICULO_DENTRO` «El vehículo está dentro del parqueadero».

## R-08 · Búsqueda y filtros (RF-VEH-10)

- **Decisión**: `q` busca `placa LIKE %Q%` con `Q` normalizada (sin espacios ni guiones), o `u.nombre_completo LIKE %q%`, o `u.numero_documento LIKE q%`. Con `escapeLike`. `tipo=carro|moto`; `propietario=<id>|ninguno`; `dentro=true|false`. Orden por placa. Paginación estándar (`limit` ≤ 100).

## R-09 · Detalle (RF-VEH-11)

- **Decisión**: `GET /vehiculos/:id` devuelve el vehículo con `propietario { idUsuario, nombre, tipoDocumento, numeroDocumento, estado }`, `dentro`, `celdaActual`, `historialPropietarios` (más reciente primero) y `ultimosMovimientos` (10, por `fecha_hora_entrada DESC`: entrada, salida, minutos, celda, estado). Hasta la spec 007 la lista sale vacía; las pruebas insertan movimientos por SQL.

## R-10 · Privacidad del Cliente (RF-VEH-12, RNF-PRI-02)

- **Decisión**: el Cliente no tiene `vehiculos.ver`, así que el listado y el detalle le responden 403. `GET /usuarios/me/vehiculos` (`perfil.ver`) devuelve solo los suyos (`id_propietario = usuario de la sesión`), con `dentro`, sin historial de otros propietarios.

## R-11 · Semilla

- **Decisión**: 6 vehículos con su periodo abierto en `historial_propietario` (fecha: inicio de la semilla):

  | Placa | Tipo | Propietario |
  |---|---|---|
  | ABC123 | carro | Andrea (4) |
  | QWE45A | moto | Andrea (4) |
  | FGH678 | carro | Carlos (5) |
  | JKL482 | carro | Valentina (6) |
  | MNP908 | carro | sin propietario |
  | RTY12 | moto | Mateo (7, inactivo) |

  Cumple el mínimo de 5 registros de la constitución.
- **Cuidado**: las pruebas de las specs 001–004 no cuentan vehículos; los vehículos aleatorios de `tests/setup/infraestructura.js` no pueden chocar con estas placas (se agregan a una lista de exclusión).

## R-12 · Bitácora (RF-VEH-09)

- **Decisión**: `registrarBitacora` en la misma transacción: `crear` (valor nuevo), `editar` (solo los campos que cambian, anterior y nuevo), `asignar_propietario` (anterior y nuevo `idPropietario`).
