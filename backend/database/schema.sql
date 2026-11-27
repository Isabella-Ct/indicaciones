-- =====================================================================
-- Sistema de Gestión de Parqueadero (Parking Lot ABC) · esquema v2.0.0
-- Fuente: SRS v2.0 §6.1 (modelo lógico) + tablas [Propuesta] de
-- specs/001-roles-permisos/research.md R-09. Cambios: database/CAMBIOS.md
-- MySQL 8 · InnoDB · utf8mb4_0900_ai_ci · hora America/Bogota (-05:00)
-- `reset.js` reemplaza el nombre `parqueaderodb` por DB_NAME.
-- =====================================================================

DROP DATABASE IF EXISTS parqueaderodb;
CREATE DATABASE parqueaderodb CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE parqueaderodb;
SET time_zone = '-05:00';

-- ---------------------------------------------------------------------
-- 4.1 Roles y permisos (spec 001)
-- ---------------------------------------------------------------------
CREATE TABLE rol (
  id_rol             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre             VARCHAR(40)  NOT NULL,
  nombre_normalizado VARCHAR(40)  GENERATED ALWAYS AS (LOWER(TRIM(nombre))) STORED,
  descripcion        VARCHAR(150) NULL,
  es_base            BOOLEAN      NOT NULL DEFAULT FALSE,
  estado             ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_rol),
  UNIQUE KEY uq_rol_nombre (nombre_normalizado),
  KEY idx_rol_estado (estado),
  CONSTRAINT ck_rol_nombre CHECK (CHAR_LENGTH(TRIM(nombre)) BETWEEN 3 AND 40)
) ENGINE=InnoDB;

CREATE TABLE permiso (
  id_permiso  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  modulo      VARCHAR(40)  NOT NULL,
  accion      ENUM('ver','crear','editar','cambiar_estado','anular','exportar') NOT NULL,
  codigo      VARCHAR(60)  NOT NULL,
  descripcion VARCHAR(150) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_permiso),
  UNIQUE KEY uq_permiso_codigo (codigo),
  UNIQUE KEY uq_permiso_modulo_accion (modulo, accion),
  CONSTRAINT ck_permiso_codigo CHECK (codigo = CONCAT(modulo, '.', accion))
) ENGINE=InnoDB;

CREATE TABLE rol_permiso (
  id_rol     INT UNSIGNED NOT NULL,
  id_permiso INT UNSIGNED NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_rol, id_permiso),
  KEY idx_rol_permiso_permiso (id_permiso),
  CONSTRAINT fk_rol_permiso_rol FOREIGN KEY (id_rol) REFERENCES rol (id_rol)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_rol_permiso_permiso FOREIGN KEY (id_permiso) REFERENCES permiso (id_permiso)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4.2 Gestión de usuarios (spec 002)
-- ---------------------------------------------------------------------
CREATE TABLE usuario (
  id_usuario               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo_documento           ENUM('CC','CE','TI','PAS','NIT') NOT NULL,
  numero_documento         VARCHAR(20)  NOT NULL,
  nombre_completo          VARCHAR(100) NOT NULL,
  correo                   VARCHAR(120) NOT NULL,
  celular                  VARCHAR(10)  NOT NULL,
  foto_url                 VARCHAR(255) NULL,
  id_rol                   INT UNSIGNED NOT NULL,
  contrasena_hash          VARCHAR(255) NOT NULL,
  debe_cambiar_contrasena  BOOLEAN      NOT NULL DEFAULT TRUE,
  estado                   ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  acepta_tratamiento_datos BOOLEAN      NOT NULL,
  fecha_autorizacion       DATETIME     NULL,
  created_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuario_documento (tipo_documento, numero_documento),
  UNIQUE KEY uq_usuario_correo (correo),
  KEY idx_usuario_rol_estado (id_rol, estado),
  KEY idx_usuario_nombre (nombre_completo),
  CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES rol (id_rol)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_usuario_documento CHECK (tipo_documento = 'PAS' OR numero_documento REGEXP '^[0-9]+$'),
  CONSTRAINT ck_usuario_celular CHECK (celular REGEXP '^3[0-9]{9}$'),
  CONSTRAINT ck_usuario_habeas_data CHECK (acepta_tratamiento_datos = TRUE)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4.3 Gestión de acceso (spec 003) + sesion [Propuesta]
-- ---------------------------------------------------------------------
CREATE TABLE token_recuperacion (
  id_token   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expira_en  DATETIME     NOT NULL,
  usado      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_token),
  UNIQUE KEY uq_token_hash (token_hash),
  KEY idx_token_usuario (id_usuario),
  CONSTRAINT fk_token_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE intento_acceso (
  id_intento       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero_documento VARCHAR(20)  NOT NULL,
  exitoso          BOOLEAN      NOT NULL,
  ip               VARCHAR(45)  NULL,
  fecha            DATETIME     NOT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_intento),
  KEY idx_intento_documento_fecha (numero_documento, fecha)
) ENGINE=InnoDB;

-- [Propuesta] R-09: revocación de tokens por jti (RF-ACC-13, RF-USR-13)
CREATE TABLE sesion (
  id_sesion   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  jti         CHAR(36)     NOT NULL,
  id_usuario  INT UNSIGNED NOT NULL,
  emitida_en  DATETIME     NOT NULL,
  expira_en   DATETIME     NOT NULL,
  revocada_en DATETIME     NULL,
  ip          VARCHAR(45)  NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_sesion),
  UNIQUE KEY uq_sesion_jti (jti),
  KEY idx_sesion_usuario (id_usuario, revocada_en),
  CONSTRAINT fk_sesion_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Transversales [Propuesta]: bitácora (RNF-SEG-07) y consecutivos (RN-22)
-- ---------------------------------------------------------------------
CREATE TABLE bitacora (
  id_bitacora    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario     INT UNSIGNED NULL,
  fecha          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accion         VARCHAR(40)  NOT NULL,
  entidad        VARCHAR(40)  NOT NULL,
  id_registro    INT UNSIGNED NOT NULL,
  valor_anterior JSON         NULL,
  valor_nuevo    JSON         NULL,
  ip             VARCHAR(45)  NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_bitacora),
  KEY idx_bitacora_entidad (entidad, id_registro),
  KEY idx_bitacora_fecha (fecha),
  CONSTRAINT fk_bitacora_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE consecutivo (
  clave      VARCHAR(20)      NOT NULL,
  prefijo    VARCHAR(5)       NOT NULL,
  siguiente  INT UNSIGNED     NOT NULL DEFAULT 1,
  longitud   TINYINT UNSIGNED NOT NULL DEFAULT 6,
  created_at DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (clave)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4.4 Parqueaderos y celdas (spec 004) · 4.5 Vehículos (spec 005)
-- ---------------------------------------------------------------------
CREATE TABLE parqueadero (
  id_parqueadero INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(60)      NOT NULL,
  direccion      VARCHAR(120)     NOT NULL,
  pisos          TINYINT UNSIGNED NOT NULL DEFAULT 1,
  horario        VARCHAR(60)      NOT NULL DEFAULT '24 horas',
  estado         ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  created_at     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_parqueadero),
  UNIQUE KEY uq_parqueadero_nombre (nombre),
  CONSTRAINT ck_parqueadero_pisos CHECK (pisos BETWEEN 1 AND 20)
) ENGINE=InnoDB;

CREATE TABLE puerta_acceso (
  id_puerta      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_parqueadero INT UNSIGNED NOT NULL,
  nombre         VARCHAR(40)  NOT NULL,
  tipo           ENUM('entrada','salida','mixta') NOT NULL,
  estado         ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_puerta),
  UNIQUE KEY uq_puerta_nombre (id_parqueadero, nombre),
  CONSTRAINT fk_puerta_parqueadero FOREIGN KEY (id_parqueadero) REFERENCES parqueadero (id_parqueadero)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE vehiculo (
  id_vehiculo    INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  placa          VARCHAR(7)        NOT NULL,
  tipo           ENUM('carro','moto') NOT NULL,
  color          VARCHAR(30)       NOT NULL,
  marca          VARCHAR(40)       NOT NULL,
  modelo         SMALLINT UNSIGNED NOT NULL,
  id_propietario INT UNSIGNED      NULL,
  estado         ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  created_at     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_vehiculo),
  UNIQUE KEY uq_vehiculo_placa (placa),
  KEY idx_vehiculo_propietario (id_propietario),
  CONSTRAINT fk_vehiculo_propietario FOREIGN KEY (id_propietario) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_vehiculo_placa CHECK (
    (tipo = 'carro' AND placa REGEXP '^[A-Z]{3}[0-9]{3}$') OR
    (tipo = 'moto'  AND placa REGEXP '^[A-Z]{3}[0-9]{2}[A-Z]?$')),
  CONSTRAINT ck_vehiculo_modelo CHECK (modelo >= 1950)
) ENGINE=InnoDB;

CREATE TABLE celda (
  id_celda           INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  id_parqueadero     INT UNSIGNED     NOT NULL,
  codigo             VARCHAR(10)      NOT NULL,
  tipo_vehiculo      ENUM('carro','moto') NOT NULL,
  piso               TINYINT UNSIGNED NOT NULL,
  area               VARCHAR(20)      NULL,
  estado             ENUM('disponible','ocupada','reservada','inhabilitada') NOT NULL DEFAULT 'disponible',
  motivo_inhabilitacion VARCHAR(200)  NULL,
  id_vehiculo_actual INT UNSIGNED     NULL,
  created_at         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_celda),
  UNIQUE KEY uq_celda_codigo (id_parqueadero, codigo),
  UNIQUE KEY uq_celda_vehiculo_actual (id_vehiculo_actual),
  KEY idx_celda_estado (id_parqueadero, tipo_vehiculo, estado),
  CONSTRAINT fk_celda_parqueadero FOREIGN KEY (id_parqueadero) REFERENCES parqueadero (id_parqueadero)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_celda_vehiculo FOREIGN KEY (id_vehiculo_actual) REFERENCES vehiculo (id_vehiculo)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_celda_ocupada CHECK ((estado = 'ocupada') = (id_vehiculo_actual IS NOT NULL))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4.6 Restricción de pico y placa (spec 006)
-- ---------------------------------------------------------------------
CREATE TABLE restriccion_placa (
  id_restriccion  INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  dia_semana      TINYINT UNSIGNED NOT NULL,
  tipo_vehiculo   ENUM('carro','moto') NOT NULL,
  digitos         VARCHAR(20)      NOT NULL,
  posicion_digito ENUM('ultimo','primero') NOT NULL DEFAULT 'ultimo',
  hora_inicio     TIME             NOT NULL,
  hora_fin        TIME             NOT NULL,
  vigente_desde   DATE             NOT NULL,
  vigente_hasta   DATE             NULL,
  estado          ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_restriccion),
  KEY idx_restriccion_dia (dia_semana, tipo_vehiculo, estado),
  CONSTRAINT ck_restriccion_dia CHECK (dia_semana BETWEEN 1 AND 7),
  CONSTRAINT ck_restriccion_digitos CHECK (digitos REGEXP '^[0-9](,[0-9])*$'),
  CONSTRAINT ck_restriccion_horas CHECK (hora_fin > hora_inicio),
  CONSTRAINT ck_restriccion_vigencia CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4.7 Control de ingreso y salida (spec 007)
-- ---------------------------------------------------------------------
CREATE TABLE movimiento (
  id_movimiento       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_vehiculo         INT UNSIGNED NOT NULL,
  id_celda            INT UNSIGNED NOT NULL,
  id_puerta_entrada   INT UNSIGNED NOT NULL,
  fecha_hora_entrada  DATETIME     NOT NULL,
  id_operador_entrada INT UNSIGNED NOT NULL,
  id_puerta_salida    INT UNSIGNED NULL,
  fecha_hora_salida   DATETIME     NULL,
  minutos_estadia     INT UNSIGNED NULL,
  id_operador_salida  INT UNSIGNED NULL,
  estado              ENUM('abierto','cerrado','anulado') NOT NULL DEFAULT 'abierto',
  motivo_anulacion    VARCHAR(200) NULL,
  id_usuario_anulacion INT UNSIGNED NULL,
  fecha_anulacion     DATETIME     NULL,
  -- RNF-SAF-01: un solo movimiento abierto por vehículo
  vehiculo_abierto    INT UNSIGNED GENERATED ALWAYS AS (IF(estado = 'abierto', id_vehiculo, NULL)) STORED,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_movimiento),
  UNIQUE KEY uq_movimiento_abierto (vehiculo_abierto),
  KEY idx_movimiento_estado_entrada (estado, fecha_hora_entrada),
  KEY idx_movimiento_salida (fecha_hora_salida),
  KEY idx_movimiento_vehiculo (id_vehiculo, fecha_hora_entrada),
  CONSTRAINT fk_mov_vehiculo FOREIGN KEY (id_vehiculo) REFERENCES vehiculo (id_vehiculo)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_mov_celda FOREIGN KEY (id_celda) REFERENCES celda (id_celda)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_mov_puerta_entrada FOREIGN KEY (id_puerta_entrada) REFERENCES puerta_acceso (id_puerta)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_mov_puerta_salida FOREIGN KEY (id_puerta_salida) REFERENCES puerta_acceso (id_puerta)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_mov_operador_entrada FOREIGN KEY (id_operador_entrada) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_mov_operador_salida FOREIGN KEY (id_operador_salida) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_mov_usuario_anulacion FOREIGN KEY (id_usuario_anulacion) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_mov_salida CHECK (fecha_hora_salida IS NULL OR fecha_hora_salida >= fecha_hora_entrada)
) ENGINE=InnoDB;

CREATE TABLE ticket (
  id_ticket     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_movimiento INT UNSIGNED NOT NULL,
  codigo        VARCHAR(12)  NOT NULL,
  fecha_emision DATETIME     NOT NULL,
  impreso       BOOLEAN      NOT NULL DEFAULT FALSE,
  valido        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_ticket),
  UNIQUE KEY uq_ticket_movimiento (id_movimiento),
  UNIQUE KEY uq_ticket_codigo (codigo),
  CONSTRAINT fk_ticket_movimiento FOREIGN KEY (id_movimiento) REFERENCES movimiento (id_movimiento)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4.8 Tarifas (spec 008) · 4.11 Descuentos (spec 011)
-- ---------------------------------------------------------------------
CREATE TABLE tarifa (
  id_tarifa          INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  nombre             VARCHAR(60)       NOT NULL,
  tipo_vehiculo      ENUM('carro','moto') NOT NULL,
  tipo_cliente       ENUM('ocasional','registrado') NOT NULL,
  valor_primera_hora DECIMAL(12,2)     NOT NULL,
  minutos_fraccion   SMALLINT UNSIGNED NOT NULL,
  valor_fraccion     DECIMAL(12,2)     NOT NULL,
  tope_diario        DECIMAL(12,2)     NULL,
  minutos_gracia     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  vigente_desde      DATETIME          NOT NULL,
  vigente_hasta      DATETIME          NULL,
  estado             ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  created_at         DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_tarifa),
  KEY idx_tarifa_vigencia (tipo_vehiculo, tipo_cliente, estado, vigente_desde),
  CONSTRAINT ck_tarifa_primera_hora CHECK (valor_primera_hora > 0),
  CONSTRAINT ck_tarifa_fraccion CHECK (minutos_fraccion BETWEEN 1 AND 60 AND valor_fraccion >= 0),
  CONSTRAINT ck_tarifa_tope CHECK (tope_diario IS NULL OR tope_diario >= valor_primera_hora),
  CONSTRAINT ck_tarifa_gracia CHECK (minutos_gracia BETWEEN 0 AND 30),
  CONSTRAINT ck_tarifa_vigencia CHECK (vigente_hasta IS NULL OR vigente_hasta > vigente_desde)
) ENGINE=InnoDB;

CREATE TABLE descuento (
  id_descuento         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre               VARCHAR(60)   NOT NULL,
  tipo                 ENUM('porcentaje','valor_fijo') NOT NULL,
  valor                DECIMAL(12,2) NOT NULL,
  aplica_tipo_cliente  ENUM('todos','ocasional','registrado') NOT NULL DEFAULT 'todos',
  aplica_tipo_vehiculo ENUM('todos','carro','moto') NOT NULL DEFAULT 'todos',
  minutos_minimos      INT UNSIGNED  NULL,
  vigente_desde        DATETIME      NOT NULL,
  vigente_hasta        DATETIME      NOT NULL,
  estado               ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_descuento),
  UNIQUE KEY uq_descuento_nombre (nombre),
  KEY idx_descuento_vigencia (estado, vigente_desde, vigente_hasta),
  CONSTRAINT ck_descuento_valor CHECK (
    (tipo = 'porcentaje' AND valor BETWEEN 1 AND 100) OR (tipo = 'valor_fijo' AND valor > 0)),
  CONSTRAINT ck_descuento_vigencia CHECK (vigente_hasta > vigente_desde)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4.9 Facturación y pagos (spec 009) · 4.10 Membresías (spec 010)
-- ---------------------------------------------------------------------
CREATE TABLE liquidacion (
  id_liquidacion         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  id_movimiento          INT UNSIGNED  NOT NULL,
  id_tarifa              INT UNSIGNED  NULL,
  minutos_cobrados       INT UNSIGNED  NOT NULL,
  valor_bruto            DECIMAL(12,2) NOT NULL DEFAULT 0,
  id_descuento           INT UNSIGNED  NULL,
  valor_descuento        DECIMAL(12,2) NOT NULL DEFAULT 0,
  cubierto_por_membresia BOOLEAN       NOT NULL DEFAULT FALSE,
  valor_total            DECIMAL(12,2) NOT NULL,
  created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_liquidacion),
  UNIQUE KEY uq_liquidacion_movimiento (id_movimiento),
  CONSTRAINT fk_liq_movimiento FOREIGN KEY (id_movimiento) REFERENCES movimiento (id_movimiento)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_liq_tarifa FOREIGN KEY (id_tarifa) REFERENCES tarifa (id_tarifa)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_liq_descuento FOREIGN KEY (id_descuento) REFERENCES descuento (id_descuento)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_liq_total CHECK (valor_total >= 0)
) ENGINE=InnoDB;

CREATE TABLE plan_membresia (
  id_plan       INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(60)       NOT NULL,
  tipo_vehiculo ENUM('carro','moto') NOT NULL,
  valor_mensual DECIMAL(12,2)     NOT NULL,
  dias_vigencia SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  beneficios    VARCHAR(300)      NULL,
  estado        ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  created_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_plan),
  UNIQUE KEY uq_plan_nombre (nombre),
  CONSTRAINT ck_plan_valor CHECK (valor_mensual > 0 AND dias_vigencia > 0)
) ENGINE=InnoDB;

-- La relación membresía ↔ factura se guarda solo en factura.id_membresia
-- (sin FK circular; ver CAMBIOS.md 2.0.0).
CREATE TABLE membresia (
  id_membresia INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_plan      INT UNSIGNED NOT NULL,
  id_cliente   INT UNSIGNED NOT NULL,
  id_vehiculo  INT UNSIGNED NOT NULL,
  fecha_inicio DATE         NOT NULL,
  fecha_fin    DATE         NOT NULL,
  estado       ENUM('activa','vencida','cancelada') NOT NULL DEFAULT 'activa',
  motivo_cancelacion VARCHAR(200) NULL,
  -- RN-23: una sola membresía activa por vehículo
  vehiculo_activa INT UNSIGNED GENERATED ALWAYS AS (IF(estado = 'activa', id_vehiculo, NULL)) STORED,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_membresia),
  UNIQUE KEY uq_membresia_activa (vehiculo_activa),
  KEY idx_membresia_cliente (id_cliente, estado),
  KEY idx_membresia_fin (estado, fecha_fin),
  CONSTRAINT fk_mem_plan FOREIGN KEY (id_plan) REFERENCES plan_membresia (id_plan)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_mem_cliente FOREIGN KEY (id_cliente) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_mem_vehiculo FOREIGN KEY (id_vehiculo) REFERENCES vehiculo (id_vehiculo)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_mem_fechas CHECK (fecha_fin >= fecha_inicio)
) ENGINE=InnoDB;

CREATE TABLE factura (
  id_factura        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  numero            VARCHAR(20)   NOT NULL,
  id_liquidacion    INT UNSIGNED  NULL,
  id_membresia      INT UNSIGNED  NULL,
  id_cliente        INT UNSIGNED  NULL,
  -- RF-FAC-11: factura a nombre de un tercero
  tercero_documento VARCHAR(20)   NULL,
  tercero_nombre    VARCHAR(100)  NULL,
  total             DECIMAL(12,2) NOT NULL,
  fecha_emision     DATETIME      NOT NULL,
  estado            ENUM('emitida','anulada') NOT NULL DEFAULT 'emitida',
  motivo_anulacion  VARCHAR(200)  NULL,
  id_usuario_anulacion INT UNSIGNED NULL,
  fecha_anulacion   DATETIME      NULL,
  cufe              VARCHAR(100)  NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_factura),
  UNIQUE KEY uq_factura_numero (numero),
  UNIQUE KEY uq_factura_liquidacion (id_liquidacion),
  KEY idx_factura_fecha (fecha_emision, estado),
  KEY idx_factura_cliente (id_cliente),
  CONSTRAINT fk_fac_liquidacion FOREIGN KEY (id_liquidacion) REFERENCES liquidacion (id_liquidacion)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_fac_membresia FOREIGN KEY (id_membresia) REFERENCES membresia (id_membresia)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_fac_cliente FOREIGN KEY (id_cliente) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_fac_usuario_anulacion FOREIGN KEY (id_usuario_anulacion) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_fac_concepto CHECK ((id_liquidacion IS NULL) <> (id_membresia IS NULL)),
  CONSTRAINT ck_fac_total CHECK (total >= 0)
) ENGINE=InnoDB;

CREATE TABLE cierre_caja (
  id_cierre                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  id_operador              INT UNSIGNED  NOT NULL,
  inicio_turno             DATETIME      NOT NULL,
  fin_turno                DATETIME      NOT NULL,
  total_sistema_por_metodo JSON          NOT NULL,
  efectivo_contado         DECIMAL(12,2) NOT NULL,
  diferencia               DECIMAL(12,2) NOT NULL,
  observaciones            VARCHAR(200)  NULL,
  created_at               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_cierre),
  KEY idx_cierre_operador (id_operador, fin_turno),
  CONSTRAINT fk_cierre_operador FOREIGN KEY (id_operador) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_cierre_turno CHECK (fin_turno >= inicio_turno)
) ENGINE=InnoDB;

CREATE TABLE pago (
  id_pago        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  id_factura     INT UNSIGNED  NOT NULL,
  metodo         ENUM('efectivo','tarjeta','transferencia','qr') NOT NULL,
  valor          DECIMAL(12,2) NOT NULL,
  valor_recibido DECIMAL(12,2) NULL,
  cambio         DECIMAL(12,2) NULL,
  referencia     VARCHAR(40)   NULL,
  id_operador    INT UNSIGNED  NOT NULL,
  fecha          DATETIME      NOT NULL,
  -- RF-FAC-18: pago queda en el cierre de caja del turno (NULL = turno abierto)
  id_cierre      INT UNSIGNED  NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_pago),
  UNIQUE KEY uq_pago_factura (id_factura),
  KEY idx_pago_operador (id_operador, id_cierre, fecha),
  CONSTRAINT fk_pago_factura FOREIGN KEY (id_factura) REFERENCES factura (id_factura)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_pago_operador FOREIGN KEY (id_operador) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_pago_cierre FOREIGN KEY (id_cierre) REFERENCES cierre_caja (id_cierre)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_pago_valor CHECK (valor >= 0),
  CONSTRAINT ck_pago_efectivo CHECK (metodo <> 'efectivo' OR (valor_recibido IS NOT NULL AND valor_recibido >= valor)),
  CONSTRAINT ck_pago_referencia CHECK (metodo = 'efectivo' OR referencia IS NOT NULL)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4.12 Reservas (spec 012)
-- ---------------------------------------------------------------------
CREATE TABLE reserva (
  id_reserva        INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  codigo            VARCHAR(12)       NOT NULL,
  id_cliente        INT UNSIGNED      NOT NULL,
  id_vehiculo       INT UNSIGNED      NOT NULL,
  id_celda          INT UNSIGNED      NOT NULL,
  fecha_hora_inicio DATETIME          NOT NULL,
  minutos_espera    SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  estado            ENUM('confirmada','cumplida','cancelada','vencida') NOT NULL DEFAULT 'confirmada',
  id_movimiento     INT UNSIGNED      NULL,
  created_at        DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_reserva),
  UNIQUE KEY uq_reserva_codigo (codigo),
  KEY idx_reserva_celda (id_celda, estado, fecha_hora_inicio),
  KEY idx_reserva_vehiculo (id_vehiculo, estado, fecha_hora_inicio),
  KEY idx_reserva_cliente (id_cliente, estado),
  CONSTRAINT fk_res_cliente FOREIGN KEY (id_cliente) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_res_vehiculo FOREIGN KEY (id_vehiculo) REFERENCES vehiculo (id_vehiculo)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_res_celda FOREIGN KEY (id_celda) REFERENCES celda (id_celda)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_res_movimiento FOREIGN KEY (id_movimiento) REFERENCES movimiento (id_movimiento)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4.13 Incidencias (spec 013)
-- ---------------------------------------------------------------------
CREATE TABLE incidencia (
  id_incidencia     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo            VARCHAR(12)  NOT NULL,
  tipo              ENUM('rayon','choque','atropellamiento','golpe_muro') NOT NULL,
  id_vehiculo       INT UNSIGNED NOT NULL,
  id_celda          INT UNSIGNED NULL,
  fecha_hora_evento DATETIME     NOT NULL,
  descripcion       VARCHAR(500) NOT NULL,
  evidencia_url     VARCHAR(255) NULL,
  id_operador       INT UNSIGNED NOT NULL,
  estado            ENUM('abierta','en_seguimiento','cerrada') NOT NULL DEFAULT 'abierta',
  solucion          VARCHAR(500) NULL,
  fecha_cierre      DATETIME     NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_incidencia),
  UNIQUE KEY uq_incidencia_codigo (codigo),
  KEY idx_incidencia_estado_fecha (estado, fecha_hora_evento),
  KEY idx_incidencia_vehiculo (id_vehiculo),
  CONSTRAINT fk_inc_vehiculo FOREIGN KEY (id_vehiculo) REFERENCES vehiculo (id_vehiculo)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_inc_celda FOREIGN KEY (id_celda) REFERENCES celda (id_celda)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_inc_operador FOREIGN KEY (id_operador) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_inc_cierre CHECK (estado <> 'cerrada' OR solucion IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE seguimiento_incidencia (
  id_seguimiento INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_incidencia  INT UNSIGNED NOT NULL,
  nota           VARCHAR(500) NOT NULL,
  id_usuario     INT UNSIGNED NOT NULL,
  fecha          DATETIME     NOT NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_seguimiento),
  KEY idx_seguimiento_incidencia (id_incidencia, fecha),
  CONSTRAINT fk_seg_incidencia FOREIGN KEY (id_incidencia) REFERENCES incidencia (id_incidencia)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_seg_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4.14 Monitoreo, placas y alertas (spec 014)
-- ---------------------------------------------------------------------
CREATE TABLE lectura_placa (
  id_lectura    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  placa_leida   VARCHAR(10)  NOT NULL,
  confianza     DECIMAL(5,2) NOT NULL,
  id_puerta     INT UNSIGNED NOT NULL,
  fecha_hora    DATETIME     NOT NULL,
  imagen_url    VARCHAR(255) NULL,
  estado        ENUM('pendiente','confirmada','descartada') NOT NULL DEFAULT 'pendiente',
  id_movimiento INT UNSIGNED NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_lectura),
  KEY idx_lectura_puerta (id_puerta, estado, fecha_hora),
  CONSTRAINT fk_lec_puerta FOREIGN KEY (id_puerta) REFERENCES puerta_acceso (id_puerta)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_lec_movimiento FOREIGN KEY (id_movimiento) REFERENCES movimiento (id_movimiento)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_lec_confianza CHECK (confianza BETWEEN 0 AND 100)
) ENGINE=InnoDB;

CREATE TABLE alerta (
  id_alerta  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo       ENUM('pico_y_placa','ocupacion_alta','incidencia','permanencia_larga','sin_tarifa','lectura_dudosa') NOT NULL,
  mensaje    VARCHAR(200) NOT NULL,
  referencia VARCHAR(40)  NULL,
  fecha      DATETIME     NOT NULL,
  leida      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_alerta),
  KEY idx_alerta_leida (leida, fecha)
) ENGINE=InnoDB;

CREATE TABLE notificacion (
  id_notificacion INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario      INT UNSIGNED NOT NULL,
  tipo            ENUM('reserva','membresia','factura','incidencia','datos') NOT NULL,
  titulo          VARCHAR(80)  NOT NULL,
  mensaje         VARCHAR(300) NOT NULL,
  canal           ENUM('app','correo','ambos') NOT NULL DEFAULT 'app',
  enviada         BOOLEAN      NOT NULL DEFAULT FALSE,
  intentos_envio  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  leida           BOOLEAN      NOT NULL DEFAULT FALSE,
  fecha           DATETIME     NOT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_notificacion),
  KEY idx_notificacion_usuario (id_usuario, leida, fecha),
  CONSTRAINT fk_not_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;
