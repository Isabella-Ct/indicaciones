/**
 * Selector de usuario por documento (molecule-user-picker) escrito en el HTML con un
 * prefijo de ids (<p>-documento, <p>-buscar, <p>-resultados, <p>-elegido…). Los
 * resultados se copian de la plantilla #tpl-opcion-usuario.
 */
import { clonar } from './plantillas.js';

const iniciales = (nombre = '') =>
  nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');

/**
 * @param {string} p  prefijo de ids
 * @param {{ buscar: (texto: string) => Promise<object[]>, onChange?: (usuario: object|null) => void, vacio?: string }} opciones
 */
export function conectarSelectorUsuario(p, { buscar, onChange, vacio }) {
  const $ = (sufijo) => document.getElementById(`${p}-${sufijo}`);
  const documento = $('documento');
  const resultados = $('resultados');
  const estado = $('estado');
  let elegido = null;

  function seleccionar(usuario) {
    elegido = usuario;
    resultados.replaceChildren();
    estado.textContent = '';
    $('error').textContent = '';
    $('busqueda').classList.toggle('hidden', Boolean(usuario));
    $('elegido').classList.toggle('hidden', !usuario);
    if (usuario) {
      $('avatar').textContent = iniciales(usuario.nombre_completo);
      $('nombre').textContent = usuario.nombre_completo;
      $('doc').textContent = `${usuario.tipo_documento} ${usuario.numero_documento}`;
    }
    onChange?.(usuario);
  }

  async function ejecutar() {
    const texto = documento.value.trim();
    resultados.replaceChildren();
    if (texto.length < 3) {
      estado.textContent = 'Escribe al menos 3 dígitos del documento.';
      return;
    }
    estado.textContent = 'Buscando…';
    try {
      const encontrados = await buscar(texto);
      estado.textContent = encontrados.length
        ? `${encontrados.length} resultado(s). Elige uno.`
        : (vacio ?? 'No hay clientes activos con ese documento.');
      resultados.replaceChildren(
        ...encontrados.map((usuario) => {
          const item = clonar('tpl-opcion-usuario');
          item.querySelector('strong').textContent = usuario.nombre_completo;
          item.querySelector('span').textContent =
            `${usuario.tipo_documento} ${usuario.numero_documento}`;
          item.querySelector('button').addEventListener('click', () => seleccionar(usuario));
          return item;
        })
      );
    } catch (error) {
      estado.textContent = error.message;
    }
  }

  $('buscar').addEventListener('click', ejecutar);
  documento.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      ejecutar();
    }
  });
  $('cambiar').addEventListener('click', () => {
    seleccionar(null);
    documento.focus();
  });

  return {
    valor: () => elegido,
    poner: (usuario) => {
      documento.value = '';
      seleccionar(usuario);
    },
    error: (mensaje) => {
      $('error').textContent = mensaje || '';
    },
  };
}
