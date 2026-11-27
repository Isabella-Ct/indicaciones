/**
 * Organismo · formulario de vehículo (placa amarilla, mosaicos Carro / Moto, color, marca y modelo).
 * El marcado está en cada página con ids `<prefijo>-placa`, `<prefijo>-tipo` (fieldset),
 * `<prefijo>-color`, `<prefijo>-marca` y `<prefijo>-modelo`. Valida igual que el servidor (RN-11) y
 * pinta sus errores junto a cada campo. No llama a la API: la página envía los datos.
 */
import { conectarSelectorTipo } from '../moleculas/selector-tipo.js';
import { marcarCampo, pintarErroresApi } from '../moleculas/campo.js';
import { normalizarPlaca, placaValida, mensajeFormato } from '../../utils/placa.js';

const PISTA = { carro: 'Carro: 3 letras y 3 dígitos (ABC123).', moto: 'Moto: 3 letras, 2 dígitos y una letra opcional (ABC12 o ABC12D).' };

/** @param {string} prefijo */
export function conectarFormularioVehiculo(prefijo) {
  const $ = (sufijo) => document.getElementById(`${prefijo}-${sufijo}`);
  const campos = { placa: $('placa'), color: $('color'), marca: $('marca'), modelo: $('modelo') };
  const pista = $('placa-hint');
  const tipo = conectarSelectorTipo($('tipo'), {
    onCambio(valor) {
      if (pista) pista.textContent = PISTA[valor];
    },
  });

  // La placa se ve en mayúsculas mientras se escribe.
  campos.placa.addEventListener('input', () => {
    campos.placa.value = campos.placa.value.toUpperCase();
  });

  const leer = () => ({
    placa: normalizarPlaca(campos.placa.value),
    tipo: tipo.valor(),
    color: campos.color.value.trim(),
    marca: campos.marca.value.trim(),
    modelo: Number(campos.modelo.value),
  });

  return {
    leer,
    /** @param {{ placa?: string, tipo?: string, color?: string, marca?: string, modelo?: number } | null} v */
    poner(v) {
      campos.placa.value = v?.placa ?? '';
      tipo.poner(v?.tipo ?? 'carro');
      campos.color.value = v?.color ?? '';
      campos.marca.value = v?.marca ?? '';
      campos.modelo.value = v?.modelo ? String(v.modelo) : '';
    },
    /** Placa y tipo no se pueden cambiar con el vehículo dentro (research R-07). */
    bloquearIdentidad(si) {
      campos.placa.readOnly = si;
      tipo.deshabilitar(si);
    },
    /** Devuelve true si todo es válido; si no, marca los campos y enfoca el primero. */
    validar() {
      const d = leer();
      const anio = new Date().getFullYear();
      const resultados = [
        marcarCampo(campos.placa, !d.placa ? 'Ingrese la placa.' : placaValida(d.placa, d.tipo) ? '' : mensajeFormato(d.tipo)),
        marcarCampo(campos.color, d.color.length < 2 || d.color.length > 30 ? 'El color debe tener entre 2 y 30 caracteres.' : ''),
        marcarCampo(campos.marca, d.marca.length < 2 || d.marca.length > 40 ? 'La marca debe tener entre 2 y 40 caracteres.' : ''),
        marcarCampo(
          campos.modelo,
          !Number.isInteger(d.modelo) || d.modelo < 1950 || d.modelo > anio + 1 ? `El modelo debe estar entre 1950 y ${anio + 1}.` : ''
        ),
      ];
      const valido = resultados.every(Boolean);
      if (!valido) Object.values(campos).find((c) => c.getAttribute('aria-invalid') === 'true')?.focus();
      return valido;
    },
    /** Errores de la API junto al campo; devuelve los mensajes que no tienen campo. */
    pintarErrores(error) {
      if (error.code === 'PLACA_DUPLICADA') {
        marcarCampo(campos.placa, error.message);
        campos.placa.focus();
        return [];
      }
      if (error.code === 'VALIDACION') {
        return pintarErroresApi(error, {
          placa: `${prefijo}-placa`,
          tipo: `${prefijo}-tipo-carro`,
          color: `${prefijo}-color`,
          marca: `${prefijo}-marca`,
          modelo: `${prefijo}-modelo`,
        });
      }
      return [error.message];
    },
    enfocar: () => campos.placa.focus(),
  };
}
