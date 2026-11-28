const r = require('../../src/modules/usuarios/usuarios.reglas');

describe('Reglas puras de usuarios (spec 002 R-02, R-07, R-09)', () => {
  test('normalizarDocumento quita espacios, puntos y guiones; PAS en mayúsculas', () => {
    expect(r.normalizarDocumento('CC', ' 1.020.304-050 ')).toBe('1020304050');
    expect(r.normalizarDocumento('PAS', 'ab 123-45c')).toBe('AB12345C');
  });

  test('normalizarNombre recorta y unifica espacios', () => {
    expect(r.normalizarNombre('  María   Fernanda  Ríos ')).toBe('María Fernanda Ríos');
  });

  test('normalizarCorreo pasa a minúsculas; normalizarCelular quita espacios y guiones', () => {
    expect(r.normalizarCorreo(' ANDREA@Correo.CO ')).toBe('andrea@correo.co');
    expect(r.normalizarCelular('310 456-7890')).toBe('3104567890');
  });

  test('RF-USR-05 generarContrasenaTemporal: 12 caracteres con los 4 tipos y sin ambiguos', () => {
    for (let i = 0; i < 200; i++) {
      const clave = r.generarContrasenaTemporal();
      expect(clave).toHaveLength(12);
      expect(clave).toMatch(/[A-Z]/);
      expect(clave).toMatch(/[a-z]/);
      expect(clave).toMatch(/[2-9]/);
      expect(clave).toMatch(/[*#$%&@!?]/);
      expect(clave).not.toMatch(/[0O1lIo]/);
    }
    expect(r.generarContrasenaTemporal()).not.toBe(r.generarContrasenaTemporal());
  });

  test('RF-USR-11 diferencias solo devuelve los campos que cambiaron', () => {
    const d = r.diferencias(
      { celular: '3101000004', correo: 'a@b.co', idRol: 3 },
      { celular: '3109998877', correo: 'a@b.co', idRol: 4, nombreCompleto: undefined }
    );
    expect(d).toEqual({
      anterior: { celular: '3101000004', idRol: 3 },
      nuevo: { celular: '3109998877', idRol: 4 },
      campos: ['celular', 'idRol'],
    });
    expect(r.diferencias({ a: 1 }, { a: 1 }).campos).toEqual([]);
  });

  test('RF-USR-16 mensajeCambioDatos describe cada cambio', () => {
    const texto = r.mensajeCambioDatos(
      { nombreCompleto: 'Andrea Salcedo', idUsuario: 4 },
      { anterior: { celular: '3101000004' }, nuevo: { celular: '3109998877', foto: true }, campos: ['celular', 'foto'] }
    );
    expect(texto).toBe('Andrea Salcedo (código 4) cambió: celular 3101000004 → 3109998877; foto actualizada.');
  });
});
