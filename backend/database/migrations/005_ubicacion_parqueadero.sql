-- Fase 8 · Ubicación de la sede para el mapa de la página pública (antes estaba en el código).
-- Solo hace falta en BD creadas antes de la Fase 8: `npm run db:reset` ya lo incluye.
SET NAMES utf8mb4;

ALTER TABLE parqueaderos
  ADD COLUMN latitud DECIMAL(9,6) NULL AFTER horario,
  ADD COLUMN longitud DECIMAL(9,6) NULL AFTER latitud;

-- Carrera 43 # 47-53, Medellín (aproximada; ajústela si hace falta).
UPDATE parqueaderos SET latitud = 6.2462, longitud = -75.5617 WHERE id = 1;
