-- Migración 001 · esquema 2.0.0 → 2.1.0 (spec 005-vehiculos, research R-05; ver CAMBIOS.md).
-- Para una BD existente: mysql parqueaderodb < migrations/001_historial_propietario.sql
-- Crea la tabla y abre un periodo para cada vehículo que ya tiene propietario.
USE parqueaderodb;
SET time_zone = '-05:00';

CREATE TABLE historial_propietario (
  -- [Propuesta] spec 005 R-05: periodos de propiedad (RF-VEH-08); un solo periodo abierto por vehículo
  id_historial        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_vehiculo         INT UNSIGNED NOT NULL,
  id_usuario          INT UNSIGNED NOT NULL,
  fecha_desde         DATETIME     NOT NULL,
  fecha_hasta         DATETIME     NULL,
  id_usuario_registro INT UNSIGNED NULL,
  vehiculo_abierto    INT UNSIGNED GENERATED ALWAYS AS (IF(fecha_hasta IS NULL, id_vehiculo, NULL)) STORED,
  PRIMARY KEY (id_historial),
  UNIQUE KEY uq_historial_abierto (vehiculo_abierto),
  KEY idx_historial_vehiculo (id_vehiculo, fecha_desde),
  KEY idx_historial_usuario (id_usuario, fecha_desde),
  CONSTRAINT fk_historial_vehiculo FOREIGN KEY (id_vehiculo) REFERENCES vehiculo (id_vehiculo)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_historial_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_historial_registro FOREIGN KEY (id_usuario_registro) REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_historial_fechas CHECK (fecha_hasta IS NULL OR fecha_hasta >= fecha_desde)
) ENGINE=InnoDB;

INSERT INTO historial_propietario (id_vehiculo, id_usuario, fecha_desde)
SELECT id_vehiculo, id_propietario, created_at FROM vehiculo WHERE id_propietario IS NOT NULL;
