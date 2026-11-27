// Servicio de autenticación (spec 001: login mínimo; spec 003 agrega el resto de B.1 §4.3).
import { solicitar } from '../api/http.js';
import { guardarSesion, borrarSesion } from '../utils/sesion.js';

/** POST /auth/login → guarda { token, expiraEn, usuario, permisos } en sessionStorage. */
export async function iniciarSesion({ tipoDocumento, numeroDocumento, contrasena }) {
  const { data } = await solicitar('/auth/login', {
    method: 'POST',
    body: { tipoDocumento, numeroDocumento, contrasena },
    publica: true,
  });
  guardarSesion(data);
  return data;
}

/** Cierra la sesión en el navegador. La invalidación en el servidor llega con la spec 003. */
export async function cerrarSesion() {
  borrarSesion();
}
