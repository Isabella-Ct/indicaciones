// Reportes del administrador — REQ-REP-01…11. Todos con permiso reportes.ver y ?formato=csv.
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const esquemas = require('./reportes.schemas');
const controller = require('./reportes.controller');

const router = Router();
router.use(auth(), requirePermiso('reportes.ver'));

const ruta = (camino, esquema, accion) => router.get(camino, validate({ query: esquema }), accion);

// REP-01 usuarios (?rol, ?estado) · REP-02 vehículos (?tipo, ?propietario=con|sin)
ruta('/usuarios', esquemas.usuarios, controller.usuarios);
ruta('/vehiculos', esquemas.vehiculos, controller.vehiculos);
// REP-03 entradas · REP-04 salidas (?desde&hasta, ?tipo, ?puerta_id, ?placa)
ruta('/entradas', esquemas.entradas, controller.entradas);
ruta('/salidas', esquemas.salidas, controller.salidas);
// REP-05 incidencias (?desde&hasta&tipo)
ruta('/incidencias', esquemas.incidencias, controller.incidencias);
// REP-06 pico y placa (?fecha) · REP-07 celdas ocupadas (?fecha)
ruta('/pico-placa', esquemas.picoPlaca, controller.picoPlaca);
ruta('/celdas-ocupadas', esquemas.celdasOcupadas, controller.celdasOcupadas);
// REP-08 celdas más usadas · REP-09 vehículos frecuentes (?desde&hasta&limite&tipo)
ruta('/celdas-mas-usadas', esquemas.celdasMasUsadas, controller.celdasMasUsadas);
ruta('/vehiculos-frecuentes', esquemas.vehiculosFrecuentes, controller.vehiculosFrecuentes);
// REP-10 ocupación día × hora (?desde&hasta) · REP-11 financiero (?desde&hasta&agrupar)
ruta('/ocupacion', esquemas.ocupacion, controller.ocupacion);
ruta('/financiero', esquemas.financiero, controller.financiero);

module.exports = router;
