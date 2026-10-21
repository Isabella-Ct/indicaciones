-- =====================================================================
-- PARKO · Parqueadero ABC — Base de datos consolidada (MySQL 8, InnoDB)
-- Fuente de verdad del modelo. Ver el comentario final con el origen
-- de cada tabla (v1 / v2) y las correcciones aplicadas.
--
-- ATENCIÓN: este script BORRA y recrea la base de datos.
-- Se ejecuta con `npm run db:reset` (backend/database/reset.js), que
-- reemplaza `parking_lot_abc` por el valor de DB_NAME del .env.
-- =====================================================================

SET NAMES utf8mb4;
SET time_zone = '-05:00'; -- America/Bogota (sin horario de verano)

DROP DATABASE IF EXISTS parking_lot_abc;
CREATE DATABASE parking_lot_abc CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE parking_lot_abc;

-- ---------------------------------------------------------------------
-- Seguridad: roles, permisos y su relación (REQ-USR-1)
-- ---------------------------------------------------------------------
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(30) NOT NULL,
  descripcion VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_roles_nombre UNIQUE (nombre)
) ENGINE=InnoDB;

CREATE TABLE permisos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(60) NOT NULL,            -- ej. usuarios.crear
  modulo VARCHAR(40) NOT NULL,            -- agrupa en la UI
  descripcion VARCHAR(255) NOT NULL,
  CONSTRAINT uq_permisos_codigo UNIQUE (codigo)
) ENGINE=InnoDB;

CREATE TABLE roles_permisos (
  rol_id INT NOT NULL,
  permiso_id INT NOT NULL,
  PRIMARY KEY (rol_id, permiso_id),
  CONSTRAINT fk_rp_rol FOREIGN KEY (rol_id) REFERENCES roles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_rp_permiso FOREIGN KEY (permiso_id) REFERENCES permisos (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Usuarios (REQ-USR-2..8). El id es el "código único autoincremental".
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo_documento ENUM('CC','CE','TI','PAS','NIT') NOT NULL,
  numero_documento VARCHAR(20) NOT NULL,
  primer_nombre VARCHAR(60) NOT NULL,
  segundo_nombre VARCHAR(60) NULL,
  primer_apellido VARCHAR(60) NOT NULL,
  segundo_apellido VARCHAR(60) NULL,
  correo VARCHAR(120) NOT NULL,
  celular VARCHAR(20) NOT NULL,
  foto_url VARCHAR(255) NULL,
  contrasena_hash VARCHAR(100) NOT NULL,
  debe_cambiar_contrasena TINYINT(1) NOT NULL DEFAULT 1,
  estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  rol_id INT NOT NULL,
  creado_por INT NULL,
  ultimo_acceso DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_usuarios_documento UNIQUE (tipo_documento, numero_documento),
  CONSTRAINT uq_usuarios_correo UNIQUE (correo),
  INDEX ix_usuarios_numero_documento (numero_documento),
  INDEX ix_usuarios_estado (estado),
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_usuarios_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Sede, pisos y puertas
-- ---------------------------------------------------------------------
CREATE TABLE parqueaderos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  direccion VARCHAR(150) NOT NULL,
  ciudad VARCHAR(60) NOT NULL,
  telefono VARCHAR(20) NULL,
  horario VARCHAR(60) NOT NULL DEFAULT 'Abierto 24 horas',
  latitud DECIMAL(9,6) NULL,                -- ubicación para el mapa de la página pública
  longitud DECIMAL(9,6) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE pisos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parqueadero_id INT NOT NULL,
  nombre VARCHAR(40) NOT NULL,              -- ej. "Sótano 1"
  orden INT NOT NULL,
  texto_carril VARCHAR(150) NOT NULL,       -- tramos separados por "|"
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_pisos_nombre UNIQUE (parqueadero_id, nombre),
  CONSTRAINT fk_pisos_parqueadero FOREIGN KEY (parqueadero_id) REFERENCES parqueaderos (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE puertas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parqueadero_id INT NOT NULL,
  nombre VARCHAR(40) NOT NULL,
  tipo ENUM('entrada','salida','mixta') NOT NULL DEFAULT 'mixta',
  activa TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_puertas_nombre UNIQUE (parqueadero_id, nombre),
  CONSTRAINT fk_puertas_parqueadero FOREIGN KEY (parqueadero_id) REFERENCES parqueaderos (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Vehículos (REQ-CAR-1..3, REQ-USR-6). usuario_id NULL = visitante.
-- ---------------------------------------------------------------------
CREATE TABLE vehiculos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  placa VARCHAR(7) NOT NULL,                -- MAYÚSCULAS, sin espacios ni guiones
  tipo ENUM('moto','carro') NOT NULL,
  color VARCHAR(30) NULL,
  marca VARCHAR(40) NULL,
  modelo VARCHAR(40) NULL,
  usuario_id INT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_por INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_vehiculos_placa UNIQUE (placa),
  INDEX ix_vehiculos_usuario (usuario_id),
  CONSTRAINT ck_vehiculos_placa CHECK (
    (tipo = 'carro' AND REGEXP_LIKE(placa, '^[A-Z]{3}[0-9]{3}$', 'c'))
    OR (tipo = 'moto' AND REGEXP_LIKE(placa, '^[A-Z]{3}[0-9]{2}[A-Z]?$', 'c'))
  ),
  CONSTRAINT fk_vehiculos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehiculos_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE vehiculos_historial_propietario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehiculo_id INT NOT NULL,
  usuario_anterior_id INT NULL,
  usuario_nuevo_id INT NULL,
  cambiado_por INT NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motivo VARCHAR(255) NULL,
  INDEX ix_vhp_vehiculo (vehiculo_id, fecha),
  CONSTRAINT fk_vhp_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculos (id) ON DELETE RESTRICT,
  CONSTRAINT fk_vhp_anterior FOREIGN KEY (usuario_anterior_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT fk_vhp_nuevo FOREIGN KEY (usuario_nuevo_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT fk_vhp_cambiado_por FOREIGN KEY (cambiado_por) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Celdas (REQ-CLD-01..03). fila_mapa + posicion dibujan el mapa.
-- ---------------------------------------------------------------------
CREATE TABLE celdas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parqueadero_id INT NOT NULL,
  piso_id INT NOT NULL,
  codigo VARCHAR(10) NOT NULL,              -- ej. A-01, M-12
  area VARCHAR(5) NOT NULL,                 -- fila de letras: A, B, C, M
  tipo ENUM('moto','carro') NOT NULL,
  es_accesible TINYINT(1) NOT NULL DEFAULT 0,
  fila_mapa ENUM('superior','inferior') NOT NULL,
  posicion INT NOT NULL,
  estado ENUM('disponible','ocupada','reservada','fuera_servicio') NOT NULL DEFAULT 'disponible',
  vehiculo_actual_id INT NULL,
  nota VARCHAR(255) NULL,                   -- motivo de fuera de servicio
  activa TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_celdas_codigo UNIQUE (parqueadero_id, codigo),
  CONSTRAINT uq_celdas_posicion UNIQUE (piso_id, fila_mapa, posicion),
  CONSTRAINT uq_celdas_vehiculo_actual UNIQUE (vehiculo_actual_id), -- un vehículo, una celda
  INDEX ix_celdas_estado (estado),
  INDEX ix_celdas_tipo_estado (tipo, estado),
  CONSTRAINT ck_celdas_posicion CHECK (posicion > 0),
  CONSTRAINT fk_celdas_parqueadero FOREIGN KEY (parqueadero_id) REFERENCES parqueaderos (id) ON DELETE RESTRICT,
  CONSTRAINT fk_celdas_piso FOREIGN KEY (piso_id) REFERENCES pisos (id) ON DELETE RESTRICT,
  CONSTRAINT fk_celdas_vehiculo FOREIGN KEY (vehiculo_actual_id) REFERENCES vehiculos (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Pico y placa (REQ-CAR-4, REQ-INEX-4)
-- dia_semana: 1 = lunes … 7 = domingo. Carros: último dígito; motos: primer dígito.
-- ---------------------------------------------------------------------
CREATE TABLE pico_placa (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo_vehiculo ENUM('moto','carro') NOT NULL,
  dia_semana TINYINT NOT NULL,
  digito TINYINT NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  activa TINYINT(1) NOT NULL DEFAULT 1,
  creado_por INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_pico_placa_regla UNIQUE (tipo_vehiculo, dia_semana, digito, hora_inicio),
  INDEX ix_pico_placa_busqueda (tipo_vehiculo, dia_semana, activa),
  CONSTRAINT ck_pico_placa_dia CHECK (dia_semana BETWEEN 1 AND 7),
  CONSTRAINT ck_pico_placa_digito CHECK (digito BETWEEN 0 AND 9),
  CONSTRAINT ck_pico_placa_horas CHECK (hora_fin > hora_inicio),
  CONSTRAINT fk_pico_placa_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tarifas, descuentos y membresías (REQ-TAR-1, REQ-DES-1, REQ-MEM-1)
-- ---------------------------------------------------------------------
CREATE TABLE tarifas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo_vehiculo ENUM('moto','carro') NOT NULL,
  valor_fraccion DECIMAL(12,2) NOT NULL,
  minutos_fraccion INT NOT NULL DEFAULT 1,
  minutos_gracia INT NOT NULL DEFAULT 0,
  valor_dia_maximo DECIMAL(12,2) NOT NULL,  -- "tope del día" por bloque de 24 h
  vigente_desde DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activa TINYINT(1) NOT NULL DEFAULT 1,
  creado_por INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX ix_tarifas_vigente (tipo_vehiculo, activa, vigente_desde),
  CONSTRAINT ck_tarifas_valores CHECK (valor_fraccion >= 0 AND valor_dia_maximo >= 0),
  CONSTRAINT ck_tarifas_minutos CHECK (minutos_fraccion > 0 AND minutos_gracia >= 0),
  CONSTRAINT fk_tarifas_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE descuentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  descripcion VARCHAR(255) NULL,
  porcentaje DECIMAL(5,2) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_descuentos_nombre UNIQUE (nombre),
  CONSTRAINT ck_descuentos_porcentaje CHECK (porcentaje >= 0 AND porcentaje <= 100)
) ENGINE=InnoDB;

CREATE TABLE membresias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  vehiculo_id INT NOT NULL,
  celda_asignada_id INT NULL,               -- celda fija opcional
  tipo ENUM('mensual','anual') NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado ENUM('activa','vencida','cancelada') NOT NULL DEFAULT 'activa',
  creado_por INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX ix_membresias_vehiculo (vehiculo_id, estado, fecha_fin),
  INDEX ix_membresias_vencimiento (estado, fecha_fin),
  CONSTRAINT ck_membresias_fechas CHECK (fecha_fin > fecha_inicio),
  CONSTRAINT ck_membresias_valor CHECK (valor >= 0),
  CONSTRAINT fk_membresias_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT fk_membresias_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculos (id) ON DELETE RESTRICT,
  CONSTRAINT fk_membresias_celda FOREIGN KEY (celda_asignada_id) REFERENCES celdas (id) ON DELETE RESTRICT,
  CONSTRAINT fk_membresias_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Reservas temporales (REQ-RES-1). Máx. una activa por vehículo.
-- ---------------------------------------------------------------------
CREATE TABLE reservas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  vehiculo_id INT NOT NULL,
  celda_id INT NOT NULL,
  fecha_hora_reserva DATETIME NOT NULL,
  fecha_hora_expiracion DATETIME NOT NULL,
  estado ENUM('pendiente','confirmada','cumplida','cancelada','expirada') NOT NULL DEFAULT 'pendiente',
  -- Columnas generadas: solo tienen valor mientras la reserva está activa,
  -- así el índice UNIQUE impide dos reservas activas por vehículo o por celda.
  vehiculo_reserva_activa INT GENERATED ALWAYS AS (IF(estado IN ('pendiente','confirmada'), vehiculo_id, NULL)) STORED,
  celda_reserva_activa INT GENERATED ALWAYS AS (IF(estado IN ('pendiente','confirmada'), celda_id, NULL)) STORED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_reservas_vehiculo_activa UNIQUE (vehiculo_reserva_activa),
  CONSTRAINT uq_reservas_celda_activa UNIQUE (celda_reserva_activa),
  INDEX ix_reservas_estado_expiracion (estado, fecha_hora_expiracion),
  CONSTRAINT ck_reservas_fechas CHECK (fecha_hora_expiracion > fecha_hora_reserva),
  CONSTRAINT fk_reservas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT fk_reservas_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculos (id) ON DELETE RESTRICT,
  CONSTRAINT fk_reservas_celda FOREIGN KEY (celda_id) REFERENCES celdas (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Estadías: entrada + salida + tiempo en un solo registro (REQ-INEX-1..3,
-- REQ-TCK-1). Reemplaza ACCESO_SALIDAS, HISTORIAL_PARQUEO e ingresos_salidas.
-- ---------------------------------------------------------------------
CREATE TABLE estadias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_ticket VARCHAR(12) NOT NULL,       -- T-000123
  vehiculo_id INT NOT NULL,
  celda_id INT NOT NULL,
  tipo_cliente ENUM('visitante','mensualidad') NOT NULL DEFAULT 'visitante', -- lo detecta el sistema
  membresia_id INT NULL,
  reserva_id INT NULL,
  puerta_entrada_id INT NOT NULL,
  puerta_salida_id INT NULL,
  fecha_hora_entrada DATETIME NOT NULL,
  fecha_hora_salida DATETIME NULL,
  minutos_estadia INT NULL,
  requiere_accesible TINYINT(1) NOT NULL DEFAULT 0,
  observaciones_entrada VARCHAR(500) NULL,  -- daños visibles, objetos de valor
  deja_llaves TINYINT(1) NOT NULL DEFAULT 0,
  estado ENUM('en_curso','finalizada') NOT NULL DEFAULT 'en_curso',
  registrada_entrada_por INT NOT NULL,
  registrada_salida_por INT NULL,
  -- Solo con valor mientras la estadía está abierta: UNIQUE impide que un
  -- vehículo tenga dos estadías abiertas o que una celda tenga dos.
  vehiculo_estadia_abierta INT GENERATED ALWAYS AS (IF(estado = 'en_curso', vehiculo_id, NULL)) STORED,
  celda_estadia_abierta INT GENERATED ALWAYS AS (IF(estado = 'en_curso', celda_id, NULL)) STORED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_estadias_ticket UNIQUE (codigo_ticket),
  CONSTRAINT uq_estadias_vehiculo_abierta UNIQUE (vehiculo_estadia_abierta),
  CONSTRAINT uq_estadias_celda_abierta UNIQUE (celda_estadia_abierta),
  INDEX ix_estadias_vehiculo (vehiculo_id, fecha_hora_entrada),
  INDEX ix_estadias_celda (celda_id, fecha_hora_entrada),
  INDEX ix_estadias_entrada (fecha_hora_entrada),
  INDEX ix_estadias_salida (fecha_hora_salida),
  INDEX ix_estadias_estado (estado),
  CONSTRAINT ck_estadias_salida CHECK (fecha_hora_salida IS NULL OR fecha_hora_salida >= fecha_hora_entrada),
  CONSTRAINT ck_estadias_minutos CHECK (minutos_estadia IS NULL OR minutos_estadia >= 0),
  CONSTRAINT ck_estadias_cierre CHECK (
    (estado = 'en_curso' AND fecha_hora_salida IS NULL)
    OR (estado = 'finalizada' AND fecha_hora_salida IS NOT NULL AND minutos_estadia IS NOT NULL)
  ),
  CONSTRAINT fk_estadias_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculos (id) ON DELETE RESTRICT,
  CONSTRAINT fk_estadias_celda FOREIGN KEY (celda_id) REFERENCES celdas (id) ON DELETE RESTRICT,
  CONSTRAINT fk_estadias_membresia FOREIGN KEY (membresia_id) REFERENCES membresias (id) ON DELETE RESTRICT,
  CONSTRAINT fk_estadias_reserva FOREIGN KEY (reserva_id) REFERENCES reservas (id) ON DELETE RESTRICT,
  CONSTRAINT fk_estadias_puerta_entrada FOREIGN KEY (puerta_entrada_id) REFERENCES puertas (id) ON DELETE RESTRICT,
  CONSTRAINT fk_estadias_puerta_salida FOREIGN KEY (puerta_salida_id) REFERENCES puertas (id) ON DELETE RESTRICT,
  CONSTRAINT fk_estadias_entrada_por FOREIGN KEY (registrada_entrada_por) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT fk_estadias_salida_por FOREIGN KEY (registrada_salida_por) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Entradas rechazadas (pico y placa u otro motivo) — REQ-INEX-4, REQ-REP-06
CREATE TABLE accesos_denegados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  placa VARCHAR(7) NOT NULL,
  tipo_vehiculo ENUM('moto','carro') NULL,
  puerta_id INT NOT NULL,
  fecha_hora DATETIME NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  regla_pico_placa_id INT NULL,
  registrado_por INT NOT NULL,
  INDEX ix_accesos_denegados_fecha (fecha_hora),
  INDEX ix_accesos_denegados_placa (placa),
  CONSTRAINT fk_ad_puerta FOREIGN KEY (puerta_id) REFERENCES puertas (id) ON DELETE RESTRICT,
  CONSTRAINT fk_ad_regla FOREIGN KEY (regla_pico_placa_id) REFERENCES pico_placa (id) ON DELETE RESTRICT,
  CONSTRAINT fk_ad_registrado_por FOREIGN KEY (registrado_por) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- "Reconocimiento" de placa simulado: placa digitada + foto opcional (REQ-PLA-1)
CREATE TABLE lecturas_placa (
  id INT AUTO_INCREMENT PRIMARY KEY,
  placa_leida VARCHAR(7) NOT NULL,
  imagen_url VARCHAR(255) NULL,
  fecha_hora DATETIME NOT NULL,
  puerta_id INT NULL,
  estadia_id INT NULL,
  registrada_por INT NULL,
  INDEX ix_lecturas_placa (placa_leida, fecha_hora),
  CONSTRAINT fk_lp_puerta FOREIGN KEY (puerta_id) REFERENCES puertas (id) ON DELETE RESTRICT,
  CONSTRAINT fk_lp_estadia FOREIGN KEY (estadia_id) REFERENCES estadias (id) ON DELETE RESTRICT,
  CONSTRAINT fk_lp_registrada_por FOREIGN KEY (registrada_por) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Facturas (REQ-FAC-1, REQ-FAC-2). FAC-000001, una por estadía.
-- ---------------------------------------------------------------------
CREATE TABLE facturas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(12) NOT NULL,
  concepto ENUM('estadia','membresia') NOT NULL,
  estadia_id INT NULL,
  membresia_id INT NULL,
  cliente_id INT NULL,                      -- titular al momento de pagar (NULL = visitante)
  subtotal DECIMAL(12,2) NOT NULL,
  descuento_id INT NULL,
  porcentaje_descuento DECIMAL(5,2) NOT NULL DEFAULT 0, -- copia del % aplicado
  valor_descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  metodo_pago ENUM('efectivo','tarjeta','transferencia') NOT NULL,
  observacion VARCHAR(255) NULL,            -- ej. "membresía"
  tarifa_id INT NULL,                       -- tarifa con la que se calculó (estadías)
  detalle_calculo JSON NULL,                -- copia del cálculo: el PDF no cambia si la tarifa cambia
  fecha_pago DATETIME NOT NULL,
  registrada_por INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_facturas_numero UNIQUE (numero),
  CONSTRAINT uq_facturas_estadia UNIQUE (estadia_id),
  INDEX ix_facturas_fecha (fecha_pago),
  INDEX ix_facturas_cliente (cliente_id, fecha_pago),
  CONSTRAINT ck_facturas_valores CHECK (subtotal >= 0 AND valor_descuento >= 0 AND total >= 0),
  CONSTRAINT ck_facturas_porcentaje CHECK (porcentaje_descuento >= 0 AND porcentaje_descuento <= 100),
  CONSTRAINT fk_facturas_estadia FOREIGN KEY (estadia_id) REFERENCES estadias (id) ON DELETE RESTRICT,
  CONSTRAINT fk_facturas_membresia FOREIGN KEY (membresia_id) REFERENCES membresias (id) ON DELETE RESTRICT,
  CONSTRAINT fk_facturas_cliente FOREIGN KEY (cliente_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT fk_facturas_descuento FOREIGN KEY (descuento_id) REFERENCES descuentos (id) ON DELETE RESTRICT,
  CONSTRAINT fk_facturas_tarifa FOREIGN KEY (tarifa_id) REFERENCES tarifas (id) ON DELETE RESTRICT,
  CONSTRAINT fk_facturas_registrada_por FOREIGN KEY (registrada_por) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Consecutivos sin huecos (número de factura): se leen con SELECT … FOR UPDATE
-- dentro de la misma transacción del pago, así dos cobros simultáneos nunca
-- obtienen el mismo número y un pago fallido no consume número.
CREATE TABLE consecutivos (
  nombre VARCHAR(30) PRIMARY KEY,           -- ej. factura
  ultimo INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Incidencias (REQ-INCD-1). Código INC-AAAAMMDD-0001.
-- ---------------------------------------------------------------------
CREATE TABLE tipos_incidencia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  descripcion VARCHAR(255) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_tipos_incidencia_nombre UNIQUE (nombre)
) ENGINE=InnoDB;

CREATE TABLE incidencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL,
  tipo_incidencia_id INT NOT NULL,
  vehiculo_id INT NOT NULL,
  celda_id INT NULL,
  estadia_id INT NULL,
  descripcion TEXT NOT NULL,
  fecha_hora DATETIME NOT NULL,
  registrada_por INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_incidencias_codigo UNIQUE (codigo),
  INDEX ix_incidencias_fecha (fecha_hora),
  INDEX ix_incidencias_vehiculo (vehiculo_id),
  CONSTRAINT fk_incidencias_tipo FOREIGN KEY (tipo_incidencia_id) REFERENCES tipos_incidencia (id) ON DELETE RESTRICT,
  CONSTRAINT fk_incidencias_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculos (id) ON DELETE RESTRICT,
  CONSTRAINT fk_incidencias_celda FOREIGN KEY (celda_id) REFERENCES celdas (id) ON DELETE RESTRICT,
  CONSTRAINT fk_incidencias_estadia FOREIGN KEY (estadia_id) REFERENCES estadias (id) ON DELETE RESTRICT,
  CONSTRAINT fk_incidencias_registrada_por FOREIGN KEY (registrada_por) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Notificaciones internas (REQ-NOT-1)
-- tipo: perfil_actualizado | incidencia | pico_placa | membresia_por_vencer
--       | reserva_expirada | manual
-- ---------------------------------------------------------------------
CREATE TABLE notificaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,                  -- destinatario
  titulo VARCHAR(120) NOT NULL,
  mensaje VARCHAR(1000) NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  enlace VARCHAR(255) NULL,
  leida TINYINT(1) NOT NULL DEFAULT 0,
  leida_at DATETIME NULL,
  enviada_por INT NULL,                     -- NULL = generada por el sistema
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX ix_notificaciones_bandeja (usuario_id, leida, created_at),
  CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT fk_notificaciones_enviada_por FOREIGN KEY (enviada_por) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Parámetros editables por el administrador (⚙️ en CLAUDE.md §7)
-- ---------------------------------------------------------------------
CREATE TABLE configuracion (
  clave VARCHAR(80) PRIMARY KEY,
  valor VARCHAR(255) NOT NULL,
  tipo ENUM('texto','entero','decimal','booleano') NOT NULL DEFAULT 'texto',
  descripcion VARCHAR(255) NOT NULL,
  actualizado_por INT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_configuracion_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- ORIGEN Y CORRECCIONES
-- ---------------------------------------------------------------------
-- Tomado de v1 (docs/bd-referencia/v1-ParkingLot.sql, alineada a los REQ):
--   · usuarios: documento (tipo + número), nombres y apellidos separados,
--     correo, celular, foto, estado; perfil -> rol_id.
--   · vehiculos: placa, color, marca, modelo, tipo; propietario opcional.
--   · pico_placa (tipo_vehiculo, dígito, día) — se agregan horas y "activa".
--   · celdas (tipo, estado) — se agregan código, piso, área, accesible y
--     posición en el mapa.
--   · INCIDENCIA -> tipos_incidencia; REPORTE_INCIDENCIA -> incidencias.
--   · ACCESO_SALIDAS / HISTORIAL_PARQUEO -> estadias (puerta, tiempo).
-- Tomado de v2 (docs/bd-referencia/v2-parqueaderodb.sql, alcance ampliado):
--   · roles, permisos, roles_permisos; parqueaderos; espacios -> celdas
--     (con estado "reservada"); ingresos_salidas -> estadias;
--     reconocimiento_placa -> lecturas_placa; tarifas; facturas (métodos
--     efectivo/tarjeta/transferencia); reservas; membresias; descuentos;
--     notificaciones; incidentes -> incidencias.
-- Corregido / agregado:
--   · PK compuestas innecesarias de v1 (USUARIO, VEHICULO, ACCESO_SALIDAS)
--     -> PK simple `id INT AUTO_INCREMENT` en todas las tablas.
--   · HISTORIAL_PARQUEO y REPORTE_INCIDENCIA tenían PK (celda, vehículo) /
--     (vehículo, tipo): impedían que un vehículo repitiera celda o tipo de
--     incidencia. Ahora cada evento es una fila con su propio id.
--   · ACCESO_SALIDAS guardaba entrada y salida como filas sueltas: no se
--     podía emparejar ni medir el tiempo. estadias tiene entrada, salida y
--     minutos en una sola fila, con estado en_curso / finalizada.
--   · v2 no tenía FKs ni índices declarados: todas las relaciones tienen
--     FK con ON DELETE RESTRICT e índices en placa, documento, fechas de
--     estadía y estados.
--   · VARCHAR libres -> ENUM (tipo de vehículo moto/carro, estados, método de
--     pago, tipo de documento) y CHECK (placa según tipo, porcentaje 0–100,
--     dígito 0–9, día 1–7, fechas coherentes).
--   · "auto" de v2 -> "carro" (vocabulario de los REQ).
--   · v2 usuarios solo tenía "nombre" y contraseña en texto: se usan los
--     campos de v1 + contrasena_hash (bcrypt) + debe_cambiar_contrasena.
--   · tarifas de v2 ("tiempo" en texto) -> fracción, minutos de fracción,
--     gracia y tope diario, con vigencia.
--   · facturas: número consecutivo, concepto (estadía/membresía), subtotal,
--     descuento aplicado y total; UNIQUE por estadía.
--   · membresias: vehículo, valor, estado y celda fija opcional.
--   · reservas: vehículo, expiración y estados cumplida/expirada.
--   · Fase 4: facturas guarda tarifa_id y detalle_calculo (JSON); tabla consecutivos.
--   · Fase 5: consecutivos también numera las incidencias por día (fila incidencia-AAAAMMDD).
--   · Fase 8: parqueaderos.latitud / longitud (mapa de la página pública).
--   · Nuevas: pisos (texto del carril del mapa), puertas, accesos_denegados,
--     vehiculos_historial_propietario y configuracion.
--   · Reglas "un vehículo / una celda con una sola estadía abierta" y "una
--     reserva activa por vehículo" garantizadas en BD con columnas generadas
--     + UNIQUE (MySQL permite varios NULL en un índice único).
--   · Borrado lógico (activo/estado) en usuarios, vehículos, celdas, tarifas
--     y descuentos; capacidad de la sede = conteo de celdas (no se guarda).
--   · utf8mb4 en lugar de utf8 (utf8mb3) para tildes, ñ y emojis.
-- =====================================================================
