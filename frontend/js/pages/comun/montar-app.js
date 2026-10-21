/**
 * Arma el esqueleto de toda página interna: exige sesión, carga la sede,
 * y monta header + navbar (según permisos) + page-head + footer.
 */
import { el } from '../../utils/dom.js';
import { createAppLayout } from '../../components/templates/app-layout/app-layout.js';
import { createHeader } from '../../components/organisms/header/header.js';
import { createNavbar } from '../../components/organisms/navbar/navbar.js';
import { createFooter } from '../../components/organisms/footer/footer.js';
import { createPageHead } from '../../components/molecules/page-head/page-head.js';
import { createSpinner } from '../../components/atoms/spinner/spinner.js';
import { showToast } from '../../components/molecules/toast/toast.js';
import { obtenerSesion, cerrarSesion } from '../../services/auth.service.js';
import { obtenerSede, subtituloSede } from '../../services/parqueadero.service.js';
import { createEmptyState } from '../../components/molecules/empty-state/empty-state.js';
import { createButton } from '../../components/atoms/button/button.js';
import { itemsPermitidos, puedeVerPagina } from '../../utils/navegacion.js';
import { montarCampana } from './campana.js';
import { leerPuertaPreferida, tomarAviso } from '../../utils/almacen.js';
import {
  esPersonal,
  etiquetaRol,
  nombreCorto,
  RUTA_CAMBIAR_CONTRASENA,
  RUTA_INICIO,
  RUTA_LOGIN,
} from '../../utils/sesion.js';

function puertaDelTurno(sede) {
  const puertas = sede?.puertas ?? [];
  const preferida = puertas.find((p) => p.id === leerPuertaPreferida());
  return (preferida ?? puertas[0])?.nombre ?? '—';
}

async function salir() {
  try {
    await cerrarSesion();
  } finally {
    location.assign(RUTA_LOGIN);
  }
}

/**
 * @param {{
 *   paginaId: string,
 *   cabecera: (sesion: object, sede: object|null) => { titulo: string, subtitulo?: string, acciones?: HTMLElement[] },
 *   abiertaATodos?: boolean,   // pantallas de todos los roles aunque su ítem del menú pida un permiso
 * }} opciones
 * @returns {Promise<{ sesion: object, sede: object|null, main: HTMLElement } | null>}
 */
export async function montarApp({ paginaId, cabecera, abiertaATodos = false }) {
  const raiz = document.getElementById('app');
  raiz.replaceChildren(
    el('div', { className: 'page-loading' }, [createSpinner({ label: 'Cargando PARKO…' })])
  );

  let sesion;
  let sede;
  try {
    [sesion, sede] = await Promise.all([obtenerSesion(), obtenerSede().catch(() => null)]);
  } catch (error) {
    // 401: api.js ya redirige al login. Otro error (servidor caído, 500): aviso con reintento.
    if (error.estado !== 401) {
      raiz.replaceChildren(
        el('div', { className: 'page' }, [
          createEmptyState({
            title: 'No pudimos cargar PARKO',
            text: error.message,
            action: createButton({ label: 'Reintentar', onClick: () => location.reload() }),
          }),
        ])
      );
    }
    return null;
  }
  if (sesion.debe_cambiar_contrasena) {
    location.assign(RUTA_CAMBIAR_CONTRASENA);
    return null;
  }

  const personal = esPersonal(sesion);
  const header = createHeader({
    sede: subtituloSede(sede),
    inicioHref: RUTA_INICIO,
    turno: personal ? `${puertaDelTurno(sede)} · ${nombreCorto(sesion)}` : nombreCorto(sesion),
    turnoLabel: personal ? 'Turno' : 'Sesión',
    usuario: {
      nombre: sesion.nombre_completo,
      rol: etiquetaRol(sesion.rol),
      fotoUrl: sesion.foto_url,
    },
    extra: [montarCampana()],
    menuItems: [
      { label: 'Mi cuenta', icon: 'i-user', href: '/app/mi-cuenta.html' },
      { label: 'Cambiar contraseña', icon: 'i-key', href: RUTA_CAMBIAR_CONTRASENA },
      { label: 'Cerrar sesión', icon: 'i-logout', onClick: salir },
    ],
  });

  // Abrir por URL una pantalla que el rol no tiene: se avisa y la página no carga datos.
  const permitida = abiertaATodos || puedeVerPagina(sesion, paginaId);
  const { titulo, subtitulo, acciones } = permitida
    ? cabecera(sesion, sede)
    : { titulo: 'Sin acceso', subtitulo: 'esta pantalla no está disponible para tu rol' };
  const layout = createAppLayout({
    header,
    navbar: createNavbar({ items: itemsPermitidos(sesion), activeId: paginaId }),
    pageHead: createPageHead({ title: titulo, subtitle: subtitulo, actions: acciones }),
    footer: createFooter({ sede }),
  });
  raiz.replaceChildren(layout);
  if (!permitida) {
    layout.querySelector('main').append(
      createEmptyState({
        title: 'No tienes permiso para ver esta pantalla',
        text: 'Usa el menú para ir a las secciones de tu cuenta.',
        action: createButton({ label: 'Ir al inicio', href: RUTA_INICIO, icon: 'i-home' }),
      })
    );
    return null;
  }

  const aviso = tomarAviso();
  if (aviso) showToast(aviso.mensaje, aviso.variante);

  return { sesion, sede, main: layout.querySelector('main') };
}
