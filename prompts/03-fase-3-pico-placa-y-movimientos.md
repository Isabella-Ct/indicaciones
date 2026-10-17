# FASE 3 — Pico y placa, entradas, salidas y tickets

## Contexto
Fases 0–2 terminadas (usuarios, vehículos, celdas con SSE). Esta fase es el **corazón operativo**: registrar entradas y salidas en las puertas, validar el pico y placa y emitir tickets. El **cobro** se conecta en la Fase 4; aquí la salida cierra la estadía y calcula los minutos.

## Lee primero
- `CLAUDE.md` §7: secciones **Pico y placa**, **Entrada** y **Salida y cobro** (solo el tiempo; el dinero va en la Fase 4).
- `docs/requerimientos.md`: REQ-CAR-4, REQ-INEX-1 a 4, REQ-PLA-1, REQ-TCK-1.
- `docs/diseno-parko/index.html` y `styles.css`, secciones **7. Gráfico y bitácora** (tabla "Últimos movimientos") y **8. Modal de ingreso** (formulario + ticket de vista previa). Retos 6–8 de `docs/diseno-parko/script.js`.
- `docs/wireframes/03-ingreso-salida.png` y `10-historial.png` con sus correcciones.

Muestra tu plan antes de codificar.

## Tareas

### Backend — módulo `pico-placa`
- CRUD `GET/POST/PUT/PATCH(activa) /api/v1/pico-placa` (admin/operador; REQ-CAR-4). Validar dígito 0–9, día 1–7, hora_inicio < hora_fin, sin reglas duplicadas.
- Servicio `evaluarRestriccion(placa, tipo, fechaHora)` → `{ restringido, regla }`. Carro = último dígito; moto = primer dígito numérico. Úsalo como función pura y testéala aparte.
- `GET /api/v1/pico-placa/hoy`: reglas que aplican hoy.

### Backend — módulo `estadias` (movimientos)
- `POST /api/v1/estadias/entrada` (admin/operador; REQ-INEX-1, REQ-INEX-4):
  1. Recibe `puerta_id`, `placa`, `celda_id` opcional, `requiere_accesible`, `observaciones_entrada`, `deja_llaves` y foto opcional (multer).
  2. Registra la lectura en `lecturas_placa` (simulación del reconocimiento, REQ-PLA-1).
  3. Si la placa no existe: responde 404 con `codigo: "VEHICULO_NO_REGISTRADO"` para que el frontend ofrezca registrarlo como visitante (tipo, color, marca, modelo) y reintente.
  4. Si hay estadía abierta para ese vehículo → 409.
  5. Evalúa pico y placa con la **hora del servidor**: si está restringido → guarda en `accesos_denegados`, notifica a los admins y responde 403 con `codigo: "PICO_Y_PLACA"` y la regla aplicada.
  6. Si tiene reserva vigente o mensualidad con celda fija, usa esa celda (y marca la reserva `cumplida`). Si no, usa la `celda_id` enviada o asigna la primera disponible del tipo correcto (por piso y posición), respetando la regla de celdas accesibles de `CLAUDE.md` §7. Si no hay celdas → 409 `SIN_CUPO`.
  7. En **una transacción**: crea la estadía con `codigo_ticket`, ocupa la celda y emite el evento SSE.
  8. Responde con los datos del ticket.
- `POST /api/v1/estadias/salida` (admin/operador; REQ-INEX-2/3): recibe `puerta_id` + `placa` **o** `codigo_ticket`. Calcula `minutos_estadia` con la hora del servidor y devuelve una **liquidación preliminar** (entrada, salida, minutos, tiempo en formato "2 h 35 min"). **No** cierra todavía: el cierre definitivo ocurre al confirmar el pago en la Fase 4. Por ahora deja un endpoint `POST /api/v1/estadias/:id/cerrar` que cierra la estadía y libera la celda (transacción + SSE); en la Fase 4 se integrará con la factura.
- `GET /api/v1/estadias/en-curso` (vehículos dentro ahora, con tiempo transcurrido).
- `GET /api/v1/estadias` (historial: filtros por placa, rango de fechas, puerta y estado; paginado), usado por el wireframe 10.
- `GET /api/v1/estadias/ultimos-movimientos?limite=10`: entradas y salidas recientes mezcladas (hora, placa, celda, movimiento, valor), para la bitácora.
- `GET /api/v1/estadias/:id/ticket.pdf`: ticket con pdfkit que imite el `ticket` de la maqueta (encabezado con franja de peligro y "TICKET DE INGRESO", N.º, placa, espacio · piso, entrada, tarifa, código de barras del número de ticket, nombre y dirección del parqueadero, observaciones y si dejó llaves); diseño para impresora térmica de 80 mm.
- `GET /api/v1/accesos-denegados` (admin).
- Cliente: `GET /api/v1/usuarios/me/estadias` (historial de sus vehículos).

### Frontend
- `app/pico-placa.html`: tabla de reglas + formulario; resalta las reglas de hoy.
La operación se hace en la pantalla **"Control de espacios"** (`app/celdas.html` de la Fase 2), que se completa así para que quede como la maqueta:
- Botón amarillo **"Registrar ingreso"** en el `page-head` → abre el organism `entry-modal` (sección 8 de la maqueta):
  - Placa en `input--plate` (mayúsculas mientras se escribe, autoenfoque), tipo de vehículo con `tiles` Carro / Moto, casilla "Requiere celda accesible", "Marca, modelo y color" (se habilita solo si la placa no existe), celda asignada con `select` agrupado por piso (`optgroup`) que solo lista celdas libres del tipo elegido y preselecciona la sugerida, hora de entrada **en solo lectura** (la pone el servidor), observaciones, casilla "El conductor deja las llaves en la caseta", puerta (recordada en localStorage) y foto opcional.
  - Una etiqueta muestra el tipo de cliente detectado ("Visitante" o "Mensualidad · <titular>") al escribir la placa.
  - Organism `ticket` a la derecha con **vista previa en vivo** (reto 7). Botones "Cancelar" y "Generar ticket".
  - Mensajes claros y grandes con `toast` o dentro del modal para: pico y placa (con la regla aplicada), sin cupo, placa duplicada dentro y éxito (el ticket final con botón Imprimir).
  - Al guardar, la celda pasa a ocupada en el mapa sin recargar (reto 8, vía SSE).
- Panel de detalle de una celda ocupada: botón **"Registrar salida"** (en la Fase 4 se convierte en "Registrar salida y cobrar") e `icon-button` de imprimir ticket. Por ahora muestra la liquidación preliminar (tiempo) y cierra la estadía; la celda vuelve a libre en el mapa (reto 6).
- Atajo de **salida por placa o ticket**: campo de búsqueda en el `page-head` que selecciona la celda del vehículo y abre su detalle.
- Organism `movement-log` debajo del mapa (sección `bottom`): tabla "Últimos movimientos" con `move--in` / `move--out`, actualizada en vivo.
- `app/pico-placa.html`: tabla de reglas + formulario; resalta las reglas de hoy.
- `app/historial.html` (wireframe 10, con estilo PARKO): filtros por placa y rango de fechas, tabla con vehículo, fecha/hora de ingreso, fecha/hora de salida, duración, celda, puertas, observaciones; exportar CSV.

### Tests (obligatorios)
- `evaluarRestriccion`: carro con último dígito restringido, moto con primer dígito, fuera de horario, día sin regla, regla inactiva.
- Entrada rechazada por pico y placa → se guarda en `accesos_denegados`.
- Doble entrada del mismo vehículo → 409. Sin cupo → 409. Entrada con reserva usa la celda reservada.
- Salida calcula bien los minutos (usa fechas controladas o fake timers).

## Criterios de aceptación
- [ ] Cubre REQ-CAR-4, REQ-INEX-1 a 4, REQ-PLA-1, REQ-TCK-1.
- [ ] Ninguna fecha/hora de movimiento viene del cliente.
- [ ] El mapa de celdas (Fase 2) se actualiza solo al registrar entradas y salidas.
- [ ] Un operador registra una entrada de un vehículo conocido en ≤ 3 interacciones (abrir modal, placa, Enter).
- [ ] El modal de ingreso y el ticket se ven como en la maqueta y la vista previa se actualiza mientras se escribe.
- [ ] El ticket PDF se genera y se ve bien.
- [ ] `npm test` y `npm run lint` pasan; README actualizado.

## Al terminar
Commit + resumen. **No empieces la Fase 4.**
