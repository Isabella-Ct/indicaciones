// Sede de prueba para las entradas y salidas (specs 007 en adelante): un parqueadero propio con tres
// puertas (mixta, solo entrada, solo salida), carros y una sola celda de moto, para no tocar las celdas
// de la semilla que usan otras pruebas. También fija el reloj del servidor (RN-16).
const { app, request, auth } = require('./helpers');
const { crearParqueadero, crearCeldas } = require('./infraestructura');
const reloj = require('../../src/utils/reloj');

/** Crea la sede y devuelve sus ids. */
async function crearSede(tokenAdmin, { carros = 3, motos = 1 } = {}) {
  const idParqueadero = await crearParqueadero(tokenAdmin);
  const puerta = async (nombre, tipo) =>
    (await request(app).post(`/api/v1/parqueaderos/${idParqueadero}/puertas`).set(auth(tokenAdmin)).send({ nombre, tipo })).body.data
      .idPuerta;
  const puertas = { mixta: await puerta('Principal', 'mixta'), entrada: await puerta('Solo entrada', 'entrada'), salida: await puerta('Solo salida', 'salida') };
  const celdas = {
    carro: await crearCeldas(tokenAdmin, idParqueadero, { prefijo: 'C-', cantidad: carros }),
    moto: await crearCeldas(tokenAdmin, idParqueadero, { prefijo: 'K-', cantidad: motos, tipoVehiculo: 'moto' }),
  };
  return { idParqueadero, puertas, celdas };
}

/** Fija el reloj del servidor en `fecha` (Date o ISO). Devuelve funciones para moverlo. */
function fijarReloj(fecha) {
  let actual = new Date(fecha);
  jest.spyOn(reloj, 'ahora').mockImplementation(() => new Date(actual));
  return {
    en: (nueva) => {
      actual = new Date(nueva);
    },
    sumarMinutos: (minutos) => {
      actual = new Date(actual.getTime() + minutos * 60000);
    },
  };
}

// Domingo 29 de noviembre de 2026 a las 10:00 en Bogotá: sin pico y placa en la semilla.
const DOMINGO_10AM = '2026-11-29T10:00:00-05:00';
// Lunes 30 de noviembre de 2026 a las 08:00 en Bogotá: carros y motos con 6 y 9 restringidos.
const LUNES_8AM = '2026-11-30T08:00:00-05:00';

module.exports = { crearSede, fijarReloj, DOMINGO_10AM, LUNES_8AM };
