const { withTransaction } = require('../../src/config/db');
const { siguienteConsecutivo } = require('../../src/utils/consecutivos');

describe('Consecutivos sin huecos (RN-22)', () => {
  test('dos llamadas seguidas dan números consecutivos con prefijo y 6 dígitos', async () => {
    const a = await withTransaction((c) => siguienteConsecutivo(c, 'ticket'));
    const b = await withTransaction((c) => siguienteConsecutivo(c, 'ticket'));
    expect(a).toMatch(/^T-\d{6}$/);
    expect(Number(b.slice(2))).toBe(Number(a.slice(2)) + 1);
  });

  test('si la transacción se revierte, el número no se consume', async () => {
    const antes = await withTransaction((c) => siguienteConsecutivo(c, 'incidencia'));
    await expect(
      withTransaction(async (c) => {
        await siguienteConsecutivo(c, 'incidencia');
        throw new Error('rollback');
      })
    ).rejects.toThrow('rollback');
    const despues = await withTransaction((c) => siguienteConsecutivo(c, 'incidencia'));
    expect(Number(despues.slice(4))).toBe(Number(antes.slice(4)) + 1);
  });

  test('clave inexistente lanza error', async () => {
    await expect(withTransaction((c) => siguienteConsecutivo(c, 'nada'))).rejects.toThrow();
  });
});
