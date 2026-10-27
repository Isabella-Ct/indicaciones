/**
 * Marco de las páginas internas escritas en HTML estático (header, navbar, campana, menú
 * de usuario y pie ya están en la página). Exige sesión, rellena los textos con la sede y
 * el usuario, muestra solo los ítems del menú permitidos al rol y conecta sus eventos.
 */
import { obtenerSesion, cerrarSesion } from '../../services/auth.service.js';
import { obtenerSede, subtituloSede } from '../../services/parqueadero.service.js';
import {
  misNotificaciones,
  conteoNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
  suscribirNotificaciones,
} from '../../services/notificaciones.service.js';
import { itemsPermitidos, puedeVerPagina } from '../../utils/navegacion.js';
import { leerPuertaPreferida, tomarAviso } from '../../utils/almacen.js';
import { formatearFechaCorta, formatearHora, formatearFechaHora } from '../../utils/formato.js';
import {
  esPersonal,
  etiquetaRol,
  nombreCorto,
  RUTA_CAMBIAR_CONTRASENA,
  RUTA_LOGIN,
} from '../../utils/sesion.js';
import { clonar } from './plantillas.js';
import { mostrarAviso } from './dialogos.js';

const RUTA_NOTIFICACIONES = '/app/notificaciones.html';
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- reloj del turno
function iniciarReloj() {
  const actualizar = () => {
    const ahora = new Date();
    $('marco-fecha').textContent = formatearFechaCorta(ahora);
    $('marco-hora').textContent = formatearHora(ahora);
    $('marco-reloj').setAttribute('datetime', ahora.toISOString());
  };
  actualizar();
  const ahora = new Date();
  const restante = (60 - ahora.getSeconds()) * 1000 - ahora.getMilliseconds();
  setTimeout(() => {
    actualizar();
    setInterval(actualizar, 60 * 1000);
  }, restante);
}

// ---------------------------------------------------------------- desplegables
/** Botón que abre/cierra un panel; se cierra con Esc o con un clic fuera. */
function desplegable(contenedor, boton, panel, alAbrir) {
  const abrir = (abierto) => {
    panel.classList.toggle('hidden', !abierto);
    boton.setAttribute('aria-expanded', String(abierto));
    if (abierto) alAbrir?.();
  };
  boton.addEventListener('click', () => abrir(panel.classList.contains('hidden')));
  contenedor.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.classList.contains('hidden')) {
      abrir(false);
      boton.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!contenedor.contains(e.target)) abrir(false);
  });
}

function prepararNavbar(sesion) {
  const permitidos = new Set(itemsPermitidos(sesion).map((i) => i.id));
  document.querySelectorAll('.organism-navbar-item').forEach((item) => {
    item.closest('li').classList.toggle('hidden', !permitidos.has(item.dataset.id));
  });
  const navbar = $('navbar');
  const alternar = $('navbar-alternar');
  alternar.addEventListener('click', () => {
    const abierto = navbar.classList.toggle('is-open');
    alternar.setAttribute('aria-expanded', String(abierto));
    alternar.setAttribute(
      'aria-label',
      abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'
    );
  });
}

function prepararMenuUsuario(sesion) {
  $('menu-usuario-nombre').textContent = sesion.nombre_completo;
  $('menu-usuario-rol').textContent = etiquetaRol(sesion.rol);
  const foto = $('menu-usuario-foto');
  if (sesion.foto_url) {
    foto.src = sesion.foto_url;
    foto.classList.remove('hidden');
  } else {
    $('menu-usuario-iniciales').textContent = sesion.nombre_completo
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }
  desplegable($('menu-usuario'), $('menu-usuario-boton'), $('menu-usuario-lista'));
  $('menu-usuario-salir').addEventListener('click', async () => {
    try {
      await cerrarSesion();
    } finally {
      location.assign(RUTA_LOGIN);
    }
  });
}

// ---------------------------------------------------------------- campana
function prepararCampana() {
  const contador = $('campana-contador');
  const boton = $('campana-boton');
  const lista = $('campana-lista');
  const leerTodas = $('campana-leer-todas');

  function ponerConteo(noLeidas) {
    contador.textContent = noLeidas > 99 ? '99+' : String(noLeidas);
    contador.classList.toggle('hidden', noLeidas === 0);
    leerTodas.disabled = noLeidas === 0;
    boton.setAttribute(
      'aria-label',
      noLeidas ? `Notificaciones: ${noLeidas} sin leer` : 'Notificaciones: ninguna sin leer'
    );
  }

  function ponerVacia(texto) {
    const vacia = clonar('tpl-notificacion-vacia');
    vacia.textContent = texto;
    lista.replaceChildren(vacia);
  }

  function ponerItems(items) {
    if (!items.length) return ponerVacia('No tienes notificaciones.');
    lista.replaceChildren(
      ...items.map((n) => {
        const fila = clonar('tpl-notificacion');
        const item = fila.querySelector('button');
        item.classList.toggle('is-unread', !n.leida);
        item.querySelector('strong').textContent = n.titulo;
        item.querySelector('.organism-notification-bell-item-text').textContent = n.mensaje;
        item.querySelector('small').textContent = formatearFechaHora(n.fecha);
        item.addEventListener('click', async () => {
          try {
            if (!n.leida) await marcarLeida(n.id);
          } catch {
            /* se navega igual */
          }
          location.assign(n.enlace || RUTA_NOTIFICACIONES);
        });
        return fila;
      })
    );
  }

  async function cargar() {
    ponerVacia('Cargando…');
    try {
      const { data, meta } = await misNotificaciones({ limite: 5 });
      ponerItems(data);
      ponerConteo(meta.no_leidas);
    } catch (error) {
      ponerItems([]);
      mostrarAviso(error.message, 'error');
    }
  }

  async function refrescarConteo() {
    try {
      ponerConteo(await conteoNoLeidas());
    } catch {
      /* el contador es secundario */
    }
  }

  desplegable($('campana'), boton, $('campana-panel'), cargar);
  leerTodas.addEventListener('click', async () => {
    try {
      await marcarTodasLeidas();
      ponerConteo(0);
      ponerItems((await misNotificaciones({ limite: 5 })).data);
    } catch (error) {
      mostrarAviso(error.message, 'error');
    }
  });

  // La bandeja de Notificaciones escucha este evento para refrescarse sola.
  const avisar = (detalle) =>
    document.dispatchEvent(new CustomEvent('parko:notificaciones', { detail: detalle }));
  suscribirNotificaciones({
    onConteo: (n) => {
      ponerConteo(n);
      avisar({ tipo: 'conteo', no_leidas: n });
    },
    onNueva: ({ titulo }) => {
      refrescarConteo();
      mostrarAviso(`Nueva notificación: ${titulo}`, 'info');
      avisar({ tipo: 'nueva' });
    },
    // Leídas desde otra pestaña o desde la bandeja.
    onLeidas: () => {
      refrescarConteo();
      avisar({ tipo: 'leidas' });
    },
  });
  refrescarConteo();
}

// ---------------------------------------------------------------- montaje
function puertaDelTurno(sede) {
  const puertas = sede?.puertas ?? [];
  const preferida = puertas.find((p) => p.id === leerPuertaPreferida());
  return (preferida ?? puertas[0])?.nombre ?? '—';
}

function rellenarSede(sede) {
  $('marco-sede').textContent = subtituloSede(sede);
  $('pie-anio').textContent = String(new Date().getFullYear());
  if (sede) {
    $('pie-sede').textContent = [sede.nombre, `${sede.direccion}, ${sede.ciudad}`, sede.horario]
      .filter(Boolean)
      .join(' · ');
    $('pie-sede').classList.remove('hidden');
  }
}

/**
 * @param {{
 *   paginaId: string,
 *   abiertaATodos?: boolean,   // pantallas de todos los roles aunque su ítem del menú pida un permiso
 * }} opciones
 * @returns {Promise<{ sesion: object, sede: object|null } | null>}
 */
export async function montarMarco({ paginaId, abiertaATodos = false }) {
  let sesion;
  let sede;
  try {
    [sesion, sede] = await Promise.all([obtenerSesion(), obtenerSede().catch(() => null)]);
  } catch (error) {
    // 401: api.js ya redirige al login. Otro error (servidor caído, 500): aviso con reintento.
    if (error.estado !== 401) {
      $('pagina-cargando').classList.add('hidden');
      $('pagina-error-texto').textContent = error.message;
      $('pagina-error').classList.remove('hidden');
      $('pagina-error-reintentar').addEventListener('click', () => location.reload());
    }
    return null;
  }
  if (sesion.debe_cambiar_contrasena) {
    location.assign(RUTA_CAMBIAR_CONTRASENA);
    return null;
  }

  const personal = esPersonal(sesion);
  $('marco-turno-etiqueta').textContent = personal ? 'Turno' : 'Sesión';
  $('marco-turno').textContent = personal
    ? `${puertaDelTurno(sede)} · ${nombreCorto(sesion)}`
    : nombreCorto(sesion);
  rellenarSede(sede);
  iniciarReloj();
  prepararNavbar(sesion);
  prepararMenuUsuario(sesion);
  prepararCampana();

  $('pagina-cargando').classList.add('hidden');
  $('app').classList.remove('hidden');

  if (!abiertaATodos && !puedeVerPagina(sesion, paginaId)) {
    $('pagina-titulo').textContent = 'Sin acceso';
    $('pagina-subtitulo').textContent = '// esta pantalla no está disponible para tu rol';
    $('pagina-contenido').classList.add('hidden');
    $('pagina-sin-acceso').classList.remove('hidden');
    return null;
  }

  const aviso = tomarAviso();
  if (aviso) mostrarAviso(aviso.mensaje, aviso.variante);
  return { sesion, sede };
}
