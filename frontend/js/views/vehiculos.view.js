// Página · Vehículos (HU-25, HU-28): listado con búsqueda por placa o propietario, filtros por tipo,
// propietario y presencia, y registro de un vehículo nuevo.
import { listarVehiculos, crearVehiculo } from '../services/vehiculos.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { conectarFormularioVehiculo } from '../components/organismos/formulario-vehiculo.js';
import { abrirDialogo, cerrarDialogo } from '../components/organismos/modal.js';
import { conectarBusqueda } from '../components/moleculas/buscador.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { limpiarErrores } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChip } from '../components/atomos/chip-estado.js';
import { ponerPlaca } from '../components/atomos/placa.js';
import { botonCargando } from '../components/atomos/boton.js';
import { tienePermiso } from '../utils/sesion.js';
import { $ } from '../utils/dom.js';
import { texto } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'vehiculos.ver', alSalir: cerrarSesion });

const TIPO = { carro: 'Carro', moto: 'Moto' };
const filtros = { page: 1, q: '', tipo: '', propietario: '', dentro: '' };

// ---------------------------------------------------------------- listado (HU-28 E1)
const tabla = conectarTabla($('tabla-vehiculos'), {
  plantilla: 'tpl-vehiculo',
  idDe: (v) => v.idVehiculo,
  onPagina: (pagina) => cargar(pagina),
  rellenar(fila, v) {
    ponerPlaca(fila.querySelector('.js-placa'), v.placa);
    fila.querySelector('.js-tipo').textContent = TIPO[v.tipo];
    fila.querySelector('.js-marca').textContent = v.marca;
    fila.querySelector('.js-color').textContent = v.color;
    fila.querySelector('.js-modelo').textContent = String(v.modelo);
    fila.querySelector('.js-propietario').textContent = v.propietario?.nombre ?? 'Sin propietario';
    fila.querySelector('.js-documento').textContent = v.propietario
      ? `${v.propietario.tipoDocumento} ${v.propietario.numeroDocumento}`
      : '';
    ponerChip(fila.querySelector('.js-dentro'), v.dentro ? `Dentro · ${texto(v.celdaActual)}` : 'Fuera', v.dentro ? 'occupied' : 'neutral');
    const ver = fila.querySelector('.js-ver');
    ver.href = `/vehiculo-detalle.html?id=${v.idVehiculo}`;
    ver.setAttribute('aria-label', `Ver el vehículo ${v.placa}`);
  },
});

async function cargar(page = filtros.page) {
  filtros.page = page;
  tabla.cargando(true);
  try {
    const { data, meta } = await listarVehiculos({
      page,
      q: filtros.q,
      tipo: filtros.tipo,
      propietario: filtros.propietario,
      dentro: filtros.dentro,
    });
    tabla.pintar(data, meta);
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
    tabla.pintar([]);
  } finally {
    tabla.cargando(false);
  }
}

conectarBusqueda($('filtro-texto'), (q) => {
  filtros.q = q;
  cargar(1);
});
for (const [id, clave] of [
  ['filtro-tipo', 'tipo'],
  ['filtro-propietario', 'propietario'],
  ['filtro-dentro', 'dentro'],
]) {
  $(id).addEventListener('change', (e) => {
    filtros[clave] = e.target.value;
    cargar(1);
  });
}

// ---------------------------------------------------------------- nuevo vehículo (HU-25)
const dialogo = $('dialogo-vehiculo');
const formulario = $('form-vehiculo');
const vehiculo = conectarFormularioVehiculo('vehiculo');
const alerta = $('vehiculo-alerta');
const guardar = $('vehiculo-guardar');

function abrirNuevo(origen) {
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  vehiculo.poner(null);
  abrirDialogo(dialogo, { origen, foco: $('vehiculo-placa') });
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  if (!vehiculo.validar()) return;
  botonCargando(guardar, true, 'Guardando…');
  try {
    const creado = await crearVehiculo(vehiculo.leer());
    mostrarAviso(`Vehículo registrado: ${creado.placa}`, 'success');
    cerrarDialogo(dialogo);
    cargar(1);
  } catch (error) {
    if (error.status === 401 || error.status === 403) return;
    const sinCampo = vehiculo.pintarErrores(error);
    if (sinCampo.length) mostrarAlerta(alerta, sinCampo.join(' '), 'error');
  } finally {
    botonCargando(guardar, false);
  }
});

// ---------------------------------------------------------------- arranque
if (marco?.permitido) {
  $('accion-nuevo').classList.toggle('hidden', !tienePermiso('vehiculos.crear'));
  $('accion-nuevo').addEventListener('click', (e) => abrirNuevo(e.currentTarget));
  cargar(1);
}
