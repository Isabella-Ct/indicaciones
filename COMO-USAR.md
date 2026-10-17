# Cómo usar este paquete con Claude Code

## 1. Prepara la carpeta del proyecto
1. Crea una carpeta nueva y vacía, por ejemplo `C:\Users\<tu-usuario>\proyectos\parking-lot-abc`.
2. Copia **dentro** de ella:
   - `CLAUDE.md` (en la raíz; Claude Code lo lee automáticamente en cada chat).
   - La carpeta `docs/` completa.
3. **No** copies la carpeta `prompts/`; quédatela aparte. Los prompts se pegan en el chat uno por uno.
4. Ábrela en Visual Studio Code y abre Claude Code.

Requisitos en tu PC: Node.js LTS y MySQL 8 (MySQL Server o XAMPP) funcionando, y Git.

## 2. Ejecuta las fases en orden

| Paso | Archivo a pegar | Resultado |
|---|---|---|
| 0 | `prompts/00-fase-0-base-del-proyecto.md` | Proyecto, BD consolidada, login y roles, layout |
| 1 | `prompts/01-fase-1-usuarios-y-vehiculos.md` | Usuarios y vehículos |
| 2 | `prompts/02-fase-2-celdas-y-mapa.md` | Celdas y mapa en tiempo real |
| 3 | `prompts/03-fase-3-pico-placa-y-movimientos.md` | Pico y placa, entradas, salidas y tickets |
| 4 | `prompts/04-fase-4-tarifas-facturacion-membresias.md` | Cobro, facturas, descuentos y membresías |
| 5 | `prompts/05-fase-5-incidencias-y-notificaciones.md` | Incidencias y notificaciones |
| 6 | `prompts/06-fase-6-reportes-y-dashboard.md` | 11 reportes y dashboard |
| 7 | `prompts/07-fase-7-reservas-portal-y-pagina-publica.md` | Reservas, portal del cliente y página pública |
| 8 | `prompts/08-fase-8-pruebas-pulido-y-entrega.md` | Pruebas, seguridad, documentación y entrega |

**Regla de oro:** no pases a la siguiente fase hasta que hayas probado la actual en el navegador y se cumplan sus criterios de aceptación.

## 3. Consejos
- Abre el contenido del `.md`, copia todo y pégalo en el chat. También puedes escribir: `Lee y ejecuta prompts/0X-....md` si dejas la carpeta `prompts/` dentro del proyecto.
- Para las fases 0, 3 y 4 (las más grandes) conviene activar el **modo plan** en Claude Code para revisar el plan antes de que escriba código.
- Si una fase queda a medias, no la repitas desde cero: dile qué falta, por ejemplo "termina los criterios de aceptación pendientes de la Fase 3".
- Si quieres cambiar una regla de negocio (tarifas, tiempo de gracia, horario de pico y placa), cámbiala **primero en `CLAUDE.md` §7** y luego pídele que la aplique.
- Usa un chat nuevo por fase si el chat se vuelve muy largo; el `CLAUDE.md` mantiene el contexto.

## 4. Decisiones ya tomadas (incluidas en `CLAUDE.md`)
- Stack: Node.js + Express + MySQL; frontend HTML/CSS/JS vanilla con **Atomic Design**.
- Diseño visual: maqueta **PARKO** (`docs/diseno-parko/`, estilo plano industrial). Los wireframes azules solo se usan para saber qué campos lleva cada pantalla.
- Login de todos los roles con **documento + contraseña** (ajuste a REQ-USR-8 por seguridad).
- Alcance completo: los 30 requerimientos + tarifas, facturación, membresías, descuentos, reservas y página pública.
- Placas y pagos **simulados**; factura PDF interna (no DIAN).
- BD nueva consolidada a partir de las dos versiones existentes.

## 5. Valores por defecto que debes confirmar (editables en `CLAUDE.md` §7)
- Cobro **por minuto** con tope diario, sin tiempo de gracia (tomado de la maqueta PARKO).
- Tarifas de ejemplo: carro $120/min (tope $28.000/día), moto $60/min (tope $12.000/día).
- Pico y placa de ejemplo: lunes a viernes de 05:00 a 20:00; carros por último dígito y motos por primer dígito.
- 2 puertas (Norte y Sur) y 44 celdas en 2 sótanos, con la misma distribución de la maqueta (incluye celdas accesibles y mensualidades con celda fija).
- Las reservas vencen a los 30 min.
