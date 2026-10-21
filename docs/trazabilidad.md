# PARKO · Matriz de trazabilidad

Cada requerimiento de [`requerimientos.md`](requerimientos.md) (30 originales + 12 derivados del alcance v2) → endpoints de la API ([`api.md`](api.md)) → pantallas → pruebas automáticas que lo verifican → estado.

- Las rutas son relativas a `/api/v1`; las pantallas, a `frontend/`.
- Las pruebas están en `backend/tests/` (`archivo › grupo`). Todas corren con `npm test` (**234 pruebas, 14 suites**; ver la lista de verificación manual en [`verificacion-manual.md`](verificacion-manual.md)).
- Estado: ✅ cumplido y probado · ⚠️ cumplido con una decisión del cliente o una limitación documentada · ❌ no cumplido. **No queda ningún requerimiento en ❌.**

## A. Requerimientos originales (30)

### Usuario

| REQ | Endpoints | Pantallas | Pruebas | Estado |
|---|---|---|---|---|
| **REQ-USR-1** — solo 3 perfiles iniciales | Semilla `roles` + `permisos` + `roles_permisos`; `GET /roles` | Navbar y pantallas según permisos (`utils/navegacion.js`); "Sin acceso" si se abre por URL una pantalla ajena | `auth.test › Rutas protegidas` (403 sin permiso); `auth.test › el cliente no recibe permisos de administración` | ✅ |
| **REQ-USR-2** — admin y operador crean usuarios (documento, nombre, correo, celular, foto, tipo); código autoincremental | `POST /usuarios` (multipart, foto opcional) | `app/usuarios.html` (Crear usuario) | `usuarios-vehiculos.test › Usuarios — creación` y `› foto`; `reglas-negocio.test › Usuarios` (operador no crea admin; rol inexistente); `flujo-completo.test › 1` | ✅ El nombre se guarda en 4 campos (nombres y apellidos) |
| **REQ-USR-3** — solo el admin activa/inactiva | `PATCH /usuarios/:id/estado` (`usuarios.cambiar_estado`) | `app/usuarios.html` (con confirmación) | `usuarios-vehiculos.test › el administrador inactiva un usuario y este ya no puede entrar`; `› no puede inactivarse a sí mismo`; `auth.test › usuario inactivo → 403` | ✅ |
| **REQ-USR-4** — cada usuario edita sus datos y se notifica al admin | `PUT /usuarios/me` (`perfil.editar`) | `app/mi-cuenta.html` | `usuarios-vehiculos.test › Mis datos`; `incidencias-notificaciones.test › REQ-USR-4…`; `reglas-negocio.test › mis datos: correo ajeno → 409; sin cambios no notifica` | ✅ |
| **REQ-USR-5** — el admin edita cualquier usuario | `PUT /usuarios/:id`, `PATCH /usuarios/:id/contrasena` (`usuarios.editar`) | `app/usuarios.html` (Editar, Contraseña) | `usuarios-vehiculos.test › solo el administrador edita usuarios`; `reglas-negocio.test › el admin no puede quitarse su rol`, `› el admin restablece la contraseña…` | ✅ Incluye asignar una contraseña temporal a quien la olvidó (no hay recuperación por correo) |
| **REQ-USR-6** — admin u operador asignan un vehículo a un usuario | `POST /vehiculos` con `usuario_id`; `PATCH /vehiculos/:id/propietario`; `GET /usuarios/buscar` | `app/vehiculos.html` (buscador de cliente por documento) | `usuarios-vehiculos.test › el operador asigna propietario a un vehículo sin dueño`; `flujo-completo.test › 3` | ✅ |
| **REQ-USR-7** — admin y operador entran con documento y contraseña | `POST /auth/login` | `login.html` | `auth.test › POST /api/v1/auth/login` (cookie httpOnly, 401, 422, 429) | ✅ |
| **REQ-USR-8 [AJUSTADO]** — todos los roles con documento + contraseña | `POST /auth/login`, `POST /auth/cambiar-contrasena` | `login.html`, `app/cambiar-contrasena.html` | `auth.test › con contraseña temporal solo puede usar /auth/me`; `flujo-completo.test › 2` | ✅ Ajuste aprobado por el cliente (acceder solo con el documento era inseguro) |

### Vehículo

| REQ | Endpoints | Pantallas | Pruebas | Estado |
|---|---|---|---|---|
| **REQ-CAR-1** — admin u operador crean vehículos (placa, color, marca, modelo + tipo) | `POST /vehiculos` (`vehiculos.crear`) | `app/vehiculos.html`; modal "Registrar ingreso" (visitante nuevo) | `usuarios-vehiculos.test › Vehículos` (placa por tipo, normalizada, duplicada) | ✅ |
| **REQ-CAR-2** — solo el admin edita vehículos | `PUT /vehiculos/:id` (`vehiculos.editar`) | `app/vehiculos.html` | `usuarios-vehiculos.test › solo el administrador edita vehículos` | ✅ |
| **REQ-CAR-3** — solo el admin reasigna a otro usuario | `PATCH /vehiculos/:id/propietario`; `GET /vehiculos/:id/historial` | `app/vehiculos.html` (historial de propietarios) | `usuarios-vehiculos.test › el operador NO puede reasignar…`; `› el administrador reasigna y queda en el historial` | ✅ |
| **REQ-CAR-4** — tabla de restricciones (pico y placa) | `GET/POST/PUT/PATCH /pico-placa`, `GET /pico-placa/hoy` | `app/pico-placa.html` | `pico-placa.unit.test › evaluarRestriccion`; `estadias.test › Pico y placa`; `reglas-negocio.test › Pico y placa` (solape, 404, inactivar) | ✅ |

### Accesos y salidas

| REQ | Endpoints | Pantallas | Pruebas | Estado |
|---|---|---|---|---|
| **REQ-INEX-1** — registrar entrada (puerta, placa, fecha y hora) | `GET /estadias/previsualizar`, `POST /estadias/entrada` | `app/celdas.html` → modal "Registrar ingreso" (ticket en vivo) | `estadias.test › Entradas`; `flujo-completo.test › 6`; `reglas-negocio.test › la entrada exige una puerta activa`; retos 7 y 8 de la maqueta en la app real | ✅ La fecha y la hora las pone el servidor (decisión de CLAUDE.md) |
| **REQ-INEX-2** — registrar salida (puerta, placa, fecha y hora) | `POST /estadias/salida` (placa o ticket), `POST /estadias/:id/pagar` | `app/celdas.html` (detalle → "Registrar salida y cobrar", buscador placa/ticket) | `estadias.test › Salidas`; `flujo-completo.test › 7–8`; reto 6 | ✅ |
| **REQ-INEX-3** — conteo de tiempo entre entrada y salida | Cálculo de `minutos_estadia` en el servidor | Detalle de celda (tiempo dentro en vivo) | `pico-placa.unit.test › tiempo de estadía`; `estadias.test › la liquidación preliminar calcula los minutos`; reto 4 | ✅ |
| **REQ-INEX-4** — negar la entrada por pico y placa | `POST /estadias/entrada` → 403 `PICO_Y_PLACA` + `accesos_denegados`; `GET /accesos-denegados` | Modal de ingreso (motivo); notificación al admin | `estadias.test › entrada rechazada por pico y placa → 403 y queda en accesos_denegados` | ✅ |

### Incidencias

| REQ | Endpoints | Pantallas | Pruebas | Estado |
|---|---|---|---|---|
| **REQ-INCD-1** — registrar incidencias con código único, vehículo, fecha, hora y tipo | `POST/GET /incidencias`, `/tipos-incidencia`, `GET /usuarios/me/incidencias` | `app/incidencias.html`; pestaña Incidencias en `app/mis-movimientos.html` | `incidencias-notificaciones.test › Incidencias` (código `INC-AAAAMMDD-NNNN`, simultáneas, notifica a admin y propietario) | ✅ |

### Celdas

| REQ | Endpoints | Pantallas | Pruebas | Estado |
|---|---|---|---|---|
| **REQ-CLD-01** — ver celdas disponibles u ocupadas por área y piso (estado, código, tipo, área) | `GET /pisos`, `GET /celdas`, `GET /celdas/resumen`, SSE `/celdas/stream` | `app/celdas.html` (mapa por piso, KPIs, en vivo) | `celdas.test › Consulta de celdas`, `› Tiempo real (SSE)`; retos 1–5 | ✅ |
| **REQ-CLD-02** — los usuarios ven las celdas desde su cuenta | Mismos endpoints (el cliente no recibe placas ajenas) | `app/disponibilidad.html` (portal, solo lectura, reservar) | `celdas.test › el cliente NO recibe placas ni titulares`; `reservas.test › mapa del cliente…` | ✅ |
| **REQ-CLD-03** — cambiar el estado de una celda (ocupada con su vehículo) | `PATCH /celdas/:id/estado`; CRUD `POST/PUT/PATCH /celdas` (admin) | Detalle de celda (ocupar, liberar, fuera de servicio) y "Gestionar celdas" | `celdas.test › Cambio de estado`, `› Gestión de celdas y puertas`; `reglas-negocio.test › Cambio manual de estado de celdas` | ✅ |

### Reportes (administrador)

Todos en `app/reportes.html` (pestañas REP-01…11, filtros, exportar CSV, imprimir), con permiso `reportes.ver`. Pruebas comunes: `reportes.test › Permisos`, `› Validación de rangos`, `› Exportación CSV de todos los reportes`, `› Rendimiento` (< 1 s con la semilla).

| REQ | Endpoint | Pruebas específicas | Estado |
|---|---|---|---|
| **REQ-REP-01** — usuarios con todos sus datos | `GET /reportes/usuarios` | `reportes.test › REP-01 usuarios con su rol y sin hash`; `flujo-completo.test › 11` | ✅ Nunca incluye la contraseña |
| **REQ-REP-02** — vehículos con su propietario | `GET /reportes/vehiculos` | `› REP-02 vehículos con propietario` | ✅ |
| **REQ-REP-03** — entradas con fecha, hora y vehículo | `GET /reportes/entradas` | `› REP-03/04 entradas y salidas…`; `flujo-completo.test › 11` | ✅ |
| **REQ-REP-04** — salidas con fecha, hora y vehículo | `GET /reportes/salidas` | `› REP-03/04…`; `flujo-completo.test › 11` | ✅ |
| **REQ-REP-05** — todas las incidencias | `GET /reportes/incidencias` | `› Exportación CSV de todos los reportes` | ✅ |
| **REQ-REP-06** — vehículos que no ingresan un día por pico y placa | `GET /reportes/pico-placa?fecha=` | `› REP-06 pico y placa` | ✅ |
| **REQ-REP-07** — celdas ocupadas en un día | `GET /reportes/celdas-ocupadas?fecha=` | `› REP-07 celdas ocupadas y máximo simultáneo` | ✅ |
| **REQ-REP-08** — celdas más usadas en un lapso | `GET /reportes/celdas-mas-usadas` | `› REP-08/09 rankings` | ✅ |
| **REQ-REP-09** — vehículos que más usan el parqueadero | `GET /reportes/vehiculos-frecuentes` | `› REP-08/09 rankings` | ✅ |
| **REQ-REP-10** — horas y días de mayor ocupación | `GET /reportes/ocupacion` | `› REP-10 ocupación día × hora` | ✅ |

## B. Requerimientos derivados del alcance v2 (12)

| REQ | Endpoints | Pantallas | Pruebas | Estado |
|---|---|---|---|---|
| **REQ-TAR-1** — tarifas por tipo de vehículo | `GET/POST /tarifas`, `POST /tarifas/simular` | `app/tarifas.html` (vigentes, historial, simulador) | `facturacion.test › Tarifas`; `reglas-negocio.test › simular una tarifa propuesta y crear una con fracción…` | ✅ |
| **REQ-TAR-2** — cálculo automático (tarifa, tiempo, membresía, descuento) | `POST /estadias/salida`, `/estadias/:id/liquidar` | Detalle de celda (valor en vivo, % del tope) y modal de cobro | `cobro.unit.test` (gracia, fracción exacta, > 24 h, membresía, descuento, redondeo configurable); `facturacion.test › Cobro y facturas` | ✅ |
| **REQ-FAC-1** — registrar el pago (efectivo, tarjeta, transferencia) | `POST /estadias/:id/pagar` | Modal de cobro (método, descuento) | `facturacion.test › pagar ignora un total manipulado`, `› dos cobros simultáneos…`; `flujo-completo.test › 8` | ⚠️ Pago **simulado**, sin pasarela (decisión del cliente) |
| **REQ-FAC-2** — factura con consecutivo, PDF, visible para el cliente | `GET /facturas`, `/facturas/:id`, `/facturas/:id/pdf`, `/usuarios/me/facturas` | `app/facturacion.html`; pestaña Facturas en `app/mis-movimientos.html` | `facturacion.test › dos pagos simultáneos no repiten el número`, `› PDF de la factura`, `› el cliente ve y descarga solo sus facturas`; `flujo-completo.test › 10` | ⚠️ PDF interno, **no** facturación electrónica DIAN (decisión del cliente) |
| **REQ-TCK-1** — ticket con código único, imprimible | `GET /estadias/:id/ticket`, `/ticket.pdf` | Modal de ingreso (vista previa e "Imprimir ticket"); `app/historial.html` | `estadias.test › ticket PDF`; reto 7 | ✅ |
| **REQ-MEM-1** — membresías mensuales o anuales (usuario + vehículo) | `GET/POST /membresias`, `/membresias/cotizar`, `PATCH /membresias/:id/cancelar`, `/usuarios/me/membresias`; tarea horaria | `app/membresias.html`; pestaña Membresías en `app/mis-movimientos.html` | `facturacion.test › Membresías`; `reglas-negocio.test › Membresías`; `flujo-completo.test › 4 y 9` | ✅ |
| **REQ-DES-1** — descuentos (descripción + 0–100 %) | `GET/POST/PUT/PATCH /descuentos` | `app/descuentos.html`; selector en el cobro | `facturacion.test › Descuentos`; `reglas-negocio.test › Descuentos` | ✅ |
| **REQ-RES-1** — el cliente reserva una celda de su tipo; el admin gestiona | `POST/GET /reservas`, `PATCH /reservas/:id/cancelar`, `/usuarios/me/reservas`; tarea cada minuto | `app/disponibilidad.html` (Reservar con cuenta regresiva); `app/reservas.html` (admin/operador: listado, cancelación y **Nueva reserva** para el vehículo de un cliente) | `reservas.test` completo; `flujo-completo.test › 5–6`, `› Concurrencia` | ✅ |
| **REQ-NOT-1** — notificaciones internas y mensajes manuales del admin | `GET/PATCH /notificaciones/mias…`, SSE `/notificaciones/stream`, `POST /notificaciones` | Campana del header (contador en vivo); `app/notificaciones.html` (bandeja y envío) | `incidencias-notificaciones.test › Notificaciones` | ✅ Sin correos ni SMS (fuera de alcance) |
| **REQ-PLA-1** — lectura de placa (digitada + foto opcional) | `POST /estadias/entrada` (campo `foto`), `/uploads/lecturas` (solo personal) | Modal de ingreso ("Foto de la placa") | `estadias.test › placa no registrada → 404 y la lectura queda guardada`; `usuarios-vehiculos.test › foto` (JPG/PNG ≤ 2 MB por firma real) | ⚠️ Reconocimiento **simulado**, sin OCR (decisión del cliente) |
| **REQ-REP-11** — reporte financiero | `GET /reportes/financiero` | `app/reportes.html` (REP-11, gráficos propios) | `reportes.test › REP-11 financiero`, `› REP-11 en CSV`; `flujo-completo.test › 11` | ✅ |
| **REQ-WEB-1** — página pública con información, tarifas, disponibilidad en vivo y acceso al login | `GET /parqueadero` (incluye la `ubicacion` de la sede), `/publico/disponibilidad`, `/publico/disponibilidad/stream`, `/publico/tarifas`, `/publico/pico-placa-hoy` | `index.html` (hero, disponibilidad en vivo, tarifas, servicios, pico y placa, ubicación OpenStreetMap) | `reservas.test › Endpoints públicos` (sin placas, nombres ni documentos); `celdas.test › Disponibilidad pública`; Lighthouse: Accesibilidad 100, Buenas prácticas 100, SEO 100 | ✅ |

## C. Reglas de CLAUDE.md verificadas en la Fase 8

| Regla | Dónde | Verificación |
|---|---|---|
| Valores ⚙️ en BD y editables desde la UI de admin | `configuracion` → `GET/PUT /configuracion` (nuevo en la Fase 8) + panel "Parámetros del negocio" en `app/tarifas.html`; tarifas, descuentos y pico y placa en sus pantallas | `reglas-negocio.test › Parámetros del negocio`; `cobro.unit.test › el redondeo es configurable` |
| Transacciones de entrada, pago y reserva frente a concurrencia | `FOR UPDATE` + índices únicos sobre columnas generadas ([`modelo-datos.md`](modelo-datos.md#transacciones-que-protegen-la-consistencia)) | `flujo-completo.test › Concurrencia`; `facturacion.test › dos cobros simultáneos` |
| Cada ruta con zod y `requirePermiso` | Tabla en [`api.md`](api.md) (109 endpoints, generada del código) | Revisión automática del árbol de rutas |
| Permisos de §6 reflejados en la interfaz (operador consulta tarifas, descuentos y membresías; personal reserva para clientes; admin gestiona puertas) | Menú (`utils/navegacion.js`) y pantallas | Recorrido automático en Edge con los 3 roles |
| Pantallas protegidas por permiso | `montarApp` muestra "Sin acceso" y no carga datos | Recorrido automático en Edge con los 3 roles |
| Atomic Design, sin `innerHTML`, sin colores fuera de tokens | `frontend/js/components`, `styles/tokens.css` | Revisión automática de imports por nivel; ESLint bloquea `innerHTML` |
| Accesibilidad (labels, foco naranja, `aria-modal`, Esc devuelve el foco, tablist) | Componentes `modal`, `level-tabs`, `field`, `toast` | Lighthouse 100 en las pantallas medidas; prueba automática de Esc/foco |
| Retos 1–8 de `docs/diseno-parko/script.js` | `app/celdas.html` | Los 8 pasan en la app real (ver `verificacion-manual.md`) |

## Fuera de alcance (decisión del cliente)

- Reconocimiento óptico real de placas (OCR / cámaras).
- Facturación electrónica DIAN.
- Pasarela de pagos real.
- Envío de correos y SMS (por eso la contraseña olvidada la restablece el administrador).
