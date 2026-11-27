// Página · Usuarios (HU-07..HU-10): listado con búsqueda y filtros, registrar, editar y cambiar estado.
import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
  obtenerFoto,
} from '../services/usuarios.service.js';
import { listarRoles } from '../services/roles.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { abrirDialogo, cerrarDialogo, confirmar } from '../components/organismos/modal.js';
import { conectarBusqueda } from '../components/moleculas/buscador.js';
import { conectarFoto } from '../components/moleculas/foto.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerAvatar } from '../components/atomos/avatar.js';
import { ponerChipActivo } from '../components/atomos/chip-estado.js';
import { botonCargando } from '../components/atomos/boton.js';
import { clonar } from '../utils/plantillas.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, parametro, mostrar } from '../utils/dom.js';

const marco = montarMarco({ permiso: 'usuarios.ver' });

const puede = {
  crear: tienePermiso('usuarios.crear'),
  editar: tienePermiso('usuarios.editar'), // también define el alcance total (research R-08)
  cambiarEstado: tienePermiso('usuarios.cambiar_estado'),
  verRoles: tienePermiso('roles.ver'),
};
const estado = { page: 1, q: '', rol: '', estado: '', roles: [], editando: null };
const yo = marco?.sesion.usuario.idUsuario;

const PATRON = {
  documento: /^\d{5,20}$/,
  pasaporte: /^[A-Za-z0-9]{5,20}$/,
  nombre: /^\p{L}[\p{L} '-]*$/u,
  correo: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  celular: /^3\d{9}$/,
};

// ---------------------------------------------------------------- roles (filtro y formulario)
function llenarSelect(select, opciones, { vacia } = {}) {
  select.replaceChildren(
    ...[...(vacia ? [{ valor: '', texto: vacia }] : []), ...opciones].map(({ valor, texto }) => {
      const opcion = clonar('tpl-opcion');
      opcion.value = String(valor);
      opcion.textContent = texto;
      return opcion;
    })
  );
}

async function prepararRoles() {
  if (puede.verRoles) {
    const { data } = await listarRoles({ limit: 100 });
    estado.roles = data;
    llenarSelect($('filtro-rol'), data.map((r) => ({ valor: r.idRol, texto: r.nombre })), { vacia: 'Todos' });
  } else {
    // Sin roles.ver (Operador): solo gestiona Clientes y el servidor asigna el rol (research R-08).
    mostrar($('filtro-rol').closest('.molecule-field'), false);
  }
}

function llenarRolesFormulario(rolActual) {
  const select = $('usuario-rol');
  if (!puede.verRoles) {
    llenarSelect(select, [{ valor: '', texto: 'Cliente' }]);
    select.disabled = true;
    return;
  }
  // RF-ROL-14: solo roles activos; si el usuario tiene uno inactivo, se muestra para no perderlo.
  const opciones = estado.roles
    .filter((r) => r.estado === 'activo' || r.idRol === rolActual)
    .map((r) => ({ valor: r.idRol, texto: r.estado === 'activo' ? r.nombre : `${r.nombre} (inactivo)` }));
  llenarSelect(select, opciones, { vacia: 'Seleccione…' });
  select.disabled = false;
  select.value = rolActual ? String(rolActual) : String(estado.roles.find((r) => r.nombre === 'Cliente')?.idRol ?? '');
}

// ---------------------------------------------------------------- listado (HU-08)
const tabla = conectarTabla($('tabla-usuarios'), {
  plantilla: 'tpl-usuario',
  idDe: (u) => u.idUsuario,
  onPagina: (pagina) => cargar(pagina),
  rellenar(fila, u) {
    fila.querySelector('.js-nombre').textContent = u.nombreCompleto;
    fila.querySelector('.js-codigo').textContent = `Código ${u.idUsuario}`;
    fila.querySelector('.js-documento').textContent = `${u.tipoDocumento} ${u.numeroDocumento}`;
    fila.querySelector('.js-correo').textContent = u.correo;
    fila.querySelector('.js-celular').textContent = u.celular;
    fila.querySelector('.js-rol').textContent = u.rol.nombre;
    ponerChipActivo(fila.querySelector('.js-estado'), u.estado);
    const avatar = fila.querySelector('.atom-avatar');
    ponerAvatar(avatar, { nombre: u.nombreCompleto });
    if (u.fotoUrl) obtenerFoto(u.idUsuario).then((blob) => blob && ponerAvatar(avatar, { nombre: u.nombreCompleto, blob }));

    const ver = fila.querySelector('.js-ver');
    ver.href = `/usuario-detalle.html?id=${u.idUsuario}`;
    ver.setAttribute('aria-label', `Ver a ${u.nombreCompleto}`);
    const editar = fila.querySelector('.js-editar');
    mostrar(editar, puede.editar);
    editar.setAttribute('aria-label', `Editar a ${u.nombreCompleto}`);
    editar.addEventListener('click', () => abrirEdicion(u.idUsuario, editar));
    const accion = fila.querySelector('.js-estado-accion');
    // RF-USR-14: no se ofrece inactivar la propia cuenta.
    mostrar(accion, puede.cambiarEstado && !(u.idUsuario === yo && u.estado === 'activo'));
    accion.querySelector('span').textContent = u.estado === 'activo' ? 'Inactivar' : 'Activar';
    accion.addEventListener('click', () => alternarEstado(u, accion));
  },
});

async function cargar(page = estado.page) {
  estado.page = page;
  tabla.cargando(true);
  try {
    const { data, meta } = await listarUsuarios({ page, q: estado.q, rol: estado.rol, estado: estado.estado });
    tabla.pintar(data, meta);
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
    tabla.pintar([]);
  } finally {
    tabla.cargando(false);
  }
}

conectarBusqueda($('filtro-texto'), (q) => {
  estado.q = q;
  cargar(1);
});
$('filtro-rol').addEventListener('change', (e) => {
  estado.rol = e.target.value;
  cargar(1);
});
$('filtro-estado').addEventListener('change', (e) => {
  estado.estado = e.target.value;
  cargar(1);
});

// ---------------------------------------------------------------- estado (HU-10)
async function alternarEstado(u, origen) {
  const nuevo = u.estado === 'activo' ? 'inactivo' : 'activo';
  const acepta = await confirmar({
    titulo: nuevo === 'inactivo' ? 'Inactivar usuario' : 'Activar usuario',
    mensaje:
      nuevo === 'inactivo'
        ? `${u.nombreCompleto} no podrá iniciar sesión y se cerrarán sus sesiones abiertas.`
        : `${u.nombreCompleto} podrá volver a iniciar sesión con sus credenciales.`,
    textoConfirmar: nuevo === 'inactivo' ? 'Inactivar' : 'Activar',
    origen,
  });
  if (!acepta) return;
  try {
    await cambiarEstadoUsuario(u.idUsuario, nuevo);
    mostrarAviso('Estado actualizado', 'success');
    cargar();
  } catch (error) {
    if (error.status !== 401 && error.status !== 403) mostrarAviso(error.message, 'error');
  }
}

// ---------------------------------------------------------------- registrar / editar (HU-07, HU-09)
const dialogo = $('dialogo-usuario');
const formulario = $('form-usuario');
const alerta = $('usuario-alerta');
const guardar = $('usuario-guardar');
const foto = conectarFoto($('usuario-foto-campo'));
const control = {
  tipo: $('usuario-tipo-documento'),
  documento: $('usuario-numero-documento'),
  nombre: $('usuario-nombre'),
  correo: $('usuario-correo'),
  celular: $('usuario-celular'),
  rol: $('usuario-rol'),
  autorizacion: $('usuario-autorizacion'),
};
const MAPA_CAMPOS = {
  tipoDocumento: 'usuario-tipo-documento',
  numeroDocumento: 'usuario-numero-documento',
  nombreCompleto: 'usuario-nombre',
  correo: 'usuario-correo',
  celular: 'usuario-celular',
  idRol: 'usuario-rol',
  aceptaTratamientoDatos: 'usuario-autorizacion',
  foto: 'usuario-foto',
};

function abrirFormulario({ usuario = null, blob = null, origen }) {
  estado.editando = usuario;
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  $('usuario-titulo').textContent = usuario ? `Editar usuario · ${usuario.nombreCompleto}` : 'Nuevo usuario';
  guardar.querySelector('span').textContent = usuario ? 'Guardar cambios' : 'Registrar usuario';
  mostrar($('usuario-codigo-campo'), Boolean(usuario));
  $('usuario-codigo').value = usuario ? String(usuario.idUsuario) : '';
  mostrar($('usuario-autorizacion-campo'), !usuario);
  control.tipo.value = usuario?.tipoDocumento ?? 'CC';
  control.documento.value = usuario?.numeroDocumento ?? '';
  control.nombre.value = usuario?.nombreCompleto ?? '';
  control.correo.value = usuario?.correo ?? '';
  control.celular.value = usuario?.celular ?? '';
  control.autorizacion.checked = false;
  llenarRolesFormulario(usuario?.rol.idRol);
  foto.reiniciar({ nombreUsuario: usuario?.nombreCompleto ?? '', blob });
  abrirDialogo(dialogo, { origen, foco: control.documento });
}

async function abrirEdicion(id, origen) {
  try {
    const usuario = await obtenerUsuario(id);
    const blob = usuario.fotoUrl ? await obtenerFoto(id) : null;
    abrirFormulario({ usuario, blob, origen });
  } catch (error) {
    if (error.status !== 401 && error.status !== 403) mostrarAviso(error.message, 'error');
  }
}

function validar() {
  const doc = control.documento.value.replace(/[\s.-]/g, '');
  const patronDoc = control.tipo.value === 'PAS' ? PATRON.pasaporte : PATRON.documento;
  const nombre = control.nombre.value.trim().replace(/\s+/g, ' ');
  const correo = control.correo.value.trim();
  const celular = control.celular.value.replace(/[\s-]/g, '');
  const errores = [
    marcarCampo(control.documento, patronDoc.test(doc) ? '' : 'Ingrese de 5 a 20 dígitos (pasaporte: letras y dígitos).'),
    marcarCampo(
      control.nombre,
      nombre.length < 3 || nombre.length > 100 || !PATRON.nombre.test(nombre) ? 'Ingrese un nombre de 3 a 100 letras.' : ''
    ),
    marcarCampo(control.correo, PATRON.correo.test(correo) ? '' : 'Ingrese un correo válido.'),
    marcarCampo(control.celular, PATRON.celular.test(celular) ? '' : 'Ingrese 10 dígitos que empiecen por 3.'),
    marcarCampo(control.rol, control.rol.disabled || control.rol.value ? '' : 'Seleccione el rol.'),
    marcarCampo(
      control.autorizacion,
      estado.editando || control.autorizacion.checked ? '' : 'Debe aceptar la autorización de tratamiento de datos.'
    ),
  ];
  const valido = errores.every(Boolean);
  if (!valido) formulario.querySelector('[aria-invalid="true"]')?.focus();
  return valido;
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  if (!validar()) return;
  const datos = {
    tipoDocumento: control.tipo.value,
    numeroDocumento: control.documento.value,
    nombreCompleto: control.nombre.value,
    correo: control.correo.value,
    celular: control.celular.value,
  };
  if (control.rol.value) datos.idRol = Number(control.rol.value);
  botonCargando(guardar, true, 'Guardando…');
  try {
    if (estado.editando) {
      if (foto.quitada()) datos.quitarFoto = true;
      await actualizarUsuario(estado.editando.idUsuario, datos, foto.archivo());
      mostrarAviso('Usuario actualizado', 'success');
    } else {
      datos.aceptaTratamientoDatos = true;
      const creado = await crearUsuario(datos, foto.archivo());
      mostrarAviso(`Usuario registrado — código ${creado.idUsuario}`, 'success');
      if (!creado.correoEnviado) {
        mostrarAviso('No se pudo enviar el correo con la contraseña temporal. Se reintentará más tarde.', 'info', {
          duracion: 9000,
        });
      }
    }
    cerrarDialogo(dialogo);
    cargar(estado.editando ? estado.page : 1);
  } catch (error) {
    if (error.code === 'DOCUMENTO_DUPLICADO') marcarCampo(control.documento, error.message);
    else if (error.code === 'CORREO_DUPLICADO') marcarCampo(control.correo, error.message);
    else if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, MAPA_CAMPOS);
      if (sinCampo.length) mostrarAlerta(alerta, sinCampo.join(' '), 'error');
    } else if (error.status !== 401 && error.status !== 403) mostrarAlerta(alerta, error.message, 'error');
    formulario.querySelector('[aria-invalid="true"]')?.focus();
  } finally {
    botonCargando(guardar, false);
  }
});

// ---------------------------------------------------------------- arranque
async function iniciar() {
  mostrar($('accion-nuevo'), puede.crear);
  $('accion-nuevo').addEventListener('click', (e) => abrirFormulario({ origen: e.currentTarget }));
  try {
    await prepararRoles();
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
  cargar(1);
  const editar = Number(parametro('editar'));
  if (editar && puede.editar) abrirEdicion(editar, $('accion-nuevo'));
}

if (marco?.permitido) iniciar();
