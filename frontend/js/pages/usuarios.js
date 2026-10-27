/**
 * Usuarios — REQ-USR-2 (crear: admin y operador), REQ-USR-3 (estado: admin),
 * REQ-USR-5 (editar y restablecer la contraseña: admin). El operador solo ve el formulario de registro.
 * HTML en app/usuarios.html.
 */
import { montarMarco } from './comun/marco-app.js';
import { abrirModal, cerrarModal, confirmar, mostrarAviso } from './comun/dialogos.js';
import {
  llenarSelect,
  ponerChip,
  marcarCampo,
  mostrarAlerta,
  botonCargando,
} from './comun/plantillas.js';
import { conectarTabla, conectarBusqueda } from './comun/tablas.js';
import { conectarFoto } from './comun/foto.js';
import { PATRON_CELULAR, PATRON_CORREO } from './comun/formularios.js';
import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
  restablecerContrasenaUsuario,
} from '../services/usuarios.service.js';
import { listarRoles } from '../services/roles.service.js';
import { etiquetaRol, tienePermiso } from '../utils/sesion.js';

const $ = (id) => document.getElementById(id);
const mostrar = (nodo, visible) => nodo.classList.toggle('hidden', !visible);
const estado = {
  sesion: null,
  roles: [],
  editando: null,
  restableciendo: null,
  filtros: { q: '', rol: '', estado: '', pagina: 1, limite: 20, orden: 'id', dir: 'asc' },
  enfocarOrden: false,
};
const puede = (codigo) => tienePermiso(estado.sesion, codigo);
const codigoUsuario = (id) => String(id).padStart(5, '0');
const iniciales = (nombre = '') =>
  nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');

function generarContrasena() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  const aleatorio = new Uint32Array(8);
  window.crypto.getRandomValues(aleatorio);
  const parte = [...aleatorio.slice(0, 6)].map((n) => letras[n % letras.length]).join('');
  return `Parko-${parte}-${(aleatorio[6] % 90) + 10}`;
}

// ---------------------------------------------------------------------------
// Listado (solo admin)
// ---------------------------------------------------------------------------
const tabla = conectarTabla($('tabla-usuarios'), {
  plantilla: 'tpl-usuario',
  rellenar: (fila, u) => {
    const [codigo, documento, nombre, contacto, rol, chip, acciones] = fila.cells;
    codigo.textContent = codigoUsuario(u.id);
    documento.firstElementChild.textContent = `${u.tipo_documento} ${u.numero_documento}`;
    const [avatar, texto] = nombre.firstElementChild.children;
    const [img, letras] = avatar.children;
    if (u.foto_url) {
      img.src = u.foto_url;
      mostrar(img, true);
      mostrar(letras, false);
    } else letras.textContent = iniciales(u.nombre_completo);
    texto.textContent = u.nombre_completo;
    const [correo, celular] = contacto.firstElementChild.children;
    correo.textContent = u.correo;
    celular.textContent = u.celular;
    ponerChip(rol.firstElementChild, etiquetaRol(u.rol));
    const activo = u.estado === 'activo';
    ponerChip(chip.firstElementChild, activo ? 'Activo' : 'Inactivo', activo ? 'free' : 'neutral');

    const [editar, contrasena, alternar] = acciones.firstElementChild.children;
    const otro = u.id !== estado.sesion.id;
    if (puede('usuarios.editar')) {
      mostrar(editar, true);
      editar.setAttribute('aria-label', `Editar a ${u.nombre_completo}`);
      editar.addEventListener('click', () => abrirFormulario(u, editar));
    }
    if (puede('usuarios.editar') && otro) {
      mostrar(contrasena, true);
      contrasena.setAttribute('aria-label', `Restablecer la contraseña de ${u.nombre_completo}`);
      contrasena.addEventListener('click', () => abrirRestablecer(u, contrasena));
    }
    if (puede('usuarios.cambiar_estado') && otro) {
      mostrar(alternar, true);
      const accion = activo ? 'Inactivar' : 'Activar';
      alternar.querySelector('span').textContent = accion;
      alternar.setAttribute('aria-label', `${accion} a ${u.nombre_completo}`);
      alternar.addEventListener('click', () => alternarEstado(u, alternar));
    }
  },
  onOrden: (clave) => {
    const f = estado.filtros;
    f.dir = f.orden === clave && f.dir === 'asc' ? 'desc' : 'asc';
    f.orden = clave;
    f.pagina = 1;
    estado.enfocarOrden = true;
    recargar();
  },
  onPagina: (pagina) => {
    estado.filtros.pagina = pagina;
    recargar();
  },
});

async function recargar() {
  if (!puede('usuarios.ver')) return pintarRegistroOperador();
  tabla.cargando(true);
  try {
    const { data, meta } = await listarUsuarios(estado.filtros);
    tabla.pintar(data, { meta, orden: { clave: estado.filtros.orden, dir: estado.filtros.dir } });
    if (estado.enfocarOrden) {
      $('tabla-usuarios')
        .querySelector('th[aria-sort="ascending"] button, th[aria-sort="descending"] button')
        ?.focus();
      estado.enfocarOrden = false;
    }
  } catch (error) {
    mostrarAviso(error.message, 'error');
  } finally {
    tabla.cargando(false);
  }
}

/** Vista del operador: solo registro (sin listado, decisión Fase 1). */
function pintarRegistroOperador() {
  const ultimo = estado.ultimoCreado;
  mostrar($('registro-intro'), !ultimo);
  mostrar($('registro-ultimo'), Boolean(ultimo));
  if (!ultimo) return;
  $('ultimo-codigo').textContent = codigoUsuario(ultimo.id);
  $('ultimo-documento').textContent = `${ultimo.tipo_documento} ${ultimo.numero_documento}`;
  $('ultimo-nombre').textContent = ultimo.nombre_completo;
  $('ultimo-rol').textContent = etiquetaRol(ultimo.rol);
}

// ---------------------------------------------------------------------------
// Formulario crear / editar (modal)
// ---------------------------------------------------------------------------
const formulario = $('form-usuario');
const alerta = $('usuario-alerta');
const guardar = $('usuario-guardar');
const foto = conectarFoto('usuario-foto');
const CAMPOS = [
  'tipo_documento',
  'numero_documento',
  'primer_nombre',
  'segundo_nombre',
  'primer_apellido',
  'segundo_apellido',
  'correo',
  'celular',
  'rol_id',
  'contrasena_temporal',
];

$('contrasena-generar').addEventListener('click', () => {
  $('contrasena_temporal').value = generarContrasena();
});

function abrirFormulario(usuario, origen) {
  estado.editando = usuario;
  const editando = Boolean(usuario);
  const rolesDisponibles = estado.roles.filter(
    (r) => r.nombre !== 'administrador' || puede('usuarios.crear_administrador')
  );
  llenarSelect($('rol_id'), {
    opciones: [
      { value: '', label: 'Selecciona un rol…' },
      ...rolesDisponibles.map((r) => ({ value: String(r.id), label: etiquetaRol(r.nombre) })),
    ],
  });
  $('modal-usuario-titulo').textContent = editando
    ? `Editar usuario ${codigoUsuario(usuario.id)}`
    : 'Crear usuario';
  $('modal-usuario-subtitulo').textContent = editando
    ? `// ${usuario.nombre_completo}`
    : '// el sistema asigna el código automáticamente';
  guardar.querySelector('span').textContent = editando ? 'Guardar cambios' : 'Crear usuario';
  for (const nombre of CAMPOS.slice(1, 8)) $(nombre).value = usuario?.[nombre] ?? '';
  $('tipo_documento').value = usuario?.tipo_documento ?? 'CC';
  $('rol_id').value = usuario
    ? String(usuario.rol_id)
    : String(rolesDisponibles.find((r) => r.nombre === 'usuario')?.id ?? '');
  $('rol_id-ayuda').classList.toggle('hidden', puede('usuarios.crear_administrador'));
  // La contraseña temporal solo se define al crear.
  mostrar($('campo-contrasena'), !editando);
  $('contrasena_temporal').disabled = editando;
  $('contrasena_temporal').value = editando ? '' : generarContrasena();
  foto.reiniciar({ fotoUrl: usuario?.foto_url ?? null, nombre: usuario?.nombre_completo ?? '' });
  CAMPOS.forEach((n) => marcarCampo($(n), ''));
  mostrarAlerta(alerta, '');
  abrirModal($('modal-usuario'), { origen });
}

function validar() {
  let ok = true;
  for (const nombre of [
    'numero_documento',
    'primer_nombre',
    'primer_apellido',
    'correo',
    'celular',
  ]) {
    if (!$(nombre).value.trim()) ok = marcarCampo($(nombre), 'Este campo es obligatorio.');
  }
  const documento = $('numero_documento').value.trim();
  if (documento && !/^[A-Za-z0-9]+$/.test(documento))
    ok = marcarCampo($('numero_documento'), 'Solo letras y números, sin puntos ni espacios.');
  const correo = $('correo').value.trim();
  if (correo && !PATRON_CORREO.test(correo))
    ok = marcarCampo($('correo'), 'Escribe un correo válido.');
  const celular = $('celular').value.trim();
  if (celular && !PATRON_CELULAR.test(celular))
    ok = marcarCampo($('celular'), 'Celular de 10 dígitos que empieza por 3.');
  if (!$('rol_id').value) ok = marcarCampo($('rol_id'), 'Selecciona el tipo de usuario.');
  if (!estado.editando && $('contrasena_temporal').value.length < 8)
    ok = marcarCampo($('contrasena_temporal'), 'Mínimo 8 caracteres.');
  return ok;
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mostrarAlerta(alerta, '');
  CAMPOS.forEach((n) => marcarCampo($(n), ''));
  if (!validar()) {
    formulario.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  const editando = estado.editando;
  botonCargando(guardar, true, 'Guardando…');
  try {
    const datos = new FormData(formulario);
    const guardado = editando
      ? await actualizarUsuario(editando.id, datos)
      : await crearUsuario(datos);
    cerrarModal($('modal-usuario'));
    if (editando) {
      mostrarAviso(`Usuario ${codigoUsuario(guardado.id)} actualizado.`, 'success');
    } else {
      mostrarAviso(`Usuario creado con el código ${codigoUsuario(guardado.id)}.`, 'success');
      estado.ultimoCreado = guardado;
    }
    await recargar();
  } catch (error) {
    let primero = null;
    for (const d of error.detalles ?? []) {
      if ($(d.campo) && CAMPOS.includes(d.campo)) {
        marcarCampo($(d.campo), d.mensaje);
        primero ??= $(d.campo);
      }
    }
    mostrarAlerta(alerta, error.message);
    primero?.focus();
  } finally {
    botonCargando(guardar, false);
  }
});

// ---------------------------------------------------------------------------
// Activar / inactivar (solo admin)
// ---------------------------------------------------------------------------
async function alternarEstado(usuario, origen) {
  const nuevo = usuario.estado === 'activo' ? 'inactivo' : 'activo';
  const ok = await confirmar({
    titulo: nuevo === 'inactivo' ? 'Inactivar usuario' : 'Activar usuario',
    mensaje:
      nuevo === 'inactivo'
        ? `${usuario.nombre_completo} no podrá iniciar sesión hasta que lo actives de nuevo.`
        : `${usuario.nombre_completo} podrá volver a iniciar sesión.`,
    textoConfirmar: nuevo === 'inactivo' ? 'Inactivar' : 'Activar',
    origen,
  });
  if (!ok) return;
  try {
    await cambiarEstadoUsuario(usuario.id, nuevo);
    mostrarAviso(`${usuario.nombre_completo} quedó ${nuevo}.`, 'success');
    await recargar();
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Restablecer contraseña (solo admin): para quien la olvidó; no hay recuperación por correo
// ---------------------------------------------------------------------------
const restablecer = $('restablecer-contrasena');

function abrirRestablecer(usuario, origen) {
  estado.restableciendo = usuario;
  $('restablecer-texto').textContent =
    `${usuario.nombre_completo} (${usuario.tipo_documento} ${usuario.numero_documento}) entrará con esta contraseña y el sistema le pedirá crear una nueva.`;
  restablecer.value = generarContrasena();
  marcarCampo(restablecer, '');
  mostrarAlerta($('restablecer-alerta'), '');
  abrirModal($('modal-restablecer'), { origen });
}

$('restablecer-generar').addEventListener('click', () => {
  restablecer.value = generarContrasena();
});

$('form-restablecer').addEventListener('submit', async (e) => {
  e.preventDefault();
  const boton = $('restablecer-guardar');
  mostrarAlerta($('restablecer-alerta'), '');
  marcarCampo(restablecer, '');
  if (restablecer.value.length < 8) {
    marcarCampo(restablecer, 'Mínimo 8 caracteres.');
    return;
  }
  const usuario = estado.restableciendo;
  botonCargando(boton, true, 'Guardando…');
  try {
    await restablecerContrasenaUsuario(usuario.id, restablecer.value);
    cerrarModal($('modal-restablecer'));
    mostrarAviso(
      `Contraseña temporal asignada a ${usuario.nombre_completo}. Entrégasela en persona.`,
      'success'
    );
  } catch (error) {
    const detalle = error.detalles?.find((d) => d.campo === 'contrasena_temporal');
    if (detalle) marcarCampo(restablecer, detalle.mensaje);
    mostrarAlerta($('restablecer-alerta'), error.message);
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------------------
async function iniciar() {
  const app = await montarMarco({ paginaId: 'usuarios' });
  if (!app) return;
  estado.sesion = app.sesion;
  const esAdmin = puede('usuarios.ver');
  $('pagina-subtitulo').textContent = esAdmin
    ? '// registro, edición y estado de los usuarios del sistema'
    : '// registro de nuevos usuarios';
  mostrar($('panel-usuarios'), esAdmin);
  mostrar($('panel-registro'), !esAdmin);
  $('accion-nuevo').addEventListener('click', (e) => abrirFormulario(null, e.currentTarget));

  try {
    estado.roles = await listarRoles();
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
  if (esAdmin) {
    conectarBusqueda($('filtro-texto'), (texto) => {
      estado.filtros.q = texto;
      estado.filtros.pagina = 1;
      recargar();
    });
    for (const [id, clave] of [
      ['filtro-rol', 'rol'],
      ['filtro-estado', 'estado'],
    ]) {
      $(id).addEventListener('change', (e) => {
        estado.filtros[clave] = e.target.value;
        estado.filtros.pagina = 1;
        recargar();
      });
    }
  }
  await recargar();

  // Enlace desde una notificación: /app/usuarios.html?id=7 abre su edición.
  const id = Number(new URLSearchParams(location.search).get('id'));
  if (id && puede('usuarios.editar')) {
    try {
      abrirFormulario(await obtenerUsuario(id));
    } catch (error) {
      mostrarAviso(error.message, 'error');
    }
  }
}

iniciar();
