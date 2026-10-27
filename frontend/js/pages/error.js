/** Página de error (500 o servidor caído) con el estilo PARKO (HTML en error.html). */
import { montarMarcoPublico } from './comun/marco-publico.js';

document.getElementById('error-reintentar').addEventListener('click', () => history.back());
montarMarcoPublico();
