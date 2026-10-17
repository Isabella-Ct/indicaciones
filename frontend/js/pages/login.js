/**
 * Página de inicio de sesión — REQ-USR-7, REQ-USR-8 [AJUSTADO]:
 * tipo + número de documento + contraseña para todos los roles.
 */
import { el } from '../utils/dom.js';
import { createAuthLayout } from '../components/templates/auth-layout/auth-layout.js';
import { createField, setFieldError } from '../components/molecules/field/field.js';
import { createCheck } from '../components/molecules/check/check.js';
import { createAlert, setAlert } from '../components/molecules/alert/alert.js';
import { createSelect } from '../components/atoms/select/select.js';
import { createInput } from '../components/atoms/input/input.js';
import { createButton, setButtonLoading } from '../components/atoms/button/button.js';
import { createLink } from '../components/atoms/link/link.js';
import { iniciarSesion, obtenerSesion } from '../services/auth.service.js';
import { obtenerSede, subtituloSede } from '../services/parqueadero.service.js';
import {
  TIPOS_DOCUMENTO,
  RUTA_INICIO,
  RUTA_CAMBIAR_CONTRASENA,
  rutaSiguienteSegura,
} from '../utils/sesion.js';

function destino(sesion) {
  if (sesion.debe_cambiar_contrasena) return RUTA_CAMBIAR_CONTRASENA;
  const siguiente = new URLSearchParams(location.search).get('siguiente');
  return rutaSiguienteSegura(siguiente) ?? RUTA_INICIO;
}

async function iniciar() {
  // Si ya hay sesión, no tiene sentido mostrar el formulario.
  try {
    const sesion = await obtenerSesion({ redirigir401: false });
    location.replace(destino(sesion));
    return;
  } catch {
    /* sin sesión: se muestra el formulario */
  }
  const sede = await obtenerSede().catch(() => null);

  const tipo = createSelect({
    id: 'tipo-documento',
    name: 'tipo_documento',
    options: TIPOS_DOCUMENTO,
    value: 'CC',
  });
  const numero = createInput({
    id: 'numero-documento',
    name: 'numero_documento',
    autocomplete: 'username',
    inputMode: 'text',
    maxLength: 20,
  });
  const contrasena = createInput({
    id: 'contrasena',
    name: 'contrasena',
    type: 'password',
    autocomplete: 'current-password',
    maxLength: 72,
  });

  const campos = {
    tipo_documento: createField({ label: 'Tipo de documento', control: tipo, required: true }),
    numero_documento: createField({
      label: 'Número de documento',
      control: numero,
      required: true,
    }),
    contrasena: createField({ label: 'Contraseña', control: contrasena, required: true }),
  };
  const mostrar = createCheck({
    label: 'Mostrar contraseña',
    onChange: (marcado) => (contrasena.type = marcado ? 'text' : 'password'),
  });
  const alerta = createAlert();
  const boton = createButton({ label: 'Ingresar', type: 'submit', block: true, icon: 'i-in' });

  const formulario = el('form', { className: 'auth-form', attrs: { novalidate: true } }, [
    alerta,
    campos.tipo_documento,
    campos.numero_documento,
    campos.contrasena,
    mostrar,
    boton,
  ]);

  function limpiarErrores() {
    setAlert(alerta, '');
    Object.values(campos).forEach((c) => setFieldError(c, ''));
  }

  function validar() {
    let valido = true;
    if (!numero.value.trim()) {
      setFieldError(campos.numero_documento, 'Escribe tu número de documento.');
      valido = false;
    } else if (!/^[A-Za-z0-9]+$/.test(numero.value.trim())) {
      setFieldError(campos.numero_documento, 'Solo letras y números, sin puntos ni espacios.');
      valido = false;
    }
    if (!contrasena.value) {
      setFieldError(campos.contrasena, 'Escribe tu contraseña.');
      valido = false;
    }
    return valido;
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limpiarErrores();
    if (!validar()) {
      formulario.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setButtonLoading(boton, true, 'Ingresando…');
    try {
      const sesion = await iniciarSesion({
        tipo_documento: tipo.value,
        numero_documento: numero.value.trim(),
        contrasena: contrasena.value,
      });
      location.assign(destino(sesion));
    } catch (error) {
      setButtonLoading(boton, false);
      contrasena.value = '';
      if (error.codigo === 'VALIDACION') {
        for (const detalle of error.detalles) {
          if (campos[detalle.campo]) setFieldError(campos[detalle.campo], detalle.mensaje);
        }
      }
      setAlert(alerta, error.message, 'error');
      contrasena.focus();
    }
  });

  const pie = sede
    ? [el('p', { text: `${sede.direccion}, ${sede.ciudad} · ${sede.horario}` })]
    : [];
  pie.push(el('p', {}, [createLink({ href: '/', text: '← Volver a la página principal' })]));

  document.getElementById('app').replaceChildren(
    createAuthLayout({
      sede: subtituloSede(sede),
      title: 'Iniciar sesión',
      subtitle: 'Ingresa con tu documento y contraseña',
      content: [formulario],
      foot: pie,
    })
  );
  numero.focus();
}

iniciar();
