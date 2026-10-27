/**
 * Marco de las páginas públicas y de autenticación en HTML estático: rellena la sede
 * (subtítulo de la marca y pie) desde la BD. Devuelve la sede o null.
 */
import { obtenerSede, subtituloSede } from '../../services/parqueadero.service.js';

export async function montarMarcoPublico() {
  const sede = await obtenerSede().catch(() => null);
  const subtitulo = document.getElementById('marco-sede');
  if (subtitulo) subtitulo.textContent = subtituloSede(sede);
  const anio = document.getElementById('pie-anio');
  if (anio) anio.textContent = String(new Date().getFullYear());
  const pie = document.getElementById('pie-sede');
  if (pie && sede) {
    pie.textContent = [sede.nombre, `${sede.direccion}, ${sede.ciudad}`, sede.horario]
      .filter(Boolean)
      .join(' · ');
    pie.classList.remove('hidden');
  }
  return sede;
}
