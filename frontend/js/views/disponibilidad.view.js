// Página · Panel del cliente › Disponibilidad (HU-22 E4, HU-24): celdas libres por piso y área y
// cupos por tipo, actualizados cada 10 s. El Cliente nunca recibe placas (RF-CLD-17).
import { consultarDisponibilidad } from '../services/disponibilidad.service.js';
import { listarCeldas } from '../services/celdas.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarMapa } from '../components/organismos/mapa-celdas.js';
import { conectarPestanas } from '../components/moleculas/pestanas.js';
import { consultarCada } from '../components/moleculas/consulta-periodica.js';
import { ponerKpi } from '../components/moleculas/kpi.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { clonar } from '../utils/plantillas.js';
import { $ } from '../utils/dom.js';
import { formatearHora, plural } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'celdas.ver', alSalir: cerrarSesion });

const estado = { idParqueadero: null, piso: null, tipo: '', libres: [] };

const mapa = conectarMapa($('mapa'));
const pestanas = conectarPestanas($('pisos'), {
  plantilla: 'tpl-piso',
  onCambio(valor) {
    estado.piso = Number(valor);
    pintarMapa();
  },
});

function pintarKpi(id, nombre, datos) {
  ponerKpi($(id), {
    valor: datos.lleno ? 'Lleno' : String(datos.disponibles),
    nota: datos.lleno ? `Sin celdas libres para ${nombre}` : `libres de ${datos.total}`,
    medidor: datos.total ? (datos.disponibles / datos.total) * 100 : 0,
    destacado: !datos.lleno,
  });
}

function pintarMapa() {
  const delPiso = estado.libres.filter((c) => c.piso === estado.piso);
  mapa.pintar(delPiso, {
    titulo: estado.piso ? `Piso ${estado.piso}` : 'Sin celdas libres',
    conteo: plural(delPiso.length, 'celda libre', 'celdas libres'),
  });
}

async function consultar() {
  const [publica, { data }] = await Promise.all([
    consultarDisponibilidad({ parqueadero: estado.idParqueadero }),
    listarCeldas({ parqueadero: estado.idParqueadero, estado: 'disponible', tipo: estado.tipo }),
  ]);
  const sede = publica.parqueaderos[0];
  if (sede) {
    pintarKpi('kpi-carro', 'carros', sede.tipos.carro);
    pintarKpi('kpi-moto', 'motos', sede.tipos.moto);
  }
  estado.libres = data;
  const pisos = [...new Set(data.map((c) => c.piso))].sort((a, b) => a - b);
  const elegido = pestanas.pintar(
    pisos.map((p) => ({ valor: String(p), texto: `Piso ${p}` })),
    estado.piso ? String(estado.piso) : undefined
  );
  estado.piso = elegido ? Number(elegido) : null;
  pintarMapa();
  $('mapa-actualizado').textContent = `Actualizado a las ${formatearHora(publica.actualizadoEn)}`;
}

let consulta = null;
$('filtro-parqueadero').addEventListener('change', (e) => {
  estado.idParqueadero = Number(e.target.value);
  estado.piso = null;
  consulta?.ahora();
});
$('filtro-tipo').addEventListener('change', (e) => {
  estado.tipo = e.target.value;
  consulta?.ahora();
});

async function iniciar() {
  let sedes;
  try {
    sedes = (await consultarDisponibilidad()).parqueaderos;
  } catch (error) {
    mostrarAviso(error.message, 'error');
    return;
  }
  $('filtro-parqueadero').replaceChildren(
    ...sedes.map((s) => {
      const opcion = clonar('tpl-opcion');
      opcion.value = String(s.idParqueadero);
      opcion.textContent = s.nombre;
      return opcion;
    })
  );
  estado.idParqueadero = sedes[0]?.idParqueadero ?? null;
  if (!estado.idParqueadero) return pintarMapa();
  consulta = consultarCada(async () => {
    try {
      await consultar();
    } catch (error) {
      if (error.status !== 401) $('mapa-actualizado').textContent = error.message;
    }
  }, 10000);
}

if (marco?.permitido) iniciar();
