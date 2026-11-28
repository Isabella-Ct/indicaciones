/**
 * Organismo · organism-form--grid: datos del pago (spec 010; reglas de la spec 009, RF-FAC-06, RF-FAC-07) para la
 * suscripción, la renovación y el panel del cliente: método, valor recibido con el cambio en vivo (efectivo) y
 * referencia (tarjeta, transferencia o QR). El marcado está en la página con ids `<prefijo>-metodo`,
 * `<prefijo>-recibido`, `<prefijo>-recibido-campo`, `<prefijo>-cambio`, `<prefijo>-referencia` y
 * `<prefijo>-referencia-campo`. No llama a la API: la página envía lo que devuelve `leer()`.
 */
import { marcarCampo } from '../moleculas/campo.js';
import { mostrar } from '../../utils/dom.js';
import { formatearCOP } from '../../utils/formato.js';

/** @param {string} prefijo */
export function conectarFormularioPago(prefijo) {
  const id = (sufijo) => document.getElementById(`${prefijo}-${sufijo}`);
  const metodo = id('metodo');
  const recibido = id('recibido');
  const referencia = id('referencia');
  let total = 0;

  function actualizarCambio() {
    const valor = Number(recibido.value);
    id('cambio').textContent = !recibido.value ? '' : valor >= total ? `Cambio: ${formatearCOP(valor - total)}` : `Faltan ${formatearCOP(total - valor)}`;
  }

  function ajustarMetodo() {
    const efectivo = metodo.value === 'efectivo';
    mostrar(id('recibido-campo'), efectivo);
    mostrar(id('referencia-campo'), !efectivo);
  }

  metodo.addEventListener('change', ajustarMetodo);
  recibido.addEventListener('input', actualizarCambio);

  return {
    /** Deja el formulario listo para cobrar `valor` (el primer método del <select> queda elegido). */
    reiniciar(valor) {
      total = Number(valor) || 0;
      metodo.selectedIndex = 0;
      recibido.value = '';
      referencia.value = '';
      [metodo, recibido, referencia].forEach((c) => marcarCampo(c, ''));
      ajustarMetodo();
      actualizarCambio();
    },
    /** Cambia el valor a cobrar (p. ej. al elegir otro plan). */
    ponerTotal(valor) {
      total = Number(valor) || 0;
      actualizarCambio();
    },
    /** Valida y devuelve { valido, pago } con el cuerpo `pago` de la API. */
    leer() {
      const pago = { metodo: metodo.value };
      let valido;
      if (pago.metodo === 'efectivo') {
        const valor = Number(recibido.value);
        valido = marcarCampo(
          recibido,
          recibido.value === '' ? 'Ingrese el valor recibido.' : valor < total ? `El valor recibido no alcanza: faltan ${formatearCOP(total - valor)}.` : ''
        );
        pago.valorRecibido = valor;
      } else {
        pago.referencia = referencia.value.trim();
        valido = marcarCampo(referencia, pago.referencia.length < 4 || pago.referencia.length > 40 ? 'Ingrese el número de referencia o autorización (4 a 40 caracteres).' : '');
      }
      return { valido, pago };
    },
    /** Pinta los errores `pago.*` de la API junto a su campo; devuelve los mensajes de los demás campos. */
    pintarErrores(error) {
      const controles = { metodo, valorRecibido: recibido, referencia };
      const otros = [];
      for (const detalle of error.details ?? []) {
        const [raiz, campo] = (detalle.campo ?? '').split('.');
        const control = raiz === 'pago' ? controles[campo] : null;
        if (control) marcarCampo(control, detalle.mensaje);
        else otros.push(detalle);
      }
      return otros;
    },
  };
}
