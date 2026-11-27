// Página · Usuarios › Detalle (HU-08 E4 · RF-USR-07): datos, foto, vehículos y membresía vigente.
// Spec 005 (HU-26): «Agregar vehículo» por placa; si no está registrado, se registra y se asocia.
import { obtenerUsuario, obtenerFoto } from '../services/usuarios.service.js';
import { buscarPorPlaca, asignarPropietario, crearVehiculo } from '../services/vehiculos.service.js';
import { conectarFormularioVehiculo } from '../components/organismos/formulario-vehiculo.js';
import { abrirDialogo, cerrarDialogo } from '../components/organismos/modal.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { marcarCampo, limpiarErrores } from '../components/moleculas/campo.js';
import { ponerPlaca } from '../components/atomos/placa.js';
import { botonCargando } from '../components/atomos/boton.js';
import { normalizarPlaca } from '../utils/placa.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerAvatar } from '../components/atomos/avatar.js';
import { ponerChipActivo } from '../components/atomos/chip-estado.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, parametro, mostrar } from '../utils/dom.js';
import { formatearFecha, formatearFechaHora } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'usuarios.ver', alSalir: cerrarSesion });

const tablaVehiculos = conectarTabla($('tabla-vehiculos-usuario'), {
  plantilla: 'tpl-vehiculo-usuario',
  idDe: (v) => v.idVehiculo,
  rellenar(fila, v) {
    ponerPlaca(fila.querySelector('.js-placa'), v.placa);
    fila.querySelector('.js-tipo').textContent = v.tipo === 'moto' ? 'Moto' : 'Carro';
    fila.querySelector('.js-marca').textContent = v.marca;
    fila.querySelector('.js-color').textContent = v.color;
    ponerChipActivo(fila.querySelector('.js-estado'), v.estado);
    const ver = fila.querySelector('.js-ver');
    ver.href = `/vehiculo-detalle.html?id=${v.idVehiculo}`;
    ver.setAttribute('aria-label', `Ver el vehículo ${v.placa}`);
    mostrar(ver, tienePermiso('vehiculos.ver'));
  },
});

let usuario = null;

async function pintar(u) {
  usuario = u;
  // Solo se agregan vehículos a usuarios activos (RN-12); hace falta buscar y registrar vehículos.
  mostrar($('accion-agregar-vehiculo'), u.estado === 'activo' && tienePermiso('vehiculos.ver') && tienePermiso('vehiculos.crear'));
  document.title = `PARKO · ${u.nombreCompleto}`;
  $('detalle-nombre').textContent = u.nombreCompleto;
  $('detalle-codigo').textContent = String(u.idUsuario);
  $('detalle-documento').textContent = `${u.tipoDocumento} ${u.numeroDocumento}`;
  $('detalle-correo').textContent = u.correo;
  $('detalle-celular').textContent = u.celular;
  $('detalle-rol').textContent = u.rol.nombre;
  ponerChipActivo($('detalle-estado'), u.estado);
  $('detalle-autorizacion').textContent = u.aceptaTratamientoDatos
    ? `Sí · ${formatearFechaHora(u.fechaAutorizacion)}`
    : 'No';
  $('detalle-registro').textContent = formatearFechaHora(u.createdAt);

  const m = u.membresiaVigente;
  mostrar($('detalle-sin-membresia'), !m);
  mostrar($('detalle-membresia'), Boolean(m));
  if (m) {
    $('membresia-plan').textContent = m.plan;
    $('membresia-placa').textContent = m.placa;
    $('membresia-inicio').textContent = formatearFecha(`${m.fechaInicio}T00:00:00-05:00`);
    $('membresia-fin').textContent = formatearFecha(`${m.fechaFin}T00:00:00-05:00`);
  }
  tablaVehiculos.pintar(u.vehiculos);

  const editar = $('detalle-editar');
  editar.href = `/usuarios.html?editar=${u.idUsuario}`;
  mostrar(editar, tienePermiso('usuarios.editar'));
  mostrar($('detalle-contenido'));

  const avatar = $('detalle-avatar');
  ponerAvatar(avatar, { nombre: u.nombreCompleto });
  if (u.fotoUrl) ponerAvatar(avatar, { nombre: u.nombreCompleto, blob: await obtenerFoto(u.idUsuario) });
}

async function iniciar() {
  const id = Number(parametro('id'));
  if (!Number.isInteger(id) || id < 1) return mostrar($('detalle-no-encontrado'));
  try {
    return await pintar(await obtenerUsuario(id));
  } catch (error) {
    // 403 fuera del alcance del Operador: se muestra igual que «no encontrado» (no revela datos).
    if ([403, 404, 422].includes(error.status)) return mostrar($('detalle-no-encontrado'));
    if (error.status !== 401) mostrarAviso(error.message, 'error');
    return null;
  }
}

// ---------------------------------------------------------------- agregar vehículo (HU-26 E1, E2)
const dialogo = $('dialogo-agregar');
const formulario = $('form-agregar');
const vehiculo = conectarFormularioVehiculo('agregar');
const alerta = $('agregar-alerta');
const guardar = $('agregar-guardar');
let registrando = false;

function modoRegistro(si) {
  registrando = si;
  mostrar($('agregar-resto'), si);
  guardar.querySelector('span').textContent = si ? 'Registrar y asociar' : 'Asociar';
}

$('accion-agregar-vehiculo').addEventListener('click', (e) => {
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  vehiculo.poner(null);
  modoRegistro(false);
  $('agregar-subtitulo').textContent = `// Vehículo de ${usuario.nombreCompleto}`;
  abrirDialogo(dialogo, { origen: e.currentTarget, foco: $('agregar-placa') });
});

async function asociarExistente(placa) {
  const encontrado = await buscarPorPlaca(placa);
  if (!encontrado) {
    // HU-26 E2: «Registre primero el vehículo» y se ofrece el formulario de registro.
    mostrarAlerta(alerta, 'Registre primero el vehículo: la placa no está registrada. Complete sus datos.', 'info');
    modoRegistro(true);
    vehiculo.poner({ placa });
    document.getElementById('agregar-tipo-carro').focus();
    return false;
  }
  if (encontrado.propietario?.idUsuario === usuario.idUsuario) {
    mostrarAlerta(alerta, `El vehículo ${placa} ya está asociado a este usuario.`, 'info');
    return false;
  }
  await asignarPropietario(encontrado.idVehiculo, { idUsuario: usuario.idUsuario });
  return true;
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  const placa = normalizarPlaca($('agregar-placa').value);
  if (!registrando && !marcarCampo($('agregar-placa'), placa.length >= 5 ? '' : 'Ingrese la placa.')) return $('agregar-placa').focus();
  if (registrando && !vehiculo.validar()) return;
  botonCargando(guardar, true, 'Guardando…');
  try {
    const listo = registrando
      ? Boolean(await crearVehiculo({ ...vehiculo.leer(), idPropietario: usuario.idUsuario }))
      : await asociarExistente(placa);
    if (listo) {
      mostrarAviso(`Vehículo ${placa} asociado a ${usuario.nombreCompleto}`, 'success');
      cerrarDialogo(dialogo);
      await pintar(await obtenerUsuario(usuario.idUsuario));
    }
  } catch (error) {
    if (error.status === 401) return;
    const sinCampo = registrando ? vehiculo.pintarErrores(error) : [error.message];
    // SOLO_ADMIN_REASIGNA (el vehículo ya tiene otro propietario), USUARIO_INACTIVO…
    if (sinCampo.length) mostrarAlerta(alerta, sinCampo.join(' '), 'error');
  } finally {
    botonCargando(guardar, false);
  }
});

if (marco?.permitido) iniciar();
