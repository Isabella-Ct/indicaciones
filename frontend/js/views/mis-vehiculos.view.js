// Página · Panel del cliente › Mis vehículos (HU-28 E3 · RF-VEH-12): solo los vehículos de la sesión.
import { misVehiculos } from '../services/vehiculos.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChip } from '../components/atomos/chip-estado.js';
import { ponerPlaca } from '../components/atomos/placa.js';
import { $ } from '../utils/dom.js';

const marco = montarMarco({ permiso: 'perfil.ver', alSalir: cerrarSesion });

const TIPO = { carro: 'Carro', moto: 'Moto' };

const tabla = conectarTabla($('tabla-mis-vehiculos'), {
  plantilla: 'tpl-mi-vehiculo',
  idDe: (v) => v.idVehiculo,
  rellenar(fila, v) {
    ponerPlaca(fila.querySelector('.js-placa'), v.placa);
    fila.querySelector('.js-tipo').textContent = TIPO[v.tipo];
    fila.querySelector('.js-marca').textContent = v.marca;
    fila.querySelector('.js-color').textContent = v.color;
    fila.querySelector('.js-modelo').textContent = String(v.modelo);
    ponerChip(fila.querySelector('.js-dentro'), v.dentro ? 'Dentro del parqueadero' : 'Fuera', v.dentro ? 'occupied' : 'neutral');
  },
});

async function cargar() {
  tabla.cargando(true);
  try {
    tabla.pintar(await misVehiculos());
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
    tabla.pintar([]);
  } finally {
    tabla.cargando(false);
  }
}

if (marco?.permitido) cargar();
