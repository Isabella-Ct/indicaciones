// Página pública · Inicio (HU-24): cupos libres de carros y motos por parqueadero, con «Lleno» y la
// hora de actualización, sin iniciar sesión y sin datos personales (RF-CLD-22, RF-CLD-23).
import { consultarDisponibilidad } from '../services/disponibilidad.service.js';
import { consultarCada } from '../components/moleculas/consulta-periodica.js';
import { ponerKpi } from '../components/moleculas/kpi.js';
import { clonar } from '../utils/plantillas.js';
import { $, mostrar } from '../utils/dom.js';
import { formatearHora } from '../utils/formato.js';

const NOMBRE = { carro: 'Carros', moto: 'Motos' };

function tarjeta(tipo, datos) {
  const nodo = clonar('tpl-cupo');
  ponerKpi(nodo, {
    etiqueta: NOMBRE[tipo],
    valor: datos.lleno ? 'Lleno' : String(datos.disponibles),
    nota: datos.lleno ? 'Sin cupos en este momento' : `cupos libres de ${datos.total}`,
    medidor: datos.total ? (datos.disponibles / datos.total) * 100 : 0,
    destacado: !datos.lleno,
  });
  return nodo;
}

async function consultar() {
  try {
    const { actualizadoEn, parqueaderos } = await consultarDisponibilidad();
    $('disponibilidad-sedes').replaceChildren(
      ...parqueaderos.map((p) => {
        const sede = clonar('tpl-sede');
        sede.querySelector('.js-nombre').textContent = p.nombre;
        sede.querySelector('.js-datos').textContent = `${p.direccion} · ${p.horario}`;
        sede.querySelector('.js-tarjetas').append(tarjeta('carro', p.tipos.carro), tarjeta('moto', p.tipos.moto));
        return sede;
      })
    );
    $('disponibilidad-hora').textContent = `Actualizado a las ${formatearHora(actualizadoEn)}`;
    mostrar($('disponibilidad-error'), false);
  } catch (error) {
    $('disponibilidad-error').querySelector('p').textContent = error.message;
    mostrar($('disponibilidad-error'));
  }
}

$('pie-anio').textContent = String(new Date().getFullYear());
consultarCada(consultar, 10000);
