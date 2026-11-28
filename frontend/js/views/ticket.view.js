// Página · Movimientos › Ticket (HU-32 · RF-MOV-07, RF-MOV-08): vista de impresión de 80 mm y envío al
// correo del propietario. El correo nunca se muestra completo (RNF-PRI-02).
import { obtenerTicket, enviarTicket } from '../services/tickets.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { ponerTicket } from '../components/organismos/ticket.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { botonCargando } from '../components/atomos/boton.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, parametro, mostrar } from '../utils/dom.js';

const marco = montarMarco({ permiso: 'movimientos.ver', alSalir: cerrarSesion });

const codigo = (parametro('codigo') || '').trim().toUpperCase();

async function cargar() {
  try {
    const ticket = await obtenerTicket(codigo);
    document.title = `PARKO · Ticket ${ticket.codigo}`;
    ponerTicket($('ticket'), { ...ticket, parqueadero: ticket.parqueadero.nombre });
    mostrar($('ticket-hoja'));
    mostrar($('ticket-imprimir'));
    // RF-MOV-07: el envío solo se ofrece si el propietario tiene correo.
    mostrar($('ticket-enviar'), ticket.tieneCorreo && tienePermiso('movimientos.crear'));
  } catch (error) {
    if (error.status === 404 || error.status === 422) mostrar($('ticket-no-encontrado'));
    else if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
}

$('ticket-imprimir').addEventListener('click', () => window.print());

$('ticket-enviar').addEventListener('click', async (e) => {
  const boton = e.currentTarget;
  botonCargando(boton, true, 'Enviando…');
  try {
    const { enviadoA } = await enviarTicket(codigo);
    mostrarAviso(`Ticket enviado a ${enviadoA}`, 'success');
  } catch (error) {
    if (error.status !== 401 && error.status !== 403) mostrarAviso(error.message, 'error');
  } finally {
    botonCargando(boton, false);
  }
});

if (marco?.permitido) {
  if (codigo) cargar();
  else mostrar($('ticket-no-encontrado'));
}
