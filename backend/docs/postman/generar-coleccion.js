/**
 * Genera la colección Postman v2.1 (parqueadero.postman_collection.json) a partir de las carpetas
 * de casos por spec (casos/*.js). Cada endpoint tiene al menos un caso de éxito y uno de error
 * (RNF-CAL-03, rúbrica C8). Ejecutar: node docs/postman/generar-coleccion.js
 * Luego, con el servidor en marcha: npm run test:api (Newman).
 */
const fs = require('node:fs');
const path = require('node:path');

const CARPETA_CASOS = path.join(__dirname, 'casos');
const DESTINO = path.join(__dirname, 'parqueadero.postman_collection.json');

// Antes de cada petición: inicia sesión una vez por rol y guarda los tokens en variables.
const PRE_REQUEST = `
const usuarios = {
  tokenAdmin: { tipoDocumento: 'CC', numeroDocumento: '1000000001', contrasena: 'Admin2026*' },
  tokenOperador: { tipoDocumento: 'CC', numeroDocumento: '1000000002', contrasena: 'Operador2026*' },
  tokenCliente: { tipoDocumento: 'CC', numeroDocumento: '1000000004', contrasena: 'Cliente2026*' },
};
Object.entries(usuarios).forEach(([variable, credenciales]) => {
  if (pm.collectionVariables.get(variable)) return;
  pm.sendRequest({
    url: pm.environment.get('baseUrl') + '/auth/login',
    method: 'POST',
    header: { 'Content-Type': 'application/json' },
    body: { mode: 'raw', raw: JSON.stringify(credenciales) },
  }, (err, res) => {
    if (!err && res.code === 200) pm.collectionVariables.set(variable, res.json().data.token);
  });
});
`.trim();

function script(lineas) {
  return { type: 'text/javascript', exec: lineas.split('\n') };
}

/** Pruebas comunes: status, sobre { ok } y code de error esperado. */
function pruebas(caso) {
  const lineas = [
    `pm.test('HTTP ${caso.status}', () => pm.response.to.have.status(${caso.status}));`,
  ];
  if (caso.status !== 204 && !caso.binario) {
    lineas.push(
      "const cuerpo = pm.response.json();",
      `pm.test('sobre ok=${caso.status < 400}', () => pm.expect(cuerpo.ok).to.eql(${caso.status < 400}));`
    );
    if (caso.code) {
      lineas.push(`pm.test('code ${caso.code}', () => pm.expect(cuerpo.error.code).to.eql('${caso.code}'));`);
    }
  }
  for (const extra of caso.pruebas ?? []) lineas.push(extra);
  for (const [variable, expresion] of Object.entries(caso.guardar ?? {})) {
    lineas.push(`pm.collectionVariables.set('${variable}', ${expresion});`);
  }
  return script(lineas.join('\n'));
}

function peticion(caso) {
  const [ruta, consulta] = caso.ruta.split('?');
  const segmentos = ruta.split('/').filter(Boolean);
  const url = {
    raw: `{{baseUrl}}${caso.ruta}`,
    host: ['{{baseUrl}}'],
    path: segmentos,
  };
  if (consulta) {
    url.query = consulta.split('&').map((par) => {
      const [key, value = ''] = par.split('=');
      return { key, value };
    });
  }
  const header = [{ key: 'Accept', value: 'application/json' }];
  if (caso.token) header.push({ key: 'Authorization', value: `Bearer {{${caso.token}}}` });
  const request = { method: caso.metodo, header, url };
  if (caso.formdata) {
    // multipart/form-data (fotos): Newman resuelve `src` desde la carpeta backend/.
    request.body = {
      mode: 'formdata',
      formdata: caso.formdata.map((c) =>
        c.src ? { key: c.key, type: 'file', src: c.src } : { key: c.key, value: String(c.value), type: 'text' }
      ),
    };
  } else if (caso.body !== undefined) {
    header.push({ key: 'Content-Type', value: 'application/json' });
    request.body = {
      mode: 'raw',
      raw: typeof caso.body === 'string' ? caso.body : JSON.stringify(caso.body, null, 2),
    };
  }
  return { name: caso.nombre, event: [{ listen: 'test', script: pruebas(caso) }], request };
}

function generar() {
  const carpetas = fs
    .readdirSync(CARPETA_CASOS)
    .filter((f) => f.endsWith('.js'))
    .sort()
    .map((archivo) => require(path.join(CARPETA_CASOS, archivo)));

  const coleccion = {
    info: {
      name: 'Parking Lot ABC · API v1',
      description:
        'Colección por spec (carpeta NNN). Cada endpoint con caso de éxito y de error (RNF-CAL-03). ' +
        'Generada por docs/postman/generar-coleccion.js. Requiere la BD recién sembrada (npm run db:reset).',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    event: [{ listen: 'prerequest', script: script(PRE_REQUEST) }],
    variable: [
      { key: 'tokenAdmin', value: '' },
      { key: 'tokenOperador', value: '' },
      { key: 'tokenCliente', value: '' },
    ],
    item: carpetas.map((c) => ({ name: c.nombre, description: c.descripcion, item: c.casos.map(peticion) })),
  };
  fs.writeFileSync(DESTINO, `${JSON.stringify(coleccion, null, 2)}\n`);
  return carpetas.reduce((n, c) => n + c.casos.length, 0);
}

if (require.main === module) console.log(`Colección generada: ${generar()} peticiones`);

module.exports = { generar };
