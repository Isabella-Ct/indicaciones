/**
 * Molécula · consulta periódica: repite una consulta cada `ms` milisegundos para que el mapa y la
 * disponibilidad se actualicen solos (RF-CLD-21: ≤ 10 s). Se pausa con la pestaña oculta y, al
 * volver, consulta de inmediato. No llama a la API: la página le pasa la función que consulta.
 */

/**
 * @param {() => Promise<void>} consultar
 * @param {number} [ms]
 * @returns {{ ahora: () => Promise<void>, detener: () => void }}
 */
export function consultarCada(consultar, ms = 10000) {
  let temporizador = null;
  let enCurso = false;

  async function ejecutar() {
    clearTimeout(temporizador);
    if (!enCurso) {
      enCurso = true;
      try {
        await consultar();
      } catch {
        // La página ya informa el error; la siguiente vuelta lo intenta de nuevo.
      } finally {
        enCurso = false;
      }
    }
    if (!document.hidden) temporizador = setTimeout(ejecutar, ms);
  }

  const alCambiarVisibilidad = () => {
    if (document.hidden) clearTimeout(temporizador);
    else ejecutar();
  };
  document.addEventListener('visibilitychange', alCambiarVisibilidad);

  ejecutar();
  return {
    ahora: ejecutar,
    detener() {
      clearTimeout(temporizador);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    },
  };
}
