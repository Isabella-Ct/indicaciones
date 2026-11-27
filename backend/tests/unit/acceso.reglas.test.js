const { generarTokenRecuperacion, hashToken, contrasenaCumple } = require('../../src/modules/auth/auth.reglas');

describe('Reglas puras de acceso (spec 003 R-03, R-04)', () => {
  test('RN-08 el token de recuperación tiene 64 caracteres hexadecimales y no se repite', () => {
    const a = generarTokenRecuperacion();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(generarTokenRecuperacion()).not.toBe(a);
  });

  test('RNF-SEG-02 hashToken es SHA-256 determinista y distinto del token', () => {
    const token = 'a'.repeat(64);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toBe(token);
  });

  test.each([
    ['Clave2026', true],
    ['ñandú2026', true],
    ['12345678', false],
    ['soloLetras', false],
    ['Ab1', false],
    [`A1${'x'.repeat(63)}`, false],
    [`A1${'x'.repeat(62)}`, true],
  ])('contrasenaCumple(%s) = %s', (texto, esperado) => {
    expect(contrasenaCumple(texto)).toBe(esperado);
  });
});
