const { enviarCorreo, bandejaMemoria, vaciarBandeja, usarTransporte } = require('../../src/integrations/correo');

describe('Adaptador de correo (spec 002 research R-01)', () => {
  afterEach(() => {
    usarTransporte(undefined);
    vaciarBandeja();
  });

  test('con el transporte «memoria» el correo queda en la bandeja y devuelve true', async () => {
    const enviado = await enviarCorreo({ para: 'a@b.co', asunto: 'Hola', texto: 'Cuerpo' });
    expect(enviado).toBe(true);
    expect(bandejaMemoria()).toEqual([expect.objectContaining({ para: 'a@b.co', asunto: 'Hola', texto: 'Cuerpo' })]);
  });

  test('si el transporte falla devuelve false sin lanzar', async () => {
    usarTransporte({ sendMail: () => Promise.reject(new Error('SMTP caído')) });
    await expect(enviarCorreo({ para: 'a@b.co', asunto: 'x', texto: 'y' })).resolves.toBe(false);
    expect(bandejaMemoria()).toHaveLength(0);
  });
});
