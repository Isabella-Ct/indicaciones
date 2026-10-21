# PARKO · API REST (`/api/v1`)

Documento generado a partir del código: cada ruta lista el permiso que exige (`requirePermiso`), los campos que valida con **zod** y, cuando la hay, la descripción de su comentario o del README. Los ejemplos de respuesta son reales (servidor con la semilla), recortados a un elemento por lista.

## Convenciones

- **Base:** `http://localhost:3000/api/v1`. Todo es JSON salvo los PDF (`application/pdf`), los CSV (`?formato=csv`) y los streams SSE (`text/event-stream`).
- **Sesión:** `POST /auth/login` deja la cookie `parko_sesion` (JWT, `httpOnly`, `SameSite=Strict`, 8 h; `Secure` en producción). Las rutas marcadas **Sesión** solo piden estar autenticado; las que nombran un permiso además lo verifican en la tabla `roles_permisos` (403 si falta).
- **Éxito:** `{ "data": …, "meta"?: … }`. **Error:** `{ "error": { "codigo", "mensaje", "detalles"?: [{ "campo", "mensaje" }] } }`.
- **Códigos:** 400 JSON inválido · 401 sin sesión o credenciales inválidas · 403 sin permiso (o `DEBE_CAMBIAR_CONTRASENA`, `PICO_Y_PLACA`) · 404 no existe (o es ajeno) · 409 conflicto de negocio · 413 cuerpo muy grande · 422 validación · 429 demasiados intentos · 500 error interno (sin stack fuera de desarrollo).
- **Paginación:** `?pagina=1&limite=20` → `meta: { pagina, limite, total, paginas }`. Fechas de filtro `AAAA-MM-DD` (hora de Bogotá). Las fechas y horas de entradas, salidas, pagos e incidencias **las pone el servidor**.
- **Límites:** login 5 intentos fallidos / 15 min por IP + documento; API 300 solicitudes/min por IP.
- En **Parámetros**, `campo?` es opcional; `:id` siempre se valida como entero positivo.

## Permisos por rol

| Permiso | Administrador | Operador | Cliente |
|---|:-:|:-:|:-:|
| `celdas.cambiar_estado` | ✅ | ✅ | — |
| `celdas.gestionar` | ✅ | — | — |
| `celdas.ver` | ✅ | ✅ | ✅ |
| `configuracion.gestionar` | ✅ | — | — |
| `descuentos.gestionar` | ✅ | — | — |
| `descuentos.ver` | ✅ | ✅ | — |
| `facturas.cobrar` | ✅ | ✅ | — |
| `facturas.ver` | ✅ | ✅ | — |
| `incidencias.gestionar_tipos` | ✅ | — | — |
| `incidencias.registrar` | ✅ | ✅ | — |
| `incidencias.ver` | ✅ | ✅ | — |
| `membresias.gestionar` | ✅ | — | — |
| `membresias.ver` | ✅ | ✅ | — |
| `movimientos.registrar` | ✅ | ✅ | — |
| `movimientos.ver` | ✅ | ✅ | — |
| `notificaciones.enviar` | ✅ | — | — |
| `perfil.editar` | ✅ | ✅ | ✅ |
| `pico_placa.gestionar` | ✅ | ✅ | — |
| `pico_placa.ver` | ✅ | ✅ | — |
| `portal.ver` | — | — | ✅ |
| `puertas.gestionar` | ✅ | — | — |
| `reportes.ver` | ✅ | — | — |
| `reservas.crear` | ✅ | ✅ | ✅ |
| `reservas.gestionar` | ✅ | — | — |
| `reservas.ver` | ✅ | ✅ | — |
| `tarifas.gestionar` | ✅ | — | — |
| `tarifas.ver` | ✅ | ✅ | — |
| `usuarios.buscar` | ✅ | ✅ | — |
| `usuarios.cambiar_estado` | ✅ | — | — |
| `usuarios.crear` | ✅ | ✅ | — |
| `usuarios.crear_administrador` | ✅ | — | — |
| `usuarios.editar` | ✅ | — | — |
| `usuarios.ver` | ✅ | — | — |
| `vehiculos.crear` | ✅ | ✅ | — |
| `vehiculos.editar` | ✅ | — | — |
| `vehiculos.reasignar` | ✅ | — | — |
| `vehiculos.ver` | ✅ | ✅ | — |

## Endpoints (109)

### Salud

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/salud` | Público | — | `{ estado: "ok", bd: "ok" }` (503 si no hay BD) |

### Autenticación

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| POST | `/auth/login` | Público | body: `tipo_documento`, `numero_documento`, `contrasena` | `{ tipo_documento, numero_documento, contrasena }` → cookie `parko_sesion` (httpOnly, SameSite=Strict, 8 h) + usuario y permisos |
| POST | `/auth/logout` | Público | — | Borra la cookie de sesión |
| GET | `/auth/me` | Sesión | — | Usuario en sesión y sus permisos |
| POST | `/auth/cambiar-contrasena` | Sesión | body: `contrasena_actual`, `contrasena_nueva` | `{ contrasena_actual, contrasena_nueva }` (mín. 8) |

<details><summary>Ejemplo: <code>GET /api/v1/auth/me</code></summary>

```json
{
  "data": {
    "id": 1,
    "tipo_documento": "CC",
    "numero_documento": "1000000001",
    "nombres": "Laura Marcela",
    "apellidos": "Gómez Ríos",
    "nombre_completo": "Laura Marcela Gómez Ríos",
    "correo": "laura.gomez@parko.test",
    "celular": "3001000001",
    "foto_url": null,
    "rol": "administrador",
    "estado": "activo",
    "debe_cambiar_contrasena": false,
    "ultimo_acceso": "2026-10-21T03:04:17.000Z",
    "permisos": [
      "celdas.cambiar_estado"
    ]
  }
}
```

</details>

### Sede

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/parqueadero` | Público | — | Datos de la sede y sus puertas activas |

<details><summary>Ejemplo: <code>GET /api/v1/parqueadero</code></summary>

```json
{
  "data": {
    "id": 1,
    "nombre": "Parqueadero ABC",
    "direccion": "Carrera 43 # 47-53",
    "ciudad": "Medellín",
    "telefono": "6045550143",
    "horario": "Abierto 24 horas",
    "ubicacion": {
      "lat": 6.2462,
      "lon": -75.5617
    },
    "puertas": [
      {
        "id": 1,
        "nombre": "Norte",
        "tipo": "mixta"
      }
    ]
  }
}
```

</details>

### Roles

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/roles` | `usuarios.crear` | — | Lista de roles (formulario de usuarios) |

### Usuarios (REQ-USR-1..8)

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/usuarios` | `usuarios.ver` | query: `pagina`?, `limite`?, `q`?, `rol`?, `estado`?, `orden`?, `dir`? | Listado. Filtros: `q` (documento/nombre/correo), `rol`, `estado`, `orden`, `dir`, `pagina`, `limite` |
| GET | `/usuarios/buscar` | `usuarios.buscar` | query: `documento` | Clientes activos cuyo documento empieza así (id, documento, nombre) |
| GET | `/usuarios/me` | Sesión | — | Mis datos |
| PUT | `/usuarios/me` | `perfil.editar` | multipart: `primer_nombre`, `segundo_nombre`?, `primer_apellido`, `segundo_apellido`?, `correo`, `celular`, `quitar_foto`?<br>archivo: `foto` (jpg/png ≤ 2 MB, opcional) | Multipart: nombres, `correo`, `celular`, `foto`, `quitar_foto`. Notifica a los administradores los campos cambiados (REQ-USR-4) |
| GET | `/usuarios/me/vehiculos` | Sesión | — | Mis vehículos |
| GET | `/usuarios/me/estadias` | Sesión | query: `pagina`?, `limite`?, `placa`?, `desde`?, `hasta`?, `puerta_id`?, `estado`? | Historial de los vehículos del usuario en sesión |
| GET | `/usuarios/me/facturas` | Sesión | query: `pagina`?, `limite`?, `desde`?, `hasta`?, `metodo_pago`?, `concepto`?, `placa`? | Facturas y membresías del usuario en sesión |
| GET | `/usuarios/me/membresias` | Sesión | — | Facturas y membresías del usuario en sesión |
| GET | `/usuarios/me/reservas` | Sesión | query: `pagina`?, `limite`?, `estado`?, `activas`?, `placa`?, `desde`?, `hasta`? | Personal: cualquiera; cliente: solo las suyas (sin datos del titular) |
| GET | `/usuarios/me/incidencias` | Sesión | query: `pagina`?, `limite`?, `tipo_id`?, `placa`?, `desde`?, `hasta`? | Incidencias de los vehículos del usuario (sin quién las registró) |
| GET | `/usuarios/:id` | Sesión | — | Detalle |
| POST | `/usuarios` | `usuarios.crear` | multipart: `tipo_documento`, `numero_documento`, `primer_nombre`, `segundo_nombre`?, `primer_apellido`, `segundo_apellido`?, `correo`, `celular`, `rol_id`, `contrasena_temporal`<br>archivo: `foto` (jpg/png ≤ 2 MB, opcional) | Multipart: documento, nombres, `correo`, `celular`, `rol_id`, `contrasena_temporal`, `foto` opcional. El operador no puede crear administradores (403) |
| PUT | `/usuarios/:id` | `usuarios.editar` | multipart: `tipo_documento`, `numero_documento`, `primer_nombre`, `segundo_nombre`?, `primer_apellido`, `segundo_apellido`?, `correo`, `celular`, `rol_id`, `quitar_foto`?<br>archivo: `foto` (jpg/png ≤ 2 MB, opcional) | Multipart, mismos datos sin contraseña + `quitar_foto` |
| PATCH | `/usuarios/:id/estado` | `usuarios.cambiar_estado` | body: `estado` | `{ estado: "activo" \| "inactivo" }`. No sobre sí mismo (409) |
| PATCH | `/usuarios/:id/contrasena` | `usuarios.editar` | body: `contrasena_temporal` | REQ-USR-5: contraseña temporal asignada por el admin |

<details><summary>Ejemplo: <code>GET /api/v1/usuarios?limite=1</code></summary>

```json
{
  "data": [
    {
      "id": 1,
      "tipo_documento": "CC",
      "numero_documento": "1000000001",
      "primer_nombre": "Laura",
      "segundo_nombre": "Marcela",
      "primer_apellido": "Gómez",
      "segundo_apellido": "Ríos",
      "nombre_completo": "Laura Marcela Gómez Ríos",
      "…": "9 campos más"
    }
  ],
  "meta": {
    "pagina": 1,
    "limite": 1,
    "total": 9,
    "total_paginas": 9
  }
}
```

</details>

### Vehículos (REQ-CAR-1..3, REQ-USR-6)

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/vehiculos` | `vehiculos.ver` | query: `pagina`?, `limite`?, `placa`?, `tipo`?, `propietario`?, `usuario_id`?, `q`?, `activo`?, `orden`?, `dir`? | Filtros: `placa`, `tipo`, `propietario=con\|sin`, `usuario_id`, `q` (documento/nombre del dueño), `activo`, orden y paginación |
| GET | `/vehiculos/placa/:placa` | `vehiculos.ver` | — | Búsqueda exacta (la placa se normaliza) |
| GET | `/vehiculos/:id` | `vehiculos.ver` | — | Detalle · historial de propietarios |
| GET | `/vehiculos/:id/historial` | `vehiculos.ver` | — | Detalle · historial de propietarios |
| POST | `/vehiculos` | `vehiculos.crear` | body: `placa`, `tipo`, `color`, `marca`, `modelo`, `usuario_id`? | `{ placa, tipo, color, marca, modelo, usuario_id? }`. Placa validada según el tipo (422) y única (409) |
| PUT | `/vehiculos/:id` | `vehiculos.editar` | body: `placa`, `tipo`, `color`, `marca`, `modelo`, `activo`? | `{ placa, tipo, color, marca, modelo, activo }` |
| PATCH | `/vehiculos/:id/propietario` | `vehiculos.crear` | body: `usuario_id`?, `motivo`? | `{ usuario_id \| null, motivo? }`. Sin dueño → admin u operador (REQ-USR-6); con dueño → solo admin (REQ-CAR-3). Queda en el historial |

<details><summary>Ejemplo: <code>GET /api/v1/vehiculos?limite=1</code></summary>

```json
{
  "data": [
    {
      "id": 104,
      "placa": "BCS78G",
      "tipo": "moto",
      "color": "Azul",
      "marca": "Honda",
      "modelo": "CB 125F",
      "activo": true,
      "propietario": null,
      "…": "1 campos más"
    }
  ],
  "meta": {
    "pagina": 1,
    "limite": 1,
    "total": 122,
    "total_paginas": 122
  }
}
```

</details>

### Pisos

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/pisos` | `celdas.ver` | — | Pisos con los tramos del carril (`carril: [...]`) |

### Celdas (REQ-CLD-01..03)

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/celdas` | `celdas.ver` | query: `piso_id`?, `area`?, `tipo`?, `estado`?, `accesible`?, `incluir_inactivas`? | Filtros: `piso_id`, `area`, `tipo`, `estado`, `accesible=0\|1`, `incluir_inactivas=1` (admin). Placas, titulares y tickets **solo** para admin/operador |
| GET | `/celdas/resumen` | `celdas.ver` | — | Totales por estado, tipo, piso y área; `ocupacion_pct` = ocupadas / habilitadas |
| GET | `/celdas/stream` | `celdas.ver` | — | SSE: `celda-actualizada`, `resumen-actualizado` (heartbeat cada 25 s). Cada conexión recibe los datos filtrados según su rol |
| GET | `/celdas/:id` | `celdas.ver` | — | Detalle |
| POST | `/celdas` | `celdas.gestionar` | body: `codigo`, `piso_id`, `area`, `tipo`, `es_accesible`?, `fila_mapa`, `posicion`, `estado`?, `nota`? | `{ codigo, piso_id, area, tipo, es_accesible, fila_mapa, posicion }` (crear admite `estado` inicial y `nota`). 409 si el código o la posición ya existen |
| PUT | `/celdas/:id` | `celdas.gestionar` | body: `codigo`, `piso_id`, `area`, `tipo`, `es_accesible`?, `fila_mapa`, `posicion` | `{ codigo, piso_id, area, tipo, es_accesible, fila_mapa, posicion }` (crear admite `estado` inicial y `nota`). 409 si el código o la posición ya existen |
| PATCH | `/celdas/:id/estado` | `celdas.cambiar_estado` | body: `estado`, `vehiculo_id`?, `nota`? | `{ estado, vehiculo_id?, nota? }` — ver reglas abajo (REQ-CLD-03) |
| PATCH | `/celdas/:id/activa` | `celdas.gestionar` | body: `activa` | `{ activa }`. Solo celdas libres o fuera de servicio y sin mensualidad/reserva |

<details><summary>Ejemplo: <code>GET /api/v1/celdas/resumen</code></summary>

```json
{
  "data": {
    "total": 44,
    "habilitadas": 43,
    "por_estado": {
      "disponible": 34,
      "ocupada": 7,
      "reservada": 2,
      "fuera_servicio": 1
    },
    "ocupacion_pct": 16,
    "por_tipo": {
      "carro": {
        "total": 32,
        "disponible": 24,
        "ocupada": 5,
        "reservada": 2,
        "fuera_servicio": 1
      },
      "moto": {
        "total": 12,
        "disponible": 10,
        "ocupada": 2,
        "reservada": 0,
        "fuera_servicio": 0
      }
    },
    "por_piso": [
      {
        "id": 1,
        "nombre": "Sótano 1",
        "orden": 1,
        "total": 24,
        "disponible": 17,
        "ocupada": 4,
        "reservada": 2,
        "fuera_servicio": 1
      }
    ],
    "por_area": [
      {
        "area": "A",
        "total": 12,
        "disponible": 7,
        "ocupada": 3,
        "reservada": 1,
        "fuera_servicio": 1
      }
    ],
    "actualizado_en": "2026-10-21T03:04:17.248Z"
  }
}
```

</details>

### Puertas

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/puertas` | Sesión | query: `incluir_inactivas`? | Puertas activas (admin: `?incluir_inactivas=1`) |
| POST | `/puertas` | `puertas.gestionar` | body: `nombre`, `tipo` | `{ nombre, tipo: entrada\|salida\|mixta }`; debe quedar al menos una activa |
| PUT | `/puertas/:id` | `puertas.gestionar` | body: `nombre`, `tipo` | `{ nombre, tipo: entrada\|salida\|mixta }`; debe quedar al menos una activa |
| PATCH | `/puertas/:id/activa` | `puertas.gestionar` | body: `activa` | `{ nombre, tipo: entrada\|salida\|mixta }`; debe quedar al menos una activa |

### Público, sin sesión (REQ-WEB-1)

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/publico/disponibilidad` | Público | — | `{ carro: { disponibles, habilitadas }, moto: {…}, actualizado_en }` — sin celdas ni personas |
| GET | `/publico/disponibilidad/stream` | Público | — | SSE con el evento `disponibilidad` (los mismos totales) |
| GET | `/publico/tarifas` | Público | — | Tarifas vigentes sin datos internos + `mensualidades: { carro: { mensual, anual }, moto: {…} }` |
| GET | `/publico/pico-placa-hoy` | Público | — | `{ fecha, dia_nombre, carro: { criterio, digitos, horarios }, moto: {…} }` — solo los dígitos de hoy |

<details><summary>Ejemplo: <code>GET /api/v1/publico/disponibilidad</code></summary>

```json
{
  "data": {
    "carro": {
      "disponibles": 24,
      "habilitadas": 31
    },
    "moto": {
      "disponibles": 10,
      "habilitadas": 12
    },
    "actualizado_en": "2026-10-21T03:04:17.254Z"
  }
}
```

</details>

<details><summary>Ejemplo: <code>GET /api/v1/publico/tarifas</code></summary>

```json
{
  "data": {
    "carro": {
      "tipo_vehiculo": "carro",
      "valor_fraccion": 120,
      "minutos_fraccion": 1,
      "minutos_gracia": 0,
      "valor_dia_maximo": 28000,
      "descripcion": "$ 120/min · tope $ 28.000 por día"
    },
    "moto": {
      "tipo_vehiculo": "moto",
      "valor_fraccion": 60,
      "minutos_fraccion": 1,
      "minutos_gracia": 0,
      "valor_dia_maximo": 12000,
      "descripcion": "$ 60/min · tope $ 12.000 por día"
    },
    "mensualidades": {
      "carro": {
        "mensual": 180000,
        "anual": 1900000
      },
      "moto": {
        "mensual": 70000,
        "anual": 750000
      }
    }
  }
}
```

</details>

<details><summary>Ejemplo: <code>GET /api/v1/publico/pico-placa-hoy</code></summary>

```json
{
  "data": {
    "fecha": "2026-10-20",
    "dia_nombre": "martes",
    "carro": {
      "criterio": "último dígito de la placa",
      "digitos": [
        0
      ],
      "horarios": [
        "05:00–20:00"
      ]
    },
    "moto": {
      "criterio": "primer dígito de la placa",
      "digitos": [
        0
      ],
      "horarios": [
        "05:00–20:00"
      ]
    }
  }
}
```

</details>

### Pico y placa (REQ-CAR-4)

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/pico-placa` | `pico_placa.ver` | query: `tipo_vehiculo`?, `dia_semana`?, `activa`? | Reglas (filtros `tipo_vehiculo`, `dia_semana`, `activa`) · reglas activas de hoy |
| GET | `/pico-placa/hoy` | `pico_placa.ver` | — | Reglas (filtros `tipo_vehiculo`, `dia_semana`, `activa`) · reglas activas de hoy |
| POST | `/pico-placa` | `pico_placa.gestionar` | body: `tipo_vehiculo`, `dia_semana`, `digito`, `hora_inicio`, `hora_fin` | `{ tipo_vehiculo, dia_semana 1–7, digito 0–9, hora_inicio, hora_fin }`. 409 si se cruza con otra regla |
| PUT | `/pico-placa/:id` | `pico_placa.gestionar` | body: `tipo_vehiculo`, `dia_semana`, `digito`, `hora_inicio`, `hora_fin` | `{ tipo_vehiculo, dia_semana 1–7, digito 0–9, hora_inicio, hora_fin }`. 409 si se cruza con otra regla |
| PATCH | `/pico-placa/:id/activa` | `pico_placa.gestionar` | body: `activa` | `{ tipo_vehiculo, dia_semana 1–7, digito 0–9, hora_inicio, hora_fin }`. 409 si se cruza con otra regla |

<details><summary>Ejemplo: <code>GET /api/v1/pico-placa/hoy</code></summary>

```json
{
  "data": {
    "fecha": "2026-10-20",
    "dia_semana": 2,
    "dia_nombre": "martes",
    "reglas": [
      {
        "id": 13,
        "tipo_vehiculo": "moto",
        "dia_semana": 2,
        "dia_nombre": "martes",
        "digito": 0,
        "hora_inicio": "05:00",
        "hora_fin": "20:00",
        "activa": true,
        "…": "1 campos más"
      }
    ]
  }
}
```

</details>

### Entradas, salidas, cobro y tickets (REQ-INEX-1..4, REQ-PLA-1, REQ-TCK-1, REQ-TAR-2, REQ-FAC-1)

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/estadias/previsualizar` | `movimientos.registrar` | query: `placa`, `requiere_accesible`? | Para el modal: vehículo, tipo de cliente, celda sugerida, pico y placa de hoy |
| POST | `/estadias/entrada` | `movimientos.registrar` | multipart: `puerta_id`, `placa`, `celda_id`?, `requiere_accesible`?, `confirmar_accesible`?, `observaciones_entrada`?, `deja_llaves`?<br>archivo: `foto` (jpg/png ≤ 2 MB, opcional) | Multipart: `puerta_id`, `placa`, `celda_id?`, `requiere_accesible`, `confirmar_accesible`, `observaciones_entrada`, `deja_llaves`, `foto?`. Respuesta: ticket. Errores: 404 `VEHICULO_NO_REGISTRADO`, 403 `PICO_Y_PLACA`, 409 `ESTADIA_ABIERTA` / `SIN_CUPO` / `CELDA_ACCESIBLE` / `CONFIRMAR_ACCESIBLE` |
| POST | `/estadias/salida` | `movimientos.registrar` | body: `puerta_id`, `placa`?, `codigo_ticket`? | `{ puerta_id, placa \| codigo_ticket }` → liquidación con dinero: `{ estadia, minutos, tiempo, tarifa, membresia, descuentos, cobro }`; **no** cierra |
| POST | `/estadias/:id/liquidar` | `movimientos.registrar` | body: `descuento_id`? | `{ descuento_id? }` → recalcula el cobro de una estadía abierta (detalle en vivo y selector de descuento) |
| POST | `/estadias/:id/pagar` | `facturas.cobrar` | body: `puerta_id`, `metodo_pago`, `descuento_id`? | `{ puerta_id, metodo_pago, descuento_id? }` → `{ estadia, factura }`. El total lo calcula el servidor (se ignora cualquier total enviado). 409 si ya se cobró |
| GET | `/estadias/en-curso` | `movimientos.ver` | — | Vehículos dentro · bitácora de entradas y salidas |
| GET | `/estadias/ultimos-movimientos` | `movimientos.ver` | query: `limite`? | Vehículos dentro · bitácora de entradas y salidas |
| GET | `/estadias` | `movimientos.ver` | query: `pagina`?, `limite`?, `placa`?, `desde`?, `hasta`?, `puerta_id`?, `estado`? | Historial: `placa`, `desde`, `hasta` (AAAA-MM-DD), `puerta_id`, `estado`, paginado |
| GET | `/estadias/:id/ticket` | `movimientos.ver` | — | Ticket (JSON) · PDF de 80 mm con código de barras Code 39 |
| GET | `/estadias/:id/ticket.pdf` | `movimientos.ver` | — | Ticket (JSON) · PDF de 80 mm con código de barras Code 39 |

<details><summary>Ejemplo: <code>GET /api/v1/estadias/en-curso</code></summary>

```json
{
  "data": [
    {
      "id": 2918,
      "codigo_ticket": "T-002918",
      "estado": "en_curso",
      "tipo_cliente": "visitante",
      "vehiculo": {
        "id": 9,
        "placa": "HJK740",
        "tipo": "carro",
        "marca": "Kia",
        "modelo": "Sportage",
        "color": "Gris",
        "propietario": "Camilo Restrepo"
      },
      "celda": {
        "id": 17,
        "codigo": "B-05",
        "piso": "Sótano 1"
      },
      "puerta_entrada": "Sur",
      "puerta_salida": null,
      "…": "10 campos más"
    }
  ]
}
```

</details>

### Accesos denegados (REQ-INEX-4)

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/accesos-denegados` | `reportes.ver` | query: `pagina`?, `limite`?, `placa`?, `desde`?, `hasta`? | Entradas rechazadas (`placa`, `desde`, `hasta`, paginado) |

### Tarifas (REQ-TAR-1)

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/tarifas` | Sesión | query: `historial`?, `tipo_vehiculo`? | `{ vigentes: { carro, moto } }`; admin: `?historial=1` agrega el historial |
| POST | `/tarifas` | `tarifas.gestionar` | body: `tipo_vehiculo`, `valor_fraccion`, `minutos_fraccion`, `minutos_gracia`?, `valor_dia_maximo` | `{ tipo_vehiculo, valor_fraccion, minutos_fraccion, minutos_gracia, valor_dia_maximo }`: nueva vigente; desactiva la anterior del tipo |
| POST | `/tarifas/simular` | `tarifas.ver` | body: `tipo_vehiculo`, `minutos`, `tarifa`? | `{ tipo_vehiculo, minutos, tarifa? }` → `{ tarifa, cobro }` (con la vigente o con valores propuestos) |

<details><summary>Ejemplo: <code>GET /api/v1/tarifas</code></summary>

```json
{
  "data": {
    "vigentes": {
      "carro": {
        "id": 1,
        "tipo_vehiculo": "carro",
        "valor_fraccion": 120,
        "minutos_fraccion": 1,
        "minutos_gracia": 0,
        "valor_dia_maximo": 28000,
        "vigente_desde": "2026-08-21T05:00:00.000Z",
        "activa": true,
        "…": "3 campos más"
      },
      "moto": {
        "id": 2,
        "tipo_vehiculo": "moto",
        "valor_fraccion": 60,
        "minutos_fraccion": 1,
        "minutos_gracia": 0,
        "valor_dia_maximo": 12000,
        "vigente_desde": "2026-08-21T05:00:00.000Z",
        "activa": true,
        "…": "3 campos más"
      }
    }
  }
}
```

</details>

### Descuentos (REQ-DES-1)

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/descuentos` | `descuentos.ver` | query: `activos`? | Admin: todos (`?activos=1`); operador: solo activos |
| POST | `/descuentos` | `descuentos.gestionar` | body: `nombre`, `descripcion`?, `porcentaje` | `{ nombre, descripcion?, porcentaje 0–100 }` · `{ activo }`. 409 `NOMBRE_DUPLICADO` |
| PUT | `/descuentos/:id` | `descuentos.gestionar` | body: `nombre`, `descripcion`?, `porcentaje` | `{ nombre, descripcion?, porcentaje 0–100 }` · `{ activo }`. 409 `NOMBRE_DUPLICADO` |
| PATCH | `/descuentos/:id/activo` | `descuentos.gestionar` | body: `activo` | `{ nombre, descripcion?, porcentaje 0–100 }` · `{ activo }`. 409 `NOMBRE_DUPLICADO` |

### Membresías (REQ-MEM-1)

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/membresias` | `membresias.ver` | query: `pagina`?, `limite`?, `estado`?, `usuario_id`?, `placa`?, `q`? | Filtros `estado`, `usuario_id`, `placa`, `q` (documento o nombre), paginado |
| GET | `/membresias/cotizar` | `membresias.ver` | query: `vehiculo_id`, `tipo`, `fecha_inicio` | `{ fecha_fin, valor }` calculados (valor desde `configuracion`) |
| GET | `/membresias/:id` | `membresias.ver` | — | Filtros `estado`, `usuario_id`, `placa`, `q` (documento o nombre), paginado |
| POST | `/membresias` | `membresias.gestionar` | body: `usuario_id`, `vehiculo_id`, `tipo`, `fecha_inicio`, `celda_asignada_id`?, `metodo_pago` | `{ usuario_id, vehiculo_id, tipo, fecha_inicio, celda_asignada_id?, metodo_pago }`: crea la membresía y su factura. 409 `MEMBRESIA_TRASLAPADA` / `CELDA_CON_MENSUALIDAD` |
| PATCH | `/membresias/:id/cancelar` | `membresias.gestionar` | — | Cancela y libera la celda fija |

<details><summary>Ejemplo: <code>GET /api/v1/membresias?limite=1</code></summary>

```json
{
  "data": [
    {
      "id": 3,
      "tipo": "mensual",
      "estado": "activa",
      "vigente": true,
      "valor": 180000,
      "fecha_inicio": "2026-10-05T05:00:00.000Z",
      "fecha_fin": "2026-11-05T05:00:00.000Z",
      "dias_restantes": 16,
      "…": "4 campos más"
    }
  ],
  "meta": {
    "pagina": 1,
    "limite": 1,
    "total": 3,
    "total_paginas": 3
  }
}
```

</details>

### Facturas (REQ-FAC-2)

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/facturas` | `facturas.ver` | query: `pagina`?, `limite`?, `desde`?, `hasta`?, `metodo_pago`?, `concepto`?, `placa`? | Admin: `desde`, `hasta`, `metodo_pago`, `concepto`, `placa`; operador: solo las de hoy. `meta.suma_total` = total del período |
| GET | `/facturas/resumen-hoy` | `facturas.ver` | — | KPIs: `recaudo`, `salidas_cobradas`, `permanencia_promedio_min` (visitantes) |
| GET | `/facturas/:id` | Sesión | — | Personal: cualquiera; cliente: solo las suyas (403 las ajenas) |
| GET | `/facturas/:id/pdf` | Sesión | — | Personal: cualquiera; cliente: solo las suyas (403 las ajenas) |

<details><summary>Ejemplo: <code>GET /api/v1/facturas?limite=1</code></summary>

```json
{
  "data": [
    {
      "id": 3023,
      "numero": "FAC-002920",
      "concepto": "estadia",
      "fecha_pago": "2026-10-21T02:45:05.000Z",
      "metodo_pago": "efectivo",
      "subtotal": 0,
      "descuento": null,
      "valor_descuento": 0,
      "…": "10 campos más"
    }
  ],
  "meta": {
    "pagina": 1,
    "limite": 1,
    "total": 2920,
    "total_paginas": 2920,
    "suma_total": 48954420,
    "desde": null,
    "hasta": null
  }
}
```

</details>

### Notificaciones (REQ-NOT-1)

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/notificaciones/mias` | Sesión | query: `pagina`?, `limite`?, `leida`? | Bandeja propia, paginada; `?leida=0\|1`. `meta.no_leidas` |
| GET | `/notificaciones/mias/conteo` | Sesión | — | `{ no_leidas }` (contador de la campana) |
| PATCH | `/notificaciones/mias/leer-todas` | Sesión | — | Solo el destinatario: una ajena responde 404 |
| GET | `/notificaciones/stream` | Sesión | — | SSE del usuario en sesión: `conteo` al conectar, `notificacion` (título) al llegar una, `leidas` |
| PATCH | `/notificaciones/:id/leida` | Sesión | — | Solo el destinatario: una ajena responde 404 |
| POST | `/notificaciones` | `notificaciones.enviar` | body: `destino`, `usuario_id`?, `rol`?, `titulo`, `mensaje` | `{ destino: usuario\|rol\|todos, usuario_id?, rol?, titulo, mensaje }` → `{ enviadas }`. Solo usuarios activos; 422 si no hay destinatarios |

<details><summary>Ejemplo: <code>GET /api/v1/notificaciones/mias/conteo</code></summary>

```json
{
  "data": {
    "no_leidas": 1
  }
}
```

</details>

### Incidencias (REQ-INCD-1)

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/incidencias` | `incidencias.ver` | query: `pagina`?, `limite`?, `tipo_id`?, `placa`?, `desde`?, `hasta`? | Filtros `tipo_id`, `placa`, `desde`, `hasta`, paginado |
| GET | `/incidencias/:id` | `incidencias.ver` | — | Filtros `tipo_id`, `placa`, `desde`, `hasta`, paginado |
| POST | `/incidencias` | `incidencias.registrar` | body: `tipo_incidencia_id`, `placa`, `celda_id`?, `descripcion` | `{ tipo_incidencia_id, placa, celda_id?, descripcion }`. El servidor pone `codigo` y `fecha_hora`. 404 `VEHICULO_NO_REGISTRADO` |

<details><summary>Ejemplo: <code>GET /api/v1/incidencias?limite=1</code></summary>

```json
{
  "data": [
    {
      "id": 1,
      "codigo": "INC-20261017-0001",
      "fecha_hora": "2026-10-17T15:20:00.000Z",
      "descripcion": "Rayón en la puerta del conductor al abrir la puerta del vehículo vecino.",
      "tipo": {
        "id": 1,
        "nombre": "Rayón"
      },
      "vehiculo": {
        "id": 7,
        "placa": "BNM350",
        "tipo": "carro",
        "marca": "Hyundai",
        "modelo": "Tucson",
        "color": "Blanco",
        "propietario": {
          "id": 7,
          "nombre_completo": "Lucía Ortega"
        }
      },
      "celda": {
        "id": 5,
        "codigo": "A-05",
        "piso": "Sótano 1"
      },
      "estadia_id": 2784,
      "…": "1 campos más"
    }
  ],
  "meta": {
    "pagina": 1,
    "limite": 1,
    "total": 10,
    "total_paginas": 10
  }
}
```

</details>

### Tipos de incidencia

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/tipos-incidencia` | `incidencias.ver` | query: `activos`? | Admin: todos (`?activos=1`); operador: activos |
| POST | `/tipos-incidencia` | `incidencias.gestionar_tipos` | body: `nombre`, `descripcion`? | `{ nombre, descripcion? }` · `{ activo }`. 409 `NOMBRE_DUPLICADO` |
| PUT | `/tipos-incidencia/:id` | `incidencias.gestionar_tipos` | body: `nombre`, `descripcion`? | `{ nombre, descripcion? }` · `{ activo }`. 409 `NOMBRE_DUPLICADO` |
| PATCH | `/tipos-incidencia/:id/activo` | `incidencias.gestionar_tipos` | body: `activo` | `{ nombre, descripcion? }` · `{ activo }`. 409 `NOMBRE_DUPLICADO` |

### Reportes del administrador (REQ-REP-01..11)

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/reportes/usuarios` | `reportes.ver` | query: `pagina`?, `limite`?, `formato`?, `rol`?, `estado`? | REP-01: usuarios con todos sus datos (sin hash) y su rol. `?rol`, `?estado`, paginado |
| GET | `/reportes/vehiculos` | `reportes.ver` | query: `pagina`?, `limite`?, `formato`?, `tipo`?, `propietario`? | REP-02: vehículos con propietario y visitas. `?tipo`, `?propietario=con\|sin`, paginado |
| GET | `/reportes/entradas` | `reportes.ver` | query: `desde`?, `hasta`?, `formato`?, `pagina`?, `limite`?, `tipo`?, `puerta_id`?, `placa`? | REP-03/04: `?desde&hasta`, `?tipo`, `?puerta_id`, `?placa`, paginado. Salidas: duración, valor, `meta.recaudado` |
| GET | `/reportes/salidas` | `reportes.ver` | query: `desde`?, `hasta`?, `formato`?, `pagina`?, `limite`?, `tipo`?, `puerta_id`?, `placa`? | REP-03/04: `?desde&hasta`, `?tipo`, `?puerta_id`, `?placa`, paginado. Salidas: duración, valor, `meta.recaudado` |
| GET | `/reportes/incidencias` | `reportes.ver` | query: `desde`?, `hasta`?, `formato`?, `pagina`?, `limite`?, `tipo`? | REP-05: `?desde&hasta&tipo` |
| GET | `/reportes/pico-placa` | `reportes.ver` | query: `fecha`?, `formato`? | REP-06: vehículos registrados que no pueden ingresar ese día (reglas activas) + accesos rechazados reales |
| GET | `/reportes/celdas-ocupadas` | `reportes.ver` | query: `fecha`?, `formato`? | REP-07: celdas distintas ocupadas, máximo simultáneo (y a qué hora), ocupación por hora |
| GET | `/reportes/celdas-mas-usadas` | `reportes.ver` | query: `desde`?, `hasta`?, `formato`?, `limite`?, `tipo`? | REP-08/09: ranking por estadías/visitas y minutos. `?desde&hasta&limite&tipo` |
| GET | `/reportes/vehiculos-frecuentes` | `reportes.ver` | query: `desde`?, `hasta`?, `formato`?, `limite`?, `tipo`? | REP-08/09: ranking por estadías/visitas y minutos. `?desde&hasta&limite&tipo` |
| GET | `/reportes/ocupacion` | `reportes.ver` | query: `desde`?, `hasta`?, `formato`? | REP-10: matriz día × hora (promedio de celdas y %), hora pico, día pico y franja pico |
| GET | `/reportes/financiero` | `reportes.ver` | query: `desde`?, `hasta`?, `formato`?, `agrupar`? | REP-11: `?agrupar=dia\|semana\|mes`; por período (incluye los vacíos), método, tipo de vehículo, concepto y descuentos |

<details><summary>Ejemplo: <code>GET /api/v1/reportes/ocupacion</code></summary>

```json
{
  "data": {
    "matriz": [
      {
        "dia": 1,
        "dia_nombre": "lunes",
        "hora": 0,
        "muestras": 5,
        "promedio": 0.6,
        "porcentaje": 1.4,
        "maximo": 2
      }
    ],
    "por_hora": [
      {
        "hora": 0,
        "promedio": 0.9,
        "porcentaje": 2.1
      }
    ],
    "por_dia": [
      {
        "dia": 1,
        "dia_nombre": "lunes",
        "promedio": 12.7,
        "porcentaje": 29.5
      }
    ]
  },
  "meta": {
    "desde": "2026-09-21",
    "hasta": "2026-10-20",
    "dias": 30,
    "habilitadas": 43,
    "hora_pico": {
      "hora": 8,
      "promedio": 25,
      "porcentaje": 58.1
    },
    "dia_pico": {
      "dia": 3,
      "dia_nombre": "miércoles",
      "promedio": 14.2,
      "porcentaje": 33.1
    },
    "franja_pico": {
      "dia": 3,
      "dia_nombre": "miércoles",
      "hora": 9,
      "muestras": 4,
      "promedio": 30.8,
      "porcentaje": 71.5,
      "maximo": 32
    }
  }
}
```

</details>

### Reservas (REQ-RES-1)

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/reservas` | `reservas.ver` | query: `pagina`?, `limite`?, `estado`?, `activas`?, `placa`?, `desde`?, `hasta`? | Filtros `estado`, `activas=1`, `placa`, `desde`, `hasta`, paginado |
| GET | `/reservas/:id` | Sesión | — | Personal: cualquiera; cliente: solo las suyas (sin datos del titular) |
| POST | `/reservas` | `reservas.crear` | body: `vehiculo_id`, `celda_id`, `requiere_accesible`? | `{ vehiculo_id, celda_id, requiere_accesible? }`: celda → `reservada`, reserva `confirmada` que vence en `configuracion.reserva_minutos_expiracion` (30). Cliente: solo sus vehículos (403). 409 `RESERVA_ACTIVA` / `VEHICULO_DENTRO` / `TIENE_CELDA_FIJA` / `CELDA_NO_DISPONIBLE` / `CELDA_ACCESIBLE`; 403 `PICO_Y_PLACA`; 422 celda de otro tipo |
| PATCH | `/reservas/:id/cancelar` | `reservas.crear` | — | El titular o admin/operador; libera la celda. 409 `RESERVA_NO_ACTIVA` |

<details><summary>Ejemplo: <code>GET /api/v1/reservas?limite=1</code></summary>

```json
{
  "data": [],
  "meta": {
    "pagina": 1,
    "limite": 1,
    "total": 0,
    "total_paginas": 1
  }
}
```

</details>

### Dashboard

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/dashboard` | Sesión | — | Según el rol: admin (ocupación, ingresos hoy vs. ayer, entradas, rechazos, incidencias, membresías por vencer), operador (su turno y pico y placa de hoy), cliente (sus vehículos, mensualidad, reserva, facturas) |

### Parámetros del negocio (CLAUDE.md §7)

| Método | Ruta | Acceso | Parámetros | Descripción |
|---|---|---|---|---|
| GET | `/configuracion` | `configuracion.gestionar` | — | todos los parámetros con su tipo y descripción |
| PUT | `/configuracion/:clave` | `configuracion.gestionar` | body: `valor` | { valor } validado según el tipo del parámetro |

## Ejemplos de escritura

**Login** — `POST /api/v1/auth/login`

```json
{ "tipo_documento": "CC", "numero_documento": "1000000002", "contrasena": "Operador2026*" }
```
→ `200` con `Set-Cookie: parko_sesion=…` y `{ "data": { "id": 2, "rol": "operador", "nombre_completo": "Juan Pérez Arango", "permisos": ["celdas.ver", …], "debe_cambiar_contrasena": false } }`. Credenciales malas → `401 CREDENCIALES_INVALIDAS`; usuario inactivo → `403 USUARIO_INACTIVO`; 5 fallos → `429 DEMASIADOS_INTENTOS`.

**Entrada** — `POST /api/v1/estadias/entrada` (multipart: `puerta_id=1`, `placa=jkl482`, `requiere_accesible=false`, `deja_llaves=true`, `foto` opcional) → `201` con el ticket, la misma forma que `GET /estadias/:id/ticket` (ejemplo real):

```json
{
  "data": {
    "id": 2918,
    "codigo_ticket": "T-002918",
    "estado": "en_curso",
    "tipo_cliente": "visitante",
    "vehiculo": {
      "id": 9,
      "placa": "HJK740",
      "tipo": "carro",
      "marca": "Kia",
      "modelo": "Sportage",
      "color": "Gris",
      "propietario": "Camilo Restrepo"
    },
    "celda": {
      "id": 17,
      "codigo": "B-05",
      "piso": "Sótano 1"
    },
    "puerta_entrada": "Sur",
    "puerta_salida": null,
    "fecha_hora_entrada": "2026-10-20T16:15:52.000Z",
    "fecha_hora_salida": null,
    "minutos": 648,
    "tiempo": "10 h 48 min",
    "requiere_accesible": false,
    "observaciones_entrada": "Deja portátil en el baúl",
    "…": "6 campos más"
  }
}
```
Errores: `404 VEHICULO_NO_REGISTRADO` (registrarlo primero), `403 PICO_Y_PLACA` (queda en `accesos_denegados`), `409 ESTADIA_ABIERTA` · `SIN_CUPO` · `CELDA_NO_DISPONIBLE` · `CONFIRMAR_ACCESIBLE`.

**Salida (liquidación)** — `POST /api/v1/estadias/salida` `{ "puerta_id": 2, "codigo_ticket": "T-002921" }`

```json
{ "data": { "minutos": 157, "tiempo": "2 h 37 min", "membresia": null,
  "cobro": { "subtotal": 18840, "total": 18840, "porcentajeTope": 67, "nota": "157 min × $ 120 = $ 18.840" },
  "descuentos": [{ "id": 1, "nombre": "Cliente frecuente", "porcentaje": 10 }] } }
```

**Pago** — `POST /api/v1/estadias/2921/pagar` `{ "puerta_id": 2, "metodo_pago": "tarjeta", "descuento_id": 1 }`

```json
{ "data": { "estadia": { "estado": "finalizada", "minutos_estadia": 157 },
  "factura": { "id": 120, "numero": "FAC-000120", "subtotal": 18840, "valor_descuento": 1840, "total": 17000,
    "metodo_pago": "tarjeta", "descuento": { "id": 1, "porcentaje": 10 } } } }
```
El total lo calcula el servidor (se ignora cualquier total enviado). Un segundo pago de la misma estadía → `409`.

**Reserva** — `POST /api/v1/reservas` `{ "vehiculo_id": 3, "celda_id": 21 }`

```json
{ "data": { "id": 15, "estado": "confirmada", "activa": true, "segundos_restantes": 1800,
  "vehiculo": { "placa": "GMR58K", "tipo": "moto" }, "celda": { "codigo": "M-05", "piso": "Sótano 1" } } }
```
Errores: `403` vehículo ajeno o `PICO_Y_PLACA`; `409 RESERVA_ACTIVA` · `VEHICULO_DENTRO` · `TIENE_CELDA_FIJA` · `CELDA_NO_DISPONIBLE` · `CELDA_ACCESIBLE`; `422` celda de otro tipo.

**Error de validación** (422) — respuesta real de `POST /auth/login` con `{ "tipo_documento": "CC" }`:

```json
{
  "error": {
    "codigo": "VALIDACION",
    "mensaje": "Hay datos inválidos en la solicitud.",
    "detalles": [
      {
        "campo": "numero_documento",
        "mensaje": "El número de documento es obligatorio."
      },
      {
        "campo": "contrasena",
        "mensaje": "La contraseña es obligatoria."
      }
    ]
  }
}
```

## Streams en tiempo real (SSE)

| Ruta | Acceso | Eventos |
|---|---|---|
| `/celdas/stream` | `celdas.ver` | `celda-actualizada` (celda; el cliente la recibe sin placas ajenas), `resumen-actualizado`, `movimiento-registrado` (solo personal), heartbeat cada 25 s |
| `/publico/disponibilidad/stream` | Público | `disponibilidad` → `{ carro: { disponibles, habilitadas }, moto: {…}, actualizado_en }` |
| `/notificaciones/stream` | Sesión | `conteo` al conectar, `notificacion` al llegar una, `leidas` |
