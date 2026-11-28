// Reloj único del servidor (RN-16: la hora de entrada y de salida la pone el servidor). Los servicios
// llaman a reloj.ahora() en vez de new Date(), así las pruebas pueden fijar el momento con
// jest.spyOn(reloj, 'ahora') sin depender del día ni de la hora reales (pico y placa, minutos).
module.exports = {
  ahora: () => new Date(),
};
