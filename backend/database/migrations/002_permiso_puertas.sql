-- Fase 2 · Permiso para el CRUD de puertas (solo administrador).
-- Solo hace falta en BD creadas antes de la Fase 2: `npm run db:reset` ya lo incluye.
SET NAMES utf8mb4;

INSERT INTO permisos (codigo, modulo, descripcion)
VALUES ('puertas.gestionar', 'puertas', 'Crear, editar y desactivar puertas de acceso')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p ON p.codigo = 'puertas.gestionar'
 WHERE r.nombre = 'administrador';
