# PARKO · Lista de verificación manual

Recorrido de **cada pantalla con los 3 roles**, en **escritorio (1366 px)** y **móvil (375 px)**, hecho el 20 de octubre de 2026 sobre la semilla de `npm run db:reset`.

**Cómo se hizo.** Un script maneja Microsoft Edge en modo headless (Chrome DevTools Protocol): inicia sesión con cada rol, abre cada pantalla en los dos anchos, espera los datos y revisa:

1. que no haya excepciones de JavaScript ni respuestas HTTP con error;
2. que la página no se desborde a lo ancho (el mapa y las tablas hacen scroll dentro de su contenedor);
3. que no aparezcan `undefined`, `NaN`, `null` ni `[object Object]`;
4. que no haya sombras decorativas ni esquinas redondeadas (sistema PARKO);
5. que todos los campos visibles tengan label;
6. y guarda una captura de pantalla.

Las interacciones clave (retos de la maqueta, Esc en los modales, menú móvil) se comprobaron con clics y teclado simulados. Las capturas de la entrega están en [`capturas/`](capturas/).

Leyenda: ✅ sin observaciones · 🔒 la pantalla no es de ese rol y muestra "Sin acceso" (comportamiento esperado) · ❌ problema.

## 1. Pantallas por rol

| Pantalla | Rol | Escritorio | Móvil 375 px | Observaciones |
|---|---|:-:|:-:|---|
| Página pública | Sin sesión | ✅ | ✅ |  |
| Inicio de sesión | Sin sesión | ✅ | ✅ |  |
| Página 404 | Sin sesión | ✅ | ✅ |  |
| Inicio (dashboard) | Administrador | ✅ | ✅ |  |
| Celdas / control de espacios | Administrador | ✅ | ✅ |  |
| Movimientos | Administrador | ✅ | ✅ |  |
| Usuarios | Administrador | ✅ | ✅ |  |
| Vehículos | Administrador | ✅ | ✅ |  |
| Pico y placa | Administrador | ✅ | ✅ |  |
| Facturas | Administrador | ✅ | ✅ |  |
| Tarifas (+ parámetros) | Administrador | ✅ | ✅ |  |
| Descuentos | Administrador | ✅ | ✅ |  |
| Membresías | Administrador | ✅ | ✅ |  |
| Reservas | Administrador | ✅ | ✅ |  |
| Incidencias | Administrador | ✅ | ✅ |  |
| Notificaciones | Administrador | ✅ | ✅ |  |
| Reportes | Administrador | ✅ | ✅ |  |
| Disponibilidad (portal) | Administrador | 🔒 | 🔒 | Sin acceso: no carga datos |
| Mis movimientos (portal) | Administrador | 🔒 | 🔒 | Sin acceso: no carga datos |
| Mi cuenta | Administrador | ✅ | ✅ |  |
| Inicio (dashboard) | Operador | ✅ | ✅ |  |
| Celdas / control de espacios | Operador | ✅ | ✅ |  |
| Movimientos | Operador | ✅ | ✅ |  |
| Usuarios | Operador | ✅ | ✅ |  |
| Vehículos | Operador | ✅ | ✅ |  |
| Pico y placa | Operador | ✅ | ✅ |  |
| Facturas | Operador | ✅ | ✅ |  |
| Tarifas (+ parámetros) | Operador | ✅ | ✅ |  |
| Descuentos | Operador | ✅ | ✅ |  |
| Membresías | Operador | ✅ | ✅ |  |
| Reservas | Operador | ✅ | ✅ |  |
| Incidencias | Operador | ✅ | ✅ |  |
| Notificaciones | Operador | ✅ | ✅ |  |
| Reportes | Operador | 🔒 | 🔒 | Sin acceso: no carga datos |
| Disponibilidad (portal) | Operador | 🔒 | 🔒 | Sin acceso: no carga datos |
| Mis movimientos (portal) | Operador | 🔒 | 🔒 | Sin acceso: no carga datos |
| Mi cuenta | Operador | ✅ | ✅ |  |
| Inicio (dashboard) | Cliente | ✅ | ✅ |  |
| Celdas / control de espacios | Cliente | ✅ | ✅ |  |
| Movimientos | Cliente | 🔒 | 🔒 | Sin acceso: no carga datos |
| Usuarios | Cliente | 🔒 | 🔒 | Sin acceso: no carga datos |
| Vehículos | Cliente | 🔒 | 🔒 | Sin acceso: no carga datos |
| Pico y placa | Cliente | 🔒 | 🔒 | Sin acceso: no carga datos |
| Facturas | Cliente | 🔒 | 🔒 | Sin acceso: no carga datos |
| Tarifas (+ parámetros) | Cliente | 🔒 | 🔒 | Sin acceso: no carga datos |
| Descuentos | Cliente | 🔒 | 🔒 | Sin acceso: no carga datos |
| Membresías | Cliente | 🔒 | 🔒 | Sin acceso: no carga datos |
| Reservas | Cliente | 🔒 | 🔒 | Sin acceso: no carga datos |
| Incidencias | Cliente | 🔒 | 🔒 | Sin acceso: no carga datos |
| Notificaciones | Cliente | ✅ | ✅ |  |
| Reportes | Cliente | 🔒 | 🔒 | Sin acceso: no carga datos |
| Disponibilidad (portal) | Cliente | ✅ | ✅ |  |
| Mis movimientos (portal) | Cliente | ✅ | ✅ |  |
| Mi cuenta | Cliente | ✅ | ✅ |  |

**Resumen:** 108 vistas revisadas · 76 ✅ · 32 🔒 (acceso denegado correctamente) · 0 ❌.

## 2. Interacciones del mapa: los 8 retos de `docs/diseno-parko/script.js` en la app real

Operador en `app/celdas.html`. El reto 8 registra una entrada real desde el modal y el reto 6 cobra esa misma salida.

| Reto | Comportamiento esperado | Resultado |
|---|---|:-:|
| 1 | al iniciar solo se ve un nivel, sin detalle ni modal | ✅ |
| 2 | pestañas: solo el nivel elegido y la pestaña activa marcada | ✅ |
| 3 | clic en un espacio: queda marcado y aparece su detalle | ✅ |
| 4 | tiempo dentro y valor a pagar (minutos × tarifa, con tope; mensualidad $0) | ✅ |
| 5 | libre / reservado / fuera de servicio muestran mensaje en vez de cobro | ✅ |
| 6 | "Registrar salida y cobrar" libera la celda y la salida aparece en la bitácora | ✅ |
| 7 | la placa se escribe en mayúsculas y el ticket se previsualiza en vivo | ✅ |
| 8 | al enviar se genera el ticket y la celda elegida queda ocupada | ✅ |

## 3. Accesibilidad y teclado

| Comprobación | Resultado |
|---|:-:|
| El modal "Registrar ingreso" tiene `role="dialog"`, `aria-modal="true"` y título asociado | ✅ |
| Al abrir el modal, el foco entra en él; **Esc** lo cierra y **devuelve el foco** al botón que lo abrió | ✅ |
| Pestañas de pisos con `role="tablist"` / `role="tab"` y `aria-selected` | ✅ |
| Foco visible: `outline` de 3 px en naranja (`--orange`) | ✅ |
| Regiones `aria-live` en el detalle de la celda, la campana y los toasts | ✅ |
| Menú móvil (≤ 760 px): botón con `aria-expanded` que despliega los módulos del rol | ✅ |
| Navegar a una pantalla de otro rol muestra "Sin acceso" y no llama a la API | ✅ |
| Todos los campos visibles con label (las 108 vistas de la tabla 1) | ✅ |

## 4. Lighthouse (Edge, perfil móvil)

| Pantalla | Accesibilidad | Buenas prácticas | SEO | Rendimiento |
|---|:-:|:-:|:-:|:-:|
| `/` | 100 | 100 | 100 | — |
| `/app/celdas.html` | 100 | 100 | — | — |
| `/app/descuentos.html` | 100 | 100 | — | — |
| `/app/disponibilidad.html` | 100 | 100 | — | — |
| `/app/inicio.html` | 100 | 100 | — | — |
| `/app/mis-movimientos.html` | 100 | 100 | — | — |
| `/app/reportes.html` | 100 | 100 | — | — |
| `/app/reservas.html` | 100 | 100 | — | — |
| `/app/tarifas.html` | 100 | 100 | — | — |
| `/app/usuarios.html` | 100 | 100 | — | — |
| `/login.html` | 100 | 96 | — | — |

El requisito de la Fase 7 (≥ 90 en Accesibilidad y Buenas prácticas para la página pública) se cumple. En el login, Buenas prácticas pierde puntos por el 401 esperado de `/auth/me` (la página comprueba si ya hay sesión).

## 5. Funciones agregadas en la revisión final

Probadas en Edge con clics simulados (y con pruebas automáticas en `reglas-negocio.test.js` y `auth.test.js`):

| Función | Rol | Resultado |
|---|---|:-:|
| Usuarios → **Contraseña**: asigna una temporal; la anterior deja de servir y la nueva obliga a cambiarla; el usuario recibe un aviso | Administrador | ✅ |
| Celdas → **Puertas**: crear (2 → 3 puertas), editar y desactivar con confirmación; siempre queda una activa | Administrador | ✅ |
| Reservas → **Nueva reserva**: busca la placa, muestra el vehículo y su dueño, lista solo celdas libres de su tipo y reserva | Operador | ✅ |
| **Descuentos** en solo lectura (sin botones de edición) y visibles en el menú | Operador | ✅ |
| Ticket de una **placa nueva** muestra la tarifa del tipo elegido ($ 120/min) en lugar de "—" | Operador | ✅ |
| Mapa de la página pública con la ubicación guardada en la BD (`parqueaderos.latitud/longitud`) | Sin sesión | ✅ |

## 6. Recorrido funcional sugerido para la sustentación

| # | Rol | Pasos | Qué debe verse |
|---|---|---|---|
| 1 | Sin sesión | Abrir `/` | Cupos libres en vivo, tarifas, pico y placa de hoy y mapa de ubicación |
| 2 | Operador | Celdas → Registrar ingreso → placa `kvn482` → Carro → marca/modelo/color → Generar ticket | Placa en mayúsculas, ticket en vivo, ticket `T-…` y la celda ocupada al instante (también en la página pública) |
| 3 | Operador | Tocar la celda → Registrar salida y cobrar → Efectivo → Cobrar | Valor calculado, factura `FAC-…` en PDF y celda libre |
| 4 | Operador | Registrar ingreso de una placa con pico y placa en horario restringido | Entrada rechazada con el motivo; el admin recibe una notificación |
| 5 | Cliente (Paula, CC 1000000005) | Disponibilidad → Sótano 2 → tocar una celda libre de moto → Reservar con la moto GMR 58K | Cuenta regresiva de 30 min y celda resaltada |
| 6 | Operador | Registrar ingreso de la placa `gmr58k` | Usa la celda reservada; la reserva queda cumplida |
| 7 | Cliente | Mis movimientos → Facturas → PDF | Descarga de su factura |
| 8 | Administrador | Reportes → 10 · Horas y días pico → Exportar CSV | Mapa de calor día × hora y archivo CSV |
| 9 | Administrador | Tarifas → Parámetros del negocio → cambiar "Minutos que dura una reserva" | Se guarda con su fecha y autor; la próxima reserva usa el nuevo valor |
| 10 | Cliente | Abrir `/app/usuarios.html` escribiendo la URL | "Sin acceso" |
