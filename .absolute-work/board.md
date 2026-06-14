# Absolute Work Board — Calendario PDF

**Status:** completed  
**Completed at:** 2026-06-12T06:20:00Z

## Project Conventions

- npm, Node 18+ ESM, Express backend, React+Vite frontend
- Sin test runner configurado; verificación manual vía curl + dev servers
- Datos en `backend/data/`

## Rollback Point

Pre-implementación (sin commit de usuario)

## Tasks

| ID | Title | Status |
|---|---|---|
| AW-001 | teamNamesEs + flags | done |
| AW-002 | worldcup-schedule.json (72) | done |
| AW-003 | scheduleMerge.js | done |
| AW-004 | localSchedule + worldCupSync | done |
| AW-005 | matchDetail external IDs | done |
| AW-006 | Spec + verify manual | done |

## Deferred Work

- Eliminatorias en calendario PDF
- Tests automatizados
- Parser PDF binario en runtime

## Verification

- [x] 72 partidos PDF sin duplicados del scraper
- [x] México 2-0 con cronología (5 eventos TheSportsDB)
- [x] Conteos por fecha: 11/jun=2, 12/jun=2, 13/jun=4, 27/jun=6
- [x] Frontend build OK
