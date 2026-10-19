-- Fase 1 · Permisos de usuarios
-- usuarios.ver queda solo para el administrador (listado completo) y se crea
-- usuarios.buscar (administrador + operador) para el buscador de clientes al
-- asignar vehículos. Solo hace falta en BD creadas antes de la Fase 1:
-- `npm run db:reset` ya incluye estos cambios.
SET NAMES utf8mb4;

DELETE rp FROM roles_permisos rp
  JOIN permisos p ON p.id = rp.permiso_id
  JOIN roles r ON r.id = rp.rol_id
 WHERE p.codigo = 'usuarios.ver' AND r.nombre = 'operador';

UPDATE permisos SET descripcion = 'Consultar el listado completo de usuarios'
 WHERE codigo = 'usuarios.ver';

INSERT INTO permisos (codigo, modulo, descripcion)
VALUES ('usuarios.buscar', 'usuarios', 'Buscar clientes por documento (asignar vehículos)')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p ON p.codigo = 'usuarios.buscar'
 WHERE r.nombre IN ('administrador', 'operador');
