/**
 * Membresías / mensualidades (wireframe 07 corregido) — REQ-MEM-1: buscador de cliente →
 * su vehículo → tipo → fecha de inicio; fecha fin y valor los calcula el servidor (solo
 * lectura). Celda fija opcional. Crear y cancelar: admin; el operador consulta.
 * HTML en app/membresias.html.
 */
import { montarMarco } from './comun/marco-app.js';
import { abrirModal, cerrarModal, confirmar, mostrarAviso } from './comun/dialogos.js';
import {
  llenarSelect,
  ponerChip,
  marcarCampo,
  mostrarAlerta,
  botonCargando,
} from './comun/plantillas.js';
import { conectarTabla, conectarBusqueda } from './comun/tablas.js';
import { conectarSelectorUsuario } from './comun/selector-usuario.js';
import {
  listarMembresias,
  cotizarMembresia,
  crearMembresia,
  cancelarMembresia,
  urlFacturaPdf,
} from '../services/facturacion.service.js';
import { buscarClientes } from '../services/usuarios.service.js';
import { listarVehiculos } from '../services/vehiculos.service.js';
import { listarCeldas } from '../services/celdas.service.js';
import { normalizarPlaca, formatearPlaca } from '../utils/placa.js';
import { formatearCOP, formatearFecha, hoyBogota } from '../utils/formato.js';
import { tienePermiso } from '../utils/sesion.js';

const $ = (id) => document.getElementById(id);
const estado = {
  sesion: null,
  filtros: { estado: 'activa', q: '', placa: '', pagina: 1, limite: 20 },
};
const puede = (codigo) => tienePermiso(estado.sesion, codigo);

function chipEstado(chip, m) {
  if (m.estado === 'cancelada') return ponerChip(chip, 'Cancelada', 'out');
  if (m.estado === 'vencida') return ponerChip(chip, 'Vencida');
  if (!m.vigente) return ponerChip(chip, 'Programada', 'reserved');
  if (m.dias_restantes !== null && m.dias_restantes <= 3)
    return ponerChip(chip, `Vence en ${m.dias_restantes} d`, 'occupied');
  return ponerChip(chip, 'Vigente', 'free');
}

const tabla = conectarTabla($('tabla-membresias'), {
  plantilla: 'tpl-membresia',
  rellenar: (fila, m) => {
    const [titular, vehiculo, tipo, vigencia, celda, valor, chip, acciones] = fila.cells;
    const [nombre, documento] = titular.firstElementChild.children;
    nombre.textContent = m.titular.nombre_completo;
    documento.textContent = `${m.titular.tipo_documento} ${m.titular.numero_documento}`;
    vehiculo.firstElementChild.textContent = formatearPlaca(m.vehiculo.placa);
    tipo.textContent = m.tipo === 'anual' ? 'Anual' : 'Mensual';
    vigencia.firstElementChild.textContent = `${formatearFecha(m.fecha_inicio)} → ${formatearFecha(m.fecha_fin)}`;
    celda.textContent = m.celda?.codigo ?? '—';
    valor.firstElementChild.textContent = formatearCOP(m.valor);
    chipEstado(chip.firstElementChild, m);
    const [pdf, boton] = acciones.firstElementChild.children;
    if (m.factura) {
      pdf.classList.remove('hidden');
      pdf.href = urlFacturaPdf(m.factura.id);
      pdf.querySelector('span').textContent = m.factura.numero;
      pdf.setAttribute('aria-label', `Factura ${m.factura.numero} en PDF`);
    }
    if (puede('membresias.gestionar') && m.estado === 'activa') {
      boton.classList.remove('hidden');
      boton.addEventListener('click', () => cancelar(m, boton));
    }
  },
  onPagina: (pagina) => {
    estado.filtros.pagina = pagina;
    recargar();
  },
});

async function recargar() {
  tabla.cargando(true);
  try {
    const { data, meta } = await listarMembresias(estado.filtros);
    tabla.pintar(data, { meta });
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

async function cancelar(m, origen) {
  const ok = await confirmar({
    titulo: `Cancelar membresía de ${m.vehiculo.placa}`,
    mensaje: `${m.titular.nombre_completo} · ${m.tipo} hasta ${formatearFecha(m.fecha_fin)}.${
      m.celda ? ` La celda ${m.celda.codigo} se libera.` : ''
    } No se hace reembolso automático.`,
    textoConfirmar: 'Cancelar membresía',
    origen,
  });
  if (!ok) return;
  try {
    await cancelarMembresia(m.id);
    mostrarAviso('Membresía cancelada.', 'success');
    await recargar();
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Nueva membresía
// ---------------------------------------------------------------------------
const formulario = $('form-membresia');
const vehiculo = $('membresia-vehiculo');
const fecha = $('membresia-fecha');
const celda = $('membresia-celda');
const alerta = $('membresia-alerta');
const guardar = $('membresia-guardar');
const nueva = { cliente: null, vehiculos: [], celdas: null };
const tipo = () => formulario.querySelector('input[name="tipo-membresia"]:checked').value;
const metodo = () => formulario.querySelector('input[name="metodo-membresia"]:checked').value;

function ponerCotizacion(cotizacion, mensaje, error = '') {
  $('membresia-fin').textContent = cotizacion ? formatearFecha(cotizacion.fecha_fin) : '—';
  $('membresia-valor').textContent = cotizacion ? formatearCOP(cotizacion.valor) : '—';
  $('membresia-nota').textContent = mensaje ?? '';
  $('membresia-error').textContent = error;
}

async function cotizar() {
  const vehiculoId = Number(vehiculo.value);
  if (!nueva.cliente || !vehiculoId || !fecha.value) {
    ponerCotizacion(null, 'Calculados por el sistema al elegir vehículo, tipo y fecha.');
    return;
  }
  try {
    const cotizacion = await cotizarMembresia({
      vehiculo_id: vehiculoId,
      tipo: tipo(),
      fecha_inicio: fecha.value,
    });
    ponerCotizacion(
      cotizacion,
      `Valor ${tipo()} para ${cotizacion.tipo_vehiculo}s (configuración).`
    );
  } catch (error) {
    ponerCotizacion(null, '', error.message);
  }
}

async function alElegirVehiculo() {
  const v = nueva.vehiculos.find((x) => x.id === Number(vehiculo.value));
  const opciones = [{ value: '', label: 'Sin celda fija' }];
  if (v) {
    try {
      nueva.celdas ??= await listarCeldas();
      opciones.push(
        ...nueva.celdas
          .filter((c) => c.tipo === v.tipo && c.estado === 'disponible')
          .map((c) => ({
            value: String(c.id),
            label: `${c.codigo} · ${c.piso.nombre}${c.es_accesible ? ' · accesible' : ''}`,
          }))
      );
    } catch {
      /* sin celdas: se puede crear sin celda fija */
    }
  }
  llenarSelect(celda, { opciones });
  celda.disabled = !v;
  await cotizar();
}

const selector = conectarSelectorUsuario('membresia-cliente', {
  buscar: buscarClientes,
  onChange: async (usuario) => {
    nueva.cliente = usuario;
    nueva.vehiculos = [];
    llenarSelect(vehiculo, {
      opciones: [{ value: '', label: usuario ? 'Cargando…' : 'Elige primero el cliente' }],
    });
    vehiculo.disabled = true;
    await cotizar();
    if (!usuario) return;
    try {
      const { data } = await listarVehiculos({ usuario_id: usuario.id, limite: 100 });
      nueva.vehiculos = data.filter((v) => v.activo !== false);
      llenarSelect(vehiculo, {
        opciones: [
          {
            value: '',
            label: nueva.vehiculos.length ? 'Elige el vehículo' : 'El cliente no tiene vehículos',
          },
          ...nueva.vehiculos.map((v) => ({
            value: String(v.id),
            label:
              `${v.placa} · ${v.tipo === 'moto' ? 'Moto' : 'Carro'} · ${v.marca ?? ''} ${v.modelo ?? ''}`.trim(),
          })),
        ],
      });
      vehiculo.disabled = nueva.vehiculos.length === 0;
      if (nueva.vehiculos.length === 1) {
        vehiculo.value = String(nueva.vehiculos[0].id);
        await alElegirVehiculo();
      }
    } catch (error) {
      selector.error(error.message);
    }
  },
});

vehiculo.addEventListener('change', alElegirVehiculo);
fecha.addEventListener('change', cotizar);
formulario.addEventListener('change', (e) => {
  if (e.target.name === 'tipo-membresia') cotizar();
});

function abrirNueva(origen) {
  formulario.querySelector('input[value="mensual"]').checked = true;
  formulario.querySelector('input[value="efectivo"]').checked = true;
  fecha.value = hoyBogota();
  fecha.min = hoyBogota();
  nueva.celdas = null;
  llenarSelect(celda, { opciones: [{ value: '', label: 'Sin celda fija' }] });
  celda.disabled = true;
  [vehiculo, fecha, celda].forEach((c) => marcarCampo(c, ''));
  mostrarAlerta(alerta, '');
  selector.poner(null);
  abrirModal($('modal-membresia'), { origen });
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarAlerta(alerta, '');
  [vehiculo, fecha, celda].forEach((c) => marcarCampo(c, ''));
  selector.error('');
  let ok = true;
  if (!nueva.cliente) {
    selector.error('Elige el cliente.');
    ok = false;
  }
  if (!vehiculo.value) ok = marcarCampo(vehiculo, 'Elige el vehículo.');
  if (!fecha.value || fecha.value < hoyBogota()) ok = marcarCampo(fecha, 'Desde hoy en adelante.');
  if (!ok) return;
  botonCargando(guardar, true, 'Guardando…');
  try {
    const creada = await crearMembresia({
      usuario_id: nueva.cliente.id,
      vehiculo_id: Number(vehiculo.value),
      tipo: tipo(),
      fecha_inicio: fecha.value,
      celda_asignada_id: celda.value ? Number(celda.value) : null,
      metodo_pago: metodo(),
    });
    mostrarAviso(
      `Membresía ${creada.tipo} de ${creada.vehiculo.placa} creada · ${creada.factura?.numero ?? ''}.`,
      'success'
    );
    cerrarModal($('modal-membresia'));
    await recargar();
  } catch (error) {
    const campos = { vehiculo_id: vehiculo, fecha_inicio: fecha, celda_asignada_id: celda };
    for (const d of error.detalles ?? [])
      if (campos[d.campo]) marcarCampo(campos[d.campo], d.mensaje);
    mostrarAlerta(alerta, error.message);
  } finally {
    botonCargando(guardar, false);
  }
});

async function iniciar() {
  const app = await montarMarco({ paginaId: 'membresias' });
  if (!app) return;
  estado.sesion = app.sesion;
  if (puede('membresias.gestionar')) {
    $('pagina-acciones').classList.remove('hidden');
    $('accion-nueva').classList.remove('hidden');
    $('accion-nueva').addEventListener('click', (e) => abrirNueva(e.currentTarget));
  }
  $('filtro-estado').value = estado.filtros.estado;
  $('filtro-estado').addEventListener('change', (e) => aplicar('estado', e.target.value));
  conectarBusqueda($('filtro-titular'), (valor) => aplicar('q', valor));
  conectarBusqueda($('filtro-placa'), (valor) => aplicar('placa', valor), {
    transform: normalizarPlaca,
  });
  await recargar();
}

iniciar();
