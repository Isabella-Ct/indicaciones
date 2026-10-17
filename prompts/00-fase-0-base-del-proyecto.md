# FASE 0 — Base del proyecto, base de datos consolidada y autenticación

## Contexto
Vas a construir desde cero el sistema web de **Parking Lot ABC**. Todo el contexto permanente está en `CLAUDE.md` (stack, arquitectura, Atomic Design, roles, reglas de negocio). Esta es la primera fase: deja lista la base sobre la que se montarán los demás módulos.

## Lee primero (obligatorio, en este orden)
1. `CLAUDE.md` completo.
2. `docs/requerimientos.md` completo.
3. `docs/ficha-proyecto.md`.
4. `docs/bd-referencia/v1-ParkingLot.sql` y `docs/bd-referencia/v2-parqueaderodb.sql`.
5. `docs/diseno-parko/README.md`, `docs/diseno-parko/styles.css` y `docs/diseno-parko/index.html` (**sistema de diseño visual oficial**). Si puedes, abre `index.html` en el navegador para verlo.
6. Mira las imágenes de `docs/wireframes/` (solo para saber qué campos lleva cada pantalla).

Después de leer, **antes de escribir código**, responde con:
- Un resumen de 10 líneas de lo que entendiste del sistema.
- El plan de esta fase (archivos que vas a crear).
- Cualquier contradicción o duda que encuentres. Si no hay dudas, continúa.

## Objetivo
Proyecto Node/Express + MySQL funcionando, con BD consolidada, datos semilla, login por documento + contraseña con roles y permisos, y el sistema de componentes Atomic Design con el diseño visual PARKO.

## Tareas

### 1. Estructura y configuración
- Crea la estructura de carpetas exacta de `CLAUDE.md` §3.
- `backend/package.json` con scripts: `dev` (nodemon), `start`, `test`, `lint`, `format`, `db:reset` (ejecuta `schema.sql` + `seed.sql`).
- `.env.example` con: `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=parking_lot_abc`, `JWT_SECRET`, `JWT_EXPIRES_IN=8h`, `NODE_ENV`, `TZ=America/Bogota`.
- `.gitignore` (node_modules, .env, uploads/*), ESLint + Prettier, `git init` con un primer commit.
- `app.js`: helmet, json, cookie-parser, rate limit, estáticos de `frontend/`, rutas `/api/v1`, 404 y `errorHandler` centralizado con el formato de error de `CLAUDE.md` §4.
- `GET /api/v1/salud` → `{ data: { estado: "ok", bd: "ok" } }` (prueba la conexión a MySQL).

### 2. Base de datos consolidada (`backend/database/schema.sql`)
Diseña las tablas listadas en `CLAUDE.md` §8 cumpliendo **todos** los REQ. Campos mínimos obligatorios:

- **usuarios:** id (código autoincremental, REQ-USR-2), tipo_documento ENUM('CC','CE','TI','PAS','NIT'), numero_documento (UNIQUE junto con tipo), primer_nombre, segundo_nombre NULL, primer_apellido, segundo_apellido NULL, correo UNIQUE, celular, foto_url NULL, contrasena_hash, debe_cambiar_contrasena, estado ENUM('activo','inactivo'), rol_id, creado_por NULL, timestamps.
- **parqueaderos:** id, nombre, direccion, ciudad (semilla: Parqueadero ABC, Carrera 43 # 47-53, Medellín). La capacidad se calcula contando celdas.
- **pisos:** id, parqueadero_id, nombre (ej. "Sótano 1"), orden, texto_carril (ej. "ENTRADA → | → CIRCULACIÓN → | → RAMPA S2", separado por `|`).
- **puertas:** id, parqueadero_id, nombre, tipo ENUM('entrada','salida','mixta'), activa.
- **celdas:** id, parqueadero_id, piso_id, codigo (UNIQUE por parqueadero), area, tipo ENUM('moto','carro'), es_accesible, fila_mapa ENUM('superior','inferior'), posicion, estado ENUM('disponible','ocupada','reservada','fuera_servicio'), vehiculo_actual_id NULL, nota NULL, activa.
- **vehiculos:** id, placa UNIQUE, tipo ENUM('moto','carro'), color, marca, modelo, usuario_id NULL (visitantes sin propietario), activo, timestamps.
- **vehiculos_historial_propietario:** vehiculo_id, usuario_anterior_id, usuario_nuevo_id, cambiado_por, fecha.
- **pico_placa:** id, tipo_vehiculo, dia_semana (1=lunes … 7=domingo), digito (0–9), hora_inicio, hora_fin, activa.
- **estadias:** id, codigo_ticket UNIQUE, vehiculo_id, celda_id, puerta_entrada_id, puerta_salida_id NULL, fecha_hora_entrada, fecha_hora_salida NULL, minutos_estadia NULL, requiere_accesible, observaciones_entrada NULL (daños visibles, objetos de valor), deja_llaves, estado ENUM('en_curso','finalizada'), registrada_entrada_por, registrada_salida_por NULL.
- **accesos_denegados:** id, placa, puerta_id, fecha_hora, motivo, regla_pico_placa_id NULL, registrado_por.
- **lecturas_placa:** id, placa_leida, imagen_url NULL, fecha_hora, estadia_id NULL.
- **tarifas:** id, tipo_vehiculo, valor_fraccion, minutos_fraccion, minutos_gracia, valor_dia_maximo, vigente_desde, activa.
- **descuentos:** id, nombre, descripcion, porcentaje DECIMAL(5,2) con CHECK 0–100, activo.
- **membresias:** id, usuario_id, vehiculo_id, celda_asignada_id NULL (celda fija), tipo ENUM('mensual','anual'), valor, fecha_inicio, fecha_fin, estado ENUM('activa','vencida','cancelada').
- **facturas:** id, numero UNIQUE, concepto ENUM('estadia','membresia'), estadia_id NULL, membresia_id NULL, subtotal, descuento_id NULL, valor_descuento, total, metodo_pago ENUM('efectivo','tarjeta','transferencia'), observacion NULL, fecha_pago, registrada_por.
- **reservas:** id, usuario_id, vehiculo_id, celda_id, fecha_hora_reserva, fecha_hora_expiracion, estado ENUM('pendiente','confirmada','cumplida','cancelada','expirada').
- **tipos_incidencia** + **incidencias:** id, codigo UNIQUE, tipo_incidencia_id, vehiculo_id, celda_id NULL, descripcion, fecha_hora, registrada_por.
- **notificaciones:** id, usuario_id (destinatario), titulo, mensaje, tipo, leida, created_at.
- **configuracion:** clave PK, valor, descripcion (ej. `reserva_minutos_expiracion=30`, `membresia_valor_mensual_carro`, etc.).
- **roles / permisos / roles_permisos** (PK compuesta rol_id+permiso_id).

Al final del archivo agrega un comentario que explique **qué tomaste de v1, qué de v2 y qué corregiste**.

### 3. Datos semilla (`backend/database/seed.sql`)
- 3 roles + todos los permisos con su asignación según la matriz de `CLAUDE.md` §6.
- Usuarios de prueba (contraseñas hasheadas con bcrypt; genera los hashes con un script `backend/database/generar-seed.js` si hace falta): 1 administrador, 2 operadores, 5 usuarios-cliente. Documenta documento/contraseña de prueba **en el README**, no en el chat.
- 1 parqueadero, 2 puertas (Norte mixta, Sur mixta) y **la misma distribución de la maqueta PARKO (44 celdas)**:
  - **Sótano 1** (carril "ENTRADA → | → CIRCULACIÓN → | → RAMPA S2"): fila superior `A-01…A-12`, fila inferior `B-01…B-12`, todas de carro; `A-01` y `B-01` accesibles; `A-09` fuera de servicio con nota "Filtración en el techo".
  - **Sótano 2** (carril "← RAMPA S1 | ← CIRCULACIÓN ← | SALIDA ←"): fila superior `C-01…C-08` de carro, fila inferior `M-01…M-12` de moto.
- 10 vehículos (carros y motos con placas colombianas válidas) asignados a clientes, 2 sin propietario; 2 mensualidades con celda fija (como `A-04` y `B-09` en la maqueta).
- Algunas estadías **en curso** para que el mapa no arranque vacío.
- Reglas de pico y placa de ejemplo, tarifas de ejemplo de `CLAUDE.md` §7 (carro $120/min con tope de $28.000, moto $60/min con tope de $12.000), 3 descuentos, 4 tipos de incidencia, valores de `configuracion`.
- Algunas estadías históricas finalizadas y facturas de las últimas 2 semanas (para que los reportes de la Fase 6 tengan datos).

### 4. Autenticación y autorización
- `POST /api/v1/auth/login` (tipo_documento, numero_documento, contrasena) → cookie JWT httpOnly + datos básicos del usuario y sus permisos. Rechaza usuarios inactivos con mensaje claro.
- `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`, `POST /api/v1/auth/cambiar-contrasena`.
- Middlewares `auth` (verifica JWT) y `requirePermiso(codigo)`.
- Rate limit en login según `CLAUDE.md` §7.

### 5. Frontend base (diseño PARKO + Atomic Design)
- `styles/tokens.css`: copia **exacta** de la sección "1. Tokens" de `docs/diseno-parko/styles.css`. `styles/base.css`: sección "2. Base" (reset, body con textura de concreto, foco naranja) y la utilidad `.hidden`. `main.css` importa tokens, base y el CSS de cada componente. Fuentes de Google Fonts como en la maqueta.
- Sprite de iconos SVG con los símbolos de la maqueta.
- Atoms: `btn` (y variantes), `icon-button`, `icon`, `input`, `input--plate`, `select`, `textarea`, `label-caps`, `status-chip`, `plate`, `meter`, `spinner`.
- Molecules: `field` (label + control + mensaje de error), `tiles`, `check`, `kpi`, `empty-state`, `brand`, `shift` (fecha y hora reales que se actualizan cada minuto), `toast`.
- Organisms: `header` (`brand` "P" + **PARKO** con subtítulo "Parqueadero ABC · Medellín" desde la BD + `shift` + menú de usuario), `navbar` (según `CLAUDE.md` §5.1; muestra solo los ítems que el rol puede ver), `modal` (`modal-head` / `modal-body` / `modal-foot`, cierra con Esc), `footer`.
- Templates: `auth-layout` (fondo concreto, `panel` centrado con `panel-head` oscuro y `hazard-strip`), `app-layout` (header + navbar + `hazard-strip` + `main.page` con `page-head`).
- `js/services/api.js`: wrapper de `fetch` con `credentials: 'include'`, manejo de errores y redirección a login si responde 401.
- Páginas: `login.html` (tipo de documento con `select`, número de documento y contraseña; botón amarillo "Ingresar"), `app/inicio.html` (bienvenida con el nombre y el rol en un `page-head`; dashboard real en la Fase 6), pantalla de cambio de contraseña obligatoria en el primer acceso.
- `frontend/index.html`: página pública provisional con el mismo estilo y enlace a login (se completa en la Fase 7).
- Crea `frontend/js/components/README.md` con el catálogo de componentes y cómo crear uno nuevo.
- Crea `frontend/app/_catalogo.html` (solo en desarrollo) que muestre todos los atoms y molecules con sus variantes, para comparar a simple vista con la maqueta.

### 6. Tests y README
- Tests: `/salud`, login correcto, contraseña incorrecta, usuario inactivo, ruta protegida sin token (401), ruta sin permiso (403).
- `README.md`: requisitos (Node, MySQL 8), instalación, `.env`, `npm run db:reset`, `npm run dev`, usuarios de prueba, estructura del proyecto.

## Criterios de aceptación
- [ ] `npm run db:reset` crea la BD sin errores y carga la semilla.
- [ ] `npm run dev` levanta en `http://localhost:PORT` y `/api/v1/salud` responde ok.
- [ ] Puedo iniciar sesión con los 3 roles y el navbar muestra opciones distintas según el rol.
- [ ] Un usuario inactivo no puede entrar; 5 intentos fallidos bloquean temporalmente.
- [ ] La contraseña nunca aparece en respuestas de la API ni en logs.
- [ ] Login, inicio y el catálogo de componentes se ven con el estilo de `docs/diseno-parko/` (mismos colores, fuentes, bordes rectos, franja de peligro) y funcionan a 375 px de ancho.
- [ ] Los tokens de `frontend/styles/tokens.css` son idénticos a los de la maqueta.
- [ ] `npm test` y `npm run lint` pasan.

## Al terminar
Haz commit y entrégame: resumen de lo hecho, árbol de archivos creado, cómo probarlo paso a paso y cualquier decisión que hayas tomado sin estar en `CLAUDE.md`. **No empieces la Fase 1.**
