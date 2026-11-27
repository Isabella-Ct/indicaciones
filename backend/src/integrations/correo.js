/**
 * Adaptador de correo (spec 002 research R-01) sobre nodemailer, con tres transportes:
 *   smtp    → servidor SMTP de .env (TBD-09)
 *   archivo → cada correo queda como .eml en backend/correos/ (desarrollo sin SMTP)
 *   memoria → bandeja en memoria para las pruebas («entorno de pruebas de correo» del SRS)
 * Nunca lanza: devuelve true si el correo salió y false si falló (el reintento es de la spec 014).
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const nodemailer = require('nodemailer');
const env = require('../config/env');

const CARPETA_CORREOS = path.join(__dirname, '..', '..', 'correos');
const bandeja = [];
let transporte;

function crearTransporte() {
  if (env.CORREO_TRANSPORTE === 'smtp') {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PUERTO,
      secure: env.SMTP_SEGURO,
      auth: env.SMTP_USUARIO ? { user: env.SMTP_USUARIO, pass: env.SMTP_CLAVE } : undefined,
    });
  }
  // archivo y memoria: nodemailer arma el mensaje completo en un Buffer sin enviarlo.
  return nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
}

/**
 * @param {{ para: string, asunto: string, texto: string,
 *           adjuntos?: Array<{ nombre: string, contenido: Buffer, tipo: string }> }} correo
 *   adjuntos: p. ej. el PDF de la factura (spec 009, RF-FAC-10).
 * @returns {Promise<boolean>}
 */
async function enviarCorreo({ para, asunto, texto, adjuntos = [] }) {
  try {
    transporte ??= crearTransporte();
    const attachments = adjuntos.map((a) => ({ filename: a.nombre, content: a.contenido, contentType: a.tipo }));
    const info = await transporte.sendMail({ from: env.CORREO_REMITENTE, to: para, subject: asunto, text: texto, attachments });
    if (env.CORREO_TRANSPORTE === 'memoria') {
      bandeja.push({ para, asunto, texto, adjuntos: adjuntos.map((a) => ({ nombre: a.nombre, tipo: a.tipo, bytes: a.contenido.length })), fecha: new Date() });
    } else if (env.CORREO_TRANSPORTE === 'archivo') {
      await fs.mkdir(CARPETA_CORREOS, { recursive: true });
      const nombre = `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID().slice(0, 8)}.eml`;
      await fs.writeFile(path.join(CARPETA_CORREOS, nombre), info.message);
    }
    return true;
  } catch (error) {
    if (env.NODE_ENV !== 'test') console.error('No se pudo enviar el correo:', error.message);
    return false;
  }
}

/** Solo pruebas: correos enviados con el transporte «memoria». */
const bandejaMemoria = () => [...bandeja];
const vaciarBandeja = () => bandeja.splice(0, bandeja.length);
/** Solo pruebas: reemplaza el transporte (p. ej. uno que falla). */
const usarTransporte = (nuevo) => {
  transporte = nuevo;
};

module.exports = { enviarCorreo, bandejaMemoria, vaciarBandeja, usarTransporte };
