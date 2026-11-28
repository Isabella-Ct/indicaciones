// Reglas puras de incidencias (spec 013, research R-01): tipos, fecha del evento y transiciones de estado
// (RF-INC-03, RF-INC-07, RF-INC-08, RN-28). Sin BD ni HTTP.

const TIPOS = Object.freeze({ rayon: 'Rayón', choque: 'Choque', atropellamiento: 'Atropellamiento', golpe_muro: 'Golpe contra muro' });

/** RF-INC-03: la fecha y hora del evento no puede ser futura (igual a ahora sí vale). */
const fechaEventoValida = (fecha, ahora) => new Date(fecha).getTime() <= new Date(ahora).getTime();

/** RN-28: una cerrada no admite notas ni otro cierre. */
const puedeCambiar = (estado) => estado !== 'cerrada';

/** RF-INC-07: estado después de una nota (la primera pasa «abierta» a «en seguimiento»). */
const estadoTrasNota = (estado) => (estado === 'abierta' ? 'en_seguimiento' : estado);

module.exports = { TIPOS, fechaEventoValida, puedeCambiar, estadoTrasNota };
