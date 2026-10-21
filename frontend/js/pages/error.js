/** Página de error (500 o servidor caído) con el estilo PARKO. */
import { createPublicLayout } from '../components/templates/public-layout/public-layout.js';
import { createFooter } from '../components/organisms/footer/footer.js';
import { createEmptyState } from '../components/molecules/empty-state/empty-state.js';
import { createButton } from '../components/atoms/button/button.js';
import { obtenerSede, subtituloSede } from '../services/parqueadero.service.js';

async function iniciar() {
  const sede = await obtenerSede().catch(() => null);
  document.getElementById('app').replaceChildren(
    createPublicLayout({
      sede: subtituloSede(sede),
      content: [
        createEmptyState({
          title: 'Algo salió mal',
          text: 'Ocurrió un error inesperado en el servidor. Intenta de nuevo en un momento; si persiste, avisa al administrador.',
          action: [
            createButton({ label: 'Reintentar', onClick: () => history.back() }),
            createButton({ label: 'Ir al inicio', href: '/', variant: 'ghost' }),
          ],
        }),
      ],
      footer: createFooter({ sede }),
    })
  );
}

iniciar();
