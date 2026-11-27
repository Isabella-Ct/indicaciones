// Páginas de la spec 003: cambiar-contrasena (marco de la app) y registro, recuperar, restablecer
// (plantilla template-auth-layout, igual que login.html).
const fs = require('node:fs');
const path = require('node:path');

module.exports = ({ pagina, icono, destino }) => {
  const campoClave = (id, etiqueta, { autocompletar = 'new-password', pista } = {}) => `<div class="molecule-field">
              <label for="${id}">${etiqueta}<span class="molecule-field-required" aria-hidden="true"> *</span></label>
              <input class="atom-input" id="${id}" type="password" maxlength="64" required autocomplete="${autocompletar}" aria-describedby="${pista ? `${id}-hint ` : ''}${id}-error" />
              ${pista ? `<p class="molecule-field-hint" id="${id}-hint" aria-live="polite">${pista}</p>` : ''}
              <p class="molecule-field-error" id="${id}-error" aria-live="polite"></p>
            </div>`;
  const REGLAS = 'Entre 8 y 64 caracteres, con al menos una letra y un número.';
  const mostrarClaves = (id) => `<label class="molecule-check"><input type="checkbox" id="${id}" />Mostrar contraseñas</label>`;
  const alerta = (id) => `<div class="molecule-alert molecule-alert--error hidden" id="${id}" aria-live="assertive">
              ${icono('i-alert')}<p></p>
            </div>`;

  // ---------------------------------------------------------------- cambiar-contrasena.html
  pagina({
    archivo: 'cambiar-contrasena.html',
    titulo: 'Cambiar contraseña',
    vista: 'cambiar-contrasena.view.js',
    activo: '',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Cambiar contraseña</h1>
            <p>// Defina una contraseña que solo usted conozca</p>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="cambio-titulo">
          <div class="molecule-panel-head"><h2 id="cambio-titulo">Nueva contraseña</h2></div>
          <div class="molecule-panel-body">
            <div class="molecule-alert molecule-alert--info hidden" id="cambio-obligatorio" aria-live="polite">
              ${icono('i-key')}<p>Por seguridad, debe cambiar la contraseña temporal antes de continuar.</p>
            </div>
            <form class="organism-form--stack" id="form-cambio" novalidate>
            ${alerta('cambio-alerta')}
            ${campoClave('cambio-actual', 'Contraseña actual', { autocompletar: 'current-password' })}
            ${campoClave('cambio-nueva', 'Contraseña nueva', { pista: REGLAS })}
            ${campoClave('cambio-confirmacion', 'Confirmar contraseña nueva')}
            ${mostrarClaves('cambio-mostrar')}
            <div class="molecule-panel-actions">
              <button class="atom-button" type="submit" id="cambio-guardar">${icono('i-check')}<span>Cambiar contraseña</span></button>
            </div>
            </form>
          </div>
        </section>`,
  });

  // ---------------------------------------------------------------- páginas públicas de autenticación
  const auth = ({ archivo, titulo, subtitulo, vista, cuerpo }) => {
    const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PARKO · ${titulo}</title>
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
    />
    <link rel="stylesheet" href="/css/estilos.css" />
    <script type="module" src="/js/views/${vista}"></script>
  </head>
  <body>
    <main class="template-auth-layout" id="contenido">
      <section class="molecule-panel template-auth-layout-panel" aria-labelledby="auth-titulo">
        <div class="molecule-panel-head template-auth-layout-head">
          <a class="molecule-brand molecule-brand--link" href="/">
            <span class="atom-brand-mark" aria-hidden="true">P</span>
            <div>PARKO<small>Parking Lot ABC</small></div>
          </a>
        </div>
        <div class="atom-hazard-strip" aria-hidden="true"></div>

        <div class="molecule-panel-body template-auth-layout-body">
          <h1 class="template-auth-layout-title" id="auth-titulo">${titulo}</h1>
          <p class="template-auth-layout-subtitle">${subtitulo}</p>
${cuerpo}
        </div>
      </section>

      <div class="template-auth-layout-foot">
        <p><a class="atom-link" href="/login.html">← Volver al inicio de sesión</a></p>
      </div>
    </main>
  </body>
</html>
`;
    fs.writeFileSync(path.join(destino, archivo), html);
  };

  const tipoDocumento = (id) => `<div class="molecule-field">
              <label for="${id}">Tipo de documento<span class="molecule-field-required" aria-hidden="true"> *</span></label>
              <select class="atom-select" id="${id}" required aria-describedby="${id}-error">
                <option value="CC" selected>Cédula de ciudadanía (CC)</option>
                <option value="CE">Cédula de extranjería (CE)</option>
                <option value="TI">Tarjeta de identidad (TI)</option>
                <option value="PAS">Pasaporte (PAS)</option>
                <option value="NIT">NIT</option>
              </select>
              <p class="molecule-field-error" id="${id}-error" aria-live="polite"></p>
            </div>`;
  const campo = (id, etiqueta, { tipo = 'text', max, extra = '', pista } = {}) => `<div class="molecule-field">
              <label for="${id}">${etiqueta}<span class="molecule-field-required" aria-hidden="true"> *</span></label>
              <input class="atom-input" id="${id}" type="${tipo}"${max ? ` maxlength="${max}"` : ''} required ${extra} aria-describedby="${pista ? `${id}-hint ` : ''}${id}-error" />
              ${pista ? `<p class="molecule-field-hint" id="${id}-hint">${pista}</p>` : ''}
              <p class="molecule-field-error" id="${id}-error" aria-live="polite"></p>
            </div>`;
  const boton = (id, texto, icon = 'i-check') =>
    `<button class="atom-button atom-button--block" type="submit" id="${id}">${icono(icon)}<span>${texto}</span></button>`;

  auth({
    archivo: 'registro.html',
    titulo: 'Crear cuenta',
    subtitulo: '// Regístrese como cliente para reservar y consultar sus servicios',
    vista: 'registro.view.js',
    cuerpo: `          <form class="organism-login-form" id="form-registro" novalidate>
            ${alerta('registro-alerta')}
            ${tipoDocumento('registro-tipo-documento')}
            ${campo('registro-numero-documento', 'Número de documento', { max: 20, extra: 'inputmode="numeric" autocomplete="username"', pista: '5 a 20 dígitos (pasaporte: letras y dígitos).' })}
            ${campo('registro-nombre', 'Nombre completo', { max: 100, extra: 'autocomplete="name"' })}
            ${campo('registro-correo', 'Correo', { tipo: 'email', max: 120, extra: 'autocomplete="email"' })}
            ${campo('registro-celular', 'Celular', { tipo: 'tel', max: 10, extra: 'inputmode="numeric" autocomplete="tel"', pista: '10 dígitos, empieza por 3.' })}
            ${campoClave('registro-contrasena', 'Contraseña', { pista: REGLAS })}
            ${campoClave('registro-confirmacion', 'Confirmar contraseña')}
            ${mostrarClaves('registro-mostrar')}
            <div class="molecule-field">
              <p class="molecule-field-hint" id="aviso-privacidad">
                Aviso de privacidad (Ley 1581 de 2012): Parking Lot ABC trata sus datos personales solo para prestar el
                servicio de parqueadero (identificación, contacto, vehículos, cobros y avisos). Puede consultarlos,
                actualizarlos o pedir su corrección desde Mi perfil o en la caseta.
              </p>
              <label class="molecule-check"><input type="checkbox" id="registro-autorizacion" aria-describedby="aviso-privacidad registro-autorizacion-error" />Autorizo el tratamiento de mis datos personales<span class="molecule-field-required" aria-hidden="true"> *</span></label>
              <p class="molecule-field-error" id="registro-autorizacion-error" aria-live="polite"></p>
            </div>
            ${boton('registro-boton', 'Crear cuenta', 'i-user')}
          </form>`,
  });

  auth({
    archivo: 'recuperar.html',
    titulo: 'Recuperar contraseña',
    subtitulo: '// Le enviaremos un enlace a su correo registrado',
    vista: 'recuperar.view.js',
    cuerpo: `          <form class="organism-login-form" id="form-recuperar" novalidate>
            ${alerta('recuperar-alerta')}
            ${tipoDocumento('recuperar-tipo-documento')}
            ${campo('recuperar-numero-documento', 'Número de documento', { max: 20, extra: 'inputmode="numeric" autocomplete="username" autofocus' })}
            ${boton('recuperar-boton', 'Enviar enlace', 'i-send')}
          </form>`,
  });

  auth({
    archivo: 'restablecer.html',
    titulo: 'Restablecer contraseña',
    subtitulo: '// Defina su nueva contraseña',
    vista: 'restablecer.view.js',
    cuerpo: `          <form class="organism-login-form" id="form-restablecer" novalidate>
            ${alerta('restablecer-alerta')}
            ${campoClave('restablecer-nueva', 'Contraseña nueva', { pista: REGLAS })}
            ${campoClave('restablecer-confirmacion', 'Confirmar contraseña nueva')}
            ${mostrarClaves('restablecer-mostrar')}
            ${boton('restablecer-boton', 'Guardar contraseña', 'i-key')}
            <p class="hidden" id="restablecer-nuevo-enlace"><a class="atom-link" href="/recuperar.html">Solicitar un enlace nuevo</a></p>
          </form>`,
  });
};
