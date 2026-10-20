// Funciones puras de la Fase 3 (sin base de datos).
const {
  evaluarRestriccion,
  digitoDeRestriccion,
} = require('../src/modules/pico-placa/pico-placa.evaluador');
const { elegirCelda } = require('../src/modules/estadias/estadias.asignacion');
const { minutosEntre, formatearDuracion } = require('../src/utils/fechas');

// Jueves 15 de octubre de 2026 (dia_semana = 4) en hora de Bogotá (UTC-5).
const jueves = (hora) => new Date(`2026-10-15T${hora}:00-05:00`);
const sabado = (hora) => new Date(`2026-10-17T${hora}:00-05:00`);

const regla = (extra) => ({
  id: 1,
  tipo_vehiculo: 'carro',
  dia_semana: 4,
  digito: 5,
  hora_inicio: '05:00:00',
  hora_fin: '20:00:00',
  activa: 1,
  ...extra,
});

describe('evaluarRestriccion (pico y placa)', () => {
  test('carro restringido por su último dígito', () => {
    const r = evaluarRestriccion('KLM205', 'carro', jueves('10:00'), [regla()]);
    expect(r).toMatchObject({ restringido: true, digito: 5, diaSemana: 4 });
    expect(r.regla.id).toBe(1);
  });

  test('carro con otro último dígito no está restringido', () => {
    expect(evaluarRestriccion('KLM256', 'carro', jueves('10:00'), [regla()]).restringido).toBe(
      false
    );
  });

  test('moto restringida por su primer dígito numérico', () => {
    const reglas = [regla({ id: 2, tipo_vehiculo: 'moto', digito: 5 })];
    expect(evaluarRestriccion('ABC59D', 'moto', jueves('10:00'), reglas).restringido).toBe(true);
    // Termina en 5 pero su primer dígito es 4: no aplica a motos.
    expect(evaluarRestriccion('ABC45D', 'moto', jueves('10:00'), reglas).restringido).toBe(false);
  });

  test('fuera del horario no hay restricción (fin exclusivo)', () => {
    expect(evaluarRestriccion('KLM205', 'carro', jueves('04:59'), [regla()]).restringido).toBe(
      false
    );
    expect(evaluarRestriccion('KLM205', 'carro', jueves('20:00'), [regla()]).restringido).toBe(
      false
    );
    expect(evaluarRestriccion('KLM205', 'carro', jueves('19:59'), [regla()]).restringido).toBe(
      true
    );
  });

  test('día sin regla', () => {
    expect(evaluarRestriccion('KLM205', 'carro', sabado('10:00'), [regla()]).restringido).toBe(
      false
    );
  });

  test('regla inactiva no restringe', () => {
    expect(
      evaluarRestriccion('KLM205', 'carro', jueves('10:00'), [regla({ activa: 0 })]).restringido
    ).toBe(false);
  });

  test('una regla de carros no afecta a motos con el mismo dígito', () => {
    expect(evaluarRestriccion('ABC55D', 'moto', jueves('10:00'), [regla()]).restringido).toBe(
      false
    );
  });

  test('dígito de restricción según el tipo', () => {
    expect(digitoDeRestriccion('ABC123', 'carro')).toBe(3);
    expect(digitoDeRestriccion('XKP45F', 'moto')).toBe(4);
  });
});

describe('elegirCelda (prioridad de celdas accesibles)', () => {
  const A01 = { id: 1, codigo: 'A-01', es_accesible: 1 };
  const A02 = { id: 2, codigo: 'A-02', es_accesible: 0 };
  const A03 = { id: 3, codigo: 'A-03', es_accesible: 0 };

  test('sin accesibilidad: primera celda normal libre', () => {
    expect(elegirCelda({ libres: [A01, A02, A03] }).codigo).toBe('A-02');
  });

  test('quien requiere accesible recibe la accesible', () => {
    expect(elegirCelda({ libres: [A01, A02], requiereAccesible: true }).codigo).toBe('A-01');
  });

  test('solo queda la accesible: exige confirmación del operador', () => {
    expect(() => elegirCelda({ libres: [A01] })).toThrow(
      expect.objectContaining({ codigo: 'CONFIRMAR_ACCESIBLE' })
    );
    expect(elegirCelda({ libres: [A01], confirmarAccesible: true }).codigo).toBe('A-01');
  });

  test('pedir una accesible habiendo otras libres → CELDA_ACCESIBLE', () => {
    expect(() => elegirCelda({ libres: [A01, A02], solicitadaId: 1 })).toThrow(
      expect.objectContaining({ codigo: 'CELDA_ACCESIBLE' })
    );
  });

  test('sin celdas libres → SIN_CUPO', () => {
    expect(() => elegirCelda({ libres: [] })).toThrow(
      expect.objectContaining({ codigo: 'SIN_CUPO', estado: 409 })
    );
  });
});

describe('tiempo de estadía', () => {
  test('minutos completos entre entrada y salida (16:05 → 18:42 = 157)', () => {
    expect(minutosEntre(jueves('16:05'), new Date(jueves('18:42').getTime() + 59 * 1000))).toBe(
      157
    );
    expect(formatearDuracion(157)).toBe('2 h 37 min');
    expect(formatearDuracion(45)).toBe('45 min');
    expect(formatearDuracion(1500)).toBe('1 d 1 h 0 min');
  });
});
