// Pruebas unitarias de las reglas de membresías (spec 010: RF-MEM-05, RF-MEM-06, RF-MEM-09).
const { finDe, periodoRenovacion, diasRestantes, avisoRenovacion, fechaColombiana } = require('../../src/modules/membresias/membresias.reglas');

test('30 días desde el 16/11 terminan el 15/12; desde el 16/12, el 14/01 (HU-47 E1)', () => {
  expect(finDe('2026-11-16', 30)).toBe('2026-12-15');
  expect(finDe('2026-12-16', 30)).toBe('2027-01-14');
  expect(finDe('2026-01-01', 365)).toBe('2026-12-31');
  expect(finDe('2026-03-10', 1)).toBe('2026-03-10');
});

test('renovación: activa desde el día siguiente al fin; vencida desde hoy', () => {
  expect(periodoRenovacion({ estado: 'activa', fechaFin: '2026-12-15' }, 30, '2026-12-01')).toEqual({ desde: '2026-12-16', hasta: '2027-01-14' });
  expect(periodoRenovacion({ estado: 'vencida', fechaFin: '2026-10-31' }, 30, '2026-11-29')).toEqual({ desde: '2026-11-29', hasta: '2026-12-28' });
});

test('días restantes cuentan el día de fin; 0 si no está activa', () => {
  expect(diasRestantes({ estado: 'activa', fechaFin: '2026-12-15' }, '2026-12-15')).toBe(1);
  expect(diasRestantes({ estado: 'activa', fechaFin: '2026-12-15' }, '2026-11-16')).toBe(30);
  expect(diasRestantes({ estado: 'activa', fechaFin: '2026-12-15' }, '2026-12-20')).toBe(0);
  expect(diasRestantes({ estado: 'cancelada', fechaFin: '2026-12-15' }, '2026-12-01')).toBe(0);
});

test('aviso de renovación con 5 días o menos', () => {
  expect(avisoRenovacion({ estado: 'activa', fechaFin: '2026-12-15' }, '2026-12-11')).toBe(true);
  expect(avisoRenovacion({ estado: 'activa', fechaFin: '2026-12-15' }, '2026-12-10')).toBe(false);
  expect(avisoRenovacion({ estado: 'vencida', fechaFin: '2026-12-15' }, '2026-12-14')).toBe(false);
});

test('fecha colombiana', () => expect(fechaColombiana('2026-12-15')).toBe('15/12/2026'));
