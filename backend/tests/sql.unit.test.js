// Ayudas de SQL compartidas por los repositorios.
const { escaparLike, nombreCompleto } = require('../src/utils/sql');

test('escaparLike escapa %, _ y la barra invertida para usarlos en LIKE ?', () => {
  expect(escaparLike('50%_a\\b')).toBe('50\\%\\_a\\\\b');
  expect(escaparLike('ABC123')).toBe('ABC123');
});

test('nombreCompleto arma el CONCAT_WS con el alias dado', () => {
  expect(nombreCompleto('u')).toBe(
    "CONCAT_WS(' ', u.primer_nombre, u.segundo_nombre, u.primer_apellido, u.segundo_apellido)"
  );
});
