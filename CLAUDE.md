# CLAUDE.md — Parking Lot ABC

Este archivo es el contexto permanente del proyecto. Léelo completo antes de cualquier tarea. Si algo de este archivo contradice un prompt, **pregunta antes de actuar**.

## 1. Qué es

**PARKO** es el sistema web de gestión de parqueaderos; su primera sede es **Parqueadero ABC** (Carrera 43 # 47-53, Medellín, Colombia; carros y motos; abierto 24 h). Reemplaza la operación manual: entradas/salidas, celdas, pico y placa, cobro, membresías, reservas, incidencias, notificaciones y reportes. Incluye una página pública y un portal para clientes.

Documentación de referencia en `docs/`:
- `docs/requerimientos.md` — **fuente de verdad funcional** (REQ-XXX). Cita el código REQ en commits y comentarios de rutas.
- `docs/ficha-proyecto.md` — contexto de negocio y casos de uso.
- `docs/diseno-parko/` — **sistema de diseño visual oficial** (maqueta HTML + CSS "plano industrial"). Lee su `README.md`.
- `docs/wireframes/*.png` — solo para saber **qué campos** lleva cada pantalla (ver correcciones en `requerimientos.md` §C). Su estilo visual (azul) **ya no aplica**.
- `docs/bd-referencia/*.sql` — dos borradores de BD **solo como referencia**; la BD real es la consolidada en `backend/database/`.

## 2. Stack (obligatorio, no cambiar sin preguntar)

- **Backend:** Node.js (LTS) + Express + MySQL 8 (driver `mysql2/promise`, SQL plano con consultas parametrizadas; **sin ORM**).
- **Frontend:** HTML + CSS + JavaScript vanilla (ES modules nativos). **Sin frameworks** (nada de React/Vue/Bootstrap/Tailwind/jQuery) y **sin bundler**. Express sirve el frontend como estático.
- **Arquitectura frontend:** **Atomic Design** (ver §5).
- Librerías backend permitidas: `express`, `mysql2`, `bcrypt`, `jsonwebtoken`, `cookie-parser`, `dotenv`, `helmet`, `cors`, `express-rate-limit`, `multer` (fotos), `pdfkit` (tickets/facturas), `zod` (validación). Dev: `nodemon`, `jest`, `supertest`, `eslint`, `prettier`. Cualquier otra: pregunta primero.
- Iconos: **sprite SVG propio** (`<symbol>` con trazo, como en `docs/diseno-parko/index.html`), sin librerías de iconos. Fuentes por Google Fonts: **Barlow Condensed** (títulos), **Barlow** (texto) e **IBM Plex Mono** (datos, placas, horas, valores).

## 3. Estructura de carpetas

```
/
├── CLAUDE.md
├── docs/                       # documentación (no modificar salvo pedido)
├── backend/
│   ├── src/
│   │   ├── app.js              # configura Express (middlewares, rutas, estáticos)
│   │   ├── server.js           # arranca el servidor
│   │   ├── config/             # env, db pool, constantes
│   │   ├── middlewares/        # auth, requirePermiso, validate, errorHandler, upload
│   │   ├── modules/            # un folder por módulo de negocio
│   │   │   └── <modulo>/       # <modulo>.routes.js, .controller.js, .service.js, .repository.js, .schemas.js
│   │   ├── utils/              # fechas (zona America/Bogota), placas, dinero, pdf, errores
│   │   └── realtime/           # SSE de ocupación de celdas
│   ├── database/
│   │   ├── schema.sql          # BD consolidada (fuente de verdad del modelo)
│   │   ├── seed.sql            # datos iniciales y de prueba
│   │   └── migrations/         # cambios posteriores numerados 001_*.sql
│   ├── tests/
│   ├── uploads/                # fotos (gitignored)
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── index.html              # página pública
    ├── login.html
    ├── app/                    # páginas internas (una .html por pantalla)
    ├── assets/                 # img, logo
    ├── styles/
    │   ├── tokens.css          # variables de diseño
    │   ├── base.css            # reset + tipografía
    │   └── main.css            # @import de tokens, base y CSS de componentes
    └── js/
        ├── components/
        │   ├── atoms/
        │   ├── molecules/
        │   ├── organisms/
        │   └── templates/
        ├── pages/              # un controlador JS por página
        ├── services/           # api.js (fetch wrapper) + un servicio por módulo
        └── utils/              # formato COP, fechas, validación de placa, auth/rol
```

Capas backend: **routes → controller → service → repository**. El controller no toca SQL; el repository no tiene lógica de negocio; las reglas de negocio viven en el service.

## 4. Convenciones

- Idioma: **español** en BD, endpoints, variables de dominio, UI y mensajes. Código en `camelCase`, BD en `snake_case`, archivos en `kebab-case` o `<modulo>.<capa>.js`.
- API REST bajo `/api/v1/...`. Respuestas JSON: éxito `{ "data": ..., "meta"?: ... }`, error `{ "error": { "codigo": "...", "mensaje": "...", "detalles"?: [...] } }`. Códigos HTTP correctos (400, 401, 403, 404, 409, 422, 500).
- Paginación en listados: `?pagina=1&limite=20`, filtros por query string.
- Toda entrada se valida con `zod` en el backend (el frontend también valida, pero nunca se confía en él).
- **Zona horaria:** `America/Bogota`. Las fechas/horas de entrada, salida, incidencias y pagos **las pone el servidor**, no el cliente.
- Dinero: pesos colombianos (COP), `DECIMAL(12,2)` en BD, mostrado como `$ 12.500` (sin decimales) en UI.
- Placas: se guardan en MAYÚSCULAS sin espacios ni guiones. Carro: `^[A-Z]{3}\d{3}$`. Moto: `^[A-Z]{3}\d{2}[A-Z]?$`.
- Nunca credenciales en código: todo en `.env` (con `.env.example` documentado).
- Commits pequeños por funcionalidad, mensaje en español: `feat(movimientos): registrar salida y calcular cobro (REQ-INEX-2, REQ-TAR-2)`.

## 5. Diseño visual y Atomic Design (frontend vanilla)

### 5.1 Sistema de diseño PARKO (obligatorio)
- El aspecto visual de **toda** la aplicación (panel interno, login y página pública) sigue `docs/diseno-parko/`: estilo **plano industrial**, con concreto, asfalto, amarillo de seguridad, franjas de peligro, títulos condensados en mayúsculas, **esquinas rectas (border-radius 0) y cero sombras decorativas**.
- `docs/diseno-parko/styles.css` es la fuente de verdad. Sus tokens (`--concrete`, `--panel`, `--asphalt`, `--asphalt-2/3`, `--line`, `--yellow`, `--orange`, `--green`, `--blue`, `--red`, `--steel`, `--ink`, `--ink-2`, `--hazard`, `--font-display`, `--font`, `--font-mono`) se copian **tal cual** a `frontend/styles/tokens.css`. Puedes agregar tokens nuevos (espaciados, z-index), pero no cambiar los existentes. Ningún color "suelto" fuera de tokens.
- **Se conservan los nombres de clase de la maqueta** (`btn`, `panel`, `panel-head`, `kpi`, `space`, `space--free`, `status-chip`, `modal`, `ticket`, `field`, `tiles`, `log`, etc.) y su convención: bloque + `--modificador` + estados `is-active` / `is-selected` + utilidad `hidden`. Las clases nuevas siguen esa misma convención.
- Pantallas que la maqueta no muestra (tablas de usuarios, formularios, reportes, login, página pública) se construyen **con los mismos componentes y el mismo lenguaje visual**: tablas con el estilo `log`, formularios con `field` + `input` dentro de un `panel`, títulos de página con `page-head`, acciones con `btn`.
- **Navbar:** la maqueta no tiene. Créalo debajo del `header` y antes de la `hazard-strip`: fondo `--asphalt-2`, ítems en `--font-display` en mayúsculas, ítem activo con fondo `--yellow` (igual que `level-tab.is-active`). Solo muestra los módulos permitidos al rol. En móvil (≤ 760 px) se vuelve un menú desplegable con botón `icon-button`.
- **Marca:** el sistema se llama **PARKO** (fijo, en `brand`, `<title>` de las páginas como "PARKO · <pantalla>" y documentos PDF). El subtítulo es la sede: **"Parqueadero ABC · Medellín"**, que sale de la tabla `parqueaderos` (nombre + ciudad), no del código.
- **Header:** `brand` con `brand-mark` "P" + "PARKO" + `<small>` con la sede; a la derecha el bloque `shift` con fecha y hora **reales** y "Turno: <puerta> · <usuario en sesión>"; además la campana de notificaciones y el menú de usuario (Mi cuenta / Cerrar sesión).
- Lo que **no** se copia de la maqueta está listado en `docs/diseno-parko/README.md`.

### 5.2 Atomic Design
- Cada componente es una **función JS que recibe un objeto de props y devuelve un `HTMLElement`**, con su CSS al lado: `js/components/atoms/button/button.js` + `button.css`. El CSS de la maqueta se reparte en estos archivos sin cambiar los valores.
- El mapeo de las clases de la maqueta a atoms, molecules, organisms y templates está en `docs/diseno-parko/README.md`. Componentes adicionales que se necesitan: atoms `spinner`, `link`, `avatar`; molecules `search-box`, `pagination`, `date-range`, `toast`; organisms `navbar`, `footer`, `data-table` (basado en `log`, con orden, paginación y estado vacío), `notification-bell`.
- **Pages:** archivos `.html` mínimos que cargan `main.css` y un `js/pages/<pagina>.js`, que monta el template y los organisms.
- Reglas: un nivel solo importa niveles inferiores. Los componentes no llaman a la API (eso lo hacen las pages a través de `services/`). Escapa siempre el texto: usa `textContent`, nunca `innerHTML` con datos del usuario. Los datos de una celda se guardan en el estado JS de la página, **no** en atributos `data-*` (solo `data-id`).
- Iconos: un único sprite SVG (`frontend/assets/icons.svg` o inyectado al cargar) con los símbolos de la maqueta (`car-top`, `moto-top`, `i-in`, `i-x`, `i-print`, `i-car`, `i-moto`, `i-wheel`) más los que hagan falta, dibujados con el mismo estilo de trazo (stroke 2.2, terminaciones cuadradas).
- **Responsive:** mínimo 360 px de ancho, con los puntos de corte de la maqueta (1180 px y 760 px). En móvil, el mapa y las tablas hacen scroll horizontal dentro de su contenedor.
- **Accesibilidad:** labels asociados, foco visible (`outline` naranja de la maqueta), contraste AA, `role="tablist"` / `aria-selected` en pestañas, `aria-modal` en modales, `aria-live` en el detalle y en los toasts. Cerrar modales con Esc y devolver el foco al botón que los abrió.

## 6. Roles y permisos

Tres roles iniciales (REQ-USR-1): `administrador`, `operador`, `usuario` (cliente). Permisos en tabla `permisos` con códigos tipo `usuarios.crear`; el middleware `requirePermiso('codigo')` los verifica.

| Acción | Admin | Operador | Usuario |
|---|:-:|:-:|:-:|
| Crear usuarios (REQ-USR-2) | ✅ | ✅ (no puede crear administradores) | ❌ |
| Activar/inactivar usuario (REQ-USR-3) | ✅ | ❌ | ❌ |
| Editar cualquier usuario (REQ-USR-5) | ✅ | ❌ | ❌ |
| Editar mis datos (REQ-USR-4, notifica al admin) | ✅ | ✅ | ✅ |
| Crear vehículo / asignarlo a un usuario (REQ-CAR-1, REQ-USR-6) | ✅ | ✅ | ❌ |
| Editar vehículo / reasignarlo a otro usuario (REQ-CAR-2, REQ-CAR-3) | ✅ | ❌ | ❌ |
| Configurar pico y placa (REQ-CAR-4) | ✅ | ✅ | ❌ |
| Registrar entrada/salida, cobrar (REQ-INEX, REQ-FAC-1) | ✅ | ✅ | ❌ |
| Ver mapa de celdas (REQ-CLD-01/02) | ✅ | ✅ | ✅ (solo lectura) |
| Cambiar estado de celda (REQ-CLD-03) / CRUD celdas | ✅ | ✅ (solo estado) | ❌ |
| Registrar incidencias (REQ-INCD-1) | ✅ | ✅ | ❌ |
| Tarifas, descuentos, membresías | ✅ | ❌ (solo consulta) | ❌ |
| Reservar celda (REQ-RES-1) | ✅ | ✅ | ✅ (para sus vehículos) |
| Reportes (REQ-REP-*) | ✅ | ❌ | ❌ |
| Mis vehículos, mis facturas, mis reservas, mis notificaciones | — | — | ✅ |

Un usuario `inactivo` no puede iniciar sesión.

## 7. Reglas de negocio (valores por defecto, configurables en BD)

> Los valores marcados ⚙️ se guardan en BD (tabla `tarifas` o `configuracion`) y se editan desde la UI de admin. **Nunca los dejes "quemados" en el código.**

**Autenticación**
- Login con **tipo y número de documento + contraseña** para todos los roles. Contraseña ≥ 8 caracteres, con bcrypt (cost 10+).
- JWT en cookie `httpOnly`, `sameSite=strict`, expiración 8 h. Rate limit en login (5 intentos / 15 min por IP+documento).
- Al crear un usuario, el admin/operador define una contraseña temporal; el usuario debe cambiarla en su primer inicio de sesión (`debe_cambiar_contrasena`).

**Celdas**
- Cada celda: `codigo` único (ej. `A-01`, `M-12`), `piso` (nivel, ej. "Sótano 1"), `area` (fila de letras A, B, C, M), `tipo` (moto/carro), `es_accesible` (sí/no), `estado` (`disponible`, `ocupada`, `reservada`, `fuera_servicio`), `vehiculo_actual_id` cuando está ocupada y `nota` (motivo de fuera de servicio).
- Para dibujar el mapa como en la maqueta, cada celda tiene `fila_mapa` (`superior`/`inferior`, a cada lado del carril) y `posicion` (orden de izquierda a derecha). Cada piso tiene los textos del carril (ej. "ENTRADA → · → CIRCULACIÓN → · → RAMPA S2"), guardados en `configuracion` o en una tabla `pisos`.
- Un vehículo solo puede ocupar una celda de su mismo tipo. Las celdas **accesibles** se asignan primero a quien marcó "requiere celda accesible"; los demás solo las usan si no queda otra celda libre del tipo y el operador lo confirma. Un vehículo no puede tener dos estadías abiertas.
- Estado `reservada` tiene dos orígenes: una **mensualidad con celda fija** (se muestra con la etiqueta "MENSUAL", el titular y la placa) o una **reserva temporal** (REQ-RES-1).
- El cambio de estado se difunde en tiempo real por **SSE** (`/api/v1/celdas/stream`) al mapa y a la página pública.

**Pico y placa** ⚙️ (Medellín)
- Regla = (tipo de vehículo, día de la semana, dígito, hora inicio, hora fin, activa). Por defecto: **carros por último dígito, motos por primer dígito numérico**, lunes a viernes, 05:00–20:00 (semilla de ejemplo; el admin la edita).
- Al registrar una entrada, si la placa coincide con una regla activa en ese día y hora → **entrada rechazada** (REQ-INEX-4), se guarda en `accesos_denegados` y se muestra el motivo.
- Los vehículos con membresía activa **no** están exentos (la ley aplica igual).

**Entrada (REQ-INEX-1)**
- Se hace desde el **modal "Registrar ingreso"** de la maqueta. Datos: puerta, placa (campo amarillo grande en mayúsculas), tipo de vehículo (mosaicos Carro/Moto), casilla "requiere celda accesible", marca/modelo/color (solo si el vehículo no existe), celda asignada, observaciones (daños visibles, objetos de valor), casilla "deja las llaves en la caseta" y foto opcional de "lectura de placa" (REQ-PLA-1). El tipo de cliente (Visitante / Mensualidad) **lo detecta el sistema** según si hay membresía activa; no se elige a mano.
- Si la placa no existe, el operador la registra en el mismo modal como vehículo de visitante (sin propietario).
- El sistema sugiere la primera celda disponible del tipo correcto (el operador puede cambiarla), la marca `ocupada`, crea la estadía y genera un **ticket** con código único (`T-000123`). El ticket se previsualiza en vivo mientras se llena el formulario, como en la maqueta.
- Si el vehículo tenía una reserva vigente o una mensualidad con celda fija, se usa esa celda; la reserva pasa a `cumplida`.

**Salida y cobro (REQ-INEX-2/3, REQ-TAR-2)**
- Se busca la estadía abierta por placa o código de ticket. El servidor fija la hora de salida y calcula `minutos_estadia`.
- La salida se hace desde el **panel de detalle de la celda** (botón "Registrar salida y cobrar") o buscando la placa o el ticket.
- Cálculo ⚙️ por tipo de vehículo (modelo de la maqueta: **cobro por minuto con tope diario**):
  1. Si `minutos ≤ minutos_gracia` (por defecto 0) → $0.
  2. Si no: `fracciones = ceil(minutos / minutos_fraccion)` × `valor_fraccion`. Por defecto `minutos_fraccion = 1`, es decir, cobro por minuto.
  3. Por cada bloque de 24 h el cobro se topa en `valor_dia_maximo` ("tope del día").
  4. Membresía activa del vehículo en la fecha → total $0 (se registra igual la factura en $0 con motivo "membresía").
  5. Descuento opcional elegido por el operador (uno por factura) → `total = subtotal × (1 − porcentaje/100)`, redondeado a la centena más cercana.
- Tarifas de ejemplo para la semilla (las de la maqueta): **carro $120/min con tope de $28.000 por día; moto $60/min con tope de $12.000 por día**.
- El panel de detalle muestra en vivo: tiempo dentro, tarifa, tope, valor a pagar, `% del tope` con la barra `meter--orange` y la nota del cálculo (ej. "157 min × $120 = $18.840").
- Al confirmar el pago: método (efectivo/tarjeta/transferencia), se genera **factura** con número consecutivo (`FAC-000001`) y PDF; la celda vuelve a `disponible`; la estadía queda `finalizada`. Todo en **una transacción**.

**Membresías / mensualidades (REQ-MEM-1)**: tipo mensual o anual, usuario + vehículo, fecha inicio, fecha fin calculada (+1 mes / +1 año), valor ⚙️, estado y **celda fija opcional** (`celda_asignada_id`). Si tiene celda fija, esa celda queda `reservada` para el titular mientras el vehículo está fuera y `ocupada` cuando entra. Se cobra con factura propia. Notificación al cliente 3 días antes de vencer.

**Reservas (REQ-RES-1)**: el cliente elige una celda disponible del tipo de su vehículo; la celda pasa a `reservada` y la reserva vence a los ⚙️ 30 min si el vehículo no llega (estado `expirada`, celda liberada). Máximo una reserva activa por vehículo.

**Incidencias (REQ-INCD-1)**: tipos semilla: Rayón, Choque, Atropellamiento, Golpe contra muro. Código `INC-AAAAMMDD-0001`, vehículo afectado, celda opcional, descripción, fecha/hora del servidor, quién la registró. Genera notificación al admin y al propietario del vehículo.

**Notificaciones (REQ-NOT-1)**: internas (campana con contador de no leídas). Eventos automáticos: usuario edita sus datos → admin; incidencia → admin + propietario; entrada rechazada por pico y placa → admin; membresía por vencer → cliente; reserva expirada → cliente. El admin puede enviar mensajes manuales. **No** se envían correos ni SMS (fuera de alcance).

**Simulaciones (decisión del cliente)**: el reconocimiento de placa es **simulado** (placa digitada + foto opcional guardada); los pagos son **simulados** (sin pasarela); la factura es un **PDF interno**, no facturación electrónica DIAN.

## 8. Base de datos consolidada

Fuente de verdad: `backend/database/schema.sql` (MySQL 8, InnoDB, `utf8mb4`). Une los dos borradores de `docs/bd-referencia/` y corrige sus errores (claves primarias compuestas innecesarias, historiales que no permiten repetir vehículo/celda, campos faltantes). Tablas:

`roles`, `permisos`, `roles_permisos`, `usuarios`, `parqueaderos`, `pisos`, `puertas`, `celdas`, `vehiculos`, `vehiculos_historial_propietario`, `pico_placa`, `estadias` (entrada+salida+tiempo; reemplaza `ACCESO_SALIDAS`, `ingresos_salidas` e `HISTORIAL_PARQUEO`), `accesos_denegados`, `lecturas_placa`, `tarifas`, `descuentos`, `membresias`, `facturas`, `reservas`, `tipos_incidencia`, `incidencias`, `notificaciones`, `configuracion`.

Reglas: PK `id INT AUTO_INCREMENT`; FKs con `ON DELETE RESTRICT`; `created_at`/`updated_at` en tablas de negocio; índices en placa, documento, fechas de estadía y estados; **borrado lógico** (`activo`/`estado`) en usuarios, vehículos, celdas, tarifas y descuentos: nunca se borran registros con historial.

## 9. Calidad y verificación

- Antes de dar una fase por terminada: `npm run lint` sin errores, `npm test` en verde y la app arranca con `npm run dev`.
- Tests con Jest + supertest: como mínimo login, permisos por rol (403), cálculo de cobro (casos límite: gracia, fracción exacta, más de 24 h, membresía, descuento), pico y placa, y transacción de salida.
- Prueba manual en el navegador de cada pantalla nueva (escritorio y 375 px de ancho).
- Seguridad: consultas parametrizadas siempre, `helmet`, validación de archivos subidos (solo jpg/png, ≤ 2 MB), nunca devolver `contrasena_hash` en la API, errores 500 sin stack en producción.
- Al terminar cada fase, actualiza `README.md` (cómo instalar, variables `.env`, usuarios de prueba, endpoints nuevos) y reporta: qué se hizo, qué REQ cubre, qué quedó pendiente.

## 10. Cómo trabajar

- Trabaja **solo en la fase pedida**; no adelantes fases futuras.
- Si un requerimiento es ambiguo o contradice este archivo, **pregunta** en vez de inventar.
- Planifica antes de escribir código en tareas grandes y muestra el plan.
- No borres ni reescribas módulos de fases anteriores sin avisar.
