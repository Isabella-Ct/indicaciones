/**
 * Conecta la campana del header (organism notification-bell) con la API y el SSE de
 * notificaciones. Cada cambio se avisa también con el evento `parko:notificaciones`
 * en `document`, para que la bandeja (notificaciones.html) se refresque en vivo.
 */
import {
  createNotificationBell,
  setBellCount,
  setBellItems,
} from '../../components/organisms/notification-bell/notification-bell.js';
import { showToast } from '../../components/molecules/toast/toast.js';
import {
  misNotificaciones,
  conteoNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
  suscribirNotificaciones,
} from '../../services/notificaciones.service.js';

export const RUTA_NOTIFICACIONES = '/app/notificaciones.html';
const avisar = (detalle) =>
  document.dispatchEvent(new CustomEvent('parko:notificaciones', { detail: detalle }));

export function montarCampana() {
  async function refrescarConteo() {
    try {
      setBellCount(campana, await conteoNoLeidas());
    } catch {
      /* el contador es secundario */
    }
  }

  const campana = createNotificationBell({
    verTodasHref: RUTA_NOTIFICACIONES,
    onAbrir: async () => {
      try {
        const { data, meta } = await misNotificaciones({ limite: 5 });
        setBellItems(campana, data);
        setBellCount(campana, meta.no_leidas);
      } catch (error) {
        setBellItems(campana, []);
        showToast(error.message, 'error');
      }
    },
    onSeleccionar: async (n) => {
      try {
        if (!n.leida) await marcarLeida(n.id);
      } catch {
        /* se navega igual */
      }
      location.assign(n.enlace || RUTA_NOTIFICACIONES);
    },
    onLeerTodas: async () => {
      try {
        await marcarTodasLeidas();
        setBellCount(campana, 0);
        setBellItems(campana, (await misNotificaciones({ limite: 5 })).data);
      } catch (error) {
        showToast(error.message, 'error');
      }
    },
  });

  suscribirNotificaciones({
    onConteo: (n) => {
      setBellCount(campana, n);
      avisar({ tipo: 'conteo', no_leidas: n });
    },
    onNueva: ({ titulo }) => {
      refrescarConteo();
      showToast(`Nueva notificación: ${titulo}`, 'info');
      avisar({ tipo: 'nueva' });
    },
    // Leídas desde otra pestaña o desde la bandeja.
    onLeidas: () => {
      refrescarConteo();
      avisar({ tipo: 'leidas' });
    },
  });
  return campana;
}
