import { el, idUnico } from '../../../utils/dom.js';
import { createModal, openModal, closeModal } from '../modal/modal.js';
import { createTicket, updateTicket } from '../ticket/ticket.js';
import { createField, setFieldError } from '../../molecules/field/field.js';
import { createTiles } from '../../molecules/tiles/tiles.js';
import { createCheck } from '../../molecules/check/check.js';
import { createAlert, setAlert } from '../../molecules/alert/alert.js';
import { createPhotoInput } from '../../molecules/photo-input/photo-input.js';
import { createInput } from '../../atoms/input/input.js';
import { createSelect } from '../../atoms/select/select.js';
import { createTextarea } from '../../atoms/textarea/textarea.js';
import { createButton, setButtonLoading } from '../../atoms/button/button.js';
import { normalizarPlaca, esPlacaValida, formatearPlaca } from '../../../utils/placa.js';
import { formatearFechaHora, formatearCOP } from '../../../utils/formato.js';

const TIPOS = [
  { value: 'carro', label: 'Carro', icon: 'i-car' },
  { value: 'moto', label: 'Moto', icon: 'i-moto' },
];

const textoTarifa = (t) => (t ? `${formatearCOP(t.valor_fraccion)}/${t.unidad}` : '—');

/**
 * Modal "Registrar ingreso" (maqueta, sección 8): formulario + ticket con vista previa
 * en vivo. No llama a la API: la página le pasa las funciones que la usan.
 * @param {{
 *   puertas: Array<{ id: number, nombre: string, tipo: string }>,
 *   puertaId?: number,
 *   celdasLibres: (tipo: 'carro'|'moto') => Array<{ id: number, codigo: string, piso: string, es_accesible: boolean }>,
 *   previsualizar: (placa: string, requiereAccesible: boolean) => Promise<object>,
 *   registrar: (datos: FormData) => Promise<object>,            // devuelve el ticket
 *   registrarVisitante: (vehiculo: object) => Promise<object>,
 *   onPuerta?: (id: number) => void,                           // recordar la puerta
 *   onImprimir?: (ticket: object) => void,
 *   onRegistrado?: (ticket: object) => void,
 * }} props
 * @returns {HTMLDivElement} overlay; ábrelo con abrirEntryModal(overlay, boton)
 */
export function createEntryModal(props) {
  const { puertas, celdasLibres, previsualizar, registrar, registrarVisitante } = props;
  const idForm = idUnico('ingreso');
  const estado = {
    tipo: 'carro',
    preview: null,
    desconocida: false,
    confirmarAccesible: false,
    consulta: 0,
  };

  // ---------------------------------------------------------------- controles
  const puerta = createSelect({
    name: 'puerta_id',
    options: puertas
      .filter((p) => p.tipo !== 'salida')
      .map((p) => ({ value: String(p.id), label: p.nombre })),
    value: props.puertaId ? String(props.puertaId) : undefined,
  });
  const placa = createInput({ name: 'placa', plate: true, placeholder: 'ABC 123', maxLength: 8 });
  const cliente = el('p', { className: 'entry-client', attrs: { 'aria-live': 'polite' } });
  const tiles = createTiles({
    name: 'tipo_vehiculo',
    label: 'Tipo de vehículo',
    options: TIPOS,
    value: 'carro',
    columns: 2,
  });
  const accesible = createCheck({ label: 'Requiere celda accesible', name: 'requiere_accesible' });
  const marca = createInput({ name: 'marca', maxLength: 40, placeholder: 'Marca' });
  const modelo = createInput({ name: 'modelo', maxLength: 40, placeholder: 'Modelo' });
  const color = createInput({ name: 'color', maxLength: 30, placeholder: 'Color' });
  const celda = createSelect({ name: 'celda_id' });
  const hora = createInput({ readOnly: true });
  const observaciones = createTextarea({
    name: 'observaciones_entrada',
    maxLength: 500,
    placeholder: 'Ej. rayón en la puerta trasera derecha',
  });
  const llaves = createCheck({
    label: 'El conductor deja las llaves en la caseta',
    name: 'deja_llaves',
  });
  const foto = createPhotoInput({ label: 'Foto de la placa (lectura, opcional)' });

  const campos = {
    puerta_id: createField({ label: 'Puerta', control: puerta, required: true }),
    placa: createField({ label: 'Placa', control: placa, required: true, full: true }),
    celda_id: createField({ label: 'Espacio asignado', control: celda }),
    hora: createField({
      label: 'Hora de entrada',
      control: hora,
      hint: 'La registra el servidor al generar el ticket.',
    }),
    observaciones_entrada: createField({
      label: 'Observaciones (daños visibles, objetos de valor)',
      control: observaciones,
      full: true,
    }),
  };
  campos.placa.append(cliente);
  const vehiculoNuevo = el('div', { className: 'field field--full entry-vehicle' }, [
    el('span', { className: 'label', text: 'Marca, modelo y color' }),
    el('div', { className: 'entry-vehicle-row' }, [marca, modelo, color]),
    el('p', {
      className: 'field-hint',
      text: 'Solo para placas no registradas: se crea como vehículo de visitante.',
    }),
    el('p', { className: 'field-error', attrs: { 'aria-live': 'polite' } }),
  ]);
  const alerta = createAlert();
  const confirmacion = el('div', { className: 'field--full hidden' });

  const ticket = createTicket({ nota: 'Vista previa: el número se asigna al generar el ticket.' });
  const formulario = el(
    'form',
    { attrs: { id: idForm, novalidate: true }, className: 'form-grid' },
    [
      el('div', { className: 'field--full' }, [alerta]),
      campos.placa,
      tiles,
      el('div', { className: 'field--full' }, [accesible]),
      vehiculoNuevo,
      campos.celda_id,
      campos.hora,
      campos.puerta_id,
      el('div', { className: 'field' }),
      campos.observaciones_entrada,
      el('div', { className: 'field--full' }, [llaves]),
      foto,
      confirmacion,
    ]
  );

  const cancelar = createButton({
    label: 'Cancelar',
    variant: 'ghost',
    onClick: () => closeModal(overlay),
  });
  const generar = createButton({ label: 'Generar ticket', type: 'submit', icon: 'i-print' });
  generar.setAttribute('form', idForm);

  let reloj = null;
  const overlay = createModal({
    title: 'Registrar ingreso',
    subtitle: 'asigna un espacio libre y genera el ticket',
    body: [formulario, ticket],
    footer: [cancelar, generar],
    onClose: () => {
      clearInterval(reloj);
      overlay.remove();
    },
  });
  overlay.querySelector('.modal-body').classList.add('modal-body--split');

  // ---------------------------------------------------------------- vista previa
  /** Rellena el select de celdas (libres del tipo, agrupadas por piso) y preselecciona la sugerida. */
  function opcionesCelda() {
    const p = estado.preview;
    const libres = celdasLibres(estado.tipo);
    const sugerida = p?.celda_sugerida;
    if (p?.celda_fija && sugerida) {
      const origen = p.tipo_cliente === 'mensualidad' ? 'mensualidad' : 'reserva';
      celda.replaceChildren(
        el('option', { text: `${sugerida.codigo} · celda fija (${origen})`, attrs: { value: '' } })
      );
      celda.disabled = true;
      return;
    }
    const grupos = new Map();
    for (const c of libres) {
      if (!grupos.has(c.piso)) grupos.set(c.piso, []);
      const tipo = c.es_accesible ? 'Accesible' : estado.tipo === 'moto' ? 'Moto' : 'Carro';
      grupos.get(c.piso).push({ value: String(c.id), label: `${c.codigo} · ${tipo}` });
    }
    const plantilla = createSelect({
      options: [
        {
          value: '',
          label: sugerida
            ? `Automática (sugerida ${sugerida.codigo})`
            : 'Automática (primera libre)',
        },
      ],
      groups: [...grupos].map(([label, options]) => ({ label, options })),
    });
    celda.replaceChildren(...plantilla.children);
    celda.disabled = false;
    const preseleccionar =
      sugerida && !p?.requiere_confirmacion_accesible && libres.some((c) => c.id === sugerida.id);
    celda.value = preseleccionar ? String(sugerida.id) : '';
  }

  function espacioElegido() {
    const select = celda;
    const p = estado.preview;
    if (p?.celda_fija && p.celda_sugerida) return p.celda_sugerida.codigo;
    const opcion = select.selectedOptions[0];
    if (!opcion || !opcion.value)
      return p?.celda_sugerida?.codigo ? `${p.celda_sugerida.codigo} (sugerida)` : 'Automática';
    const libre = celdasLibres(estado.tipo).find((c) => String(c.id) === opcion.value);
    return libre ? `${libre.codigo} · ${libre.piso}` : opcion.textContent;
  }

  function pintarTicket() {
    const p = estado.preview;
    updateTicket(ticket, {
      numero: 'Al generar',
      placa: placa.value ? formatearPlaca(placa.value) : '',
      espacio: espacioElegido(),
      entrada: hora.value,
      tarifa: textoTarifa(p?.tarifa ?? p?.tarifas?.[estado.tipo]),
      cliente: p?.registrado
        ? p.tipo_cliente === 'mensualidad'
          ? `Mensualidad · ${p.titular}`
          : 'Visitante'
        : placa.value
          ? 'Visitante (nuevo)'
          : '',
      puerta: puerta.selectedOptions[0]?.textContent ?? '',
    });
  }

  function habilitarVehiculoNuevo(activo) {
    estado.desconocida = activo;
    vehiculoNuevo.classList.toggle('is-disabled', !activo);
    for (const control of [marca, modelo, color]) control.disabled = !activo;
    for (const radio of tiles.querySelectorAll('input'))
      radio.disabled = !activo && Boolean(estado.preview?.registrado);
  }

  function elegirTipo(tipo) {
    estado.tipo = tipo;
    tiles.querySelector(`input[value="${tipo}"]`).checked = true;
  }

  function pintarCliente() {
    const p = estado.preview;
    cliente.className = 'entry-client';
    if (!p) return (cliente.textContent = '');
    if (!p.registrado) {
      cliente.textContent = 'Placa nueva · se registrará como visitante';
      cliente.classList.add('entry-client--nuevo');
      return;
    }
    const partes = [
      p.tipo_cliente === 'mensualidad' ? `Mensualidad · ${p.titular}` : 'Visitante',
      [p.vehiculo.marca, p.vehiculo.modelo, p.vehiculo.color].filter(Boolean).join(' '),
    ];
    cliente.textContent = partes.filter(Boolean).join(' · ');
    if (p.pico_placa) {
      cliente.textContent += ` · ⚠ Pico y placa: ${p.pico_placa.descripcion}`;
      cliente.classList.add('entry-client--alerta');
    } else if (p.estadia_abierta) {
      cliente.textContent += ` · ⚠ Ya está dentro (celda ${p.estadia_abierta.celda})`;
      cliente.classList.add('entry-client--alerta');
    } else if (p.sin_cupo) {
      cliente.textContent += ' · ⚠ Sin celdas libres para este tipo';
      cliente.classList.add('entry-client--alerta');
    }
  }

  let espera;
  async function consultarPlaca() {
    const valor = placa.value;
    const turno = ++estado.consulta;
    if (valor.length < 5) {
      estado.preview = null;
      habilitarVehiculoNuevo(false);
      for (const radio of tiles.querySelectorAll('input')) radio.disabled = false;
      pintarCliente();
      opcionesCelda();
      return pintarTicket();
    }
    try {
      const p = await previsualizar(valor, accesible.querySelector('input').checked);
      if (turno !== estado.consulta) return; // llegó una respuesta vieja
      estado.preview = p;
      if (p.registrado) elegirTipo(p.vehiculo.tipo);
      habilitarVehiculoNuevo(!p.registrado);
      pintarCliente();
      opcionesCelda();
      pintarTicket();
    } catch {
      /* la previsualización es una ayuda: si falla, se valida al enviar */
    }
  }

  // ---------------------------------------------------------------- eventos
  placa.addEventListener('input', () => {
    placa.value = normalizarPlaca(placa.value);
    setFieldError(campos.placa, '');
    estado.confirmarAccesible = false;
    confirmacion.classList.add('hidden');
    pintarTicket();
    clearTimeout(espera);
    espera = setTimeout(consultarPlaca, 250);
  });
  tiles.addEventListener('change', (e) => {
    estado.tipo = e.target.value;
    opcionesCelda();
    pintarTicket();
  });
  accesible.querySelector('input').addEventListener('change', consultarPlaca);
  formulario.addEventListener('change', (e) => {
    if (e.target.name === 'celda_id' || e.target === puerta) pintarTicket();
    if (e.target === puerta) props.onPuerta?.(Number(puerta.value));
  });

  function ponerHora() {
    hora.value = formatearFechaHora(new Date());
    pintarTicket();
  }

  // ---------------------------------------------------------------- envío
  function datosFormulario() {
    const datos = new FormData();
    datos.set('puerta_id', puerta.value);
    datos.set('placa', placa.value);
    if (!celda.disabled && celda.value) datos.set('celda_id', celda.value);
    datos.set('requiere_accesible', String(accesible.querySelector('input').checked));
    datos.set('confirmar_accesible', String(estado.confirmarAccesible));
    if (observaciones.value.trim()) datos.set('observaciones_entrada', observaciones.value.trim());
    datos.set('deja_llaves', String(llaves.querySelector('input').checked));
    const archivo = foto.querySelector('input[type="file"]').files[0];
    if (archivo) datos.set('foto', archivo);
    return datos;
  }

  function mostrarConfirmacionAccesible(mensaje) {
    confirmacion.replaceChildren(
      el('div', { className: 'alert alert--info' }, [el('p', { text: mensaje })]),
      createCheck({
        label: 'Confirmo asignar la celda accesible',
        onChange: (marcado) => (estado.confirmarAccesible = marcado),
      })
    );
    confirmacion.classList.remove('hidden');
    confirmacion.querySelector('input').focus();
  }

  function mostrarExito(t) {
    const emitido = createTicket({
      emitido: true,
      nota: t.observaciones_entrada
        ? `Observaciones: ${t.observaciones_entrada}`
        : 'Conserve este ticket.',
      datos: {
        numero: t.codigo_ticket,
        placa: formatearPlaca(t.vehiculo.placa),
        espacio: `${t.celda.codigo} · ${t.celda.piso}`,
        entrada: formatearFechaHora(t.fecha_hora_entrada),
        tarifa: textoTarifa(t.tarifa),
        cliente: t.tipo_cliente === 'mensualidad' ? 'Mensualidad' : 'Visitante',
        puerta: t.puerta_entrada,
      },
    });
    const resumen = el('div', { className: 'entry-success' }, [
      createAlert({
        message: `Ingreso registrado: ${formatearPlaca(t.vehiculo.placa)} en la celda ${t.celda.codigo}.`,
        variant: 'success',
      }),
      el('p', { className: 'entry-success-ticket', text: t.codigo_ticket }),
      el('p', {
        className: 'field-hint',
        text: t.deja_llaves
          ? 'El conductor dejó las llaves en la caseta.'
          : 'El conductor conserva las llaves.',
      }),
    ]);
    overlay.querySelector('.modal-body').replaceChildren(resumen, emitido);
    const imprimir = createButton({
      label: 'Imprimir ticket',
      icon: 'i-print',
      variant: 'dark',
      onClick: () => props.onImprimir?.(t),
    });
    overlay
      .querySelector('.modal-foot')
      .replaceChildren(
        createButton({ label: 'Cerrar', variant: 'ghost', onClick: () => closeModal(overlay) }),
        imprimir
      );
    imprimir.focus();
    props.onRegistrado?.(t);
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    setAlert(alerta, '');
    setFieldError(campos.placa, '');
    vehiculoNuevo.querySelector('.field-error').textContent = '';
    if (!esPlacaValida(placa.value, 'carro') && !esPlacaValida(placa.value, 'moto')) {
      setFieldError(campos.placa, 'Escribe una placa válida: ABC123 (carro) o ABC12D (moto).');
      placa.focus();
      return;
    }
    setButtonLoading(generar, true, 'Generando…');
    try {
      if (estado.desconocida) {
        if (!esPlacaValida(placa.value, estado.tipo)) {
          throw Object.assign(new Error(`La placa no corresponde a un ${estado.tipo}.`), {
            codigo: 'LOCAL',
            campo: 'placa',
          });
        }
        if (![marca, modelo, color].every((c) => c.value.trim())) {
          throw Object.assign(new Error('Completa marca, modelo y color del vehículo nuevo.'), {
            codigo: 'LOCAL',
            campo: 'vehiculo',
          });
        }
        await registrarVisitante({
          placa: placa.value,
          tipo: estado.tipo,
          marca: marca.value.trim(),
          modelo: modelo.value.trim(),
          color: color.value.trim(),
        });
        estado.desconocida = false;
      }
      const t = await registrar(datosFormulario());
      mostrarExito(t);
    } catch (error) {
      setButtonLoading(generar, false);
      switch (error.codigo) {
        case 'VEHICULO_NO_REGISTRADO':
          estado.preview = { registrado: false };
          habilitarVehiculoNuevo(true);
          pintarCliente();
          setAlert(
            alerta,
            'Placa no registrada: elige el tipo y completa marca, modelo y color para registrarla como visitante.',
            'info'
          );
          marca.focus();
          break;
        case 'CONFIRMAR_ACCESIBLE':
          mostrarConfirmacionAccesible(error.message);
          break;
        case 'PICO_Y_PLACA':
          setAlert(alerta, error.message, 'error');
          alerta.classList.add('alert--grande');
          break;
        case 'LOCAL':
          if (error.campo === 'placa') setFieldError(campos.placa, error.message);
          else vehiculoNuevo.querySelector('.field-error').textContent = error.message;
          break;
        default:
          setAlert(alerta, error.message, 'error');
          if (['SIN_CUPO', 'ESTADIA_ABIERTA'].includes(error.codigo))
            alerta.classList.add('alert--grande');
          for (const d of error.detalles ?? [])
            if (campos[d.campo]) setFieldError(campos[d.campo], d.mensaje);
      }
    }
  });

  // Estado inicial
  habilitarVehiculoNuevo(false);
  opcionesCelda();
  ponerHora();
  reloj = setInterval(ponerHora, 15 * 1000);
  return overlay;
}

/** Abre el modal y pone el foco en la placa (para registrar en ≤ 3 interacciones). */
export function abrirEntryModal(overlay, origen) {
  openModal(overlay, origen);
  overlay.querySelector('.input--plate')?.focus();
}
