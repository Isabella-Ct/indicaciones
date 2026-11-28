// Herramienta de desarrollo. Verifica imports/exports de frontend/js y que los ids usados por cada vista existan en su HTML.
// Uso (desde la raíz del repo): node herramientas/verificar-front.js "$(pwd)/frontend"
const fs = require('node:fs');
const path = require('node:path');

const raiz = process.argv[2];
const archivos = [];
(function recorrer(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) recorrer(p);
    else if (p.endsWith('.js')) archivos.push(p);
  }
})(path.join(raiz, 'js'));

let fallas = 0;
const exportsDe = (archivo) => {
  const t = fs.readFileSync(archivo, 'utf8');
  return new Set([...t.matchAll(/export\s+(?:async\s+)?(?:function|const|class|let)\s+([\w$]+)/g)].map((m) => m[1]));
};

for (const a of archivos) {
  const t = fs.readFileSync(a, 'utf8');
  for (const m of t.matchAll(/import\s*\{([^}]+)\}\s*from\s*'(\.[^']+)'/g)) {
    const destino = path.join(path.dirname(a), m[2]);
    if (!fs.existsSync(destino)) {
      console.log('IMPORT ROTO', a, m[2]);
      fallas++;
      continue;
    }
    const disponibles = exportsDe(destino);
    for (const nombre of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
      if (!disponibles.has(nombre)) {
        console.log('EXPORT FALTA', path.basename(a), nombre, m[2]);
        fallas++;
      }
    }
  }
}

const comunes = ['plantillas/marco-app.js', 'organismos/navbar.js', 'moleculas/menu-usuario.js', 'organismos/modal.js', 'moleculas/aviso.js']
  .map((f) => fs.readFileSync(path.join(raiz, 'js', 'components', f), 'utf8'))
  .join('\n');
const pares = {
  'roles.view.js': ['roles.html', true],
  'rol-detalle.view.js': ['rol-detalle.html', true],
  'permisos.view.js': ['permisos.html', true],
  'login.view.js': ['login.html', false],
  'sin-acceso.view.js': ['sin-acceso.html', false],
  'usuarios.view.js': ['usuarios.html', true],
  'usuario-detalle.view.js': ['usuario-detalle.html', true],
  'mi-perfil.view.js': ['mi-perfil.html', true],
  'cambiar-contrasena.view.js': ['cambiar-contrasena.html', true],
  'registro.view.js': ['registro.html', false],
  'recuperar.view.js': ['recuperar.html', false],
  'restablecer.view.js': ['restablecer.html', false],
};
for (const [vista, [html, conMarco]] of Object.entries(pares)) {
  const marcado = fs.readFileSync(path.join(raiz, html), 'utf8');
  let js = fs.readFileSync(path.join(raiz, 'js', 'views', vista), 'utf8');
  if (conMarco) js += comunes;
  const ids = new Set([...js.matchAll(/(?:\$|getElementById|clonar)\('([\w-]+)'\)/g)].map((m) => m[1]));
  for (const id of ids) {
    if (!marcado.includes(`id="${id}"`)) {
      console.log('ID FALTA', html, id);
      fallas++;
    }
  }
}
console.log(fallas ? `FALLAS ${fallas}` : 'TODO_OK');
