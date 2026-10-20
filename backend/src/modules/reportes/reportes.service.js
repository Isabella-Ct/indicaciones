// Reportes del administrador — REQ-REP-01…11. Cada función devuelve
// { data, meta, csv: { nombre, columnas, filas } }: el controlador responde JSON o CSV.
const { aLimites, meta } = require('../../utils/paginacion');
const {
  enBogota,
  sumarDias,
  diasEntre,
  diaSemanaDe,
  nombreDia,
  formatearFechaHora,
  formatearDuracion,
} = require('../../utils/fechas');
const repo = require('./reportes.repository');
const incidenciasRepo = require('../incidencias/incidencias.repository');

const LIMITE_CSV = 50000;
const inicioDe = (fecha) => `${fecha} 00:00:00`;
const finDe = (fecha) => `${sumarDias(fecha, 1)} 00:00:00`;
const fh = (fecha) => (fecha ? formatearFechaHora(fecha) : '');
const pct = (parte, total) => (total ? Math.round((parte / total) * 1000) / 10 : 0);
const limitesSegun = (q) => (q.formato === 'csv' ? { limit: LIMITE_CSV, offset: 0 } : aLimites(q));
const rangoMeta = (q) => ({
  desde: q.desde,
  hasta: q.hasta,
  dias: diasEntre(q.desde, q.hasta) + 1,
});
const ETIQUETA_METODO = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};
const ETIQUETA_CONCEPTO = { estadia: 'Parqueo', membresia: 'Mensualidad' };

// ---------------------------------------------------------------- REP-01
async function usuarios(q) {
  const { filas, total } = await repo.usuarios(q, limitesSegun(q));
  const data = filas.map((u) => ({
    id: u.id,
    tipo_documento: u.tipo_documento,
    numero_documento: u.numero_documento,
    primer_nombre: u.primer_nombre,
    segundo_nombre: u.segundo_nombre,
    primer_apellido: u.primer_apellido,
    segundo_apellido: u.segundo_apellido,
    nombre_completo: u.nombre_completo,
    correo: u.correo,
    celular: u.celular,
    rol: u.rol,
    estado: u.estado,
    debe_cambiar_contrasena: Boolean(u.debe_cambiar_contrasena),
    ultimo_acceso: u.ultimo_acceso,
    creado: u.created_at,
    vehiculos: u.vehiculos,
  }));
  return {
    data,
    meta: meta(q, total),
    csv: {
      nombre: 'usuarios',
      filas: data,
      columnas: [
        { titulo: 'Código', valor: (u) => String(u.id).padStart(5, '0') },
        { titulo: 'Tipo documento', valor: (u) => u.tipo_documento },
        { titulo: 'Número documento', valor: (u) => u.numero_documento },
        { titulo: 'Primer nombre', valor: (u) => u.primer_nombre },
        { titulo: 'Segundo nombre', valor: (u) => u.segundo_nombre },
        { titulo: 'Primer apellido', valor: (u) => u.primer_apellido },
        { titulo: 'Segundo apellido', valor: (u) => u.segundo_apellido },
        { titulo: 'Correo', valor: (u) => u.correo },
        { titulo: 'Celular', valor: (u) => u.celular },
        { titulo: 'Rol', valor: (u) => u.rol },
        { titulo: 'Estado', valor: (u) => u.estado },
        {
          titulo: 'Debe cambiar contraseña',
          valor: (u) => (u.debe_cambiar_contrasena ? 'Sí' : 'No'),
        },
        { titulo: 'Último acceso', valor: (u) => fh(u.ultimo_acceso) },
        { titulo: 'Creado', valor: (u) => fh(u.creado) },
        { titulo: 'Vehículos', valor: (u) => u.vehiculos },
      ],
    },
  };
}

// ---------------------------------------------------------------- REP-02
async function vehiculos(q) {
  const { filas, total } = await repo.vehiculos(q, limitesSegun(q));
  const data = filas.map((v) => ({
    id: v.id,
    placa: v.placa,
    tipo: v.tipo,
    marca: v.marca,
    modelo: v.modelo,
    color: v.color,
    activo: Boolean(v.activo),
    registrado: v.created_at,
    visitas: v.visitas,
    propietario: v.propietario_id
      ? {
          id: v.propietario_id,
          nombre_completo: v.propietario,
          tipo_documento: v.tipo_documento,
          numero_documento: v.numero_documento,
        }
      : null,
  }));
  return {
    data,
    meta: meta(q, total),
    csv: {
      nombre: 'vehiculos',
      filas: data,
      columnas: [
        { titulo: 'Placa', valor: (v) => v.placa },
        { titulo: 'Tipo', valor: (v) => v.tipo },
        { titulo: 'Marca', valor: (v) => v.marca },
        { titulo: 'Modelo', valor: (v) => v.modelo },
        { titulo: 'Color', valor: (v) => v.color },
        { titulo: 'Activo', valor: (v) => (v.activo ? 'Sí' : 'No') },
        { titulo: 'Propietario', valor: (v) => v.propietario?.nombre_completo ?? 'Visitante' },
        {
          titulo: 'Documento propietario',
          valor: (v) =>
            v.propietario
              ? `${v.propietario.tipo_documento} ${v.propietario.numero_documento}`
              : '',
        },
        { titulo: 'Visitas', valor: (v) => v.visitas },
        { titulo: 'Registrado', valor: (v) => fh(v.registrado) },
      ],
    },
  };
}

// ---------------------------------------------------------------- REP-03 / REP-04
async function entradas(q) {
  const { filas, total } = await repo.entradas(
    { ...q, inicio: inicioDe(q.desde), fin: finDe(q.hasta) },
    limitesSegun(q)
  );
  return {
    data: filas,
    meta: { ...meta(q, total), ...rangoMeta(q) },
    csv: {
      nombre: `entradas-${q.desde}-${q.hasta}`,
      filas,
      columnas: [
        { titulo: 'Ticket', valor: (e) => e.codigo_ticket },
        { titulo: 'Fecha y hora', valor: (e) => fh(e.fecha_hora_entrada) },
        { titulo: 'Placa', valor: (e) => e.placa },
        { titulo: 'Tipo', valor: (e) => e.tipo },
        { titulo: 'Cliente', valor: (e) => e.tipo_cliente },
        { titulo: 'Puerta', valor: (e) => e.puerta },
        { titulo: 'Celda', valor: (e) => e.celda },
        { titulo: 'Piso', valor: (e) => e.piso },
        { titulo: 'Registró', valor: (e) => e.registro },
        { titulo: 'Estado', valor: (e) => (e.estado === 'en_curso' ? 'Dentro' : 'Salió') },
      ],
    },
  };
}

async function salidas(q) {
  const { filas, total, recaudado, promedio } = await repo.salidas(
    { ...q, inicio: inicioDe(q.desde), fin: finDe(q.hasta) },
    limitesSegun(q)
  );
  const data = filas.map((s) => ({ ...s, tiempo: formatearDuracion(s.minutos_estadia ?? 0) }));
  return {
    data,
    meta: {
      ...meta(q, total),
      ...rangoMeta(q),
      recaudado,
      permanencia_promedio_min: Math.round(promedio),
    },
    csv: {
      nombre: `salidas-${q.desde}-${q.hasta}`,
      filas: data,
      columnas: [
        { titulo: 'Ticket', valor: (s) => s.codigo_ticket },
        { titulo: 'Entrada', valor: (s) => fh(s.fecha_hora_entrada) },
        { titulo: 'Salida', valor: (s) => fh(s.fecha_hora_salida) },
        { titulo: 'Placa', valor: (s) => s.placa },
        { titulo: 'Tipo', valor: (s) => s.tipo },
        { titulo: 'Puerta', valor: (s) => s.puerta },
        { titulo: 'Celda', valor: (s) => s.celda },
        { titulo: 'Minutos', valor: (s) => s.minutos_estadia },
        { titulo: 'Duración', valor: (s) => s.tiempo },
        { titulo: 'Factura', valor: (s) => s.factura },
        { titulo: 'Valor (COP)', valor: (s) => s.valor },
        { titulo: 'Método', valor: (s) => ETIQUETA_METODO[s.metodo_pago] ?? '' },
      ],
    },
  };
}

// ---------------------------------------------------------------- REP-05
async function incidencias(q) {
  const { filas, total } = await incidenciasRepo.listar(
    { tipo_id: q.tipo, desde: q.desde, hasta: q.hasta },
    limitesSegun(q)
  );
  const data = filas.map((i) => ({
    id: i.id,
    codigo: i.codigo,
    fecha_hora: i.fecha_hora,
    tipo: i.tipo_nombre,
    placa: i.placa,
    tipo_vehiculo: i.tipo_vehiculo,
    propietario: i.propietario_nombre,
    celda: i.celda_codigo,
    descripcion: i.descripcion,
    registro: i.registrada_por_nombre,
  }));
  return {
    data,
    meta: { ...meta(q, total), ...rangoMeta(q) },
    csv: {
      nombre: `incidencias-${q.desde}-${q.hasta}`,
      filas: data,
      columnas: [
        { titulo: 'Código', valor: (i) => i.codigo },
        { titulo: 'Fecha y hora', valor: (i) => fh(i.fecha_hora) },
        { titulo: 'Tipo', valor: (i) => i.tipo },
        { titulo: 'Placa', valor: (i) => i.placa },
        { titulo: 'Propietario', valor: (i) => i.propietario ?? 'Visitante' },
        { titulo: 'Celda', valor: (i) => i.celda },
        { titulo: 'Descripción', valor: (i) => i.descripcion },
        { titulo: 'Registró', valor: (i) => i.registro },
      ],
    },
  };
}

// ---------------------------------------------------------------- REP-06
async function picoPlaca({ fecha }) {
  const dia = diaSemanaDe(fecha);
  const [vehiculosRestringidos, reglas, porTipo, denegados] = await Promise.all([
    repo.vehiculosRestringidos(dia),
    repo.reglasDelDia(dia),
    repo.vehiculosActivosPorTipo(),
    repo.denegadosDelDia(inicioDe(fecha), finDe(fecha)),
  ]);
  const cuenta = (tipo) => vehiculosRestringidos.filter((v) => v.tipo === tipo).length;
  return {
    data: { vehiculos: vehiculosRestringidos, reglas, denegados },
    meta: {
      fecha,
      dia_semana: dia,
      dia_nombre: nombreDia(dia),
      total_restringidos: vehiculosRestringidos.length,
      por_tipo: {
        carro: { restringidos: cuenta('carro'), registrados: porTipo.carro ?? 0 },
        moto: { restringidos: cuenta('moto'), registrados: porTipo.moto ?? 0 },
      },
      total_denegados: denegados.length,
    },
    csv: {
      nombre: `pico-placa-${fecha}`,
      filas: vehiculosRestringidos,
      columnas: [
        { titulo: 'Placa', valor: (v) => v.placa },
        { titulo: 'Tipo', valor: (v) => v.tipo },
        { titulo: 'Marca', valor: (v) => v.marca },
        { titulo: 'Modelo', valor: (v) => v.modelo },
        { titulo: 'Propietario', valor: (v) => v.propietario ?? 'Visitante' },
        { titulo: 'Dígito', valor: (v) => v.digito },
        { titulo: 'Horario restringido', valor: (v) => v.horario },
      ],
    },
  };
}

// ---------------------------------------------------------------- REP-07
/** Ocupación por hora de un día (celdas distintas y %), con las franjas futuras marcadas. */
async function ocupacionPorHora(fecha, horas = 1) {
  const [{ habilitadas }, franjas] = await Promise.all([
    repo.celdasHabilitadas(),
    repo.ocupacionPorFranjas(inicioDe(fecha), horas),
  ]);
  const ahora = enBogota();
  const horaActual = Number(ahora.hora.slice(0, 2));
  return [...franjas.entries()].map(([hora, celdas]) => {
    const estado =
      fecha < ahora.fecha || hora + horas <= horaActual
        ? 'pasada'
        : fecha === ahora.fecha && hora <= horaActual
          ? 'actual'
          : 'futura';
    return { hora, celdas, porcentaje: pct(celdas, habilitadas), estado };
  });
}

async function celdasOcupadas({ fecha }) {
  const inicio = inicioDe(fecha);
  const fin = finDe(fecha);
  const [celdas, maximo, { habilitadas }, porHora] = await Promise.all([
    repo.celdasOcupadasDelDia(inicio, fin),
    repo.maximoSimultaneo(inicio, fin),
    repo.celdasHabilitadas(),
    ocupacionPorHora(fecha),
  ]);
  const data = celdas.map((c) => ({
    ...c,
    minutos: Number(c.minutos),
    tiempo: formatearDuracion(Number(c.minutos)),
  }));
  return {
    data: { celdas: data, por_hora: porHora },
    meta: {
      fecha,
      total_celdas_ocupadas: data.length,
      habilitadas,
      porcentaje: pct(data.length, habilitadas),
      estadias: data.reduce((s, c) => s + c.estadias, 0),
      maximo_simultaneo: maximo.maximo,
      momento_maximo: maximo.momento,
      porcentaje_maximo: pct(maximo.maximo, habilitadas),
    },
    csv: {
      nombre: `celdas-ocupadas-${fecha}`,
      filas: data,
      columnas: [
        { titulo: 'Celda', valor: (c) => c.codigo },
        { titulo: 'Tipo', valor: (c) => c.tipo },
        { titulo: 'Piso', valor: (c) => c.piso },
        { titulo: 'Estadías', valor: (c) => c.estadias },
        { titulo: 'Minutos ocupada', valor: (c) => c.minutos },
      ],
    },
  };
}

// ---------------------------------------------------------------- REP-08 / REP-09
async function celdasMasUsadas(q) {
  const { filas, total } = await repo.celdasMasUsadas({
    ...q,
    inicio: inicioDe(q.desde),
    fin: finDe(q.hasta),
  });
  const data = filas.map((c, i) => ({
    puesto: i + 1,
    ...c,
    es_accesible: Boolean(c.es_accesible),
    minutos: Number(c.minutos),
    tiempo: formatearDuracion(Number(c.minutos)),
    participacion: pct(c.estadias, total),
  }));
  return {
    data,
    meta: { ...rangoMeta(q), total_estadias: total, limite: q.limite },
    csv: {
      nombre: `celdas-mas-usadas-${q.desde}-${q.hasta}`,
      filas: data,
      columnas: [
        { titulo: 'Puesto', valor: (c) => c.puesto },
        { titulo: 'Celda', valor: (c) => c.codigo },
        { titulo: 'Tipo', valor: (c) => c.tipo },
        { titulo: 'Piso', valor: (c) => c.piso },
        { titulo: 'Estadías', valor: (c) => c.estadias },
        { titulo: 'Minutos', valor: (c) => c.minutos },
        { titulo: '% de las estadías', valor: (c) => String(c.participacion).replace('.', ',') },
      ],
    },
  };
}

async function vehiculosFrecuentes(q) {
  const { filas, total } = await repo.vehiculosFrecuentes({
    ...q,
    inicio: inicioDe(q.desde),
    fin: finDe(q.hasta),
  });
  const data = filas.map((v, i) => ({
    puesto: i + 1,
    ...v,
    minutos: Number(v.minutos),
    tiempo: formatearDuracion(Number(v.minutos)),
    pagado: Number(v.pagado),
  }));
  return {
    data,
    meta: { ...rangoMeta(q), total_estadias: total, limite: q.limite },
    csv: {
      nombre: `vehiculos-frecuentes-${q.desde}-${q.hasta}`,
      filas: data,
      columnas: [
        { titulo: 'Puesto', valor: (v) => v.puesto },
        { titulo: 'Placa', valor: (v) => v.placa },
        { titulo: 'Tipo', valor: (v) => v.tipo },
        { titulo: 'Propietario', valor: (v) => v.propietario ?? 'Visitante' },
        { titulo: 'Visitas', valor: (v) => v.visitas },
        { titulo: 'Minutos', valor: (v) => v.minutos },
        { titulo: 'Pagado (COP)', valor: (v) => v.pagado },
        { titulo: 'Última visita', valor: (v) => fh(v.ultima_visita) },
      ],
    },
  };
}

// ---------------------------------------------------------------- REP-10
/**
 * Promedio de celdas ocupadas por (día de la semana, hora). El denominador es cuántas
 * veces ocurre esa franja en el rango (sin contar horas que aún no llegan).
 */
async function ocupacion(q) {
  const [filas, { habilitadas }] = await Promise.all([
    repo.ocupacionDiaHora(inicioDe(q.desde), finDe(q.hasta)),
    repo.celdasHabilitadas(),
  ]);
  const ahora = enBogota();
  const horaActual = Number(ahora.hora.slice(0, 2));
  const veces = Array.from({ length: 8 }, () => Array(24).fill(0));
  for (let d = 0; d <= diasEntre(q.desde, q.hasta); d++) {
    const fecha = sumarDias(q.desde, d);
    if (fecha > ahora.fecha) break;
    const dia = diaSemanaDe(fecha);
    for (let h = 0; h < 24; h++) if (fecha < ahora.fecha || h <= horaActual) veces[dia][h] += 1;
  }
  const sumas = new Map(filas.map((f) => [`${f.dia}-${f.hora}`, f]));
  const matriz = [];
  for (let dia = 1; dia <= 7; dia++) {
    for (let hora = 0; hora < 24; hora++) {
      const f = sumas.get(`${dia}-${hora}`);
      const n = veces[dia][hora];
      const promedio = n ? Number(f?.suma ?? 0) / n : 0;
      matriz.push({
        dia,
        dia_nombre: nombreDia(dia),
        hora,
        muestras: n,
        promedio: Math.round(promedio * 10) / 10,
        porcentaje: pct(promedio, habilitadas),
        maximo: Number(f?.maximo ?? 0),
      });
    }
  }
  const promedioDe = (celdas) => {
    const conMuestra = celdas.filter((c) => c.muestras);
    const suma = conMuestra.reduce((s, c) => s + c.promedio * c.muestras, 0);
    const n = conMuestra.reduce((s, c) => s + c.muestras, 0);
    return n ? suma / n : 0;
  };
  const porHora = Array.from({ length: 24 }, (_, hora) => {
    const promedio = promedioDe(matriz.filter((c) => c.hora === hora));
    return {
      hora,
      promedio: Math.round(promedio * 10) / 10,
      porcentaje: pct(promedio, habilitadas),
    };
  });
  const porDia = Array.from({ length: 7 }, (_, i) => {
    const promedio = promedioDe(matriz.filter((c) => c.dia === i + 1));
    return {
      dia: i + 1,
      dia_nombre: nombreDia(i + 1),
      promedio: Math.round(promedio * 10) / 10,
      porcentaje: pct(promedio, habilitadas),
    };
  });
  const mayor = (lista) => lista.reduce((a, b) => (b.promedio > a.promedio ? b : a));
  return {
    data: { matriz, por_hora: porHora, por_dia: porDia },
    meta: {
      ...rangoMeta(q),
      habilitadas,
      hora_pico: mayor(porHora),
      dia_pico: mayor(porDia),
      franja_pico: mayor(matriz),
    },
    csv: {
      nombre: `ocupacion-${q.desde}-${q.hasta}`,
      filas: matriz,
      columnas: [
        { titulo: 'Día', valor: (c) => c.dia_nombre },
        { titulo: 'Hora', valor: (c) => `${String(c.hora).padStart(2, '0')}:00` },
        {
          titulo: 'Celdas ocupadas (promedio)',
          valor: (c) => String(c.promedio).replace('.', ','),
        },
        { titulo: '% de ocupación', valor: (c) => String(c.porcentaje).replace('.', ',') },
        { titulo: 'Máximo', valor: (c) => c.maximo },
        { titulo: 'Días medidos', valor: (c) => c.muestras },
      ],
    },
  };
}

// ---------------------------------------------------------------- REP-11
/** Lista completa de períodos del rango (también los que no tienen facturas). */
function periodosDelRango(desde, hasta, agrupar) {
  const lista = [];
  if (agrupar === 'mes') {
    for (let f = `${desde.slice(0, 7)}-01`; f <= hasta;) {
      lista.push(f.slice(0, 7));
      const [a, m] = f.split('-').map(Number);
      f = `${m === 12 ? a + 1 : a}-${String((m % 12) + 1).padStart(2, '0')}-01`;
    }
    return lista;
  }
  let f = agrupar === 'semana' ? sumarDias(desde, 1 - diaSemanaDe(desde)) : desde;
  for (; f <= hasta; f = sumarDias(f, agrupar === 'semana' ? 7 : 1)) lista.push(f);
  return lista;
}

const numeros = (f) => ({
  facturas: Number(f.facturas),
  total: Number(f.total),
  subtotal: Number(f.subtotal),
  descuentos: Number(f.descuentos),
});

async function financiero(q) {
  const r = await repo.financiero(inicioDe(q.desde), finDe(q.hasta), q.agrupar);
  const porPeriodoMap = new Map(r.porPeriodo.map((p) => [p.periodo, p]));
  const porPeriodo = periodosDelRango(q.desde, q.hasta, q.agrupar).map((periodo) => {
    const p = porPeriodoMap.get(periodo);
    return {
      periodo,
      ...numeros(p ?? { facturas: 0, total: 0, subtotal: 0, descuentos: 0 }),
      estadias: Number(p?.estadias ?? 0),
    };
  });
  const totales = numeros(r.totales);
  const conParticipacion = (lista, clave, etiquetas) =>
    lista.map((f) => ({
      [clave]: f[clave],
      etiqueta: etiquetas ? (etiquetas[f[clave]] ?? f[clave]) : f[clave],
      ...numeros(f),
      participacion: pct(Number(f.total), totales.total),
    }));
  const porTipo = conParticipacion(r.porTipo, 'tipo', { carro: 'Carros', moto: 'Motos' });
  const data = {
    por_periodo: porPeriodo,
    por_metodo: conParticipacion(r.porMetodo, 'metodo_pago', ETIQUETA_METODO),
    por_tipo_vehiculo: porTipo,
    por_concepto: conParticipacion(r.porConcepto, 'concepto', ETIQUETA_CONCEPTO),
    descuentos: r.porDescuento.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      porcentaje: Number(d.porcentaje),
      ...numeros(d),
    })),
  };
  const filasCsv = [
    ...data.por_periodo.map((p) => ({ seccion: `Por ${q.agrupar}`, clave: p.periodo, ...p })),
    ...data.por_metodo.map((p) => ({ seccion: 'Por método de pago', clave: p.etiqueta, ...p })),
    ...data.por_tipo_vehiculo.map((p) => ({
      seccion: 'Por tipo de vehículo',
      clave: p.etiqueta,
      ...p,
    })),
    ...data.por_concepto.map((p) => ({ seccion: 'Por concepto', clave: p.etiqueta, ...p })),
    ...data.descuentos.map((p) => ({
      seccion: 'Descuentos otorgados',
      clave: `${p.nombre} (${p.porcentaje} %)`,
      ...p,
    })),
    { seccion: 'Total', clave: `${q.desde} a ${q.hasta}`, ...totales },
  ];
  return {
    data,
    meta: {
      ...rangoMeta(q),
      agrupar: q.agrupar,
      ...totales,
      sin_cobro: Number(r.totales.sin_cobro ?? 0),
      ticket_promedio: Math.round(Number(r.totales.ticket_promedio ?? 0)),
    },
    csv: {
      nombre: `financiero-${q.desde}-${q.hasta}`,
      filas: filasCsv,
      columnas: [
        { titulo: 'Sección', valor: (f) => f.seccion },
        { titulo: 'Detalle', valor: (f) => f.clave },
        { titulo: 'Facturas', valor: (f) => f.facturas },
        { titulo: 'Subtotal (COP)', valor: (f) => f.subtotal },
        { titulo: 'Descuentos (COP)', valor: (f) => f.descuentos },
        { titulo: 'Total (COP)', valor: (f) => f.total },
      ],
    },
  };
}

module.exports = {
  usuarios,
  vehiculos,
  entradas,
  salidas,
  incidencias,
  picoPlaca,
  celdasOcupadas,
  ocupacionPorHora,
  celdasMasUsadas,
  vehiculosFrecuentes,
  ocupacion,
  financiero,
};
