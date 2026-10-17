# FASE 8 — Pruebas finales, pulido y entrega

## Contexto
Todas las funcionalidades están construidas (Fases 0–7). Esta fase **no agrega funcionalidades nuevas**: revisa, corrige, prueba y deja el proyecto listo para entregar y sustentar.

## Lee primero
- `CLAUDE.md` completo y `docs/requerimientos.md` completo.
- Todo el código del proyecto.

## Tareas

### 1. Matriz de trazabilidad
Crea `docs/trazabilidad.md`: una tabla con **cada REQ** (los 30 originales + los derivados) → endpoint(s) → pantalla(s) → test(s) que lo verifican → estado (✅ / ⚠️ parcial / ❌). Todo lo que no esté en ✅ arréglalo o explícame por qué no se puede.

### 2. Revisión de calidad
- Busca y elimina código muerto, duplicado y `console.log` de depuración.
- Verifica que **todas** las rutas tengan validación con zod y `requirePermiso` correctos (genera una tabla ruta → permiso en `docs/api.md`).
- Verifica que el frontend respete Atomic Design: ningún componente llama a la API, ningún nivel importa uno superior, ningún color fuera de `tokens.css`, ningún `innerHTML` con datos del usuario.
- Fidelidad visual: compara cada pantalla con `docs/diseno-parko/` (tokens idénticos, fuentes, bordes rectos, sin sombras decorativas, franja de peligro, mayúsculas condensadas) y corrige las diferencias. Revisa que los 8 retos de `docs/diseno-parko/script.js` funcionen en la app real.
- Revisión de seguridad: inyección SQL, XSS, IDOR (acceder a recursos ajenos cambiando el id), subida de archivos, cookies, rate limits, cabeceras de helmet, mensajes de error. Corrige lo que encuentres y lístalo.
- Revisa las transacciones de entrada, pago y reserva frente a concurrencia (dos operadores al mismo tiempo en la misma celda).

### 3. Pruebas
- Sube la cobertura de los services a ≥ 80 % (`jest --coverage`).
- Agrega un test de integración del flujo completo: crear cliente → crear vehículo → membresía/reserva → entrada → salida → pago → factura → aparece en reportes.
- Prueba manual guiada: recorre cada pantalla con los 3 roles en escritorio y a 375 px y entrégame una lista de verificación con el resultado.

### 4. Pulido de interfaz
- Estados vacíos, de carga y de error consistentes en todas las pantallas.
- Confirmación antes de acciones destructivas (inactivar, cancelar, cobrar).
- Revisión de textos (ortografía y tildes), formato de dinero y fechas consistente.
- Página 404 y página de error con el layout del sistema.

### 5. Documentación y entrega
- `README.md` final: descripción, capturas de pantalla (guárdalas en `docs/capturas/`), requisitos, instalación paso a paso en Windows con MySQL/XAMPP o MySQL Server, variables de entorno, usuarios de prueba, scripts, estructura, cómo correr los tests.
- `docs/api.md`: todos los endpoints con método, ruta, permiso, parámetros y ejemplo de respuesta.
- `docs/modelo-datos.md`: descripción de cada tabla y un diagrama entidad-relación en **Mermaid**.
- `docs/manual-usuario.md`: guía corta por rol (administrador, operador, cliente).
- `backend/database/schema.sql` consolidado con todas las migraciones aplicadas (que una instalación nueva funcione solo con `schema.sql` + `seed.sql`).

## Criterios de aceptación
- [ ] `docs/trazabilidad.md` con todos los REQ en ✅ (o justificados).
- [ ] `npm test` (cobertura ≥ 80 % en services) y `npm run lint` pasan.
- [ ] Una persona nueva puede instalar y correr el proyecto solo siguiendo el README.
- [ ] La lista de verificación manual está completa.

## Al terminar
Commit final con tag `v1.0.0` y un resumen ejecutivo del proyecto (qué hace, cómo está construido, qué quedó fuera de alcance: OCR real, DIAN, pasarela de pago, correos/SMS) que pueda usar para la sustentación.
