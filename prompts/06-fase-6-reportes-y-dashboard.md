# FASE 6 — Reportes y dashboard

## Contexto
Fases 0–5 terminadas: el sistema ya genera todos los datos operativos. Ahora construyes los **11 reportes del administrador** y un **dashboard por rol**. Los gráficos se hacen **sin librerías**, como componentes de Atomic Design, siguiendo el estilo del `col-chart` de la maqueta PARKO (`docs/diseno-parko/`, sección 7): barras planas en `--steel`, barra actual en `--yellow` con borde, barras futuras rayadas, ejes en `--font-mono`, sin sombras ni bordes redondeados.

## Lee primero
- `docs/requerimientos.md`: REQ-REP-01 a REQ-REP-11.
- `CLAUDE.md` §5 y §6 (los reportes son **solo para el admin**).
- Revisa `seed.sql`: si los datos históricos no alcanzan para que los reportes se vean bien, amplíalos (por ejemplo, 60 días de estadías con picos realistas de 7–9 h y 17–19 h).

Muestra tu plan antes de codificar, con la consulta SQL que propones para cada reporte.

## Tareas

### Backend — módulo `reportes` (todas las rutas con permiso `reportes.ver`)
| Ruta `GET /api/v1/reportes/...` | REQ | Contenido |
|---|---|---|
| `usuarios` | REP-01 | Todos los usuarios con todos sus datos (sin hash) y su rol. |
| `vehiculos` | REP-02 | Vehículos con sus datos y propietario. |
| `entradas?desde&hasta` | REP-03 | Entradas con fecha, hora, vehículo, puerta y celda. |
| `salidas?desde&hasta` | REP-04 | Salidas con fecha, hora, vehículo, puerta, duración y valor. |
| `incidencias?desde&hasta&tipo` | REP-05 | Incidencias. |
| `pico-placa?fecha` | REP-06 | Total y listado de vehículos registrados que **no** pueden ingresar ese día según las reglas activas + los accesos denegados reales de ese día. |
| `celdas-ocupadas?fecha` | REP-07 | Total de celdas distintas ocupadas ese día y ocupación máxima simultánea. |
| `celdas-mas-usadas?desde&hasta&limite` | REP-08 | Ranking por número de estadías y minutos totales. |
| `vehiculos-frecuentes?desde&hasta&limite` | REP-09 | Ranking por número de visitas y tiempo total. |
| `ocupacion?desde&hasta` | REP-10 | Matriz día de la semana × hora con la ocupación promedio, más la hora y el día pico. |
| `financiero?desde&hasta&agrupar=dia\|semana\|mes` | REP-11 | Ingresos por período, por método de pago, por tipo de vehículo y por concepto (estadía/membresía); descuentos otorgados. |

- Todos aceptan `?formato=csv` y devuelven CSV en UTF-8 con BOM (para que Excel muestre bien las tildes).
- Valida los rangos de fechas (máximo 366 días) y usa índices; revisa con `EXPLAIN` las consultas pesadas.
- `GET /api/v1/dashboard`: datos según el rol del usuario:
  - Admin: ocupación actual, ingresos de hoy vs. ayer, entradas de hoy, accesos denegados de hoy, incidencias de la semana, membresías por vencer.
  - Operador: ocupación actual, vehículos dentro, entradas/salidas de su turno (hoy), reglas de pico y placa de hoy.
  - Cliente: sus vehículos, si alguno está dentro y desde cuándo, membresía activa, reserva activa, últimas facturas.

### Frontend
- Organisms de gráficos (sin librerías): `col-chart` (reutiliza el de la maqueta, generado con datos reales: "Ocupación por hora · hoy"), `hbar-chart` (rankings REP-08/09), `line-chart` en SVG (ingresos REP-11), `heatmap` día × hora (REP-10, escala de `--concrete-2` a `--yellow` a `--orange`) y `stacked-meter` (métodos de pago, como barras `meter` apiladas en lugar de donas). Con ejes, etiquetas, `title`/tooltip, `role="img"` con `aria-label` descriptivo y colores solo desde tokens.
- `app/reportes.html`: menú lateral (estilo `level-tab` en vertical) con los 11 reportes; cada uno en un `panel` con sus filtros, tabla (`data-table`), gráfico cuando aplique, botones "Exportar CSV" e "Imprimir" (`@media print` limpio: sin navbar, fondo blanco).
- `app/inicio.html` → **dashboard real** según el rol usando la fila `kpis` y los gráficos; las cifras de ocupación se actualizan por SSE. Para admin y operador, el `col-chart` "Ocupación por hora · hoy" y la bitácora "Últimos movimientos", como en la parte inferior de la maqueta.

### Tests
- Cada reporte responde 403 para operador y cliente.
- REP-06 con reglas de prueba devuelve los vehículos correctos.
- REP-10 y REP-11 con un set de datos pequeño y controlado dan los totales esperados.
- CSV con tildes y separador correcto.

## Criterios de aceptación
- [ ] Los 11 reportes funcionan con filtros, exportan CSV y se imprimen bien.
- [ ] El dashboard muestra información distinta y útil para cada rol.
- [ ] Ningún reporte tarda más de 1 s con los datos semilla.
- [ ] `npm test` y `npm run lint` pasan; README actualizado.

## Al terminar
Commit + resumen. **No empieces la Fase 7.**
