-- Migración 002 · esquema 2.1.0 → 2.2.0 (spec 007-control-ingreso-salida, research R-04 y R-05; ver CAMBIOS.md).
-- Para una BD existente: mysql parqueaderodb < migrations/002_ingresos_rechazados_y_ticket_extraviado.sql
USE parqueaderodb;
SET time_zone = '-05:00';

ALTER TABLE ticket ADD COLUMN extraviado BOOLEAN NOT NULL DEFAULT FALSE AFTER valido;

CREATE TABLE ingreso_rechazado (
  -- [Propuesta] spec 007 R-04: intentos de entrada negados por pico y placa (RF-MOV-02, RF-REP-06)
  id_ingreso_rechazado INT UNSIGNED NOT NULL AUTO_INCREMENT,
  placa                VARCHAR(7)   NOT NULL,
  tipo_vehiculo        ENUM('carro','moto') NOT NULL,
  id_vehiculo          INT UNSIGNED NULL,
  id_puerta            INT UNSIGNED NOT NULL,
  fecha_hora           DATETIME     NOT NULL,
  motivo               VARCHAR(200) NOT NULL,
  id_operador          INT UNSIGNED NOT NULL,
  PRIMARY KEY (id_ingreso_rechazado),
  KEY idx_ingreso_rechazado_fecha (fecha_hora),
  KEY idx_ingreso_rechazado_placa (placa),
  CONSTRAINT fk_rechazo_vehiculo FOREIGN KEY (id_vehiculo) REFERENCES vehiculo (id_vehiculo)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_rechazo_puerta FOREIGN KEY (id_puerta) REFERENCES puerta_acceso (id_puerta)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_rechazo_operador FOREIGN KEY (id_operador) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;
