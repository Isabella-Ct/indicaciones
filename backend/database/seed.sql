-- =====================================================================
-- PARKO · Datos iniciales y de prueba
-- GENERADO por backend/database/generar-seed.js — no editar a mano.
-- Contraseñas de prueba: ver README.md. Fechas relativas a CURDATE()/NOW().
-- =====================================================================
SET NAMES utf8mb4;
SET time_zone = '-05:00';
USE parking_lot_abc;

-- Roles y permisos (CLAUDE.md §6)
INSERT INTO roles (id, nombre, descripcion) VALUES
  (1, 'administrador', 'Acceso total a la operación y configuración'),
  (2, 'operador', 'Operación diaria: entradas, salidas, cobros y celdas'),
  (3, 'usuario', 'Cliente: consulta sus vehículos, facturas y reservas');

INSERT INTO permisos (id, codigo, modulo, descripcion) VALUES
  (1, 'usuarios.ver', 'usuarios', 'Consultar el listado completo de usuarios'),
  (2, 'usuarios.crear', 'usuarios', 'Crear usuarios (REQ-USR-2)'),
  (3, 'usuarios.crear_administrador', 'usuarios', 'Crear usuarios con rol administrador'),
  (4, 'usuarios.editar', 'usuarios', 'Editar cualquier usuario (REQ-USR-5)'),
  (5, 'usuarios.cambiar_estado', 'usuarios', 'Activar o inactivar usuarios (REQ-USR-3)'),
  (6, 'perfil.editar', 'usuarios', 'Editar mis datos personales (REQ-USR-4)'),
  (7, 'vehiculos.ver', 'vehiculos', 'Consultar vehículos'),
  (8, 'vehiculos.crear', 'vehiculos', 'Crear vehículo y asignarlo a un usuario (REQ-CAR-1, REQ-USR-6)'),
  (9, 'vehiculos.editar', 'vehiculos', 'Editar vehículos (REQ-CAR-2)'),
  (10, 'vehiculos.reasignar', 'vehiculos', 'Reasignar vehículo a otro usuario (REQ-CAR-3)'),
  (11, 'pico_placa.ver', 'pico_placa', 'Consultar reglas de pico y placa'),
  (12, 'pico_placa.gestionar', 'pico_placa', 'Configurar pico y placa (REQ-CAR-4)'),
  (13, 'movimientos.ver', 'movimientos', 'Consultar entradas y salidas'),
  (14, 'movimientos.registrar', 'movimientos', 'Registrar entrada y salida (REQ-INEX-1/2)'),
  (15, 'facturas.ver', 'facturas', 'Consultar facturas'),
  (16, 'facturas.cobrar', 'facturas', 'Registrar pagos (REQ-FAC-1)'),
  (17, 'celdas.ver', 'celdas', 'Ver el mapa de celdas (REQ-CLD-01/02)'),
  (18, 'celdas.cambiar_estado', 'celdas', 'Cambiar el estado de una celda (REQ-CLD-03)'),
  (19, 'celdas.gestionar', 'celdas', 'Crear, editar e inactivar celdas'),
  (20, 'incidencias.ver', 'incidencias', 'Consultar incidencias'),
  (21, 'incidencias.registrar', 'incidencias', 'Registrar incidencias (REQ-INCD-1)'),
  (22, 'tarifas.ver', 'tarifas', 'Consultar tarifas'),
  (23, 'tarifas.gestionar', 'tarifas', 'Configurar tarifas (REQ-TAR-1)'),
  (24, 'descuentos.ver', 'descuentos', 'Consultar descuentos'),
  (25, 'descuentos.gestionar', 'descuentos', 'Gestionar descuentos (REQ-DES-1)'),
  (26, 'membresias.ver', 'membresias', 'Consultar membresías'),
  (27, 'membresias.gestionar', 'membresias', 'Gestionar membresías (REQ-MEM-1)'),
  (28, 'reservas.ver', 'reservas', 'Consultar todas las reservas'),
  (29, 'reservas.crear', 'reservas', 'Reservar una celda (REQ-RES-1)'),
  (30, 'reservas.gestionar', 'reservas', 'Gestionar reservas de cualquier cliente'),
  (31, 'reportes.ver', 'reportes', 'Ver reportes (REQ-REP-*)'),
  (32, 'notificaciones.enviar', 'notificaciones', 'Enviar mensajes manuales (REQ-NOT-1)'),
  (33, 'configuracion.gestionar', 'configuracion', 'Editar parámetros del sistema'),
  (34, 'portal.ver', 'portal', 'Mis vehículos, mis facturas y mis reservas'),
  (35, 'usuarios.buscar', 'usuarios', 'Buscar clientes por documento (asignar vehículos)'),
  (36, 'puertas.gestionar', 'puertas', 'Crear, editar y desactivar puertas de acceso'),
  (37, 'incidencias.gestionar_tipos', 'incidencias', 'Crear, editar y desactivar tipos de incidencia');

INSERT INTO roles_permisos (rol_id, permiso_id) VALUES
  (1, 1),
  (1, 2),
  (1, 3),
  (1, 4),
  (1, 5),
  (1, 6),
  (1, 7),
  (1, 8),
  (1, 9),
  (1, 10),
  (1, 11),
  (1, 12),
  (1, 13),
  (1, 14),
  (1, 15),
  (1, 16),
  (1, 17),
  (1, 18),
  (1, 19),
  (1, 20),
  (1, 21),
  (1, 22),
  (1, 23),
  (1, 24),
  (1, 25),
  (1, 26),
  (1, 27),
  (1, 28),
  (1, 29),
  (1, 30),
  (1, 31),
  (1, 32),
  (1, 33),
  (1, 35),
  (1, 36),
  (1, 37),
  (2, 2),
  (2, 6),
  (2, 7),
  (2, 8),
  (2, 11),
  (2, 12),
  (2, 13),
  (2, 14),
  (2, 15),
  (2, 16),
  (2, 17),
  (2, 18),
  (2, 20),
  (2, 21),
  (2, 22),
  (2, 24),
  (2, 26),
  (2, 28),
  (2, 29),
  (2, 35),
  (3, 6),
  (3, 17),
  (3, 29),
  (3, 34);

-- Usuarios de prueba (1 administrador, 2 operadores, 5 clientes activos + 1 inactivo)
INSERT INTO usuarios (id, tipo_documento, numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, celular, contrasena_hash, debe_cambiar_contrasena, estado, rol_id, creado_por) VALUES
  (1, 'CC', '1000000001', 'Laura', 'Marcela', 'Gómez', 'Ríos', 'laura.gomez@parko.test', '3001000001', '$2b$10$qm7.b2axUHk5VA1tRBBCpuHpkYCHd0.zikuvOYMn.kc2F19DrALnO', 0, 'activo', 1, NULL),
  (2, 'CC', '1000000002', 'Juan', NULL, 'Pérez', 'Arango', 'juan.perez@parko.test', '3001000002', '$2b$10$HqZBPFDD2Zur7hjtK6E4C.2A9UnZ4wiYkwgXVXXRzXTcS9wWxZtcW', 0, 'activo', 2, 1),
  (3, 'CC', '1000000003', 'Sebastián', NULL, 'Duque', 'Mejía', 'sebastian.duque@parko.test', '3001000003', '$2b$10$HqZBPFDD2Zur7hjtK6E4C.2A9UnZ4wiYkwgXVXXRzXTcS9wWxZtcW', 0, 'activo', 2, 1),
  (4, 'CC', '1000000004', 'Andrea', NULL, 'Salcedo', 'Vélez', 'andrea.salcedo@correo.test', '3101000004', '$2b$10$RoN.QJBiLgF.YK.4LMSCSubISYFFLfxWE/0ZBW.T5v7C/YsHXHweG', 0, 'activo', 3, 1),
  (5, 'CC', '1000000005', 'Paula', 'Andrea', 'Giraldo', NULL, 'paula.giraldo@correo.test', '3101000005', '$2b$10$RoN.QJBiLgF.YK.4LMSCSubISYFFLfxWE/0ZBW.T5v7C/YsHXHweG', 0, 'activo', 3, 1),
  (6, 'CC', '1000000006', 'Hernán', NULL, 'Quintero', 'Zapata', 'hernan.quintero@correo.test', '3101000006', '$2b$10$RoN.QJBiLgF.YK.4LMSCSubISYFFLfxWE/0ZBW.T5v7C/YsHXHweG', 0, 'activo', 3, 1),
  (7, 'CE', '1000000007', 'Lucía', NULL, 'Ortega', NULL, 'lucia.ortega@correo.test', '3101000007', '$2b$10$RoN.QJBiLgF.YK.4LMSCSubISYFFLfxWE/0ZBW.T5v7C/YsHXHweG', 0, 'activo', 3, 1),
  (8, 'CC', '1000000008', 'Camilo', 'José', 'Restrepo', 'Ochoa', 'camilo.restrepo@correo.test', '3101000008', '$2b$10$RoN.QJBiLgF.YK.4LMSCSubISYFFLfxWE/0ZBW.T5v7C/YsHXHweG', 1, 'activo', 3, 1),
  (9, 'CC', '1000000009', 'Felipe', NULL, 'Mora', 'Cano', 'felipe.mora@correo.test', '3101000009', '$2b$10$RoN.QJBiLgF.YK.4LMSCSubISYFFLfxWE/0ZBW.T5v7C/YsHXHweG', 0, 'inactivo', 3, 1);

-- Sede, pisos y puertas
INSERT INTO parqueaderos (id, nombre, direccion, ciudad, telefono, horario) VALUES
  (1, 'Parqueadero ABC', 'Carrera 43 # 47-53', 'Medellín', '6045550143', 'Abierto 24 horas');

INSERT INTO pisos (id, parqueadero_id, nombre, orden, texto_carril) VALUES
  (1, 1, 'Sótano 1', 1, 'ENTRADA → | → CIRCULACIÓN → | → RAMPA S2'),
  (2, 1, 'Sótano 2', 2, '← RAMPA S1 | ← CIRCULACIÓN ← | SALIDA ←');

INSERT INTO puertas (id, parqueadero_id, nombre, tipo, activa) VALUES
  (1, 1, 'Norte', 'mixta', 1),
  (2, 1, 'Sur', 'mixta', 1);

-- Vehículos: 10 con propietario y 2 de visitantes
INSERT INTO vehiculos (id, placa, tipo, color, marca, modelo, usuario_id, creado_por) VALUES
  (1, 'MNP908', 'carro', 'Gris', 'Mazda', 'CX-30', 4, 2),
  (2, 'XKP45F', 'moto', 'Azul', 'Yamaha', 'NMAX', 4, 2),
  (3, 'CVB275', 'carro', 'Rojo', 'Honda', 'HR-V', 5, 2),
  (4, 'GMR58K', 'moto', 'Rojo', 'Honda', 'XRE 300', 5, 2),
  (5, 'QWE731', 'carro', 'Negro', 'Toyota', 'Corolla', 6, 2),
  (6, 'BQS19E', 'moto', 'Negro', 'AKT', 'NKD 125', 6, 2),
  (7, 'BNM350', 'carro', 'Blanco', 'Hyundai', 'Tucson', 7, 2),
  (8, 'RTV82G', 'moto', 'Rojo', 'Honda', 'CB 190', 7, 2),
  (9, 'HJK740', 'carro', 'Gris', 'Kia', 'Sportage', 8, 2),
  (10, 'OPQ119', 'carro', 'Rojo', 'Mazda', '2', 8, 2),
  (11, 'JKL482', 'carro', 'Rojo', 'Chevrolet', 'Spark', NULL, 2),
  (12, 'FJS27D', 'moto', 'Blanco', 'TVS', 'Apache', NULL, 2);

-- 44 celdas: Sótano 1 (A, B) y Sótano 2 (C carros, M motos)
INSERT INTO celdas (id, parqueadero_id, codigo, area, piso_id, fila_mapa, posicion, tipo, es_accesible, estado, vehiculo_actual_id, nota) VALUES
  (1, 1, 'A-01', 'A', 1, 'superior', 1, 'carro', 1, 'disponible', NULL, NULL),
  (2, 1, 'A-02', 'A', 1, 'superior', 2, 'carro', 0, 'disponible', NULL, NULL),
  (3, 1, 'A-03', 'A', 1, 'superior', 3, 'carro', 0, 'ocupada', 11, NULL),
  (4, 1, 'A-04', 'A', 1, 'superior', 4, 'carro', 0, 'reservada', NULL, NULL),
  (5, 1, 'A-05', 'A', 1, 'superior', 5, 'carro', 0, 'ocupada', 5, NULL),
  (6, 1, 'A-06', 'A', 1, 'superior', 6, 'carro', 0, 'disponible', NULL, NULL),
  (7, 1, 'A-07', 'A', 1, 'superior', 7, 'carro', 0, 'disponible', NULL, NULL),
  (8, 1, 'A-08', 'A', 1, 'superior', 8, 'carro', 0, 'disponible', NULL, NULL),
  (9, 1, 'A-09', 'A', 1, 'superior', 9, 'carro', 0, 'fuera_servicio', NULL, 'Filtración en el techo'),
  (10, 1, 'A-10', 'A', 1, 'superior', 10, 'carro', 0, 'ocupada', 7, NULL),
  (11, 1, 'A-11', 'A', 1, 'superior', 11, 'carro', 0, 'disponible', NULL, NULL),
  (12, 1, 'A-12', 'A', 1, 'superior', 12, 'carro', 0, 'disponible', NULL, NULL),
  (13, 1, 'B-01', 'B', 1, 'inferior', 1, 'carro', 1, 'disponible', NULL, NULL),
  (14, 1, 'B-02', 'B', 1, 'inferior', 2, 'carro', 0, 'disponible', NULL, NULL),
  (15, 1, 'B-03', 'B', 1, 'inferior', 3, 'carro', 0, 'disponible', NULL, NULL),
  (16, 1, 'B-04', 'B', 1, 'inferior', 4, 'carro', 0, 'disponible', NULL, NULL),
  (17, 1, 'B-05', 'B', 1, 'inferior', 5, 'carro', 0, 'ocupada', 9, NULL),
  (18, 1, 'B-06', 'B', 1, 'inferior', 6, 'carro', 0, 'disponible', NULL, NULL),
  (19, 1, 'B-07', 'B', 1, 'inferior', 7, 'carro', 0, 'disponible', NULL, NULL),
  (20, 1, 'B-08', 'B', 1, 'inferior', 8, 'carro', 0, 'disponible', NULL, NULL),
  (21, 1, 'B-09', 'B', 1, 'inferior', 9, 'carro', 0, 'reservada', NULL, NULL),
  (22, 1, 'B-10', 'B', 1, 'inferior', 10, 'carro', 0, 'disponible', NULL, NULL),
  (23, 1, 'B-11', 'B', 1, 'inferior', 11, 'carro', 0, 'disponible', NULL, NULL),
  (24, 1, 'B-12', 'B', 1, 'inferior', 12, 'carro', 0, 'disponible', NULL, NULL),
  (25, 1, 'C-01', 'C', 2, 'superior', 1, 'carro', 0, 'disponible', NULL, NULL),
  (26, 1, 'C-02', 'C', 2, 'superior', 2, 'carro', 0, 'disponible', NULL, NULL),
  (27, 1, 'C-03', 'C', 2, 'superior', 3, 'carro', 0, 'ocupada', 10, NULL),
  (28, 1, 'C-04', 'C', 2, 'superior', 4, 'carro', 0, 'disponible', NULL, NULL),
  (29, 1, 'C-05', 'C', 2, 'superior', 5, 'carro', 0, 'disponible', NULL, NULL),
  (30, 1, 'C-06', 'C', 2, 'superior', 6, 'carro', 0, 'disponible', NULL, NULL),
  (31, 1, 'C-07', 'C', 2, 'superior', 7, 'carro', 0, 'disponible', NULL, NULL),
  (32, 1, 'C-08', 'C', 2, 'superior', 8, 'carro', 0, 'disponible', NULL, NULL),
  (33, 1, 'M-01', 'M', 2, 'inferior', 1, 'moto', 0, 'ocupada', 2, NULL),
  (34, 1, 'M-02', 'M', 2, 'inferior', 2, 'moto', 0, 'disponible', NULL, NULL),
  (35, 1, 'M-03', 'M', 2, 'inferior', 3, 'moto', 0, 'disponible', NULL, NULL),
  (36, 1, 'M-04', 'M', 2, 'inferior', 4, 'moto', 0, 'disponible', NULL, NULL),
  (37, 1, 'M-05', 'M', 2, 'inferior', 5, 'moto', 0, 'disponible', NULL, NULL),
  (38, 1, 'M-06', 'M', 2, 'inferior', 6, 'moto', 0, 'disponible', NULL, NULL),
  (39, 1, 'M-07', 'M', 2, 'inferior', 7, 'moto', 0, 'disponible', NULL, NULL),
  (40, 1, 'M-08', 'M', 2, 'inferior', 8, 'moto', 0, 'disponible', NULL, NULL),
  (41, 1, 'M-09', 'M', 2, 'inferior', 9, 'moto', 0, 'disponible', NULL, NULL),
  (42, 1, 'M-10', 'M', 2, 'inferior', 10, 'moto', 0, 'disponible', NULL, NULL),
  (43, 1, 'M-11', 'M', 2, 'inferior', 11, 'moto', 0, 'disponible', NULL, NULL),
  (44, 1, 'M-12', 'M', 2, 'inferior', 12, 'moto', 0, 'ocupada', 12, NULL);

-- Pico y placa de ejemplo (carros: último dígito; motos: primer dígito)
INSERT INTO pico_placa (id, tipo_vehiculo, dia_semana, digito, hora_inicio, hora_fin, activa, creado_por) VALUES
  (1, 'carro', 1, 1, '05:00:00', '20:00:00', 1, 1),
  (2, 'carro', 1, 7, '05:00:00', '20:00:00', 1, 1),
  (3, 'carro', 2, 0, '05:00:00', '20:00:00', 1, 1),
  (4, 'carro', 2, 3, '05:00:00', '20:00:00', 1, 1),
  (5, 'carro', 3, 4, '05:00:00', '20:00:00', 1, 1),
  (6, 'carro', 3, 6, '05:00:00', '20:00:00', 1, 1),
  (7, 'carro', 4, 5, '05:00:00', '20:00:00', 1, 1),
  (8, 'carro', 4, 9, '05:00:00', '20:00:00', 1, 1),
  (9, 'carro', 5, 2, '05:00:00', '20:00:00', 1, 1),
  (10, 'carro', 5, 8, '05:00:00', '20:00:00', 1, 1),
  (11, 'moto', 1, 1, '05:00:00', '20:00:00', 1, 1),
  (12, 'moto', 1, 7, '05:00:00', '20:00:00', 1, 1),
  (13, 'moto', 2, 0, '05:00:00', '20:00:00', 1, 1),
  (14, 'moto', 2, 3, '05:00:00', '20:00:00', 1, 1),
  (15, 'moto', 3, 4, '05:00:00', '20:00:00', 1, 1),
  (16, 'moto', 3, 6, '05:00:00', '20:00:00', 1, 1),
  (17, 'moto', 4, 5, '05:00:00', '20:00:00', 1, 1),
  (18, 'moto', 4, 9, '05:00:00', '20:00:00', 1, 1),
  (19, 'moto', 5, 2, '05:00:00', '20:00:00', 1, 1),
  (20, 'moto', 5, 8, '05:00:00', '20:00:00', 1, 1);

-- Tarifas (carro $120/min tope $28.000; moto $60/min tope $12.000)
INSERT INTO tarifas (id, tipo_vehiculo, valor_fraccion, minutos_fraccion, minutos_gracia, valor_dia_maximo, vigente_desde, activa, creado_por) VALUES
  (1, 'carro', 120, 1, 0, 28000, CURDATE() - INTERVAL 60 DAY, 1, 1),
  (2, 'moto', 60, 1, 0, 12000, CURDATE() - INTERVAL 60 DAY, 1, 1);

INSERT INTO descuentos (id, nombre, descripcion, porcentaje) VALUES
  (1, 'Cliente frecuente', 'Clientes con más de 10 visitas en el mes', 10),
  (2, 'Convenio comercio vecino', 'Compras en locales aliados de la Carrera 43', 20),
  (3, 'Adulto mayor', 'Conductores mayores de 62 años', 15);

INSERT INTO tipos_incidencia (id, nombre, descripcion) VALUES
  (1, 'Rayón', 'Rayones en la pintura o los vidrios'),
  (2, 'Choque', 'Colisión entre vehículos dentro del parqueadero'),
  (3, 'Atropellamiento', 'Un vehículo golpea a una persona'),
  (4, 'Golpe contra muro', 'Un vehículo golpea un muro, columna o estructura');

INSERT INTO configuracion (clave, valor, tipo, descripcion) VALUES
  ('reserva_minutos_expiracion', '30', 'entero', 'Minutos que dura una reserva si el vehículo no llega'),
  ('membresia_dias_aviso_vencimiento', '3', 'entero', 'Días antes del vencimiento para notificar al cliente'),
  ('membresia_valor_mensual_carro', '180000', 'decimal', 'Valor de la mensualidad de carro (COP)'),
  ('membresia_valor_anual_carro', '1900000', 'decimal', 'Valor de la anualidad de carro (COP)'),
  ('membresia_valor_mensual_moto', '70000', 'decimal', 'Valor de la mensualidad de moto (COP)'),
  ('membresia_valor_anual_moto', '750000', 'decimal', 'Valor de la anualidad de moto (COP)'),
  ('facturacion_redondeo', '100', 'entero', 'Múltiplo al que se redondea el total con descuento (COP)'),
  ('ticket_mensaje_pie', 'Conserve este ticket. Sin él, la salida requiere validar la placa.', 'texto', 'Texto al pie del ticket de ingreso');

-- Mensualidades (A-04 y B-09 con celda fija)
INSERT INTO membresias (id, usuario_id, vehiculo_id, celda_asignada_id, tipo, valor, fecha_inicio, fecha_fin, estado, creado_por) VALUES
  (1, 4, 1, 4, 'mensual', 180000, CURDATE() - INTERVAL 20 DAY, CURDATE() - INTERVAL 20 DAY + INTERVAL 1 MONTH, 'activa', 1),
  (2, 5, 3, 21, 'mensual', 180000, CURDATE() + INTERVAL 2 DAY - INTERVAL 1 MONTH, CURDATE() + INTERVAL 2 DAY, 'activa', 1),
  (3, 6, 5, NULL, 'mensual', 180000, CURDATE() - INTERVAL 15 DAY, CURDATE() - INTERVAL 15 DAY + INTERVAL 1 MONTH, 'activa', 1);

-- Estadías: 115 históricas (14 días) + 7 en curso
INSERT INTO estadias (id, codigo_ticket, vehiculo_id, celda_id, tipo_cliente, membresia_id, puerta_entrada_id, puerta_salida_id, fecha_hora_entrada, fecha_hora_salida, minutos_estadia, requiere_accesible, observaciones_entrada, deja_llaves, estado, registrada_entrada_por, registrada_salida_por) VALUES
  (1, 'T-000001', 6, 42, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '10:42:00'), TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '17:43:00'), 421, 0, 'Sin novedades visibles', 0, 'finalizada', 1, 1),
  (2, 'T-000002', 10, 23, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '11:32:00'), TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '20:15:00'), 523, 0, NULL, 0, 'finalizada', 1, 3),
  (3, 'T-000003', 7, 32, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '12:54:00'), TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '14:42:00'), 108, 0, NULL, 0, 'finalizada', 2, 1),
  (4, 'T-000004', 4, 33, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '14:49:00'), TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '18:16:00'), 207, 0, NULL, 0, 'finalizada', 3, 2),
  (5, 'T-000005', 12, 36, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '15:18:00'), TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '22:56:00'), 458, 0, NULL, 0, 'finalizada', 3, 2),
  (6, 'T-000006', 1, 4, 'mensualidad', 1, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '17:38:00'), TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '20:17:00'), 159, 0, NULL, 0, 'finalizada', 3, 3),
  (7, 'T-000007', 8, 33, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '18:52:00'), TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '19:49:00'), 57, 0, NULL, 0, 'finalizada', 3, 1),
  (8, 'T-000008', 2, 44, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '19:55:00'), TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '21:45:00'), 110, 0, NULL, 0, 'finalizada', 1, 3),
  (9, 'T-000009', 9, 17, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '08:42:00'), TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '09:48:00'), 66, 0, NULL, 0, 'finalizada', 2, 2),
  (10, 'T-000010', 12, 35, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '12:27:00'), TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '12:42:00'), 15, 0, 'Sin novedades visibles', 0, 'finalizada', 2, 2),
  (11, 'T-000011', 10, 30, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '13:44:00'), TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '14:09:00'), 25, 0, 'Sin novedades visibles', 0, 'finalizada', 3, 2),
  (12, 'T-000012', 2, 44, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '17:06:00'), TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '17:34:00'), 28, 0, 'Sin novedades visibles', 0, 'finalizada', 3, 3),
  (13, 'T-000013', 11, 19, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '17:36:00'), TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '23:30:00'), 354, 0, 'Sin novedades visibles', 0, 'finalizada', 2, 3),
  (14, 'T-000014', 1, 4, 'mensualidad', 1, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '18:08:00'), TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '23:30:00'), 322, 0, NULL, 0, 'finalizada', 2, 1),
  (15, 'T-000015', 8, 40, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '18:24:00'), TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '20:42:00'), 138, 0, 'Sin novedades visibles', 0, 'finalizada', 2, 1),
  (16, 'T-000016', 3, 21, 'mensualidad', 2, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '19:07:00'), TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '23:30:00'), 263, 0, NULL, 0, 'finalizada', 3, 2),
  (17, 'T-000017', 4, 35, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '19:55:00'), TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '23:30:00'), 215, 0, NULL, 0, 'finalizada', 2, 3),
  (18, 'T-000018', 8, 33, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '07:13:00'), TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '09:55:00'), 162, 0, 'Sin novedades visibles', 1, 'finalizada', 2, 3),
  (19, 'T-000019', 12, 35, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '07:31:00'), TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '09:13:00'), 102, 0, NULL, 0, 'finalizada', 3, 2),
  (20, 'T-000020', 9, 32, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '07:56:00'), TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '15:19:00'), 443, 0, NULL, 0, 'finalizada', 2, 1),
  (21, 'T-000021', 1, 4, 'mensualidad', 1, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '10:24:00'), TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '18:35:00'), 491, 0, NULL, 0, 'finalizada', 3, 3),
  (22, 'T-000022', 6, 39, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '11:05:00'), TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '15:50:00'), 285, 0, NULL, 0, 'finalizada', 3, 3),
  (23, 'T-000023', 2, 44, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '14:16:00'), TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '19:35:00'), 319, 0, NULL, 0, 'finalizada', 2, 2),
  (24, 'T-000024', 5, 17, 'mensualidad', 3, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '15:22:00'), TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '23:17:00'), 475, 0, NULL, 0, 'finalizada', 2, 2),
  (25, 'T-000025', 5, 1, 'mensualidad', 3, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '06:10:00'), TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '09:07:00'), 177, 0, NULL, 0, 'finalizada', 2, 1),
  (26, 'T-000026', 1, 4, 'mensualidad', 1, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '07:08:00'), TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '10:57:00'), 229, 0, NULL, 1, 'finalizada', 1, 2),
  (27, 'T-000027', 6, 34, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '10:47:00'), TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '11:59:00'), 72, 0, 'Sin novedades visibles', 0, 'finalizada', 2, 3),
  (28, 'T-000028', 7, 18, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '12:52:00'), TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '16:53:00'), 241, 0, NULL, 1, 'finalizada', 3, 2),
  (29, 'T-000029', 4, 37, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '14:15:00'), TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '15:01:00'), 46, 0, 'Sin novedades visibles', 1, 'finalizada', 2, 2),
  (30, 'T-000030', 8, 33, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '15:29:00'), TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '19:26:00'), 237, 0, NULL, 0, 'finalizada', 2, 1),
  (31, 'T-000031', 11, 7, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '17:01:00'), TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '23:30:00'), 389, 0, NULL, 0, 'finalizada', 1, 3),
  (32, 'T-000032', 9, 3, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '19:38:00'), TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '21:11:00'), 93, 0, NULL, 0, 'finalizada', 3, 3),
  (33, 'T-000033', 7, 15, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '10:53:00'), TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '17:00:00'), 367, 0, NULL, 0, 'finalizada', 3, 2),
  (34, 'T-000034', 8, 34, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '10:54:00'), TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '17:13:00'), 379, 0, 'Sin novedades visibles', 1, 'finalizada', 1, 1),
  (35, 'T-000035', 5, 12, 'mensualidad', 3, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '13:40:00'), TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '15:24:00'), 104, 0, NULL, 0, 'finalizada', 2, 3),
  (36, 'T-000036', 4, 43, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '17:41:00'), TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '23:30:00'), 349, 0, NULL, 0, 'finalizada', 3, 3),
  (37, 'T-000037', 12, 34, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '17:48:00'), TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '20:57:00'), 189, 0, NULL, 0, 'finalizada', 2, 2),
  (38, 'T-000038', 2, 44, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '18:22:00'), TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '18:44:00'), 22, 0, NULL, 0, 'finalizada', 1, 3),
  (39, 'T-000039', 3, 21, 'mensualidad', 2, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '18:51:00'), TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '21:23:00'), 152, 0, NULL, 0, 'finalizada', 3, 2),
  (40, 'T-000040', 1, 4, 'mensualidad', 1, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '19:04:00'), TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '23:30:00'), 266, 0, NULL, 0, 'finalizada', 2, 3),
  (41, 'T-000041', 11, 18, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '06:54:00'), TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '07:55:00'), 61, 0, 'Sin novedades visibles', 1, 'finalizada', 3, 3),
  (42, 'T-000042', 6, 37, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '08:40:00'), TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '14:24:00'), 344, 0, NULL, 0, 'finalizada', 1, 1),
  (43, 'T-000043', 3, 21, 'mensualidad', 2, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '11:21:00'), TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '15:53:00'), 272, 0, NULL, 0, 'finalizada', 1, 2),
  (44, 'T-000044', 7, 10, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '13:09:00'), TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '15:52:00'), 163, 0, NULL, 1, 'finalizada', 3, 2),
  (45, 'T-000045', 12, 43, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '13:44:00'), TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '14:56:00'), 72, 0, NULL, 0, 'finalizada', 2, 3),
  (46, 'T-000046', 1, 4, 'mensualidad', 1, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '13:58:00'), TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '17:34:00'), 216, 0, NULL, 0, 'finalizada', 2, 2),
  (47, 'T-000047', 2, 34, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '14:16:00'), TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '16:06:00'), 110, 0, NULL, 0, 'finalizada', 3, 2),
  (48, 'T-000048', 4, 42, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '14:18:00'), TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '18:57:00'), 279, 0, NULL, 1, 'finalizada', 1, 3),
  (49, 'T-000049', 5, 14, 'mensualidad', 3, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '17:28:00'), TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '21:05:00'), 217, 0, NULL, 1, 'finalizada', 1, 2),
  (50, 'T-000050', 8, 37, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '18:56:00'), TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '21:38:00'), 162, 0, NULL, 1, 'finalizada', 3, 3),
  (51, 'T-000051', 12, 41, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '06:14:00'), TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '10:12:00'), 238, 0, 'Sin novedades visibles', 0, 'finalizada', 2, 3),
  (52, 'T-000052', 9, 22, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '10:30:00'), TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '12:02:00'), 92, 0, NULL, 0, 'finalizada', 1, 2),
  (53, 'T-000053', 4, 38, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '10:45:00'), TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '16:29:00'), 344, 0, NULL, 0, 'finalizada', 1, 3),
  (54, 'T-000054', 10, 19, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '11:22:00'), TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '13:43:00'), 141, 0, NULL, 0, 'finalizada', 1, 1),
  (55, 'T-000055', 5, 15, 'mensualidad', 3, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '11:25:00'), TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '15:12:00'), 227, 0, NULL, 0, 'finalizada', 2, 2),
  (56, 'T-000056', 7, 6, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '11:50:00'), TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '17:40:00'), 350, 0, NULL, 0, 'finalizada', 3, 3),
  (57, 'T-000057', 1, 4, 'mensualidad', 1, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '12:00:00'), TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '19:37:00'), 457, 0, NULL, 0, 'finalizada', 3, 2),
  (58, 'T-000058', 6, 37, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '16:35:00'), TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '23:12:00'), 397, 0, NULL, 0, 'finalizada', 3, 3),
  (59, 'T-000059', 2, 35, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '19:26:00'), TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '23:23:00'), 237, 0, NULL, 0, 'finalizada', 2, 3),
  (60, 'T-000060', 3, 21, 'mensualidad', 2, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '19:30:00'), TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '23:30:00'), 240, 0, NULL, 0, 'finalizada', 2, 1),
  (61, 'T-000061', 11, 13, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '19:58:00'), TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '23:28:00'), 210, 0, NULL, 0, 'finalizada', 3, 2),
  (62, 'T-000062', 5, 26, 'mensualidad', 3, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '06:19:00'), TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '10:37:00'), 258, 0, 'Sin novedades visibles', 0, 'finalizada', 2, 3),
  (63, 'T-000063', 9, 11, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '07:13:00'), TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '16:13:00'), 540, 0, NULL, 0, 'finalizada', 2, 1),
  (64, 'T-000064', 8, 37, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '12:28:00'), TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '20:10:00'), 462, 0, NULL, 1, 'finalizada', 3, 3),
  (65, 'T-000065', 11, 3, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '14:03:00'), TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '17:36:00'), 213, 0, 'Sin novedades visibles', 0, 'finalizada', 3, 3),
  (66, 'T-000066', 6, 36, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '15:00:00'), TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '23:01:00'), 481, 0, NULL, 0, 'finalizada', 2, 3),
  (67, 'T-000067', 12, 41, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '16:17:00'), TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '22:48:00'), 391, 0, NULL, 0, 'finalizada', 3, 2),
  (68, 'T-000068', 10, 29, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '16:32:00'), TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '20:27:00'), 235, 0, NULL, 0, 'finalizada', 3, 2),
  (69, 'T-000069', 1, 4, 'mensualidad', 1, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '19:27:00'), TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '23:30:00'), 243, 0, NULL, 0, 'finalizada', 3, 2),
  (70, 'T-000070', 6, 35, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '08:06:00'), TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '13:18:00'), 312, 0, NULL, 0, 'finalizada', 1, 2),
  (71, 'T-000071', 11, 17, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '09:52:00'), TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '11:45:00'), 113, 0, NULL, 0, 'finalizada', 3, 2),
  (72, 'T-000072', 10, 7, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '11:38:00'), TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '15:04:00'), 206, 0, NULL, 0, 'finalizada', 3, 1),
  (73, 'T-000073', 1, 4, 'mensualidad', 1, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '11:57:00'), TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '14:19:00'), 142, 0, NULL, 0, 'finalizada', 2, 3),
  (74, 'T-000074', 4, 37, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '12:43:00'), TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '16:03:00'), 200, 0, 'Sin novedades visibles', 0, 'finalizada', 1, 1),
  (75, 'T-000075', 12, 40, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '14:46:00'), TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '21:24:00'), 398, 0, NULL, 0, 'finalizada', 3, 1),
  (76, 'T-000076', 3, 21, 'mensualidad', 2, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '17:26:00'), TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '22:09:00'), 283, 0, NULL, 0, 'finalizada', 3, 2),
  (77, 'T-000077', 8, 38, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '19:02:00'), TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '23:30:00'), 268, 0, NULL, 0, 'finalizada', 3, 3),
  (78, 'T-000078', 5, 11, 'mensualidad', 3, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '19:06:00'), TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '23:30:00'), 264, 0, NULL, 0, 'finalizada', 2, 2),
  (79, 'T-000079', 1, 4, 'mensualidad', 1, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '06:10:00'), TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '11:32:00'), 322, 0, NULL, 0, 'finalizada', 2, 1),
  (80, 'T-000080', 5, 30, 'mensualidad', 3, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '08:53:00'), TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '14:51:00'), 358, 0, NULL, 0, 'finalizada', 3, 2),
  (81, 'T-000081', 11, 19, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '09:53:00'), TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '17:30:00'), 457, 0, NULL, 0, 'finalizada', 3, 2),
  (82, 'T-000082', 8, 33, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '11:18:00'), TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '17:27:00'), 369, 0, NULL, 0, 'finalizada', 2, 3),
  (83, 'T-000083', 9, 2, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '11:40:00'), TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '14:42:00'), 182, 0, NULL, 0, 'finalizada', 3, 2),
  (84, 'T-000084', 3, 21, 'mensualidad', 2, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '15:57:00'), TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '22:16:00'), 379, 0, NULL, 0, 'finalizada', 2, 3),
  (85, 'T-000085', 1, 4, 'mensualidad', 1, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '06:36:00'), TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '10:28:00'), 232, 0, NULL, 0, 'finalizada', 2, 2),
  (86, 'T-000086', 3, 21, 'mensualidad', 2, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '08:59:00'), TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '11:43:00'), 164, 0, NULL, 0, 'finalizada', 3, 2),
  (87, 'T-000087', 6, 35, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '10:39:00'), TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '14:32:00'), 233, 0, NULL, 0, 'finalizada', 3, 3),
  (88, 'T-000088', 4, 34, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '11:21:00'), TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '12:58:00'), 97, 0, NULL, 0, 'finalizada', 3, 1),
  (89, 'T-000089', 7, 32, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '14:16:00'), TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '17:00:00'), 164, 0, NULL, 0, 'finalizada', 3, 3),
  (90, 'T-000090', 2, 34, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '15:21:00'), TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '18:38:00'), 197, 0, NULL, 0, 'finalizada', 3, 3),
  (91, 'T-000091', 9, 27, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '16:29:00'), TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '17:07:00'), 38, 0, 'Sin novedades visibles', 0, 'finalizada', 2, 2),
  (92, 'T-000092', 10, 8, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '17:02:00'), TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '23:30:00'), 388, 0, NULL, 0, 'finalizada', 2, 3),
  (93, 'T-000093', 5, 14, 'mensualidad', 3, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '19:19:00'), TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '23:30:00'), 251, 0, NULL, 0, 'finalizada', 1, 2),
  (94, 'T-000094', 11, 31, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '19:22:00'), TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '20:49:00'), 87, 0, NULL, 0, 'finalizada', 3, 2),
  (95, 'T-000095', 4, 41, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '06:56:00'), TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '10:17:00'), 201, 0, NULL, 0, 'finalizada', 2, 2),
  (96, 'T-000096', 10, 16, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '06:58:00'), TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '15:52:00'), 534, 0, 'Sin novedades visibles', 0, 'finalizada', 3, 3),
  (97, 'T-000097', 12, 38, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '10:53:00'), TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '18:25:00'), 452, 0, NULL, 0, 'finalizada', 3, 3),
  (98, 'T-000098', 11, 18, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '14:20:00'), TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '20:34:00'), 374, 0, NULL, 0, 'finalizada', 3, 1),
  (99, 'T-000099', 5, 1, 'mensualidad', 3, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '14:28:00'), TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '23:17:00'), 529, 0, NULL, 0, 'finalizada', 1, 3),
  (100, 'T-000100', 1, 4, 'mensualidad', 1, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '14:31:00'), TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '16:52:00'), 141, 0, NULL, 0, 'finalizada', 3, 2),
  (101, 'T-000101', 9, 22, 'visitante', NULL, 2, 2, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '15:05:00'), TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '23:30:00'), 505, 0, NULL, 1, 'finalizada', 2, 2),
  (102, 'T-000102', 6, 42, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '16:36:00'), TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '20:36:00'), 240, 0, NULL, 0, 'finalizada', 2, 1),
  (103, 'T-000103', 2, 38, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '18:43:00'), TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '23:30:00'), 287, 0, 'Sin novedades visibles', 0, 'finalizada', 2, 3),
  (104, 'T-000104', 8, 36, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '19:24:00'), TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '23:30:00'), 246, 0, NULL, 0, 'finalizada', 2, 3),
  (105, 'T-000105', 6, 40, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '07:56:00'), TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '11:45:00'), 229, 0, NULL, 0, 'finalizada', 3, 2),
  (106, 'T-000106', 11, 3, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '08:07:00'), TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '16:43:00'), 516, 0, 'Sin novedades visibles', 0, 'finalizada', 3, 2),
  (107, 'T-000107', 9, 26, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '08:23:00'), TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '14:18:00'), 355, 0, NULL, 0, 'finalizada', 2, 3),
  (108, 'T-000108', 10, 1, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '08:56:00'), TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '15:27:00'), 391, 1, NULL, 0, 'finalizada', 2, 3),
  (109, 'T-000109', 2, 38, 'visitante', NULL, 2, 1, TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '11:35:00'), TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '14:26:00'), 171, 0, NULL, 0, 'finalizada', 3, 3),
  (110, 'T-000110', 12, 33, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '13:42:00'), TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '18:23:00'), 281, 0, 'Sin novedades visibles', 1, 'finalizada', 3, 3),
  (111, 'T-000111', 8, 36, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '06:45:00'), TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '15:34:00'), 529, 0, NULL, 0, 'finalizada', 3, 3),
  (112, 'T-000112', 4, 35, 'visitante', NULL, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '09:45:00'), TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '15:10:00'), 325, 0, NULL, 1, 'finalizada', 2, 2),
  (113, 'T-000113', 1, 4, 'mensualidad', 1, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '11:03:00'), TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '18:22:00'), 439, 0, NULL, 0, 'finalizada', 2, 2),
  (114, 'T-000114', 6, 43, 'visitante', NULL, 1, 1, TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '11:33:00'), TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '16:24:00'), 291, 0, NULL, 0, 'finalizada', 3, 2),
  (115, 'T-000115', 3, 21, 'mensualidad', 2, 1, 2, TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '15:44:00'), TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '19:49:00'), 245, 0, NULL, 0, 'finalizada', 3, 2),
  (116, 'T-000116', 11, 3, 'visitante', NULL, 1, NULL, NOW() - INTERVAL 157 MINUTE, NULL, NULL, 0, 'Rayón leve en el bómper trasero', 0, 'en_curso', 2, NULL),
  (117, 'T-000117', 5, 5, 'mensualidad', 3, 2, NULL, NOW() - INTERVAL 230 MINUTE, NULL, NULL, 0, NULL, 0, 'en_curso', 3, NULL),
  (118, 'T-000118', 7, 10, 'visitante', NULL, 1, NULL, NOW() - INTERVAL 95 MINUTE, NULL, NULL, 0, NULL, 1, 'en_curso', 2, NULL),
  (119, 'T-000119', 9, 17, 'visitante', NULL, 2, NULL, NOW() - INTERVAL 300 MINUTE, NULL, NULL, 0, 'Deja portátil en el baúl', 0, 'en_curso', 3, NULL),
  (120, 'T-000120', 10, 27, 'visitante', NULL, 1, NULL, NOW() - INTERVAL 48 MINUTE, NULL, NULL, 0, NULL, 0, 'en_curso', 2, NULL),
  (121, 'T-000121', 2, 33, 'visitante', NULL, 2, NULL, NOW() - INTERVAL 180 MINUTE, NULL, NULL, 0, NULL, 0, 'en_curso', 3, NULL),
  (122, 'T-000122', 12, 44, 'visitante', NULL, 1, NULL, NOW() - INTERVAL 22 MINUTE, NULL, NULL, 0, 'Casco con el vigilante', 0, 'en_curso', 2, NULL);

INSERT INTO lecturas_placa (placa_leida, imagen_url, fecha_hora, puerta_id, estadia_id, registrada_por) VALUES
  ('JKL482', NULL, NOW() - INTERVAL 157 MINUTE, 1, 116, 2),
  ('QWE731', NULL, NOW() - INTERVAL 230 MINUTE, 2, 117, 3),
  ('BNM350', NULL, NOW() - INTERVAL 95 MINUTE, 1, 118, 2),
  ('HJK740', NULL, NOW() - INTERVAL 300 MINUTE, 2, 119, 3),
  ('OPQ119', NULL, NOW() - INTERVAL 48 MINUTE, 1, 120, 2),
  ('XKP45F', NULL, NOW() - INTERVAL 180 MINUTE, 2, 121, 3),
  ('FJS27D', NULL, NOW() - INTERVAL 22 MINUTE, 1, 122, 2);

-- Facturas: 118 (estadías + mensualidades)
INSERT INTO facturas (id, numero, concepto, estadia_id, membresia_id, cliente_id, subtotal, descuento_id, porcentaje_descuento, valor_descuento, total, metodo_pago, observacion, tarifa_id, detalle_calculo, fecha_pago, registrada_por) VALUES
  (1, 'FAC-000001', 'membresia', NULL, 2, 5, 180000, NULL, 0, 0, 180000, 'transferencia', 'Mensualidad carro', NULL, NULL, TIMESTAMP(CURDATE() + INTERVAL 2 DAY - INTERVAL 1 MONTH, '09:00:00'), 1),
  (2, 'FAC-000002', 'membresia', NULL, 1, 4, 180000, NULL, 0, 0, 180000, 'transferencia', 'Mensualidad carro', NULL, NULL, TIMESTAMP(CURDATE() - INTERVAL 20 DAY, '09:00:00'), 1),
  (3, 'FAC-000003', 'membresia', NULL, 3, 6, 180000, NULL, 0, 0, 180000, 'transferencia', 'Mensualidad carro', NULL, NULL, TIMESTAMP(CURDATE() - INTERVAL 15 DAY, '09:00:00'), 1),
  (4, 'FAC-000004', 'estadia', 3, NULL, 7, 12960, 1, 10, 1260, 11700, 'efectivo', NULL, 1, '{"minutos":108,"fracciones":108,"subtotal":12960,"valorDescuento":1260,"total":11700,"porcentajeDescuento":10,"porcentajeTope":46,"membresia":false,"nota":"108 min × $ 120 = $ 12.960","detalle":[{"paso":"fracciones","texto":"108 min × $ 120 = $ 12.960","valor":12960},{"paso":"descuento","texto":"Descuento Cliente frecuente (10 %): −$ 1.260 (redondeado a la centena)","valor":-1260},{"paso":"total","texto":"Total a pagar: $ 11.700","valor":11700}]}', TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '14:42:00'), 2),
  (5, 'FAC-000005', 'estadia', 1, NULL, 6, 12000, NULL, 0, 0, 12000, 'efectivo', NULL, 2, '{"minutos":421,"fracciones":421,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"421 min × $ 60 = $ 25.260 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"421 min × $ 60 = $ 25.260 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '17:43:00'), 1),
  (6, 'FAC-000006', 'estadia', 4, NULL, 5, 12000, NULL, 0, 0, 12000, 'tarjeta', NULL, 2, '{"minutos":207,"fracciones":207,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"207 min × $ 60 = $ 12.420 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"207 min × $ 60 = $ 12.420 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '18:16:00'), 3),
  (7, 'FAC-000007', 'estadia', 7, NULL, 7, 3420, NULL, 0, 0, 3420, 'efectivo', NULL, 2, '{"minutos":57,"fracciones":57,"subtotal":3420,"valorDescuento":0,"total":3420,"porcentajeDescuento":0,"porcentajeTope":28,"membresia":false,"nota":"57 min × $ 60 = $ 3.420","detalle":[{"paso":"fracciones","texto":"57 min × $ 60 = $ 3.420","valor":3420},{"paso":"total","texto":"Total a pagar: $ 3.420","valor":3420}]}', TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '19:49:00'), 3),
  (8, 'FAC-000008', 'estadia', 2, NULL, 8, 28000, NULL, 0, 0, 28000, 'tarjeta', NULL, 1, '{"minutos":523,"fracciones":523,"subtotal":28000,"valorDescuento":0,"total":28000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"523 min × $ 120 = $ 62.760 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"523 min × $ 120 = $ 62.760 → tope del día $ 28.000","valor":28000},{"paso":"total","texto":"Total a pagar: $ 28.000","valor":28000}]}', TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '20:15:00'), 1),
  (9, 'FAC-000009', 'estadia', 6, NULL, 4, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":159,"fracciones":159,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"fracciones","texto":"159 min × $ 120 = $ 19.080","valor":19080},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 19.080)","valor":-19080},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '20:17:00'), 3),
  (10, 'FAC-000010', 'estadia', 8, NULL, 4, 6600, NULL, 0, 0, 6600, 'transferencia', NULL, 2, '{"minutos":110,"fracciones":110,"subtotal":6600,"valorDescuento":0,"total":6600,"porcentajeDescuento":0,"porcentajeTope":55,"membresia":false,"nota":"110 min × $ 60 = $ 6.600","detalle":[{"paso":"fracciones","texto":"110 min × $ 60 = $ 6.600","valor":6600},{"paso":"total","texto":"Total a pagar: $ 6.600","valor":6600}]}', TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '21:45:00'), 1),
  (11, 'FAC-000011', 'estadia', 5, NULL, NULL, 12000, NULL, 0, 0, 12000, 'transferencia', NULL, 2, '{"minutos":458,"fracciones":458,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"458 min × $ 60 = $ 27.480 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"458 min × $ 60 = $ 27.480 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '22:56:00'), 3),
  (12, 'FAC-000012', 'estadia', 9, NULL, 8, 7920, NULL, 0, 0, 7920, 'efectivo', NULL, 1, '{"minutos":66,"fracciones":66,"subtotal":7920,"valorDescuento":0,"total":7920,"porcentajeDescuento":0,"porcentajeTope":28,"membresia":false,"nota":"66 min × $ 120 = $ 7.920","detalle":[{"paso":"fracciones","texto":"66 min × $ 120 = $ 7.920","valor":7920},{"paso":"total","texto":"Total a pagar: $ 7.920","valor":7920}]}', TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '09:48:00'), 2),
  (13, 'FAC-000013', 'estadia', 10, NULL, NULL, 900, NULL, 0, 0, 900, 'efectivo', NULL, 2, '{"minutos":15,"fracciones":15,"subtotal":900,"valorDescuento":0,"total":900,"porcentajeDescuento":0,"porcentajeTope":8,"membresia":false,"nota":"15 min × $ 60 = $ 900","detalle":[{"paso":"fracciones","texto":"15 min × $ 60 = $ 900","valor":900},{"paso":"total","texto":"Total a pagar: $ 900","valor":900}]}', TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '12:42:00'), 2),
  (14, 'FAC-000014', 'estadia', 11, NULL, 8, 3000, NULL, 0, 0, 3000, 'efectivo', NULL, 1, '{"minutos":25,"fracciones":25,"subtotal":3000,"valorDescuento":0,"total":3000,"porcentajeDescuento":0,"porcentajeTope":11,"membresia":false,"nota":"25 min × $ 120 = $ 3.000","detalle":[{"paso":"fracciones","texto":"25 min × $ 120 = $ 3.000","valor":3000},{"paso":"total","texto":"Total a pagar: $ 3.000","valor":3000}]}', TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '14:09:00'), 3),
  (15, 'FAC-000015', 'estadia', 12, NULL, 4, 1680, NULL, 0, 0, 1680, 'efectivo', NULL, 2, '{"minutos":28,"fracciones":28,"subtotal":1680,"valorDescuento":0,"total":1680,"porcentajeDescuento":0,"porcentajeTope":14,"membresia":false,"nota":"28 min × $ 60 = $ 1.680","detalle":[{"paso":"fracciones","texto":"28 min × $ 60 = $ 1.680","valor":1680},{"paso":"total","texto":"Total a pagar: $ 1.680","valor":1680}]}', TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '17:34:00'), 3),
  (16, 'FAC-000016', 'estadia', 15, NULL, 7, 8280, NULL, 0, 0, 8280, 'efectivo', NULL, 2, '{"minutos":138,"fracciones":138,"subtotal":8280,"valorDescuento":0,"total":8280,"porcentajeDescuento":0,"porcentajeTope":69,"membresia":false,"nota":"138 min × $ 60 = $ 8.280","detalle":[{"paso":"fracciones","texto":"138 min × $ 60 = $ 8.280","valor":8280},{"paso":"total","texto":"Total a pagar: $ 8.280","valor":8280}]}', TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '20:42:00'), 2),
  (17, 'FAC-000017', 'estadia', 13, NULL, NULL, 28000, NULL, 0, 0, 28000, 'efectivo', NULL, 1, '{"minutos":354,"fracciones":354,"subtotal":28000,"valorDescuento":0,"total":28000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"354 min × $ 120 = $ 42.480 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"354 min × $ 120 = $ 42.480 → tope del día $ 28.000","valor":28000},{"paso":"total","texto":"Total a pagar: $ 28.000","valor":28000}]}', TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '23:30:00'), 2),
  (18, 'FAC-000018', 'estadia', 14, NULL, 4, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":322,"fracciones":322,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"322 min × $ 120 = $ 38.640 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '23:30:00'), 2),
  (19, 'FAC-000019', 'estadia', 16, NULL, 5, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":263,"fracciones":263,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"263 min × $ 120 = $ 31.560 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '23:30:00'), 3),
  (20, 'FAC-000020', 'estadia', 17, NULL, 5, 12000, NULL, 0, 0, 12000, 'efectivo', NULL, 2, '{"minutos":215,"fracciones":215,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"215 min × $ 60 = $ 12.900 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"215 min × $ 60 = $ 12.900 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '23:30:00'), 2),
  (21, 'FAC-000021', 'estadia', 19, NULL, NULL, 6120, NULL, 0, 0, 6120, 'tarjeta', NULL, 2, '{"minutos":102,"fracciones":102,"subtotal":6120,"valorDescuento":0,"total":6120,"porcentajeDescuento":0,"porcentajeTope":51,"membresia":false,"nota":"102 min × $ 60 = $ 6.120","detalle":[{"paso":"fracciones","texto":"102 min × $ 60 = $ 6.120","valor":6120},{"paso":"total","texto":"Total a pagar: $ 6.120","valor":6120}]}', TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '09:13:00'), 3),
  (22, 'FAC-000022', 'estadia', 18, NULL, 7, 9720, NULL, 0, 0, 9720, 'tarjeta', NULL, 2, '{"minutos":162,"fracciones":162,"subtotal":9720,"valorDescuento":0,"total":9720,"porcentajeDescuento":0,"porcentajeTope":81,"membresia":false,"nota":"162 min × $ 60 = $ 9.720","detalle":[{"paso":"fracciones","texto":"162 min × $ 60 = $ 9.720","valor":9720},{"paso":"total","texto":"Total a pagar: $ 9.720","valor":9720}]}', TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '09:55:00'), 2),
  (23, 'FAC-000023', 'estadia', 20, NULL, 8, 28000, 3, 15, 4200, 23800, 'efectivo', NULL, 1, '{"minutos":443,"fracciones":443,"subtotal":28000,"valorDescuento":4200,"total":23800,"porcentajeDescuento":15,"porcentajeTope":100,"membresia":false,"nota":"443 min × $ 120 = $ 53.160 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"443 min × $ 120 = $ 53.160 → tope del día $ 28.000","valor":28000},{"paso":"descuento","texto":"Descuento Adulto mayor (15 %): −$ 4.200 (redondeado a la centena)","valor":-4200},{"paso":"total","texto":"Total a pagar: $ 23.800","valor":23800}]}', TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '15:19:00'), 2),
  (24, 'FAC-000024', 'estadia', 22, NULL, 6, 12000, NULL, 0, 0, 12000, 'transferencia', NULL, 2, '{"minutos":285,"fracciones":285,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"285 min × $ 60 = $ 17.100 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"285 min × $ 60 = $ 17.100 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '15:50:00'), 3),
  (25, 'FAC-000025', 'estadia', 21, NULL, 4, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":491,"fracciones":491,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"491 min × $ 120 = $ 58.920 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '18:35:00'), 3),
  (26, 'FAC-000026', 'estadia', 23, NULL, 4, 12000, 3, 15, 1800, 10200, 'efectivo', NULL, 2, '{"minutos":319,"fracciones":319,"subtotal":12000,"valorDescuento":1800,"total":10200,"porcentajeDescuento":15,"porcentajeTope":100,"membresia":false,"nota":"319 min × $ 60 = $ 19.140 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"319 min × $ 60 = $ 19.140 → tope del día $ 12.000","valor":12000},{"paso":"descuento","texto":"Descuento Adulto mayor (15 %): −$ 1.800 (redondeado a la centena)","valor":-1800},{"paso":"total","texto":"Total a pagar: $ 10.200","valor":10200}]}', TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '19:35:00'), 2),
  (27, 'FAC-000027', 'estadia', 24, NULL, 6, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":475,"fracciones":475,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"475 min × $ 120 = $ 57.000 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '23:17:00'), 2),
  (28, 'FAC-000028', 'estadia', 25, NULL, 6, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":177,"fracciones":177,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"fracciones","texto":"177 min × $ 120 = $ 21.240","valor":21240},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 21.240)","valor":-21240},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '09:07:00'), 2),
  (29, 'FAC-000029', 'estadia', 26, NULL, 4, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":229,"fracciones":229,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"fracciones","texto":"229 min × $ 120 = $ 27.480","valor":27480},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 27.480)","valor":-27480},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '10:57:00'), 1),
  (30, 'FAC-000030', 'estadia', 27, NULL, 6, 4320, NULL, 0, 0, 4320, 'tarjeta', NULL, 2, '{"minutos":72,"fracciones":72,"subtotal":4320,"valorDescuento":0,"total":4320,"porcentajeDescuento":0,"porcentajeTope":36,"membresia":false,"nota":"72 min × $ 60 = $ 4.320","detalle":[{"paso":"fracciones","texto":"72 min × $ 60 = $ 4.320","valor":4320},{"paso":"total","texto":"Total a pagar: $ 4.320","valor":4320}]}', TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '11:59:00'), 2),
  (31, 'FAC-000031', 'estadia', 29, NULL, 5, 2760, NULL, 0, 0, 2760, 'efectivo', NULL, 2, '{"minutos":46,"fracciones":46,"subtotal":2760,"valorDescuento":0,"total":2760,"porcentajeDescuento":0,"porcentajeTope":23,"membresia":false,"nota":"46 min × $ 60 = $ 2.760","detalle":[{"paso":"fracciones","texto":"46 min × $ 60 = $ 2.760","valor":2760},{"paso":"total","texto":"Total a pagar: $ 2.760","valor":2760}]}', TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '15:01:00'), 2),
  (32, 'FAC-000032', 'estadia', 28, NULL, 7, 28000, NULL, 0, 0, 28000, 'transferencia', NULL, 1, '{"minutos":241,"fracciones":241,"subtotal":28000,"valorDescuento":0,"total":28000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"241 min × $ 120 = $ 28.920 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"241 min × $ 120 = $ 28.920 → tope del día $ 28.000","valor":28000},{"paso":"total","texto":"Total a pagar: $ 28.000","valor":28000}]}', TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '16:53:00'), 3),
  (33, 'FAC-000033', 'estadia', 30, NULL, 7, 12000, NULL, 0, 0, 12000, 'efectivo', NULL, 2, '{"minutos":237,"fracciones":237,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"237 min × $ 60 = $ 14.220 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"237 min × $ 60 = $ 14.220 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '19:26:00'), 2),
  (34, 'FAC-000034', 'estadia', 32, NULL, 8, 11160, NULL, 0, 0, 11160, 'tarjeta', NULL, 1, '{"minutos":93,"fracciones":93,"subtotal":11160,"valorDescuento":0,"total":11160,"porcentajeDescuento":0,"porcentajeTope":40,"membresia":false,"nota":"93 min × $ 120 = $ 11.160","detalle":[{"paso":"fracciones","texto":"93 min × $ 120 = $ 11.160","valor":11160},{"paso":"total","texto":"Total a pagar: $ 11.160","valor":11160}]}', TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '21:11:00'), 3),
  (35, 'FAC-000035', 'estadia', 31, NULL, NULL, 28000, NULL, 0, 0, 28000, 'transferencia', NULL, 1, '{"minutos":389,"fracciones":389,"subtotal":28000,"valorDescuento":0,"total":28000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"389 min × $ 120 = $ 46.680 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"389 min × $ 120 = $ 46.680 → tope del día $ 28.000","valor":28000},{"paso":"total","texto":"Total a pagar: $ 28.000","valor":28000}]}', TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '23:30:00'), 1),
  (36, 'FAC-000036', 'estadia', 35, NULL, 6, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":104,"fracciones":104,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"fracciones","texto":"104 min × $ 120 = $ 12.480","valor":12480},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 12.480)","valor":-12480},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '15:24:00'), 2),
  (37, 'FAC-000037', 'estadia', 33, NULL, 7, 28000, NULL, 0, 0, 28000, 'transferencia', NULL, 1, '{"minutos":367,"fracciones":367,"subtotal":28000,"valorDescuento":0,"total":28000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"367 min × $ 120 = $ 44.040 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"367 min × $ 120 = $ 44.040 → tope del día $ 28.000","valor":28000},{"paso":"total","texto":"Total a pagar: $ 28.000","valor":28000}]}', TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '17:00:00'), 3),
  (38, 'FAC-000038', 'estadia', 34, NULL, 7, 12000, NULL, 0, 0, 12000, 'tarjeta', NULL, 2, '{"minutos":379,"fracciones":379,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"379 min × $ 60 = $ 22.740 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"379 min × $ 60 = $ 22.740 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '17:13:00'), 1),
  (39, 'FAC-000039', 'estadia', 38, NULL, 4, 1320, NULL, 0, 0, 1320, 'transferencia', NULL, 2, '{"minutos":22,"fracciones":22,"subtotal":1320,"valorDescuento":0,"total":1320,"porcentajeDescuento":0,"porcentajeTope":11,"membresia":false,"nota":"22 min × $ 60 = $ 1.320","detalle":[{"paso":"fracciones","texto":"22 min × $ 60 = $ 1.320","valor":1320},{"paso":"total","texto":"Total a pagar: $ 1.320","valor":1320}]}', TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '18:44:00'), 1),
  (40, 'FAC-000040', 'estadia', 37, NULL, NULL, 11340, NULL, 0, 0, 11340, 'tarjeta', NULL, 2, '{"minutos":189,"fracciones":189,"subtotal":11340,"valorDescuento":0,"total":11340,"porcentajeDescuento":0,"porcentajeTope":95,"membresia":false,"nota":"189 min × $ 60 = $ 11.340","detalle":[{"paso":"fracciones","texto":"189 min × $ 60 = $ 11.340","valor":11340},{"paso":"total","texto":"Total a pagar: $ 11.340","valor":11340}]}', TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '20:57:00'), 2),
  (41, 'FAC-000041', 'estadia', 39, NULL, 5, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":152,"fracciones":152,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"fracciones","texto":"152 min × $ 120 = $ 18.240","valor":18240},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 18.240)","valor":-18240},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '21:23:00'), 3),
  (42, 'FAC-000042', 'estadia', 36, NULL, 5, 12000, 2, 20, 2400, 9600, 'tarjeta', NULL, 2, '{"minutos":349,"fracciones":349,"subtotal":12000,"valorDescuento":2400,"total":9600,"porcentajeDescuento":20,"porcentajeTope":100,"membresia":false,"nota":"349 min × $ 60 = $ 20.940 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"349 min × $ 60 = $ 20.940 → tope del día $ 12.000","valor":12000},{"paso":"descuento","texto":"Descuento Convenio comercio vecino (20 %): −$ 2.400 (redondeado a la centena)","valor":-2400},{"paso":"total","texto":"Total a pagar: $ 9.600","valor":9600}]}', TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '23:30:00'), 3),
  (43, 'FAC-000043', 'estadia', 40, NULL, 4, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":266,"fracciones":266,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"266 min × $ 120 = $ 31.920 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '23:30:00'), 2),
  (44, 'FAC-000044', 'estadia', 41, NULL, NULL, 7320, NULL, 0, 0, 7320, 'efectivo', NULL, 1, '{"minutos":61,"fracciones":61,"subtotal":7320,"valorDescuento":0,"total":7320,"porcentajeDescuento":0,"porcentajeTope":26,"membresia":false,"nota":"61 min × $ 120 = $ 7.320","detalle":[{"paso":"fracciones","texto":"61 min × $ 120 = $ 7.320","valor":7320},{"paso":"total","texto":"Total a pagar: $ 7.320","valor":7320}]}', TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '07:55:00'), 3),
  (45, 'FAC-000045', 'estadia', 42, NULL, 6, 12000, NULL, 0, 0, 12000, 'transferencia', NULL, 2, '{"minutos":344,"fracciones":344,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"344 min × $ 60 = $ 20.640 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"344 min × $ 60 = $ 20.640 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '14:24:00'), 1),
  (46, 'FAC-000046', 'estadia', 45, NULL, NULL, 4320, NULL, 0, 0, 4320, 'efectivo', NULL, 2, '{"minutos":72,"fracciones":72,"subtotal":4320,"valorDescuento":0,"total":4320,"porcentajeDescuento":0,"porcentajeTope":36,"membresia":false,"nota":"72 min × $ 60 = $ 4.320","detalle":[{"paso":"fracciones","texto":"72 min × $ 60 = $ 4.320","valor":4320},{"paso":"total","texto":"Total a pagar: $ 4.320","valor":4320}]}', TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '14:56:00'), 2),
  (47, 'FAC-000047', 'estadia', 44, NULL, 7, 19560, NULL, 0, 0, 19560, 'transferencia', NULL, 1, '{"minutos":163,"fracciones":163,"subtotal":19560,"valorDescuento":0,"total":19560,"porcentajeDescuento":0,"porcentajeTope":70,"membresia":false,"nota":"163 min × $ 120 = $ 19.560","detalle":[{"paso":"fracciones","texto":"163 min × $ 120 = $ 19.560","valor":19560},{"paso":"total","texto":"Total a pagar: $ 19.560","valor":19560}]}', TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '15:52:00'), 3),
  (48, 'FAC-000048', 'estadia', 43, NULL, 5, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":272,"fracciones":272,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"272 min × $ 120 = $ 32.640 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '15:53:00'), 1),
  (49, 'FAC-000049', 'estadia', 47, NULL, 4, 6600, NULL, 0, 0, 6600, 'tarjeta', NULL, 2, '{"minutos":110,"fracciones":110,"subtotal":6600,"valorDescuento":0,"total":6600,"porcentajeDescuento":0,"porcentajeTope":55,"membresia":false,"nota":"110 min × $ 60 = $ 6.600","detalle":[{"paso":"fracciones","texto":"110 min × $ 60 = $ 6.600","valor":6600},{"paso":"total","texto":"Total a pagar: $ 6.600","valor":6600}]}', TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '16:06:00'), 3),
  (50, 'FAC-000050', 'estadia', 46, NULL, 4, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":216,"fracciones":216,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"fracciones","texto":"216 min × $ 120 = $ 25.920","valor":25920},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 25.920)","valor":-25920},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '17:34:00'), 2),
  (51, 'FAC-000051', 'estadia', 48, NULL, 5, 12000, NULL, 0, 0, 12000, 'efectivo', NULL, 2, '{"minutos":279,"fracciones":279,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"279 min × $ 60 = $ 16.740 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"279 min × $ 60 = $ 16.740 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '18:57:00'), 1),
  (52, 'FAC-000052', 'estadia', 49, NULL, 6, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":217,"fracciones":217,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"fracciones","texto":"217 min × $ 120 = $ 26.040","valor":26040},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 26.040)","valor":-26040},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '21:05:00'), 1),
  (53, 'FAC-000053', 'estadia', 50, NULL, 7, 9720, NULL, 0, 0, 9720, 'tarjeta', NULL, 2, '{"minutos":162,"fracciones":162,"subtotal":9720,"valorDescuento":0,"total":9720,"porcentajeDescuento":0,"porcentajeTope":81,"membresia":false,"nota":"162 min × $ 60 = $ 9.720","detalle":[{"paso":"fracciones","texto":"162 min × $ 60 = $ 9.720","valor":9720},{"paso":"total","texto":"Total a pagar: $ 9.720","valor":9720}]}', TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '21:38:00'), 3),
  (54, 'FAC-000054', 'estadia', 51, NULL, NULL, 12000, NULL, 0, 0, 12000, 'efectivo', NULL, 2, '{"minutos":238,"fracciones":238,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"238 min × $ 60 = $ 14.280 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"238 min × $ 60 = $ 14.280 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '10:12:00'), 2),
  (55, 'FAC-000055', 'estadia', 52, NULL, 8, 11040, NULL, 0, 0, 11040, 'transferencia', NULL, 1, '{"minutos":92,"fracciones":92,"subtotal":11040,"valorDescuento":0,"total":11040,"porcentajeDescuento":0,"porcentajeTope":39,"membresia":false,"nota":"92 min × $ 120 = $ 11.040","detalle":[{"paso":"fracciones","texto":"92 min × $ 120 = $ 11.040","valor":11040},{"paso":"total","texto":"Total a pagar: $ 11.040","valor":11040}]}', TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '12:02:00'), 1),
  (56, 'FAC-000056', 'estadia', 54, NULL, 8, 16920, NULL, 0, 0, 16920, 'efectivo', NULL, 1, '{"minutos":141,"fracciones":141,"subtotal":16920,"valorDescuento":0,"total":16920,"porcentajeDescuento":0,"porcentajeTope":60,"membresia":false,"nota":"141 min × $ 120 = $ 16.920","detalle":[{"paso":"fracciones","texto":"141 min × $ 120 = $ 16.920","valor":16920},{"paso":"total","texto":"Total a pagar: $ 16.920","valor":16920}]}', TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '13:43:00'), 1),
  (57, 'FAC-000057', 'estadia', 55, NULL, 6, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":227,"fracciones":227,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"fracciones","texto":"227 min × $ 120 = $ 27.240","valor":27240},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 27.240)","valor":-27240},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '15:12:00'), 2),
  (58, 'FAC-000058', 'estadia', 53, NULL, 5, 12000, NULL, 0, 0, 12000, 'transferencia', NULL, 2, '{"minutos":344,"fracciones":344,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"344 min × $ 60 = $ 20.640 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"344 min × $ 60 = $ 20.640 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '16:29:00'), 1),
  (59, 'FAC-000059', 'estadia', 56, NULL, 7, 28000, NULL, 0, 0, 28000, 'tarjeta', NULL, 1, '{"minutos":350,"fracciones":350,"subtotal":28000,"valorDescuento":0,"total":28000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"350 min × $ 120 = $ 42.000 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"350 min × $ 120 = $ 42.000 → tope del día $ 28.000","valor":28000},{"paso":"total","texto":"Total a pagar: $ 28.000","valor":28000}]}', TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '17:40:00'), 3),
  (60, 'FAC-000060', 'estadia', 57, NULL, 4, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":457,"fracciones":457,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"457 min × $ 120 = $ 54.840 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '19:37:00'), 3),
  (61, 'FAC-000061', 'estadia', 58, NULL, 6, 12000, NULL, 0, 0, 12000, 'transferencia', NULL, 2, '{"minutos":397,"fracciones":397,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"397 min × $ 60 = $ 23.820 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"397 min × $ 60 = $ 23.820 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '23:12:00'), 3),
  (62, 'FAC-000062', 'estadia', 59, NULL, 4, 12000, 1, 10, 1200, 10800, 'efectivo', NULL, 2, '{"minutos":237,"fracciones":237,"subtotal":12000,"valorDescuento":1200,"total":10800,"porcentajeDescuento":10,"porcentajeTope":100,"membresia":false,"nota":"237 min × $ 60 = $ 14.220 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"237 min × $ 60 = $ 14.220 → tope del día $ 12.000","valor":12000},{"paso":"descuento","texto":"Descuento Cliente frecuente (10 %): −$ 1.200 (redondeado a la centena)","valor":-1200},{"paso":"total","texto":"Total a pagar: $ 10.800","valor":10800}]}', TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '23:23:00'), 2),
  (63, 'FAC-000063', 'estadia', 61, NULL, NULL, 25200, NULL, 0, 0, 25200, 'transferencia', NULL, 1, '{"minutos":210,"fracciones":210,"subtotal":25200,"valorDescuento":0,"total":25200,"porcentajeDescuento":0,"porcentajeTope":90,"membresia":false,"nota":"210 min × $ 120 = $ 25.200","detalle":[{"paso":"fracciones","texto":"210 min × $ 120 = $ 25.200","valor":25200},{"paso":"total","texto":"Total a pagar: $ 25.200","valor":25200}]}', TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '23:28:00'), 3),
  (64, 'FAC-000064', 'estadia', 60, NULL, 5, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":240,"fracciones":240,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"240 min × $ 120 = $ 28.800 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '23:30:00'), 2),
  (65, 'FAC-000065', 'estadia', 62, NULL, 6, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":258,"fracciones":258,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"258 min × $ 120 = $ 30.960 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '10:37:00'), 2),
  (66, 'FAC-000066', 'estadia', 63, NULL, 8, 28000, NULL, 0, 0, 28000, 'transferencia', NULL, 1, '{"minutos":540,"fracciones":540,"subtotal":28000,"valorDescuento":0,"total":28000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"540 min × $ 120 = $ 64.800 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"540 min × $ 120 = $ 64.800 → tope del día $ 28.000","valor":28000},{"paso":"total","texto":"Total a pagar: $ 28.000","valor":28000}]}', TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '16:13:00'), 2),
  (67, 'FAC-000067', 'estadia', 65, NULL, NULL, 25560, NULL, 0, 0, 25560, 'transferencia', NULL, 1, '{"minutos":213,"fracciones":213,"subtotal":25560,"valorDescuento":0,"total":25560,"porcentajeDescuento":0,"porcentajeTope":91,"membresia":false,"nota":"213 min × $ 120 = $ 25.560","detalle":[{"paso":"fracciones","texto":"213 min × $ 120 = $ 25.560","valor":25560},{"paso":"total","texto":"Total a pagar: $ 25.560","valor":25560}]}', TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '17:36:00'), 3),
  (68, 'FAC-000068', 'estadia', 64, NULL, 7, 12000, NULL, 0, 0, 12000, 'tarjeta', NULL, 2, '{"minutos":462,"fracciones":462,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"462 min × $ 60 = $ 27.720 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"462 min × $ 60 = $ 27.720 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '20:10:00'), 3),
  (69, 'FAC-000069', 'estadia', 68, NULL, 8, 28000, NULL, 0, 0, 28000, 'transferencia', NULL, 1, '{"minutos":235,"fracciones":235,"subtotal":28000,"valorDescuento":0,"total":28000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"235 min × $ 120 = $ 28.200 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"235 min × $ 120 = $ 28.200 → tope del día $ 28.000","valor":28000},{"paso":"total","texto":"Total a pagar: $ 28.000","valor":28000}]}', TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '20:27:00'), 3),
  (70, 'FAC-000070', 'estadia', 67, NULL, NULL, 12000, NULL, 0, 0, 12000, 'efectivo', NULL, 2, '{"minutos":391,"fracciones":391,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"391 min × $ 60 = $ 23.460 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"391 min × $ 60 = $ 23.460 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '22:48:00'), 3),
  (71, 'FAC-000071', 'estadia', 66, NULL, 6, 12000, NULL, 0, 0, 12000, 'efectivo', NULL, 2, '{"minutos":481,"fracciones":481,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"481 min × $ 60 = $ 28.860 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"481 min × $ 60 = $ 28.860 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '23:01:00'), 2),
  (72, 'FAC-000072', 'estadia', 69, NULL, 4, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":243,"fracciones":243,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"243 min × $ 120 = $ 29.160 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '23:30:00'), 3),
  (73, 'FAC-000073', 'estadia', 71, NULL, NULL, 13560, NULL, 0, 0, 13560, 'tarjeta', NULL, 1, '{"minutos":113,"fracciones":113,"subtotal":13560,"valorDescuento":0,"total":13560,"porcentajeDescuento":0,"porcentajeTope":48,"membresia":false,"nota":"113 min × $ 120 = $ 13.560","detalle":[{"paso":"fracciones","texto":"113 min × $ 120 = $ 13.560","valor":13560},{"paso":"total","texto":"Total a pagar: $ 13.560","valor":13560}]}', TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '11:45:00'), 3),
  (74, 'FAC-000074', 'estadia', 70, NULL, 6, 12000, NULL, 0, 0, 12000, 'transferencia', NULL, 2, '{"minutos":312,"fracciones":312,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"312 min × $ 60 = $ 18.720 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"312 min × $ 60 = $ 18.720 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '13:18:00'), 1),
  (75, 'FAC-000075', 'estadia', 73, NULL, 4, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":142,"fracciones":142,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"fracciones","texto":"142 min × $ 120 = $ 17.040","valor":17040},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 17.040)","valor":-17040},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '14:19:00'), 2),
  (76, 'FAC-000076', 'estadia', 72, NULL, 8, 24720, NULL, 0, 0, 24720, 'efectivo', NULL, 1, '{"minutos":206,"fracciones":206,"subtotal":24720,"valorDescuento":0,"total":24720,"porcentajeDescuento":0,"porcentajeTope":88,"membresia":false,"nota":"206 min × $ 120 = $ 24.720","detalle":[{"paso":"fracciones","texto":"206 min × $ 120 = $ 24.720","valor":24720},{"paso":"total","texto":"Total a pagar: $ 24.720","valor":24720}]}', TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '15:04:00'), 3),
  (77, 'FAC-000077', 'estadia', 74, NULL, 5, 12000, NULL, 0, 0, 12000, 'transferencia', NULL, 2, '{"minutos":200,"fracciones":200,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"200 min × $ 60 = $ 12.000","detalle":[{"paso":"fracciones","texto":"200 min × $ 60 = $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '16:03:00'), 1),
  (78, 'FAC-000078', 'estadia', 75, NULL, NULL, 12000, NULL, 0, 0, 12000, 'efectivo', NULL, 2, '{"minutos":398,"fracciones":398,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"398 min × $ 60 = $ 23.880 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"398 min × $ 60 = $ 23.880 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '21:24:00'), 3),
  (79, 'FAC-000079', 'estadia', 76, NULL, 5, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":283,"fracciones":283,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"283 min × $ 120 = $ 33.960 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '22:09:00'), 3),
  (80, 'FAC-000080', 'estadia', 77, NULL, 7, 12000, NULL, 0, 0, 12000, 'transferencia', NULL, 2, '{"minutos":268,"fracciones":268,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"268 min × $ 60 = $ 16.080 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"268 min × $ 60 = $ 16.080 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '23:30:00'), 3),
  (81, 'FAC-000081', 'estadia', 78, NULL, 6, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":264,"fracciones":264,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"264 min × $ 120 = $ 31.680 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '23:30:00'), 2),
  (82, 'FAC-000082', 'estadia', 79, NULL, 4, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":322,"fracciones":322,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"322 min × $ 120 = $ 38.640 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '11:32:00'), 2),
  (83, 'FAC-000083', 'estadia', 83, NULL, 8, 21840, NULL, 0, 0, 21840, 'efectivo', NULL, 1, '{"minutos":182,"fracciones":182,"subtotal":21840,"valorDescuento":0,"total":21840,"porcentajeDescuento":0,"porcentajeTope":78,"membresia":false,"nota":"182 min × $ 120 = $ 21.840","detalle":[{"paso":"fracciones","texto":"182 min × $ 120 = $ 21.840","valor":21840},{"paso":"total","texto":"Total a pagar: $ 21.840","valor":21840}]}', TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '14:42:00'), 3),
  (84, 'FAC-000084', 'estadia', 80, NULL, 6, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":358,"fracciones":358,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"358 min × $ 120 = $ 42.960 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '14:51:00'), 3),
  (85, 'FAC-000085', 'estadia', 82, NULL, 7, 12000, NULL, 0, 0, 12000, 'efectivo', NULL, 2, '{"minutos":369,"fracciones":369,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"369 min × $ 60 = $ 22.140 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"369 min × $ 60 = $ 22.140 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '17:27:00'), 2),
  (86, 'FAC-000086', 'estadia', 81, NULL, NULL, 28000, NULL, 0, 0, 28000, 'transferencia', NULL, 1, '{"minutos":457,"fracciones":457,"subtotal":28000,"valorDescuento":0,"total":28000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"457 min × $ 120 = $ 54.840 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"457 min × $ 120 = $ 54.840 → tope del día $ 28.000","valor":28000},{"paso":"total","texto":"Total a pagar: $ 28.000","valor":28000}]}', TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '17:30:00'), 3),
  (87, 'FAC-000087', 'estadia', 84, NULL, 5, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":379,"fracciones":379,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"379 min × $ 120 = $ 45.480 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '22:16:00'), 2),
  (88, 'FAC-000088', 'estadia', 85, NULL, 4, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":232,"fracciones":232,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"fracciones","texto":"232 min × $ 120 = $ 27.840","valor":27840},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 27.840)","valor":-27840},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '10:28:00'), 2),
  (89, 'FAC-000089', 'estadia', 86, NULL, 5, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":164,"fracciones":164,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"fracciones","texto":"164 min × $ 120 = $ 19.680","valor":19680},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 19.680)","valor":-19680},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '11:43:00'), 3),
  (90, 'FAC-000090', 'estadia', 88, NULL, 5, 5820, NULL, 0, 0, 5820, 'tarjeta', NULL, 2, '{"minutos":97,"fracciones":97,"subtotal":5820,"valorDescuento":0,"total":5820,"porcentajeDescuento":0,"porcentajeTope":49,"membresia":false,"nota":"97 min × $ 60 = $ 5.820","detalle":[{"paso":"fracciones","texto":"97 min × $ 60 = $ 5.820","valor":5820},{"paso":"total","texto":"Total a pagar: $ 5.820","valor":5820}]}', TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '12:58:00'), 3),
  (91, 'FAC-000091', 'estadia', 87, NULL, 6, 12000, 2, 20, 2400, 9600, 'transferencia', NULL, 2, '{"minutos":233,"fracciones":233,"subtotal":12000,"valorDescuento":2400,"total":9600,"porcentajeDescuento":20,"porcentajeTope":100,"membresia":false,"nota":"233 min × $ 60 = $ 13.980 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"233 min × $ 60 = $ 13.980 → tope del día $ 12.000","valor":12000},{"paso":"descuento","texto":"Descuento Convenio comercio vecino (20 %): −$ 2.400 (redondeado a la centena)","valor":-2400},{"paso":"total","texto":"Total a pagar: $ 9.600","valor":9600}]}', TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '14:32:00'), 3),
  (92, 'FAC-000092', 'estadia', 89, NULL, 7, 19680, NULL, 0, 0, 19680, 'transferencia', NULL, 1, '{"minutos":164,"fracciones":164,"subtotal":19680,"valorDescuento":0,"total":19680,"porcentajeDescuento":0,"porcentajeTope":70,"membresia":false,"nota":"164 min × $ 120 = $ 19.680","detalle":[{"paso":"fracciones","texto":"164 min × $ 120 = $ 19.680","valor":19680},{"paso":"total","texto":"Total a pagar: $ 19.680","valor":19680}]}', TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '17:00:00'), 3),
  (93, 'FAC-000093', 'estadia', 91, NULL, 8, 4560, NULL, 0, 0, 4560, 'efectivo', NULL, 1, '{"minutos":38,"fracciones":38,"subtotal":4560,"valorDescuento":0,"total":4560,"porcentajeDescuento":0,"porcentajeTope":16,"membresia":false,"nota":"38 min × $ 120 = $ 4.560","detalle":[{"paso":"fracciones","texto":"38 min × $ 120 = $ 4.560","valor":4560},{"paso":"total","texto":"Total a pagar: $ 4.560","valor":4560}]}', TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '17:07:00'), 2),
  (94, 'FAC-000094', 'estadia', 90, NULL, 4, 11820, NULL, 0, 0, 11820, 'efectivo', NULL, 2, '{"minutos":197,"fracciones":197,"subtotal":11820,"valorDescuento":0,"total":11820,"porcentajeDescuento":0,"porcentajeTope":99,"membresia":false,"nota":"197 min × $ 60 = $ 11.820","detalle":[{"paso":"fracciones","texto":"197 min × $ 60 = $ 11.820","valor":11820},{"paso":"total","texto":"Total a pagar: $ 11.820","valor":11820}]}', TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '18:38:00'), 3),
  (95, 'FAC-000095', 'estadia', 94, NULL, NULL, 10440, NULL, 0, 0, 10440, 'transferencia', NULL, 1, '{"minutos":87,"fracciones":87,"subtotal":10440,"valorDescuento":0,"total":10440,"porcentajeDescuento":0,"porcentajeTope":37,"membresia":false,"nota":"87 min × $ 120 = $ 10.440","detalle":[{"paso":"fracciones","texto":"87 min × $ 120 = $ 10.440","valor":10440},{"paso":"total","texto":"Total a pagar: $ 10.440","valor":10440}]}', TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '20:49:00'), 3),
  (96, 'FAC-000096', 'estadia', 92, NULL, 8, 28000, NULL, 0, 0, 28000, 'efectivo', NULL, 1, '{"minutos":388,"fracciones":388,"subtotal":28000,"valorDescuento":0,"total":28000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"388 min × $ 120 = $ 46.560 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"388 min × $ 120 = $ 46.560 → tope del día $ 28.000","valor":28000},{"paso":"total","texto":"Total a pagar: $ 28.000","valor":28000}]}', TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '23:30:00'), 2),
  (97, 'FAC-000097', 'estadia', 93, NULL, 6, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":251,"fracciones":251,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"251 min × $ 120 = $ 30.120 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '23:30:00'), 1),
  (98, 'FAC-000098', 'estadia', 95, NULL, 5, 12000, NULL, 0, 0, 12000, 'transferencia', NULL, 2, '{"minutos":201,"fracciones":201,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"201 min × $ 60 = $ 12.060 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"201 min × $ 60 = $ 12.060 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '10:17:00'), 2),
  (99, 'FAC-000099', 'estadia', 96, NULL, 8, 28000, NULL, 0, 0, 28000, 'transferencia', NULL, 1, '{"minutos":534,"fracciones":534,"subtotal":28000,"valorDescuento":0,"total":28000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"534 min × $ 120 = $ 64.080 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"534 min × $ 120 = $ 64.080 → tope del día $ 28.000","valor":28000},{"paso":"total","texto":"Total a pagar: $ 28.000","valor":28000}]}', TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '15:52:00'), 3),
  (100, 'FAC-000100', 'estadia', 100, NULL, 4, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":141,"fracciones":141,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"fracciones","texto":"141 min × $ 120 = $ 16.920","valor":16920},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 16.920)","valor":-16920},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '16:52:00'), 3),
  (101, 'FAC-000101', 'estadia', 97, NULL, NULL, 12000, 2, 20, 2400, 9600, 'transferencia', NULL, 2, '{"minutos":452,"fracciones":452,"subtotal":12000,"valorDescuento":2400,"total":9600,"porcentajeDescuento":20,"porcentajeTope":100,"membresia":false,"nota":"452 min × $ 60 = $ 27.120 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"452 min × $ 60 = $ 27.120 → tope del día $ 12.000","valor":12000},{"paso":"descuento","texto":"Descuento Convenio comercio vecino (20 %): −$ 2.400 (redondeado a la centena)","valor":-2400},{"paso":"total","texto":"Total a pagar: $ 9.600","valor":9600}]}', TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '18:25:00'), 3),
  (102, 'FAC-000102', 'estadia', 98, NULL, NULL, 28000, NULL, 0, 0, 28000, 'tarjeta', NULL, 1, '{"minutos":374,"fracciones":374,"subtotal":28000,"valorDescuento":0,"total":28000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"374 min × $ 120 = $ 44.880 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"374 min × $ 120 = $ 44.880 → tope del día $ 28.000","valor":28000},{"paso":"total","texto":"Total a pagar: $ 28.000","valor":28000}]}', TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '20:34:00'), 3),
  (103, 'FAC-000103', 'estadia', 102, NULL, 6, 12000, NULL, 0, 0, 12000, 'transferencia', NULL, 2, '{"minutos":240,"fracciones":240,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"240 min × $ 60 = $ 14.400 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"240 min × $ 60 = $ 14.400 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '20:36:00'), 2),
  (104, 'FAC-000104', 'estadia', 99, NULL, 6, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":529,"fracciones":529,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"529 min × $ 120 = $ 63.480 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '23:17:00'), 1),
  (105, 'FAC-000105', 'estadia', 101, NULL, 8, 28000, 2, 20, 5600, 22400, 'efectivo', NULL, 1, '{"minutos":505,"fracciones":505,"subtotal":28000,"valorDescuento":5600,"total":22400,"porcentajeDescuento":20,"porcentajeTope":100,"membresia":false,"nota":"505 min × $ 120 = $ 60.600 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"505 min × $ 120 = $ 60.600 → tope del día $ 28.000","valor":28000},{"paso":"descuento","texto":"Descuento Convenio comercio vecino (20 %): −$ 5.600 (redondeado a la centena)","valor":-5600},{"paso":"total","texto":"Total a pagar: $ 22.400","valor":22400}]}', TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '23:30:00'), 2),
  (106, 'FAC-000106', 'estadia', 103, NULL, 4, 12000, NULL, 0, 0, 12000, 'transferencia', NULL, 2, '{"minutos":287,"fracciones":287,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"287 min × $ 60 = $ 17.220 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"287 min × $ 60 = $ 17.220 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '23:30:00'), 2),
  (107, 'FAC-000107', 'estadia', 104, NULL, 7, 12000, 2, 20, 2400, 9600, 'transferencia', NULL, 2, '{"minutos":246,"fracciones":246,"subtotal":12000,"valorDescuento":2400,"total":9600,"porcentajeDescuento":20,"porcentajeTope":100,"membresia":false,"nota":"246 min × $ 60 = $ 14.760 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"246 min × $ 60 = $ 14.760 → tope del día $ 12.000","valor":12000},{"paso":"descuento","texto":"Descuento Convenio comercio vecino (20 %): −$ 2.400 (redondeado a la centena)","valor":-2400},{"paso":"total","texto":"Total a pagar: $ 9.600","valor":9600}]}', TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '23:30:00'), 2),
  (108, 'FAC-000108', 'estadia', 105, NULL, 6, 12000, 1, 10, 1200, 10800, 'efectivo', NULL, 2, '{"minutos":229,"fracciones":229,"subtotal":12000,"valorDescuento":1200,"total":10800,"porcentajeDescuento":10,"porcentajeTope":100,"membresia":false,"nota":"229 min × $ 60 = $ 13.740 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"229 min × $ 60 = $ 13.740 → tope del día $ 12.000","valor":12000},{"paso":"descuento","texto":"Descuento Cliente frecuente (10 %): −$ 1.200 (redondeado a la centena)","valor":-1200},{"paso":"total","texto":"Total a pagar: $ 10.800","valor":10800}]}', TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '11:45:00'), 3),
  (109, 'FAC-000109', 'estadia', 107, NULL, 8, 28000, NULL, 0, 0, 28000, 'transferencia', NULL, 1, '{"minutos":355,"fracciones":355,"subtotal":28000,"valorDescuento":0,"total":28000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"355 min × $ 120 = $ 42.600 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"355 min × $ 120 = $ 42.600 → tope del día $ 28.000","valor":28000},{"paso":"total","texto":"Total a pagar: $ 28.000","valor":28000}]}', TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '14:18:00'), 2),
  (110, 'FAC-000110', 'estadia', 109, NULL, 4, 10260, NULL, 0, 0, 10260, 'tarjeta', NULL, 2, '{"minutos":171,"fracciones":171,"subtotal":10260,"valorDescuento":0,"total":10260,"porcentajeDescuento":0,"porcentajeTope":86,"membresia":false,"nota":"171 min × $ 60 = $ 10.260","detalle":[{"paso":"fracciones","texto":"171 min × $ 60 = $ 10.260","valor":10260},{"paso":"total","texto":"Total a pagar: $ 10.260","valor":10260}]}', TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '14:26:00'), 3),
  (111, 'FAC-000111', 'estadia', 108, NULL, 8, 28000, NULL, 0, 0, 28000, 'tarjeta', NULL, 1, '{"minutos":391,"fracciones":391,"subtotal":28000,"valorDescuento":0,"total":28000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"391 min × $ 120 = $ 46.920 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"391 min × $ 120 = $ 46.920 → tope del día $ 28.000","valor":28000},{"paso":"total","texto":"Total a pagar: $ 28.000","valor":28000}]}', TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '15:27:00'), 2),
  (112, 'FAC-000112', 'estadia', 106, NULL, NULL, 28000, NULL, 0, 0, 28000, 'efectivo', NULL, 1, '{"minutos":516,"fracciones":516,"subtotal":28000,"valorDescuento":0,"total":28000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"516 min × $ 120 = $ 61.920 → tope del día $ 28.000","detalle":[{"paso":"tope","texto":"516 min × $ 120 = $ 61.920 → tope del día $ 28.000","valor":28000},{"paso":"total","texto":"Total a pagar: $ 28.000","valor":28000}]}', TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '16:43:00'), 3),
  (113, 'FAC-000113', 'estadia', 110, NULL, NULL, 12000, NULL, 0, 0, 12000, 'tarjeta', NULL, 2, '{"minutos":281,"fracciones":281,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"281 min × $ 60 = $ 16.860 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"281 min × $ 60 = $ 16.860 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '18:23:00'), 3),
  (114, 'FAC-000114', 'estadia', 112, NULL, 5, 12000, NULL, 0, 0, 12000, 'efectivo', NULL, 2, '{"minutos":325,"fracciones":325,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"325 min × $ 60 = $ 19.500 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"325 min × $ 60 = $ 19.500 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '15:10:00'), 2),
  (115, 'FAC-000115', 'estadia', 111, NULL, 7, 12000, NULL, 0, 0, 12000, 'efectivo', NULL, 2, '{"minutos":529,"fracciones":529,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"529 min × $ 60 = $ 31.740 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"529 min × $ 60 = $ 31.740 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '15:34:00'), 3),
  (116, 'FAC-000116', 'estadia', 114, NULL, 6, 12000, NULL, 0, 0, 12000, 'tarjeta', NULL, 2, '{"minutos":291,"fracciones":291,"subtotal":12000,"valorDescuento":0,"total":12000,"porcentajeDescuento":0,"porcentajeTope":100,"membresia":false,"nota":"291 min × $ 60 = $ 17.460 → tope del día $ 12.000","detalle":[{"paso":"tope","texto":"291 min × $ 60 = $ 17.460 → tope del día $ 12.000","valor":12000},{"paso":"total","texto":"Total a pagar: $ 12.000","valor":12000}]}', TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '16:24:00'), 3),
  (117, 'FAC-000117', 'estadia', 113, NULL, 4, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":439,"fracciones":439,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"439 min × $ 120 = $ 52.680 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '18:22:00'), 2),
  (118, 'FAC-000118', 'estadia', 115, NULL, 5, 0, NULL, 0, 0, 0, 'efectivo', 'membresía', 1, '{"minutos":245,"fracciones":245,"subtotal":0,"valorDescuento":0,"total":0,"porcentajeDescuento":0,"porcentajeTope":0,"membresia":true,"nota":"Mensualidad activa","detalle":[{"paso":"tope","texto":"245 min × $ 120 = $ 29.400 → tope del día $ 28.000","valor":28000},{"paso":"membresia","texto":"Mensualidad activa: no paga (tarifa normal $ 28.000)","valor":-28000},{"paso":"total","texto":"Total a pagar: $ 0","valor":0}]}', TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '19:49:00'), 3);

INSERT INTO consecutivos (nombre, ultimo) VALUES
  ('factura', 118);

-- Entradas rechazadas por pico y placa (solo días hábiles con regla activa)
INSERT INTO accesos_denegados (placa, tipo_vehiculo, puerta_id, fecha_hora, motivo, regla_pico_placa_id, registrado_por)
SELECT CONCAT('KLM20', pp.digito), 'carro', 1, TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '07:35:00'),
  CONCAT('Pico y placa: carros con placa terminada en ', pp.digito, ' (', TIME_FORMAT(pp.hora_inicio, '%H:%i'), '–', TIME_FORMAT(pp.hora_fin, '%H:%i'), ')'),
  pp.id, 2
FROM pico_placa pp
WHERE pp.tipo_vehiculo = 'carro' AND pp.activa = 1 AND pp.dia_semana = WEEKDAY(CURDATE() - INTERVAL 2 DAY) + 1
ORDER BY pp.digito LIMIT 1;

INSERT INTO accesos_denegados (placa, tipo_vehiculo, puerta_id, fecha_hora, motivo, regla_pico_placa_id, registrado_por)
SELECT CONCAT('TRS54', pp.digito), 'carro', 2, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '09:10:00'),
  CONCAT('Pico y placa: carros con placa terminada en ', pp.digito, ' (', TIME_FORMAT(pp.hora_inicio, '%H:%i'), '–', TIME_FORMAT(pp.hora_fin, '%H:%i'), ')'),
  pp.id, 3
FROM pico_placa pp
WHERE pp.tipo_vehiculo = 'carro' AND pp.activa = 1 AND pp.dia_semana = WEEKDAY(CURDATE() - INTERVAL 3 DAY) + 1
ORDER BY pp.digito LIMIT 1;

INSERT INTO accesos_denegados (placa, tipo_vehiculo, puerta_id, fecha_hora, motivo, regla_pico_placa_id, registrado_por)
SELECT CONCAT('NQW', pp.digito, '7K'), 'moto', 2, TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '08:05:00'),
  CONCAT('Pico y placa: motos con placa con primer dígito ', pp.digito, ' (', TIME_FORMAT(pp.hora_inicio, '%H:%i'), '–', TIME_FORMAT(pp.hora_fin, '%H:%i'), ')'),
  pp.id, 3
FROM pico_placa pp
WHERE pp.tipo_vehiculo = 'moto' AND pp.activa = 1 AND pp.dia_semana = WEEKDAY(CURDATE() - INTERVAL 5 DAY) + 1
ORDER BY pp.digito LIMIT 1;

INSERT INTO accesos_denegados (placa, tipo_vehiculo, puerta_id, fecha_hora, motivo, regla_pico_placa_id, registrado_por)
SELECT CONCAT('DFG81', pp.digito), 'carro', 1, TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '17:40:00'),
  CONCAT('Pico y placa: carros con placa terminada en ', pp.digito, ' (', TIME_FORMAT(pp.hora_inicio, '%H:%i'), '–', TIME_FORMAT(pp.hora_fin, '%H:%i'), ')'),
  pp.id, 2
FROM pico_placa pp
WHERE pp.tipo_vehiculo = 'carro' AND pp.activa = 1 AND pp.dia_semana = WEEKDAY(CURDATE() - INTERVAL 6 DAY) + 1
ORDER BY pp.digito LIMIT 1;

INSERT INTO accesos_denegados (placa, tipo_vehiculo, puerta_id, fecha_hora, motivo, regla_pico_placa_id, registrado_por)
SELECT CONCAT('PWX33', pp.digito), 'carro', 1, TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '06:50:00'),
  CONCAT('Pico y placa: carros con placa terminada en ', pp.digito, ' (', TIME_FORMAT(pp.hora_inicio, '%H:%i'), '–', TIME_FORMAT(pp.hora_fin, '%H:%i'), ')'),
  pp.id, 2
FROM pico_placa pp
WHERE pp.tipo_vehiculo = 'carro' AND pp.activa = 1 AND pp.dia_semana = WEEKDAY(CURDATE() - INTERVAL 8 DAY) + 1
ORDER BY pp.digito LIMIT 1;

INSERT INTO accesos_denegados (placa, tipo_vehiculo, puerta_id, fecha_hora, motivo, regla_pico_placa_id, registrado_por)
SELECT CONCAT('HYT', pp.digito, '7K'), 'moto', 2, TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '12:15:00'),
  CONCAT('Pico y placa: motos con placa con primer dígito ', pp.digito, ' (', TIME_FORMAT(pp.hora_inicio, '%H:%i'), '–', TIME_FORMAT(pp.hora_fin, '%H:%i'), ')'),
  pp.id, 3
FROM pico_placa pp
WHERE pp.tipo_vehiculo = 'moto' AND pp.activa = 1 AND pp.dia_semana = WEEKDAY(CURDATE() - INTERVAL 9 DAY) + 1
ORDER BY pp.digito LIMIT 1;

-- Incidencias
INSERT INTO incidencias (id, codigo, tipo_incidencia_id, vehiculo_id, celda_id, estadia_id, descripcion, fecha_hora, registrada_por) VALUES
  (1, CONCAT('INC-', DATE_FORMAT(CURDATE() - INTERVAL 3 DAY, '%Y%m%d'), '-0001'), 1, 7, 32, NULL, 'Rayón en la puerta del conductor al abrir la puerta del vehículo vecino.', TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '10:20:00'), 2),
  (2, CONCAT('INC-', DATE_FORMAT(CURDATE() - INTERVAL 9 DAY, '%Y%m%d'), '-0001'), 4, 10, 23, NULL, 'Golpe del bómper trasero contra la columna C-04 al maniobrar.', TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '15:05:00'), 2);

-- Notificaciones de ejemplo
INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, enlace, leida, enviada_por, created_at) VALUES
  (1, 'Nueva incidencia', 'Rayón registrado al vehículo BNM350.', 'incidencia', '/app/incidencias.html?id=1', 1, NULL, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '10:21:00')),
  (7, 'Incidencia con tu vehículo', 'Se registró un rayón a tu vehículo BNM350. Acércate a la caseta para más información.', 'incidencia', '/app/mi-cuenta.html#mis-incidencias', 0, NULL, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '10:21:00')),
  (1, 'Nueva incidencia', 'Golpe contra muro registrado al vehículo OPQ119.', 'incidencia', '/app/incidencias.html?id=2', 0, NULL, TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '15:06:00')),
  (5, 'Tu mensualidad está por vencer', 'La mensualidad del vehículo CVB275 vence en 2 días.', 'membresia_por_vencer', '/app/mi-cuenta.html?membresia=2', 0, NULL, NOW() - INTERVAL 60 MINUTE),
  (4, 'Bienvenida', 'Ya puedes consultar tus vehículos y facturas desde PARKO.', 'manual', NULL, 0, 1, TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '09:00:00'));
