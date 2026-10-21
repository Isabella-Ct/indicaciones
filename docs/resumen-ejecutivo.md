# PARKO · Resumen ejecutivo

*Para la sustentación del proyecto Parking Lot ABC · versión 1.0.0*

## El problema

El **Parqueadero ABC** (Carrera 43 # 47-53, Medellín; carros y motos; 24 horas) se operaba a mano. Las entradas y salidas se anotaban en papel, el cobro se calculaba a ojo, la ocupación no se conocía en tiempo real, las mensualidades se controlaban en hojas sueltas y no había historial para responder preguntas del negocio: cuánto se recaudó, a qué hora se llena o qué vehículos no pueden entrar por pico y placa.

## La solución

**PARKO** es una aplicación web que digitaliza toda la operación, con tres perfiles y una página pública:

| Perfil | Qué hace en PARKO |
|---|---|
| **Operador** (caseta) | Registra entradas desde un modal con la placa en grande, la celda sugerida y el ticket armándose en vivo. Ve el mapa de celdas actualizado al instante. Registra la salida y cobra con el valor calculado por el sistema. Registra incidencias. |
| **Administrador** | Todo lo anterior, más: usuarios y vehículos, tarifas, descuentos, membresías, reglas de pico y placa, parámetros del negocio, mensajes a los clientes y **11 reportes** (ocupación por hora y día, celdas más usadas, vehículos frecuentes, financiero…) exportables a CSV. |
| **Cliente** | Consulta la disponibilidad en vivo y **reserva** una celda con cuenta regresiva para llegar. Revisa sus estadías, descarga sus facturas en PDF y ve sus membresías e incidencias. |
| **Público** (sin cuenta) | Ve los cupos libres de carros y motos en vivo, las tarifas, el pico y placa de hoy y la ubicación. |

### Lo que el sistema resuelve solo

- **Cobro correcto siempre.** Tarifa por minuto (o por fracción) con tope por cada 24 h, minutos de gracia, membresía en $ 0 y un descuento por factura. El servidor calcula el total; el valor que envíe el navegador se ignora. Cada factura guarda su cálculo, así que un cambio de tarifa no altera las anteriores.
- **Pico y placa de Medellín.** Si la placa tiene restricción a esa hora, la entrada se rechaza, se registra el intento y se avisa al administrador.
- **Celdas.** Una celda solo admite un vehículo de su tipo. Las accesibles se reservan para quien las necesita. Las mensualidades con celda fija la encuentran apartada al llegar. Las reservas vencen solas a los 30 minutos y liberan la celda.
- **Tiempo real.** Cada entrada, salida o cambio de estado aparece al instante en el mapa del operador, en el del cliente y en la página pública (Server-Sent Events).
- **Sin errores por simultaneidad.** Si dos operadores intentan ocupar la misma celda, o dos clientes reservarla, o se cobra dos veces la misma estadía, el sistema acepta una sola operación y rechaza la otra. Las facturas tienen numeración consecutiva sin huecos.
- **Notificaciones internas.** Una campana con contador en vivo avisa de incidencias, membresías por vencer, reservas expiradas, cambios de datos y entradas rechazadas.

## Cómo está construido

| Capa | Tecnología y decisiones |
|---|---|
| **Backend** | Node.js + Express 5. Arquitectura por módulos en cuatro capas (**rutas → controlador → servicio → repositorio**): las reglas de negocio viven solo en el servicio y el SQL solo en el repositorio. 22 módulos, 109 endpoints REST bajo `/api/v1`. |
| **Base de datos** | MySQL 8, 24 tablas, SQL plano parametrizado (sin ORM). Une y corrige los dos borradores iniciales. Usa índices únicos sobre columnas generadas para que la propia base de datos impida dos estadías abiertas del mismo vehículo o dos reservas de la misma celda. Borrado lógico en todo lo que tiene historial. |
| **Frontend** | HTML, CSS y JavaScript **sin frameworks ni empaquetador**, con **Atomic Design**: 15 átomos, 24 moléculas, 23 organismos y 3 plantillas, cada uno una función que devuelve un elemento del DOM. 19 pantallas. |
| **Diseño** | Sistema visual propio **PARKO** ("plano industrial": concreto, asfalto, amarillo de seguridad, franjas de peligro, tipografía condensada, cero sombras), con tokens de diseño únicos y sprite de iconos propio. Responsive desde 360 px. |
| **Seguridad** | Contraseñas con bcrypt; sesión JWT en cookie httpOnly/SameSite; límite de intentos de login; permisos por rol verificados en **cada** ruta; validación de **toda** entrada con zod; consultas parametrizadas; cabeceras helmet con CSP; fotos verificadas por su firma real; nada de `innerHTML` con datos de usuarios. |
| **Calidad** | **234 pruebas automáticas** (Jest + supertest) que incluyen el flujo completo de un cliente nuevo hasta los reportes y los casos de concurrencia. Cobertura de los servicios ≥ 80 %. Lint sin errores. Recorrido automático de las pantallas con los 3 roles en escritorio y móvil. Lighthouse 100 en accesibilidad y buenas prácticas en las pantallas medidas. |
| **Trazabilidad** | Los 42 requerimientos (30 originales + 12 del alcance ampliado) están enlazados a sus endpoints, pantallas y pruebas en `docs/trazabilidad.md`. |

## Cifras

- 42 requerimientos cubiertos; ninguno pendiente.
- ~10.000 líneas de backend, ~13.700 de JavaScript de frontend, ~3.900 de CSS y ~4.300 de pruebas.
- Semilla realista: 60 días de operación (~2.900 estadías y facturas, horas pico, fines de semana más tranquilos), para mostrar los reportes con datos creíbles.

## Fuera de alcance (decisiones del cliente)

| Tema | Cómo queda en la versión 1.0 |
|---|---|
| Reconocimiento óptico de placas (OCR, cámaras) | **Simulado:** el operador digita la placa y puede adjuntar una foto, que queda guardada como "lectura". |
| Facturación electrónica DIAN | La factura es un **PDF interno** con número consecutivo; no se reporta a la DIAN. |
| Pasarela de pagos | El pago es **simulado:** se registra el método (efectivo, tarjeta o transferencia) sin cobrar en línea. |
| Correos y SMS | Solo **notificaciones internas** (campana); no se envían mensajes externos. |

## Posibles siguientes pasos

1. Integrar una cámara con OCR en las puertas para leer la placa automáticamente.
2. Pasarela de pagos (PSE, tarjetas) y facturación electrónica a través de un proveedor autorizado por la DIAN.
3. Avisos por correo o WhatsApp para membresías por vencer y reservas.
4. Varias sedes: el modelo ya tiene la tabla `parqueaderos`; faltaría elegir la sede en la interfaz.
5. Despliegue en un servidor con HTTPS (la cookie de sesión ya se marca `Secure` en producción).

## Documentación de entrega

`README.md` (instalación) · `docs/manual-usuario.md` · `docs/api.md` · `docs/modelo-datos.md` · `docs/trazabilidad.md` · `docs/verificacion-manual.md` · `docs/capturas/`
