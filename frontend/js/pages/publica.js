/**
 * Página pública (REQ-WEB-1), sin sesión: portada, disponibilidad en vivo, tarifas
 * vigentes, servicios, pico y placa de hoy, ubicación y contacto. Todos los datos salen
 * de la API pública (solo totales: nunca celdas, placas ni personas).
 * HTML en index.html: aquí solo se rellenan textos y se muestran u ocultan partes.
 */
import { montarMarcoPublico } from './comun/marco-publico.js';
import { clonar } from './comun/plantillas.js';
import { subtituloSede } from '../services/parqueadero.service.js';
import {
  obtenerDisponibilidad,
  obtenerTarifas,
  obtenerPicoPlacaHoy,
  suscribirDisponibilidad,
} from '../services/publico.service.js';
import { formatearCOP, formatearHora } from '../utils/formato.js';

const $ = (id) => document.getElementById(id);
const mostrar = (nodo, visible) => nodo.classList.toggle('hidden', !visible);

// ---------------------------------------------------------------- disponibilidad
const TEXTOS_VIVO = {
  conectando: 'Conectando…',
  'en-vivo': 'En vivo',
  reconectando: 'Reconectando…',
};

function ponerCupos(tipo, t) {
  const libres = t?.disponibles ?? 0;
  const total = t?.habilitadas ?? 0;
  const v = total ? Math.round((libres / total) * 100) : 0;
  $(`cupos-${tipo}`).textContent = String(libres);
  $(`cupos-${tipo}-unidad`).textContent = libres === 1 ? ' libre' : ' libres';
  const medidor = $(`cupos-${tipo}-medidor`);
  medidor.setAttribute('aria-valuenow', String(v));
  medidor.firstElementChild.style.setProperty('--v', String(v));
  $(`cupos-${tipo}-nota`).textContent = total
    ? `de ${total} celdas habilitadas`
    : 'Sin celdas habilitadas';
}

function ponerDisponibilidad(datos) {
  ponerCupos('carro', datos.carro);
  ponerCupos('moto', datos.moto);
  $('disponibilidad-hora').textContent = datos.actualizado_en
    ? `Actualizado a las ${formatearHora(datos.actualizado_en)}`
    : '';
}

function ponerIndicador(estado) {
  const indicador = $('indicador-vivo');
  indicador.className = `molecule-live-status molecule-live-status--${estado}`;
  indicador.textContent = TEXTOS_VIVO[estado];
}

// ---------------------------------------------------------------- tarifas
const fraccion = (t) =>
  t.minutos_fraccion === 1 ? ' por minuto' : ` cada ${t.minutos_fraccion} minutos`;

function ponerPrecio(tipo, t, m) {
  if (t) {
    $(`precio-${tipo}-valor`).textContent = formatearCOP(t.valor_fraccion);
    $(`precio-${tipo}-fraccion`).textContent = fraccion(t);
    $(`precio-${tipo}-tope`).textContent =
      `Nunca pagas más de ${formatearCOP(t.valor_dia_maximo)} por cada 24 horas.`;
    $(`precio-${tipo}-gracia`).textContent = t.minutos_gracia
      ? `Los primeros ${t.minutos_gracia} minutos no se cobran.`
      : 'Pagas solo el tiempo que estuviste.';
  } else {
    $(`precio-${tipo}-valor`).textContent = '';
    $(`precio-${tipo}-fraccion`).textContent = 'Consulta en la caseta';
  }
  mostrar($(`precio-${tipo}-lista`), Boolean(t));
  mostrar($(`precio-${tipo}-planes`), Boolean(m?.mensual));
  if (m?.mensual) {
    $(`precio-${tipo}-mensual`).textContent = formatearCOP(m.mensual);
    mostrar($(`precio-${tipo}-anual-fila`), Boolean(m.anual));
    if (m.anual) $(`precio-${tipo}-anual`).textContent = formatearCOP(m.anual);
  }
}

function ponerTarifas(datos) {
  mostrar($('tarifas-tabla'), Boolean(datos));
  mostrar($('tarifas-error'), !datos);
  if (!datos) return;
  ponerPrecio('carro', datos.carro, datos.mensualidades?.carro);
  ponerPrecio('moto', datos.moto, datos.mensualidades?.moto);
}

// ---------------------------------------------------------------- pico y placa
function ponerRegla(tipo, regla) {
  const hay = regla.digitos.length > 0;
  const digitos = $(`pico-${tipo}-digitos`);
  digitos.replaceChildren(
    ...regla.digitos.map((d) => {
      const span = clonar('tpl-digito');
      span.textContent = String(d);
      return span;
    })
  );
  digitos.setAttribute('aria-label', `Dígitos restringidos: ${regla.digitos.join(', ')}`);
  mostrar(digitos, hay);
  mostrar($(`pico-${tipo}-libre`), !hay);
  $(`pico-${tipo}-texto`).textContent = hay
    ? `Según el ${regla.criterio}, de ${regla.horarios.join(' y ')}.`
    : 'Hoy pueden circular todas las placas.';
}

function ponerPicoPlaca(datos) {
  mostrar($('pico-reglas'), Boolean(datos));
  mostrar($('pico-error'), !datos);
  if (!datos) return;
  $('pico-placa-subtitulo').textContent = `${datos.dia_nombre} ${datos.fecha}`;
  ponerRegla('carro', datos.carro);
  ponerRegla('moto', datos.moto);
}

// ---------------------------------------------------------------- sede y mapa
function ponerSede(sede) {
  if (!sede) return;
  $('hero-sede').textContent = subtituloSede(sede) || 'Parqueadero ABC · Medellín';
  $('hero-direccion').textContent = `${sede.direccion}, ${sede.ciudad}`;
  $('hero-horario').textContent = sede.horario;
  mostrar($('hero-datos'), true);

  const direccion = `${sede.direccion}, ${sede.ciudad}`;
  $('contacto-direccion').textContent = direccion;
  $('contacto-horario').textContent = sede.horario ?? 'Abierto 24 horas';
  $('contacto-telefono').textContent = sede.telefono ?? '—';

  const mapa = sede.ubicacion;
  if (!mapa) return;
  const d = 0.004;
  const bbox = [mapa.lon - d, mapa.lat - d * 0.75, mapa.lon + d, mapa.lat + d * 0.75]
    .map((n) => n.toFixed(5))
    .join('%2C');
  const iframe = $('contacto-mapa-iframe');
  iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${mapa.lat}%2C${mapa.lon}`;
  iframe.title = `Mapa de la ubicación: ${direccion}`;
  const enlace = $('contacto-mapa-enlace');
  enlace.href = `https://www.openstreetmap.org/?mlat=${mapa.lat}&mlon=${mapa.lon}#map=${mapa.zoom ?? 17}/${mapa.lat}/${mapa.lon}`;
  mostrar(enlace, true);
  mostrar($('contacto-mapa'), true);
}

async function iniciar() {
  obtenerDisponibilidad()
    .then(ponerDisponibilidad)
    .catch(() => {});
  suscribirDisponibilidad({ onDisponibilidad: ponerDisponibilidad, onEstado: ponerIndicador });

  const [sede, tarifas, picoPlaca] = await Promise.all([
    montarMarcoPublico(),
    obtenerTarifas().catch(() => null),
    obtenerPicoPlacaHoy().catch(() => null),
  ]);
  ponerSede(sede);
  ponerTarifas(tarifas);
  ponerPicoPlaca(picoPlaca);
}

iniciar();
