// Página · Usuarios › Detalle (HU-08 E4 · RF-USR-07): datos, foto, vehículos y membresía vigente.
import { obtenerUsuario, obtenerFoto } from '../services/usuarios.service.js';
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
    fila.querySelector('.js-placa').textContent = v.placa;
    fila.querySelector('.js-tipo').textContent = v.tipo === 'moto' ? 'Moto' : 'Carro';
    fila.querySelector('.js-marca').textContent = v.marca;
    fila.querySelector('.js-color').textContent = v.color;
    ponerChipActivo(fila.querySelector('.js-estado'), v.estado);
  },
});

async function pintar(u) {
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

if (marco?.permitido) iniciar();
