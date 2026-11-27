const {
  normalizarNombre,
  esRenombre,
  faltanProtegidos,
  agruparPorModulo,
} = require('../../src/modules/roles/roles.reglas');
const { PERMISOS_PROTEGIDOS_ADMIN } = require('../../src/config/constantes');

describe('Reglas puras de roles (spec 001)', () => {
  test('RF-ROL-05 normalizarNombre recorta y pasa a minúsculas', () => {
    expect(normalizarNombre('  Supervisor ')).toBe('supervisor');
    expect(normalizarNombre('OPERADOR')).toBe('operador');
  });

  test('RF-ROL-03 esRenombre ignora mayúsculas y espacios extremos', () => {
    expect(esRenombre('Operador', ' operador ')).toBe(false);
    expect(esRenombre('Operador', 'Operario')).toBe(true);
  });

  test('RF-ROL-11 faltanProtegidos detecta los 8 permisos de gestión', () => {
    expect(faltanProtegidos(PERMISOS_PROTEGIDOS_ADMIN)).toEqual([]);
    expect(faltanProtegidos([...PERMISOS_PROTEGIDOS_ADMIN, 'reportes.ver'])).toEqual([]);
    const sinEditar = PERMISOS_PROTEGIDOS_ADMIN.filter((c) => c !== 'roles.editar');
    expect(faltanProtegidos(sinEditar)).toEqual(['roles.editar']);
    expect(faltanProtegidos([])).toHaveLength(8);
  });

  test('RF-ROL-08/15 agruparPorModulo conserva el orden del catálogo', () => {
    const grupos = agruparPorModulo([
      { idPermiso: 1, modulo: 'roles', codigo: 'roles.ver', accion: 'ver', descripcion: 'a' },
      { idPermiso: 5, modulo: 'usuarios', codigo: 'usuarios.ver', accion: 'ver', descripcion: 'b' },
      { idPermiso: 2, modulo: 'roles', codigo: 'roles.crear', accion: 'crear', descripcion: 'c' },
    ]);
    expect(grupos.map((g) => g.modulo)).toEqual(['roles', 'usuarios']);
    expect(grupos[0].permisos.map((p) => p.codigo)).toEqual(['roles.ver', 'roles.crear']);
    expect(grupos[0].permisos[0]).toEqual({
      idPermiso: 1,
      codigo: 'roles.ver',
      accion: 'ver',
      descripcion: 'a',
    });
  });
});
