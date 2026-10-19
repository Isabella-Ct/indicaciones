/** Diálogo de confirmación con el modal PARKO. Devuelve una promesa con true/false. */
import { el } from '../../utils/dom.js';
import { createModal, openModal, closeModal } from '../../components/organisms/modal/modal.js';
import { createButton } from '../../components/atoms/button/button.js';

/**
 * @param {{ titulo: string, mensaje: string, textoConfirmar?: string, origen?: HTMLElement }} opciones
 * @returns {Promise<boolean>}
 */
export function confirmar({ titulo, mensaje, textoConfirmar = 'Confirmar', origen }) {
  return new Promise((resolver) => {
    let respuesta = false;
    const modal = createModal({
      title: titulo,
      size: 'sm',
      body: [el('p', { text: mensaje })],
      footer: [
        createButton({ label: 'Cancelar', variant: 'ghost', onClick: () => closeModal(modal) }),
        createButton({
          label: textoConfirmar,
          variant: 'dark',
          onClick: () => {
            respuesta = true;
            closeModal(modal);
          },
        }),
      ],
      onClose: () => {
        modal.remove();
        resolver(respuesta);
      },
    });
    openModal(modal, origen);
  });
}
