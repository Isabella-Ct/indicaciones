// Página · Configuración › Pico y placa (HU-29, HU-30): tabla semanal por día y tipo de vehículo, nueva,
// editar y eliminar restricciones; con 409 ofrece editar la restricción que ya existe.
import {
  listarRestricciones,
  crearRestriccion,
  actualizarRestriccion,
  eliminarRestriccion,
  restriccionHoy,
} from '../services/restricciones.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTablaSemanal } from '../components/organismos/tabla-semanal.js';
import { abrirDialogo, cerrarDialogo, confirmar } from '../components/organismos/modal.js';
import { ponerPicoPlaca } from '../components/moleculas/aviso-pico-placa.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { botonCargando } from '../components/atomos/boton.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, mostrar } from '../utils/dom.js';

const marco = montarMarco({ permiso: 'restricciones.ver', alSalir: cerrarSesion });

const puede = {
  crear: tienePermiso('restricciones.crear'),
  editar: tienePermiso('restricciones.editar'),
  eliminar: tienePermiso('restricciones.cambiar_estado'),
};
/** Estado de la página: las restricciones cargadas y la que se edita (los datos no van en el DOM). */
const estado = { filtro: 'activo', restricciones: [], editando: null, existente: null };

// ---------------------------------------------------------------- tabla semanal (HU-29 E1)
const tabla = conectarTablaSemanal($('tabla-semanal'), {
  puedeEditar: puede.editar,
  puedeEliminar: puede.eliminar,
  onEditar: (r, origen) => abrirFormulario(r, origen),
  onEliminar: (r, origen) => eliminar(r, origen),
});

async function cargar() {
  mostrar($('semana-cargando'));
  try {
    const { data } = await listarRestricciones({ estado: estado.filtro || undefined });
    estado.restricciones = data;
    tabla.pintar(data);
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
  } finally {
    mostrar($('semana-cargando'), false);
  }
  try {
    ponerPicoPlaca($('pico-placa-hoy'), await restriccionHoy());
  } catch {
    // El aviso es informativo: si falla, la tabla sigue disponible.
  }
}

$('filtro-estado').addEventListener('change', (e) => {
  estado.filtro = e.target.value;
  cargar();
});

// ---------------------------------------------------------------- eliminar (HU-29 E4)
async function eliminar(r, origen) {
  const acepta = await confirmar({
    titulo: 'Eliminar restricción',
    mensaje: `Los ${r.tipoVehiculo}s con placa ${r.digitos.join(' o ')} podrán entrar el ${r.nombreDia} desde ahora.`,
    textoConfirmar: 'Eliminar',
    origen,
  });
  if (!acepta) return;
  try {
    await eliminarRestriccion(r.idRestriccion);
    mostrarAviso('Restricción eliminada', 'success');
    cargar();
  } catch (error) {
    if (error.status !== 401 && error.status !== 403) mostrarAviso(error.message, 'error');
  }
}

// ---------------------------------------------------------------- nueva / editar (HU-29 E1–E4)
const dialogo = $('dialogo-restriccion');
const formulario = $('form-restriccion');
const alerta = $('restriccion-alerta');
const guardar = $('restriccion-guardar');
const campo = {
  dia: $('restriccion-dia'),
  tipo: $('restriccion-tipo'),
  posicion: $('restriccion-posicion'),
  estado: $('restriccion-estado'),
  inicio: $('restriccion-inicio'),
  fin: $('restriccion-fin'),
  desde: $('restriccion-desde'),
  hasta: $('restriccion-hasta'),
};
const casillas = () => [...formulario.querySelectorAll('.js-digito')];
const digitos = () => casillas().filter((c) => c.checked).map((c) => Number(c.value));

function marcarDigitos(mensaje) {
  $('restriccion-digitos-error').textContent = mensaje || '';
  $('restriccion-digitos').toggleAttribute('aria-invalid', Boolean(mensaje));
}

function limpiar() {
  limpiarErrores(formulario);
  marcarDigitos('');
  mostrarAlerta(alerta, '');
  mostrar($('restriccion-existente-campo'), false);
  estado.existente = null;
}

// Carro → último dígito; moto → primer dígito (6.1), solo como propuesta al cambiar el tipo.
campo.tipo.addEventListener('change', () => {
  campo.posicion.value = campo.tipo.value === 'moto' ? 'primero' : 'ultimo';
});

function abrirFormulario(r = null, origen) {
  limpiar();
  estado.editando = r;
  $('dialogo-restriccion-titulo').textContent = r ? `Editar restricción · ${r.nombreDia}, ${r.tipoVehiculo}s` : 'Nueva restricción';
  campo.dia.value = String(r?.diaSemana ?? 1);
  campo.tipo.value = r?.tipoVehiculo ?? 'carro';
  campo.posicion.value = r?.posicionDigito ?? 'ultimo';
  campo.inicio.value = r?.horaInicio ?? '05:00';
  campo.fin.value = r?.horaFin ?? '20:00';
  campo.desde.value = r?.vigenteDesde ?? '';
  campo.hasta.value = r?.vigenteHasta ?? '';
  campo.estado.value = r?.estado ?? 'activo';
  mostrar($('restriccion-estado-campo'), Boolean(r) && puede.eliminar);
  const actuales = new Set(r?.digitos ?? []);
  casillas().forEach((c) => (c.checked = actuales.has(Number(c.value))));
  if (dialogo.open) campo.dia.focus();
  else abrirDialogo(dialogo, { origen, foco: campo.dia });
}

function validar() {
  const lista = digitos();
  marcarDigitos(!lista.length ? 'Elija al menos un dígito.' : lista.length > 5 ? 'Elija máximo 5 dígitos.' : '');
  let valido = lista.length >= 1 && lista.length <= 5;
  valido = marcarCampo(campo.inicio, campo.inicio.value ? '' : 'Ingrese la hora de inicio.') && valido;
  valido =
    marcarCampo(campo.fin, !campo.fin.value ? 'Ingrese la hora de fin.' : campo.fin.value <= campo.inicio.value ? 'La hora de fin debe ser posterior a la de inicio.' : '') &&
    valido;
  valido =
    marcarCampo(campo.hasta, campo.hasta.value && campo.desde.value && campo.hasta.value < campo.desde.value ? 'La vigencia debe terminar en la fecha de inicio o después.' : '') &&
    valido;
  if (!valido) (formulario.querySelector('[aria-invalid="true"]') ?? casillas()[0]).focus();
  return valido;
}

function leer() {
  const datos = {
    diaSemana: Number(campo.dia.value),
    tipoVehiculo: campo.tipo.value,
    digitos: digitos(),
    posicionDigito: campo.posicion.value,
    horaInicio: campo.inicio.value,
    horaFin: campo.fin.value,
    vigenteDesde: campo.desde.value || undefined,
    vigenteHasta: campo.hasta.value || null,
  };
  if (estado.editando && puede.eliminar) datos.estado = campo.estado.value;
  return datos;
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiar();
  if (!validar()) return;
  botonCargando(guardar, true, 'Guardando…');
  try {
    if (estado.editando) await actualizarRestriccion(estado.editando.idRestriccion, leer());
    else await crearRestriccion(leer());
    mostrarAviso(estado.editando ? 'Restricción actualizada' : 'Restricción creada', 'success');
    cerrarDialogo(dialogo);
    cargar();
  } catch (error) {
    if (error.status === 401) return;
    if (error.code === 'RESTRICCION_SUPERPUESTA') {
      // HU-29 E2: se ofrece editar la que ya existe.
      mostrarAlerta(alerta, error.message, 'error');
      estado.existente = Number(error.details?.[0]?.mensaje) || null;
      mostrar($('restriccion-existente-campo'), Boolean(estado.existente) && puede.editar);
    } else if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, {
        diaSemana: 'restriccion-dia',
        tipoVehiculo: 'restriccion-tipo',
        posicionDigito: 'restriccion-posicion',
        horaInicio: 'restriccion-inicio',
        horaFin: 'restriccion-fin',
        vigenteDesde: 'restriccion-desde',
        vigenteHasta: 'restriccion-hasta',
        estado: 'restriccion-estado',
      });
      const deDigitos = (error.details ?? []).find((d) => d.campo.split('.')[0] === 'digitos');
      if (deDigitos) marcarDigitos(deDigitos.mensaje);
      if (sinCampo.length && !deDigitos) mostrarAlerta(alerta, sinCampo.join(' '), 'error');
    } else {
      mostrarAlerta(alerta, error.message, 'error');
    }
  } finally {
    botonCargando(guardar, false);
  }
});

$('restriccion-editar-existente').addEventListener('click', async () => {
  let existente = estado.restricciones.find((r) => r.idRestriccion === estado.existente);
  if (!existente) {
    // Puede estar fuera del filtro actual: se busca entre todas.
    const { data } = await listarRestricciones({});
    existente = data.find((r) => r.idRestriccion === estado.existente);
  }
  if (existente) abrirFormulario(existente);
});

// ---------------------------------------------------------------- arranque
if (marco?.permitido) {
  mostrar($('accion-nueva'), puede.crear);
  $('accion-nueva').addEventListener('click', (e) => abrirFormulario(null, e.currentTarget));
  cargar();
}
