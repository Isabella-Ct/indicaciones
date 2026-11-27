// Página · Mi perfil (HU-11 · RF-USR-15..17): documento, código y rol de solo lectura; nombre, correo,
// celular y foto editables. El servidor avisa al Administrador de cada cambio (RF-USR-16).
import { misDatos, actualizarMisDatos, obtenerFoto } from '../services/usuarios.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarFoto } from '../components/moleculas/foto.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChipActivo } from '../components/atomos/chip-estado.js';
import { botonCargando } from '../components/atomos/boton.js';
import { $ } from '../utils/dom.js';

const marco = montarMarco({ permiso: 'perfil.ver' });

const formulario = $('form-perfil');
const alerta = $('perfil-alerta');
const guardar = $('perfil-guardar');
const nombre = $('perfil-nombre');
const correo = $('perfil-correo');
const celular = $('perfil-celular');
const foto = conectarFoto($('perfil-foto-campo'));

async function pintar(u) {
  $('perfil-codigo').textContent = String(u.idUsuario);
  $('perfil-documento').textContent = `${u.tipoDocumento} ${u.numeroDocumento}`;
  $('perfil-rol').textContent = u.rol.nombre;
  ponerChipActivo($('perfil-estado'), u.estado);
  nombre.value = u.nombreCompleto;
  correo.value = u.correo;
  celular.value = u.celular;
  foto.reiniciar({ nombreUsuario: u.nombreCompleto, blob: u.fotoUrl ? await obtenerFoto(u.idUsuario) : null });
}

function validar() {
  const n = nombre.value.trim().replace(/\s+/g, ' ');
  const resultados = [
    marcarCampo(nombre, n.length < 3 || n.length > 100 || !/^\p{L}[\p{L} '-]*$/u.test(n) ? 'Ingrese un nombre de 3 a 100 letras.' : ''),
    marcarCampo(correo, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo.value.trim()) ? '' : 'Ingrese un correo válido.'),
    marcarCampo(celular, /^3\d{9}$/.test(celular.value.replace(/[\s-]/g, '')) ? '' : 'Ingrese 10 dígitos que empiecen por 3.'),
  ];
  const valido = resultados.every(Boolean);
  if (!valido) formulario.querySelector('[aria-invalid="true"]')?.focus();
  return valido;
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  if (!validar()) return;
  const datos = { nombreCompleto: nombre.value, correo: correo.value, celular: celular.value };
  if (foto.quitada()) datos.quitarFoto = true;
  botonCargando(guardar, true, 'Guardando…');
  try {
    await pintar(await actualizarMisDatos(datos, foto.archivo()));
    mostrarAviso('Datos actualizados', 'success');
  } catch (error) {
    if (error.code === 'CORREO_DUPLICADO') marcarCampo(correo, error.message);
    else if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, {
        nombreCompleto: 'perfil-nombre',
        correo: 'perfil-correo',
        celular: 'perfil-celular',
        foto: 'perfil-foto',
      });
      if (sinCampo.length) mostrarAlerta(alerta, sinCampo.join(' '), 'error');
    } else if (error.status !== 401 && error.status !== 403) mostrarAlerta(alerta, error.message, 'error');
  } finally {
    botonCargando(guardar, false);
  }
});

async function iniciar() {
  try {
    await pintar(await misDatos());
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
}

if (marco?.permitido) iniciar();
