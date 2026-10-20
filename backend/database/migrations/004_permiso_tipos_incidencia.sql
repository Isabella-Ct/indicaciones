-- Fase 5 · Permiso para el CRUD de tipos de incidencia (solo administrador).
-- Solo hace falta en BD creadas antes de la Fase 5: `npm run db:reset` ya lo incluye.
SET NAMES utf8mb4;

INSERT INTO permisos (codigo, modulo, descripcion)
VALUES ('incidencias.gestionar_tipos', 'incidencias', 'Crear, editar y desactivar tipos de incidencia')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p ON p.codigo = 'incidencias.gestionar_tipos'
 WHERE r.nombre = 'administrador';
