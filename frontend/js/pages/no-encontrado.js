/** Página 404 con el estilo PARKO. */
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
          title: 'Página no encontrada',
          text: 'La pantalla que buscas no existe o todavía no está disponible.',
          action: createButton({ label: 'Ir al inicio', href: '/' }),
        }),
      ],
      footer: createFooter({ sede }),
    })
  );
}

iniciar();
