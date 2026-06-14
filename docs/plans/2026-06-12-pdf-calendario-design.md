# Calendario PDF como fuente oficial — Design Spec

**Fecha:** 2026-06-12  
**Estado:** Aprobado e implementado

## Objetivo

Usar el calendario oficial del PDF FIFA 2026 (72 partidos, fase de grupos) como base estructural, manteniendo la lógica existente de goles, cronología, tarjetas y alineaciones en cancha.

## Decisiones

| Tema | Decisión |
|---|---|
| Calendario base | `backend/data/worldcup-schedule.json` (72 partidos, IDs 1–72) |
| Zona horaria | `America/Mexico_City` (`-06:00`) |
| Nombres UI | Español; `nameEn` interno para APIs |
| Enriquecimiento | `local-schedule.json` (scraper LiveScore/TheSportsDB) |
| Datos en vivo | SportsAPIPro overlay + eliminatorias extra de API |
| Fusión | `scheduleMerge.js` por `fixtureKey` normalizado |

## Arquitectura

```
worldcup-schedule.json (PDF)
  → merge enrichments (local-schedule scraper)
  → overlay live (API cache / SportsAPIPro)
  → frontend GET /api/worldcup/today
```

Detalle partido sin cambios de contrato: `GET /api/worldcup/match/:id` resuelve por ID numérico o externos (`externalApiId`, `theSportsDbId`).

## Archivos

- `backend/scripts/build-worldcup-schedule.js` — regenera JSON desde datos del PDF
- `backend/src/utils/teamNamesEs.js` — mapa ES ↔ EN
- `backend/src/services/scheduleMerge.js` — fusión en capas
- `backend/src/services/localSchedule.js` — carga PDF + scraper
- `backend/src/services/worldCupSync.js` — sync diario con presupuesto API

## Fuera de alcance

- Eliminatorias en PDF (solo vía API cuando existan)
- Parser PDF en runtime (PDF es referencia; JSON es fuente)
