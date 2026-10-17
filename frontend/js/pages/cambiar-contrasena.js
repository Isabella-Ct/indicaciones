/**
 * Cambio de contraseña. Obligatorio en el primer acceso (debe_cambiar_contrasena)
 * y disponible desde el menú de usuario.
 */
import { el } from '../utils/dom.js';
import { createAuthLayout } from '../components/templates/auth-layout/auth-layout.js';
import { createField, setFieldError } from '../components/molecules/field/field.js';
import { createAlert, setAlert } from '../components/molecules/alert/alert.js';
import { createInput } from '../components/atoms/input/input.js';
import { createButton, setButtonLoading } from '../components/atoms/button/button.js';
import { obtenerSesion, cambiarContrasena, cerrarSesion } from '../services/auth.service.js';
import { obtenerSede, subtituloSede } from '../services/parqueadero.service.js';
import { guardarAviso } from '../utils/almacen.js';
import { RUTA_INICIO, RUTA_LOGIN } from '../utils/sesion.js';

const MINIMO = 8;

async function iniciar() {
  const [sesion, sede] = await Promise.all([obtenerSesion(), obtenerSede().catch(() => null)]);
  const obligatorio = sesion.debe_cambiar_contrasena;

  const actual = createInput({
    id: 'contrasena-actual',
    type: 'password',
    autocomplete: 'current-password',
    maxLength: 72,
  });
  const nueva = createInput({
    id: 'contrasena-nueva',
    type: 'password',
    autocomplete: 'new-password',
    maxLength: 72,
  });
  const confirmacion = createInput({
    id: 'contrasena-confirmacion',
    type: 'password',
    autocomplete: 'new-password',
    maxLength: 72,
  });

  const campos = {
    contrasena_actual: createField({
      label: obligatorio ? 'Contraseña temporal' : 'Contraseña actual',
      control: actual,
      required: true,
    }),
    contrasena_nueva: createField({
      label: 'Nueva contraseña',
      control: nueva,
      required: true,
      hint: `Mínimo ${MINIMO} caracteres. Evita tu número de documento.`,
    }),
    confirmacion: createField({
      label: 'Repite la nueva contraseña',
      control: confirmacion,
      required: true,
    }),
  };
  const alerta = createAlert();
  const guardar = createButton({
    label: 'Guardar contraseña',
    type: 'submit',
    block: true,
    icon: 'i-key',
  });
  const secundario = obligatorio
    ? createButton({
        label: 'Cerrar sesión',
        variant: 'ghost',
        block: true,
        onClick: async () => {
          await cerrarSesion().catch(() => {});
          location.assign(RUTA_LOGIN);
        },
      })
    : createButton({ label: 'Volver al inicio', variant: 'ghost', block: true, href: RUTA_INICIO });

  const formulario = el('form', { className: 'auth-form', attrs: { novalidate: true } }, [
    alerta,
    campos.contrasena_actual,
    campos.contrasena_nueva,
    campos.confirmacion,
    guardar,
    secundario,
  ]);

  function validar() {
    let valido = true;
    if (!actual.value) {
      setFieldError(campos.contrasena_actual, 'Escribe tu contraseña actual.');
      valido = false;
    }
    if (nueva.value.length < MINIMO) {
      setFieldError(campos.contrasena_nueva, `Debe tener al menos ${MINIMO} caracteres.`);
      valido = false;
    } else if (nueva.value === actual.value) {
      setFieldError(campos.contrasena_nueva, 'Debe ser distinta de la actual.');
      valido = false;
    }
    if (confirmacion.value !== nueva.value) {
      setFieldError(campos.confirmacion, 'Las contraseñas no coinciden.');
      valido = false;
    }
    return valido;
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    setAlert(alerta, '');
    Object.values(campos).forEach((c) => setFieldError(c, ''));
    if (!validar()) {
      formulario.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setButtonLoading(guardar, true, 'Guardando…');
    try {
      await cambiarContrasena({ contrasena_actual: actual.value, contrasena_nueva: nueva.value });
      guardarAviso('Tu contraseña se actualizó correctamente.', 'success');
      location.assign(RUTA_INICIO);
    } catch (error) {
      setButtonLoading(guardar, false);
      for (const detalle of error.detalles ?? []) {
        if (campos[detalle.campo]) setFieldError(campos[detalle.campo], detalle.mensaje);
      }
      setAlert(alerta, error.message, 'error');
    }
  });

  document.getElementById('app').replaceChildren(
    createAuthLayout({
      sede: subtituloSede(sede),
      title: obligatorio ? 'Crea tu contraseña' : 'Cambiar contraseña',
      subtitle: obligatorio
        ? `Hola, ${sesion.nombres}: tu contraseña es temporal; crea una nueva para continuar`
        : `${sesion.nombre_completo} · ${sesion.tipo_documento} ${sesion.numero_documento}`,
      content: [formulario],
    })
  );
  actual.focus();
}

iniciar();
