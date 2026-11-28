const express = require('express');
const request = require('supertest');
const { subirFoto, tipoPorFirma } = require('../../src/middlewares/subir-foto');
const { errorHandler } = require('../../src/middlewares/error-handler');

// PNG mínimo válido (1×1) y JPG con firma FF D8 FF.
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
    '1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082',
  'hex'
);
// Firma JPG + bytes aleatorios (un buffer de puros ceros rompe el multipart del cliente de pruebas).
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), require('node:crypto').randomBytes(64)]);
const GIF = Buffer.from('GIF89a', 'ascii');

const app = express();
app.post('/subir', subirFoto, (req, res) => res.json({ ok: true, data: req.foto ? { ext: req.foto.ext } : null }));
app.use(errorHandler);

describe('Middleware subirFoto (RNF-PRI-03)', () => {
  test('tipoPorFirma reconoce JPG y PNG por su contenido', () => {
    expect(tipoPorFirma(PNG)).toEqual({ ext: 'png', mime: 'image/png' });
    expect(tipoPorFirma(JPG)).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
    expect(tipoPorFirma(GIF)).toBeNull();
  });

  test.each([
    ['PNG', PNG, 'foto.png', 'png'],
    ['JPG', JPG, 'foto.jpg', 'jpg'],
  ])('acepta %s válido', async (_n, buffer, nombre, ext) => {
    const res = await request(app).post('/subir').attach('foto', buffer, nombre);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ ext });
  });

  test('sin archivo deja req.foto vacío y JSON pasa sin tocar', async () => {
    expect((await request(app).post('/subir').field('a', '1')).body.data).toBeNull();
    expect((await request(app).post('/subir').send({ a: 1 })).body.data).toBeNull();
  });

  test('rechaza GIF y un PNG falso (extensión .png con otro contenido) con 422', async () => {
    for (const [buffer, nombre] of [
      [GIF, 'foto.gif'],
      [Buffer.from('no soy una imagen'), 'foto.png'],
    ]) {
      const res = await request(app).post('/subir').attach('foto', buffer, nombre);
      expect(res.status).toBe(422);
      expect(res.body.error.details).toEqual([{ campo: 'foto', mensaje: 'La foto debe ser JPG o PNG.' }]);
    }
  });

  test('rechaza archivos de más de 2 MB con 422', async () => {
    const grande = Buffer.concat([PNG, require('node:crypto').randomBytes(2 * 1024 * 1024)]);
    const res = await request(app).post('/subir').attach('foto', grande, 'grande.png');
    expect(res.status).toBe(422);
    expect(res.body.error.details[0]).toEqual({ campo: 'foto', mensaje: 'La foto supera 2 MB.' });
  });
});
