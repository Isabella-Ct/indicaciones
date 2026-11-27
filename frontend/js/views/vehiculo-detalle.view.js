// Página · Vehículos › Detalle (HU-26, HU-27, HU-28 E2): datos, propietario (asociar, reasignar y
// quitar), edición, historial de propietarios y últimos 10 movimientos.
import { obtenerVehiculo, actualizarVehiculo, asignarPropietario } from '../services/vehiculos.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { conectarFormularioVehiculo } from '../components/organismos/formulario-vehiculo.js';
import { abrirDialogo, cerrarDialogo, confirmar } from '../components/organismos/modal.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChip, ponerChipActivo } from '../components/atomos/chip-estado.js';
import { ponerPlaca } from '../components/atomos/placa.js';
import { botonCargando } from '../components/atomos/boton.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, parametro, mostrar } from '../utils/dom.js';
import { formatearFechaHora, texto } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'vehiculos.ver', alSalir: cerrarSesion });

const TIPO = { carro: 'Carro', moto: 'Moto' };
const ESTADO_MOVIMIENTO = { abierto: ['Dentro', 'occupied'], cerrado: ['Cerrado', 'free'], anulado: ['Anulado', 'out'] };
const id = Number(parametro('id'));
const puede = {
  asociar: tienePermiso('vehiculos.crear'),
  editar: tienePermiso('vehiculos.editar'),
  verUsuarios: tienePermiso('usuarios.ver'),
};
let actual = null;

const tablaHistorial = conectarTabla($('tabla-historial'), {
  plantilla: 'tpl-historial',
  rellenar(fila, h) {
    fila.querySelector('.js-nombre').textContent = h.nombre;
    fila.querySelector('.js-desde').textContent = formatearFechaHora(h.desde);
    fila.querySelector('.js-hasta').textContent = h.hasta ? formatearFechaHora(h.hasta) : 'Vigente';
  },
});

const tablaMovimientos = conectarTabla($('tabla-movimientos'), {
  plantilla: 'tpl-movimiento',
  idDe: (m) => m.idMovimiento,
  rellenar(fila, m) {
    fila.querySelector('.js-entrada').textContent = formatearFechaHora(m.fechaHoraEntrada);
    fila.querySelector('.js-salida').textContent = formatearFechaHora(m.fechaHoraSalida);
    fila.querySelector('.js-celda').textContent = m.celda;
    fila.querySelector('.js-tiempo').textContent = m.minutosEstadia === null ? '—' : `${m.minutosEstadia} min`;
    const [nombre, variante] = ESTADO_MOVIMIENTO[m.estado] ?? [m.estado, 'neutral'];
    ponerChip(fila.querySelector('.js-estado'), nombre, variante);
  },
});

function pintar(v) {
  actual = v;
  document.title = `PARKO · Vehículo ${v.placa}`;
  ponerPlaca($('detalle-placa'), v.placa);
  $('detalle-subtitulo').textContent = `// Vehículos › ${TIPO[v.tipo]} ${v.marca} · ${v.color}`;
  $('detalle-tipo').textContent = TIPO[v.tipo];
  $('detalle-marca').textContent = v.marca;
  $('detalle-color').textContent = v.color;
  $('detalle-modelo').textContent = String(v.modelo);
  ponerChip($('detalle-dentro'), v.dentro ? 'Dentro del parqueadero' : 'Fuera', v.dentro ? 'occupied' : 'neutral');
  mostrar($('detalle-celda-fila'), v.dentro);
  $('detalle-celda').textContent = texto(v.celdaActual);

  const p = v.propietario;
  mostrar($('detalle-sin-propietario'), !p);
  mostrar($('detalle-propietario'), Boolean(p));
  if (p) {
    const enlace = $('detalle-propietario-nombre');
    enlace.textContent = p.nombre;
    enlace.href = puede.verUsuarios ? `/usuario-detalle.html?id=${p.idUsuario}` : '#';
    $('detalle-propietario-documento').textContent = `${p.tipoDocumento} ${p.numeroDocumento}`;
    ponerChipActivo($('detalle-propietario-estado'), p.estado);
  }
  // RF-VEH-06: el Operador asocia solo si no hay propietario; reasignar y quitar son del Administrador.
  mostrar($('accion-asociar'), puede.asociar && !p);
  mostrar($('accion-reasignar'), puede.editar && Boolean(p));
  mostrar($('accion-quitar'), puede.editar && Boolean(p));
  mostrar($('accion-editar'), puede.editar);

  tablaHistorial.pintar(v.historialPropietarios ?? []);
  tablaMovimientos.pintar(v.ultimosMovimientos ?? []);
  mostrar($('detalle-contenido'));
}

async function cargar() {
  try {
    pintar(await obtenerVehiculo(id));
  } catch (error) {
    if (error.status === 404 || error.status === 422) mostrar($('detalle-no-encontrado'));
    else if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
}

// ---------------------------------------------------------------- editar (HU-27 E1, E4, E5)
const dialogoVehiculo = $('dialogo-vehiculo');
const formVehiculo = $('form-vehiculo');
const formulario = conectarFormularioVehiculo('vehiculo');

$('accion-editar').addEventListener('click', (e) => {
  limpiarErrores(formVehiculo);
  mostrarAlerta($('vehiculo-alerta'), '');
  formulario.poner(actual);
  // Con el vehículo dentro, la placa y el tipo no cambian (el servidor también lo impide).
  formulario.bloquearIdentidad(actual.dentro);
  mostrarAlerta($('vehiculo-alerta'), actual.dentro ? 'El vehículo está dentro: solo se pueden cambiar el color, la marca y el modelo.' : '', 'info');
  abrirDialogo(dialogoVehiculo, { origen: e.currentTarget, foco: $(actual.dentro ? 'vehiculo-color' : 'vehiculo-placa') });
});

formVehiculo.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formVehiculo);
  if (!formulario.validar()) return;
  const boton = $('vehiculo-guardar');
  botonCargando(boton, true, 'Guardando…');
  try {
    pintar({ ...actual, ...(await actualizarVehiculo(id, formulario.leer())) });
    mostrarAviso('Vehículo actualizado', 'success');
    cerrarDialogo(dialogoVehiculo);
    cargar();
  } catch (error) {
    if (error.status === 401) return;
    const sinCampo = formulario.pintarErrores(error);
    if (sinCampo.length) mostrarAlerta($('vehiculo-alerta'), sinCampo.join(' '), 'error');
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------- propietario (HU-26, HU-27 E2)
const dialogoPropietario = $('dialogo-propietario');
const formPropietario = $('form-propietario');
const campoTipoDoc = $('propietario-tipo-documento');
const campoNumeroDoc = $('propietario-numero-documento');

function abrirPropietario(reasignar, origen) {
  limpiarErrores(formPropietario);
  mostrarAlerta($('propietario-alerta'), '');
  $('dialogo-propietario-titulo').textContent = reasignar ? 'Reasignar propietario' : 'Asociar propietario';
  $('propietario-guardar').querySelector('span').textContent = reasignar ? 'Reasignar' : 'Asociar';
  campoTipoDoc.value = 'CC';
  campoNumeroDoc.value = '';
  abrirDialogo(dialogoPropietario, { origen, foco: campoNumeroDoc });
}

$('accion-asociar').addEventListener('click', (e) => abrirPropietario(false, e.currentTarget));
$('accion-reasignar').addEventListener('click', (e) => abrirPropietario(true, e.currentTarget));

formPropietario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formPropietario);
  mostrarAlerta($('propietario-alerta'), '');
  const numeroDocumento = campoNumeroDoc.value.trim();
  if (!marcarCampo(campoNumeroDoc, numeroDocumento ? '' : 'Ingrese el número de documento.')) return campoNumeroDoc.focus();
  const boton = $('propietario-guardar');
  botonCargando(boton, true, 'Guardando…');
  try {
    const v = await asignarPropietario(id, { tipoDocumento: campoTipoDoc.value, numeroDocumento });
    mostrarAviso(`Propietario: ${v.propietario?.nombre ?? '—'}`, 'success');
    cerrarDialogo(dialogoPropietario);
    cargar();
  } catch (error) {
    if (error.status === 401) return;
    if (error.code === 'USUARIO_NO_ENCONTRADO' || error.code === 'USUARIO_INACTIVO') {
      marcarCampo(campoNumeroDoc, error.message);
      campoNumeroDoc.focus();
    } else if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, {
        tipoDocumento: 'propietario-tipo-documento',
        numeroDocumento: 'propietario-numero-documento',
      });
      if (sinCampo.length) mostrarAlerta($('propietario-alerta'), sinCampo.join(' '), 'error');
    } else {
      // SOLO_ADMIN_REASIGNA y otros: alerta del formulario.
      mostrarAlerta($('propietario-alerta'), error.message, 'error');
    }
  } finally {
    botonCargando(boton, false);
  }
});

$('accion-quitar').addEventListener('click', async (e) => {
  const acepta = await confirmar({
    titulo: 'Quitar propietario',
    mensaje: `El vehículo ${actual.placa} quedará sin propietario. El historial conserva el periodo de ${actual.propietario.nombre}.`,
    textoConfirmar: 'Quitar',
    origen: e.currentTarget,
  });
  if (!acepta) return;
  try {
    await asignarPropietario(id, { idUsuario: null });
    mostrarAviso('Propietario retirado', 'success');
    cargar();
  } catch (error) {
    if (error.status !== 401 && error.status !== 403) mostrarAviso(error.message, 'error');
  }
});

// ---------------------------------------------------------------- arranque
if (marco?.permitido) {
  if (Number.isInteger(id) && id > 0) cargar();
  else mostrar($('detalle-no-encontrado'));
}
