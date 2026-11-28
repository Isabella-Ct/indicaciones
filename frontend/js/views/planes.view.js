// Página · Configuración › Planes de membresía (HU-45): listado con filtros, nuevo plan, edición y activar /
// inactivar (las membresías vigentes de un plan inactivo se mantienen hasta su fin).
import { listarPlanes, crearPlan, actualizarPlan, cambiarEstadoPlan } from '../services/membresias.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { abrirDialogo, cerrarDialogo, confirmar } from '../components/organismos/modal.js';
import { ponerPrecio } from '../components/moleculas/precio.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChipActivo } from '../components/atomos/chip-estado.js';
import { botonCargando } from '../components/atomos/boton.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, mostrar } from '../utils/dom.js';
import { plural } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'planes.ver', alSalir: cerrarSesion });

const TIPO = { carro: 'Carros', moto: 'Motos' };
const puede = { crear: tienePermiso('planes.crear'), editar: tienePermiso('planes.editar'), estado: tienePermiso('planes.cambiar_estado') };
/** Estado de la página: página actual, filtros y el plan en edición. */
const estado = { page: 1, filtros: { tipoVehiculo: '', estado: '' }, editando: null };

// ---------------------------------------------------------------- listado
const tabla = conectarTabla($('tabla-planes'), {
  plantilla: 'tpl-plan',
  idDe: (p) => p.idPlan,
  onPagina: (pagina) => cargar(pagina),
  rellenar(fila, p) {
    fila.querySelector('.js-nombre').textContent = p.nombre;
    fila.querySelector('.js-beneficios').textContent = p.beneficios ?? '';
    fila.querySelector('.js-vehiculo').textContent = TIPO[p.tipoVehiculo];
    ponerPrecio(fila.querySelector('.js-valor'), p.valorMensual);
    fila.querySelector('.js-dias').textContent = plural(p.diasVigencia, 'día');
    fila.querySelector('.js-activas').textContent = String(p.membresiasActivas);
    ponerChipActivo(fila.querySelector('.js-estado'), p.estado);
    const editar = fila.querySelector('.js-editar');
    editar.classList.toggle('hidden', !puede.editar);
    editar.setAttribute('aria-label', `Editar el plan ${p.nombre}`);
    editar.addEventListener('click', () => abrirFormulario(p, editar));
    const cambiar = fila.querySelector('.js-cambiar');
    cambiar.classList.toggle('hidden', !puede.estado);
    cambiar.querySelector('span').textContent = p.estado === 'activo' ? 'Inactivar' : 'Activar';
    cambiar.setAttribute('aria-label', `${p.estado === 'activo' ? 'Inactivar' : 'Activar'} el plan ${p.nombre}`);
    cambiar.addEventListener('click', () => alternarEstado(p, cambiar));
  },
});

async function cargar(page = estado.page) {
  estado.page = page;
  tabla.cargando(true);
  try {
    const { data, meta } = await listarPlanes({ ...estado.filtros, page });
    tabla.pintar(data, meta);
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
    tabla.pintar([]);
  } finally {
    tabla.cargando(false);
  }
}

for (const [id, clave] of [
  ['filtro-vehiculo', 'tipoVehiculo'],
  ['filtro-estado', 'estado'],
]) {
  $(id).addEventListener('change', (e) => {
    estado.filtros[clave] = e.target.value;
    cargar(1);
  });
}

// ---------------------------------------------------------------- activar / inactivar (HU-45 E3)
async function alternarEstado(p, origen) {
  const nuevo = p.estado === 'activo' ? 'inactivo' : 'activo';
  if (nuevo === 'inactivo') {
    const mensaje = p.membresiasActivas
      ? `El plan deja de ofrecerse. Sus ${plural(p.membresiasActivas, 'membresía activa', 'membresías activas')} siguen vigentes hasta su fin.`
      : 'El plan deja de ofrecerse para nuevas suscripciones y renovaciones.';
    const acepta = await confirmar({ titulo: `Inactivar ${p.nombre}`, mensaje, textoConfirmar: 'Inactivar', origen });
    if (!acepta) return;
  }
  try {
    await cambiarEstadoPlan(p.idPlan, nuevo);
    mostrarAviso(nuevo === 'inactivo' ? 'Plan inactivado' : 'Plan activado', 'success');
    cargar();
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
}

// ---------------------------------------------------------------- nuevo / editar (HU-45 E1, E2, E4)
const dialogo = $('dialogo-plan');
const formulario = $('form-plan');
const alerta = $('plan-alerta');
const campo = { nombre: $('plan-nombre'), vehiculo: $('plan-vehiculo'), valor: $('plan-valor'), dias: $('plan-dias'), beneficios: $('plan-beneficios') };

function abrirFormulario(p = null, origen) {
  estado.editando = p;
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  $('dialogo-plan-titulo').textContent = p ? `Editar plan · ${p.nombre}` : 'Nuevo plan';
  campo.nombre.value = p?.nombre ?? '';
  campo.vehiculo.value = p?.tipoVehiculo ?? 'carro';
  campo.valor.value = p ? String(p.valorMensual) : '';
  campo.dias.value = String(p?.diasVigencia ?? 30);
  campo.beneficios.value = p?.beneficios ?? '';
  abrirDialogo(dialogo, { origen, foco: campo.nombre });
}

function leer() {
  return {
    nombre: campo.nombre.value.trim(),
    tipoVehiculo: campo.vehiculo.value,
    valorMensual: campo.valor.value === '' ? null : Number(campo.valor.value),
    diasVigencia: campo.dias.value === '' ? null : Number(campo.dias.value),
    beneficios: campo.beneficios.value.trim() || null,
  };
}

function validar(d) {
  const reglas = [
    [campo.nombre, d.nombre.length < 3 || d.nombre.length > 60 ? 'El nombre debe tener entre 3 y 60 caracteres.' : ''],
    [campo.valor, !(d.valorMensual > 0) ? 'El valor debe ser mayor que 0.' : ''],
    [campo.dias, !Number.isInteger(d.diasVigencia) || d.diasVigencia < 1 || d.diasVigencia > 366 ? 'Los días de vigencia van de 1 a 366.' : ''],
    [campo.beneficios, (d.beneficios ?? '').length > 300 ? 'Los beneficios admiten máximo 300 caracteres.' : ''],
  ];
  const valido = reglas.map(([control, mensaje]) => marcarCampo(control, mensaje)).every(Boolean);
  if (!valido) formulario.querySelector('[aria-invalid="true"]')?.focus();
  return valido;
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  const datos = leer();
  if (!validar(datos)) return;
  const boton = $('plan-guardar');
  botonCargando(boton, true, 'Guardando…');
  try {
    if (estado.editando) await actualizarPlan(estado.editando.idPlan, datos);
    else await crearPlan(datos);
    mostrarAviso(estado.editando ? 'Plan actualizado' : 'Plan creado', 'success');
    cerrarDialogo(dialogo);
    cargar(estado.editando ? estado.page : 1);
  } catch (error) {
    if (error.status === 401) return;
    if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, {
        nombre: 'plan-nombre',
        tipoVehiculo: 'plan-vehiculo',
        valorMensual: 'plan-valor',
        diasVigencia: 'plan-dias',
        beneficios: 'plan-beneficios',
      });
      if (sinCampo.length) mostrarAlerta(alerta, sinCampo.join(' '), 'error');
    } else {
      // PLAN_DUPLICADO, PLAN_EN_USO, PLAN_NO_ENCONTRADO…
      mostrarAlerta(alerta, error.message, 'error');
    }
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------- arranque
if (marco?.permitido) {
  mostrar($('accion-nuevo'), puede.crear);
  $('accion-nuevo').addEventListener('click', (e) => abrirFormulario(null, e.currentTarget));
  cargar(1);
}
