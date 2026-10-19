/**
 * Mi cuenta (todos los roles) — REQ-USR-4: editar mis nombres, correo, celular y
 * foto (notifica a los administradores) y cambiar mi contraseña. Los clientes
 * ven además "Mis vehículos" en solo lectura.
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import {
  limpiarErrores,
  mostrarErrorApi,
  marcarError,
  PATRON_CELULAR,
  PATRON_CORREO,
} from './comun/formularios.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createField } from '../components/molecules/field/field.js';
import { createAlert, setAlert } from '../components/molecules/alert/alert.js';
import { createPhotoInput } from '../components/molecules/photo-input/photo-input.js';
import { createDataList } from '../components/molecules/data-list/data-list.js';
import { showToast } from '../components/molecules/toast/toast.js';
import { createDataTable } from '../components/organisms/data-table/data-table.js';
import { createButton, setButtonLoading } from '../components/atoms/button/button.js';
import { createInput } from '../components/atoms/input/input.js';
import { createPlate } from '../components/atoms/plate/plate.js';
import {
  obtenerMiPerfil,
  actualizarMiPerfil,
  listarMisVehiculos,
} from '../services/usuarios.service.js';
import { cambiarContrasena } from '../services/auth.service.js';
import { guardarAviso } from '../utils/almacen.js';
import { etiquetaRol, tienePermiso } from '../utils/sesion.js';

function panelMisDatos(perfil, sesion) {
  const control = {
    primer_nombre: createInput({
      name: 'primer_nombre',
      value: perfil.primer_nombre,
      maxLength: 60,
      autocomplete: 'given-name',
    }),
    segundo_nombre: createInput({
      name: 'segundo_nombre',
      value: perfil.segundo_nombre,
      maxLength: 60,
    }),
    primer_apellido: createInput({
      name: 'primer_apellido',
      value: perfil.primer_apellido,
      maxLength: 60,
      autocomplete: 'family-name',
    }),
    segundo_apellido: createInput({
      name: 'segundo_apellido',
      value: perfil.segundo_apellido,
      maxLength: 60,
    }),
    correo: createInput({
      name: 'correo',
      type: 'email',
      value: perfil.correo,
      maxLength: 120,
      autocomplete: 'email',
    }),
    celular: createInput({
      name: 'celular',
      type: 'tel',
      inputMode: 'numeric',
      value: perfil.celular,
      maxLength: 10,
      autocomplete: 'tel',
    }),
  };
  const campos = {
    primer_nombre: createField({
      label: 'Primer nombre',
      control: control.primer_nombre,
      required: true,
    }),
    segundo_nombre: createField({ label: 'Segundo nombre', control: control.segundo_nombre }),
    primer_apellido: createField({
      label: 'Primer apellido',
      control: control.primer_apellido,
      required: true,
    }),
    segundo_apellido: createField({ label: 'Segundo apellido', control: control.segundo_apellido }),
    correo: createField({ label: 'Correo electrónico', control: control.correo, required: true }),
    celular: createField({
      label: 'Celular',
      control: control.celular,
      required: true,
      hint: '10 dígitos, empieza por 3.',
    }),
    foto: createPhotoInput({
      label: 'Mi foto',
      fotoUrl: perfil.foto_url,
      nombre: perfil.nombre_completo,
    }),
  };
  const alerta = createAlert();
  const guardar = createButton({ label: 'Guardar mis datos', type: 'submit', icon: 'i-check' });
  const formulario = el('form', { className: 'stack', attrs: { novalidate: true } }, [
    createDataList({
      items: [
        { term: 'Código', value: String(perfil.id).padStart(5, '0') },
        { term: 'Documento', value: `${perfil.tipo_documento} ${perfil.numero_documento}` },
        { term: 'Tipo de usuario', value: etiquetaRol(perfil.rol) },
        { term: 'Estado', value: perfil.estado === 'activo' ? 'Activo' : 'Inactivo' },
      ],
    }),
    el('p', {
      className: 'field-hint',
      text:
        sesion.rol === 'administrador'
          ? 'El documento y el rol se cambian desde Usuarios.'
          : 'El documento, el rol y el estado solo los cambia el administrador. Al guardar, se le notificará el cambio.',
    }),
    alerta,
    el('div', { className: 'form-grid' }, Object.values(campos)),
    el('div', {}, [guardar]),
  ]);

  function validar() {
    let ok = true;
    for (const nombre of ['primer_nombre', 'primer_apellido', 'correo', 'celular']) {
      if (!control[nombre].value.trim())
        ok = marcarError(campos[nombre], 'Este campo es obligatorio.');
    }
    if (control.correo.value.trim() && !PATRON_CORREO.test(control.correo.value.trim())) {
      ok = marcarError(campos.correo, 'Escribe un correo válido.');
    }
    if (control.celular.value.trim() && !PATRON_CELULAR.test(control.celular.value.trim())) {
      ok = marcarError(campos.celular, 'Celular de 10 dígitos que empieza por 3.');
    }
    return ok;
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limpiarErrores(campos, alerta);
    if (!validar()) {
      formulario.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setButtonLoading(guardar, true, 'Guardando…');
    try {
      const { meta } = await actualizarMiPerfil(new FormData(formulario));
      if (meta.campos_cambiados.length === 0) {
        setButtonLoading(guardar, false);
        setAlert(alerta, 'No hiciste cambios.', 'info');
        return;
      }
      // Se recarga para que el header muestre el nombre y la foto nuevos.
      guardarAviso(
        sesion.rol === 'administrador'
          ? 'Tus datos se actualizaron.'
          : 'Tus datos se actualizaron y se notificó al administrador.',
        'success'
      );
      location.reload();
    } catch (error) {
      setButtonLoading(guardar, false);
      mostrarErrorApi(error, campos, alerta);
    }
  });

  return createPanel({ title: 'Mis datos', children: [formulario] });
}

function panelContrasena() {
  const control = {
    contrasena_actual: createInput({
      type: 'password',
      autocomplete: 'current-password',
      maxLength: 72,
    }),
    contrasena_nueva: createInput({
      type: 'password',
      autocomplete: 'new-password',
      maxLength: 72,
    }),
    confirmacion: createInput({ type: 'password', autocomplete: 'new-password', maxLength: 72 }),
  };
  const campos = {
    contrasena_actual: createField({
      label: 'Contraseña actual',
      control: control.contrasena_actual,
      required: true,
    }),
    contrasena_nueva: createField({
      label: 'Nueva contraseña',
      control: control.contrasena_nueva,
      required: true,
      hint: 'Mínimo 8 caracteres.',
    }),
    confirmacion: createField({
      label: 'Repite la nueva contraseña',
      control: control.confirmacion,
      required: true,
    }),
  };
  const alerta = createAlert();
  const guardar = createButton({ label: 'Cambiar contraseña', type: 'submit', icon: 'i-key' });
  const formulario = el('form', { className: 'stack', attrs: { novalidate: true } }, [
    alerta,
    ...Object.values(campos),
    el('div', {}, [guardar]),
  ]);

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limpiarErrores(campos, alerta);
    let ok = true;
    if (!control.contrasena_actual.value)
      ok = marcarError(campos.contrasena_actual, 'Escribe tu contraseña actual.');
    if (control.contrasena_nueva.value.length < 8)
      ok = marcarError(campos.contrasena_nueva, 'Mínimo 8 caracteres.');
    if (control.confirmacion.value !== control.contrasena_nueva.value)
      ok = marcarError(campos.confirmacion, 'Las contraseñas no coinciden.');
    if (!ok) return formulario.querySelector('[aria-invalid="true"]')?.focus();

    setButtonLoading(guardar, true, 'Guardando…');
    try {
      await cambiarContrasena({
        contrasena_actual: control.contrasena_actual.value,
        contrasena_nueva: control.contrasena_nueva.value,
      });
      formulario.reset();
      setAlert(alerta, 'Tu contraseña se cambió correctamente.', 'success');
      showToast('Contraseña actualizada.', 'success');
    } catch (error) {
      mostrarErrorApi(error, campos, alerta);
    } finally {
      setButtonLoading(guardar, false);
    }
  });

  return createPanel({ title: 'Cambiar contraseña', children: [formulario] });
}

async function panelMisVehiculos() {
  let vehiculos = [];
  try {
    vehiculos = await listarMisVehiculos();
  } catch (error) {
    showToast(error.message, 'error');
  }
  return el('div', { className: 'page-grid-full' }, [
    createPanel({
      title: 'Mis vehículos',
      children: [
        createDataTable({
          caption: 'Mis vehículos',
          minWidth: 520,
          rows: vehiculos,
          empty: {
            title: 'Sin vehículos',
            text: 'No tienes vehículos registrados. Acércate a la caseta para registrarlos.',
          },
          columns: [
            { key: 'placa', label: 'Placa', render: (v) => createPlate({ placa: v.placa }) },
            { key: 'tipo', label: 'Tipo', render: (v) => (v.tipo === 'moto' ? 'Moto' : 'Carro') },
            {
              key: 'marca',
              label: 'Marca y modelo',
              render: (v) => `${v.marca ?? ''} ${v.modelo ?? ''}`.trim(),
            },
            { key: 'color', label: 'Color' },
          ],
        }),
      ],
    }),
  ]);
}

async function iniciar() {
  const app = await montarApp({
    paginaId: 'mi-cuenta',
    cabecera: (sesion) => ({
      titulo: 'Mi cuenta',
      subtitulo: `${etiquetaRol(sesion.rol)} · ${sesion.tipo_documento} ${sesion.numero_documento}`,
    }),
  });
  if (!app) return;
  const perfil = await obtenerMiPerfil();
  const paneles = [panelMisDatos(perfil, app.sesion), panelContrasena()];
  if (tienePermiso(app.sesion, 'portal.ver')) paneles.push(await panelMisVehiculos());
  app.main.append(el('div', { className: 'page-grid' }, paneles));
}

iniciar();
