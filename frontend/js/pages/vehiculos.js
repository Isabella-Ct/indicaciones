/**
 * Vehículos — REQ-CAR-1 (crear: admin/operador), REQ-CAR-2 (editar: admin),
 * REQ-USR-6 (asignar propietario a un vehículo sin dueño: admin/operador),
 * REQ-CAR-3 (cambiar propietario: admin). Wireframe 02 corregido.
 * HTML en app/vehiculos.html.
 */
import { montarMarco } from './comun/marco-app.js';
import { abrirModal, cerrarModal, mostrarAviso } from './comun/dialogos.js';
import { ponerChip, marcarCampo, mostrarAlerta, botonCargando } from './comun/plantillas.js';
import { conectarTabla, conectarBusqueda, texto } from './comun/tablas.js';
import { conectarSelectorUsuario } from './comun/selector-usuario.js';
import {
  listarVehiculos,
  crearVehiculo,
  actualizarVehiculo,
  cambiarPropietario,
  historialPropietarios,
} from '../services/vehiculos.service.js';
import { buscarClientes } from '../services/usuarios.service.js';
import { normalizarPlaca, esPlacaValida, formatearPlaca } from '../utils/placa.js';
import { formatearFechaHora } from '../utils/formato.js';
import { tienePermiso } from '../utils/sesion.js';

const $ = (id) => document.getElementById(id);
const mostrar = (nodo, visible) => nodo.classList.toggle('hidden', !visible);
const estado = {
  sesion: null,
  filtros: {
    placa: '',
    tipo: '',
    propietario: '',
    q: '',
    pagina: 1,
    limite: 20,
    orden: 'placa',
    dir: 'asc',
  },
  enfocarOrden: false,
};
const puede = (codigo) => tienePermiso(estado.sesion, codigo);
const MENSAJE_PLACA = {
  carro: 'Carro: 3 letras y 3 números (ej. ABC123).',
  moto: 'Moto: 3 letras, 2 números y una letra opcional (ej. ABC12D).',
};
const describirPersona = (p) => `${p.nombre_completo} · ${p.tipo_documento} ${p.numero_documento}`;

// ---------------------------------------------------------------------------
// Listado
// ---------------------------------------------------------------------------
const tabla = conectarTabla($('tabla-vehiculos'), {
  plantilla: 'tpl-vehiculo',
  rellenar: (fila, v) => {
    const [placa, tipo, marca, color, propietario, chip, acciones] = fila.cells;
    placa.firstElementChild.textContent = formatearPlaca(v.placa);
    const moto = v.tipo === 'moto';
    tipo
      .querySelector('use')
      .setAttribute('href', `/assets/icons.svg#${moto ? 'i-moto' : 'i-car'}`);
    tipo.querySelector('span > span').textContent = moto ? 'Moto' : 'Carro';
    marca.textContent = texto(`${v.marca ?? ''} ${v.modelo ?? ''}`.trim());
    color.textContent = texto(v.color);
    const [conDueno, sinDueno] = propietario.children;
    mostrar(conDueno, Boolean(v.propietario));
    mostrar(sinDueno, !v.propietario);
    if (v.propietario) {
      conDueno.firstElementChild.textContent = v.propietario.nombre_completo;
      conDueno.lastElementChild.textContent = `${v.propietario.tipo_documento} ${v.propietario.numero_documento}`;
    }
    ponerChip(
      chip.firstElementChild,
      v.activo ? 'Activo' : 'Inactivo',
      v.activo ? 'free' : 'neutral'
    );

    const [editar, dueno, historial] = acciones.firstElementChild.children;
    if (puede('vehiculos.editar')) {
      mostrar(editar, true);
      editar.setAttribute('aria-label', `Editar ${v.placa}`);
      editar.addEventListener('click', () => abrirFormulario(v, editar));
    }
    const asignar = !v.propietario && puede('vehiculos.crear');
    const cambiar = v.propietario && puede('vehiculos.reasignar');
    if (asignar || cambiar) {
      mostrar(dueno, true);
      dueno.querySelector('span').textContent = asignar ? 'Asignar dueño' : 'Cambiar dueño';
      dueno.setAttribute(
        'aria-label',
        asignar ? `Asignar propietario a ${v.placa}` : `Cambiar propietario de ${v.placa}`
      );
      dueno.addEventListener('click', () => abrirPropietario(v, dueno));
    }
    historial.setAttribute('aria-label', `Historial de ${v.placa}`);
    historial.addEventListener('click', () => abrirHistorial(v, historial));
  },
  onOrden: (clave) => {
    const f = estado.filtros;
    f.dir = f.orden === clave && f.dir === 'asc' ? 'desc' : 'asc';
    f.orden = clave;
    f.pagina = 1;
    estado.enfocarOrden = true;
    recargar();
  },
  onPagina: (pagina) => {
    estado.filtros.pagina = pagina;
    recargar();
  },
});

async function recargar() {
  tabla.cargando(true);
  try {
    const { data, meta } = await listarVehiculos(estado.filtros);
    tabla.pintar(data, { meta, orden: { clave: estado.filtros.orden, dir: estado.filtros.dir } });
    if (estado.enfocarOrden) {
      $('tabla-vehiculos')
        .querySelector('th[aria-sort="ascending"] button, th[aria-sort="descending"] button')
        ?.focus();
      estado.enfocarOrden = false;
    }
  } catch (error) {
    mostrarAviso(error.message, 'error');
  } finally {
    tabla.cargando(false);
  }
}

function aplicar(clave, valor) {
  estado.filtros[clave] = valor;
  estado.filtros.pagina = 1;
  recargar();
}

// ---------------------------------------------------------------------------
// Registrar (admin/operador) y editar (admin)
// ---------------------------------------------------------------------------
const f = {
  formulario: $('form-vehiculo'),
  placa: $('vehiculo-placa'),
  marca: $('vehiculo-marca'),
  modelo: $('vehiculo-modelo'),
  color: $('vehiculo-color'),
  activo: $('vehiculo-activo'),
  alerta: $('vehiculo-alerta'),
  guardar: $('vehiculo-guardar'),
  editando: null,
};
const tipoVehiculo = () => f.formulario.querySelector('input[name="tipo"]:checked').value;
const propietarioNuevo = conectarSelectorUsuario('vehiculo-propietario', {
  buscar: buscarClientes,
});

f.placa.addEventListener('input', () => {
  f.placa.value = normalizarPlaca(f.placa.value);
});
f.formulario.addEventListener('change', (e) => {
  if (e.target.name === 'tipo')
    $('vehiculo-placa-ayuda').textContent = MENSAJE_PLACA[e.target.value];
});

function abrirFormulario(vehiculo, origen) {
  f.editando = vehiculo;
  const tipo = vehiculo?.tipo ?? 'carro';
  $('modal-vehiculo-titulo').textContent = vehiculo ? 'Editar vehículo' : 'Registrar vehículo';
  $('modal-vehiculo-subtitulo').textContent = vehiculo
    ? `// placa ${vehiculo.placa}`
    : '// placa, tipo, marca, modelo, color y propietario';
  f.guardar.querySelector('span').textContent = vehiculo ? 'Guardar cambios' : 'Registrar vehículo';
  f.placa.value = vehiculo?.placa ?? '';
  f.marca.value = vehiculo?.marca ?? '';
  f.modelo.value = vehiculo?.modelo ?? '';
  f.color.value = vehiculo?.color ?? '';
  f.formulario.querySelector(`input[name="tipo"][value="${tipo}"]`).checked = true;
  $('vehiculo-placa-ayuda').textContent = MENSAJE_PLACA[tipo];
  // Al editar se cambia el estado; al registrar se elige el propietario.
  mostrar($('vehiculo-activo-campo'), Boolean(vehiculo));
  f.activo.checked = Boolean(vehiculo?.activo);
  mostrar($('vehiculo-propietario'), !vehiculo);
  propietarioNuevo.poner(null);
  [f.placa, f.marca, f.modelo, f.color].forEach((c) => marcarCampo(c, ''));
  mostrarAlerta(f.alerta, '');
  abrirModal($('modal-vehiculo'), { origen });
}

function validarVehiculo() {
  let ok = true;
  const tipo = tipoVehiculo();
  if (!f.placa.value) ok = marcarCampo(f.placa, 'La placa es obligatoria.');
  else if (!esPlacaValida(f.placa.value, tipo)) ok = marcarCampo(f.placa, MENSAJE_PLACA[tipo]);
  for (const control of [f.marca, f.modelo, f.color]) {
    if (!control.value.trim()) ok = marcarCampo(control, 'Este campo es obligatorio.');
  }
  return ok;
}

f.formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mostrarAlerta(f.alerta, '');
  [f.placa, f.marca, f.modelo, f.color].forEach((c) => marcarCampo(c, ''));
  propietarioNuevo.error('');
  if (!validarVehiculo()) {
    f.formulario.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  const datos = {
    placa: f.placa.value,
    tipo: tipoVehiculo(),
    marca: f.marca.value.trim(),
    modelo: f.modelo.value.trim(),
    color: f.color.value.trim(),
  };
  botonCargando(f.guardar, true, 'Guardando…');
  try {
    if (f.editando) {
      await actualizarVehiculo(f.editando.id, { ...datos, activo: f.activo.checked });
      mostrarAviso(`Vehículo ${datos.placa} actualizado.`, 'success');
    } else {
      const propietario = propietarioNuevo.valor();
      await crearVehiculo({ ...datos, usuario_id: propietario ? propietario.id : null });
      mostrarAviso(`Vehículo ${datos.placa} registrado.`, 'success');
    }
    cerrarModal($('modal-vehiculo'));
    await recargar();
  } catch (error) {
    const campos = { placa: f.placa, marca: f.marca, modelo: f.modelo, color: f.color };
    for (const d of error.detalles ?? []) {
      if (campos[d.campo]) marcarCampo(campos[d.campo], d.mensaje);
      if (d.campo === 'usuario_id') propietarioNuevo.error(d.mensaje);
    }
    mostrarAlerta(f.alerta, error.message);
  } finally {
    botonCargando(f.guardar, false);
  }
});

// ---------------------------------------------------------------------------
// Asignar (sin dueño: admin/operador) o cambiar propietario (con dueño: admin)
// ---------------------------------------------------------------------------
const p = { vehiculo: null, motivo: $('propietario-motivo'), alerta: $('propietario-alerta') };
const nuevoDueno = conectarSelectorUsuario('propietario-nuevo', { buscar: buscarClientes });

function abrirPropietario(vehiculo, origen) {
  p.vehiculo = vehiculo;
  const tieneDueno = Boolean(vehiculo.propietario);
  $('modal-propietario-titulo').textContent = tieneDueno
    ? 'Cambiar propietario'
    : 'Asignar propietario';
  $('modal-propietario-subtitulo').textContent = tieneDueno
    ? '// el cambio queda en el historial del vehículo'
    : '// solo clientes activos';
  document.querySelector('label[for="propietario-nuevo-documento"]').firstChild.textContent =
    tieneDueno ? 'Nuevo propietario' : 'Propietario';
  $('propietario-guardar').querySelector('span').textContent = tieneDueno
    ? 'Cambiar propietario'
    : 'Asignar';
  $('propietario-placa').textContent = formatearPlaca(vehiculo.placa);
  $('propietario-actual').textContent = tieneDueno
    ? describirPersona(vehiculo.propietario)
    : 'Sin propietario';
  // El administrador también puede dejar el vehículo sin propietario.
  mostrar($('propietario-quitar'), tieneDueno && puede('vehiculos.reasignar'));
  p.motivo.value = '';
  marcarCampo(p.motivo, '');
  nuevoDueno.poner(null);
  mostrarAlerta(p.alerta, '');
  abrirModal($('modal-propietario'), { origen });
}

async function enviarPropietario(usuarioId, boton) {
  mostrarAlerta(p.alerta, '');
  marcarCampo(p.motivo, '');
  botonCargando(boton, true, 'Guardando…');
  try {
    const actualizado = await cambiarPropietario(p.vehiculo.id, {
      usuario_id: usuarioId,
      motivo: p.motivo.value,
    });
    mostrarAviso(
      actualizado.propietario
        ? `${p.vehiculo.placa} ahora pertenece a ${actualizado.propietario.nombre_completo}.`
        : `${p.vehiculo.placa} quedó sin propietario.`,
      'success'
    );
    cerrarModal($('modal-propietario'));
    await recargar();
  } catch (error) {
    for (const d of error.detalles ?? []) {
      if (d.campo === 'motivo') marcarCampo(p.motivo, d.mensaje);
      if (d.campo === 'usuario_id') nuevoDueno.error(d.mensaje);
    }
    mostrarAlerta(p.alerta, error.message);
  } finally {
    botonCargando(boton, false);
  }
}

$('propietario-quitar').addEventListener('click', (e) => enviarPropietario(null, e.currentTarget));
$('form-propietario').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const elegido = nuevoDueno.valor();
  if (!elegido) {
    nuevoDueno.error('Busca y elige un cliente.');
    $('propietario-nuevo-documento').focus();
    return;
  }
  enviarPropietario(elegido.id, $('propietario-guardar'));
});

// ---------------------------------------------------------------------------
// Historial de propietarios
// ---------------------------------------------------------------------------
const tablaHistorial = conectarTabla($('tabla-historial'), {
  plantilla: 'tpl-historial',
  rellenar: (fila, h) => {
    const [fecha, de, a, registro, motivo] = fila.cells;
    fecha.textContent = formatearFechaHora(h.fecha);
    de.textContent = h.anterior ? h.anterior.nombre_completo : 'Sin propietario';
    a.textContent = h.nuevo ? h.nuevo.nombre_completo : 'Sin propietario';
    registro.textContent = texto(h.cambiado_por);
    motivo.textContent = texto(h.motivo);
  },
});

async function abrirHistorial(vehiculo, origen) {
  $('modal-historial-subtitulo').textContent = `// placa ${vehiculo.placa}`;
  $('tabla-historial').querySelector('caption').textContent =
    `Historial de propietarios de ${vehiculo.placa}`;
  mostrar($('historial-cargando'), true);
  mostrar($('historial-error'), false);
  mostrar($('historial-contenido'), false);
  abrirModal($('modal-historial'), { origen });
  try {
    tablaHistorial.pintar(await historialPropietarios(vehiculo.id));
    mostrar($('historial-contenido'), true);
  } catch (error) {
    $('historial-error').textContent = error.message;
    mostrar($('historial-error'), true);
  } finally {
    mostrar($('historial-cargando'), false);
  }
}

async function iniciar() {
  const app = await montarMarco({ paginaId: 'vehiculos' });
  if (!app) return;
  estado.sesion = app.sesion;
  if (puede('vehiculos.crear')) {
    $('pagina-acciones').classList.remove('hidden');
    $('accion-nuevo').classList.remove('hidden');
    $('accion-nuevo').addEventListener('click', (e) => abrirFormulario(null, e.currentTarget));
  }
  conectarBusqueda($('filtro-placa'), (valor) => aplicar('placa', valor), {
    transform: normalizarPlaca,
  });
  conectarBusqueda($('filtro-cliente'), (valor) => aplicar('q', valor));
  $('filtro-tipo').addEventListener('change', (e) => aplicar('tipo', e.target.value));
  $('filtro-propietario').addEventListener('change', (e) => aplicar('propietario', e.target.value));
  await recargar();
}

iniciar();
