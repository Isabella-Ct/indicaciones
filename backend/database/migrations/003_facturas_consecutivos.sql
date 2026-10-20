-- Fase 4 · Facturación
-- - facturas.tarifa_id y facturas.detalle_calculo (JSON): el PDF de una factura
--   no cambia aunque después cambie la tarifa.
-- - consecutivos: número de factura sin huecos y seguro ante pagos simultáneos.
-- Solo para BD creadas antes de la Fase 4: `npm run db:reset` ya lo incluye.
SET NAMES utf8mb4;

ALTER TABLE facturas
  ADD COLUMN tarifa_id INT NULL AFTER observacion,
  ADD COLUMN detalle_calculo JSON NULL AFTER tarifa_id,
  ADD CONSTRAINT fk_facturas_tarifa FOREIGN KEY (tarifa_id) REFERENCES tarifas (id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS consecutivos (
  nombre VARCHAR(30) PRIMARY KEY,
  ultimo INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Continúa desde el número más alto ya emitido (FAC-000118 → 118).
INSERT INTO consecutivos (nombre, ultimo)
SELECT 'factura', COALESCE(MAX(CAST(SUBSTRING(numero, 5) AS UNSIGNED)), 0) FROM facturas
ON DUPLICATE KEY UPDATE ultimo = VALUES(ultimo);
