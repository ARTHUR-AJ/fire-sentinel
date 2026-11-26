# Fire Sentinel Lite: Project Brief

This file is the shared context for the three team members AND for any AI assistant they use.
If you are an AI assistant reading this: you are helping a university student who is still learning.
Follow the "Rules for the AI assistant" section at the bottom.

## 1. What this is

A university GIS course assignment (UNIMA, Malawi).

- Build a **database-driven web application** that solves a spatial problem.
- Deliver a **10-minute video** (1 slide explaining the problem and the spatial analysis methods, then a demo)
  and a **public GitHub repository**.
- Team of three: the backend/data person, Atusaye, Gilbert.
- Deadline: about 30 November 2026 (confirm the exact date). We are vibe coding (building with AI help).

## 2. The problem

Bushfires burn Malawi's forest reserves every dry season, and villages nearby get no early warning of a fire heading their way.
Satellites detect fires, weather data gives wind, and a simple spread model can estimate where a fire is heading.
Fire Sentinel Lite shows how an early warning for villages could work.

## 3. What the app does (the demo story)

Fire Sentinel Lite **replays one real past fire** near one forest reserve.

1. Map shows the reserve outline and the villages around it.
2. User presses play. The first satellite detection appears with a label like "detected 6 hours ago".
3. The app reads the wind for that time and draws **two ellipses**, a slow case and a fast case, stretched downwind and growing hour by hour.
4. Villages inside the fast ellipse change colour. A side panel lists each with an **arrival window**, for example "likely reached in 2 to 5 hours".
5. An **alert screen** shows the SMS that would be sent to the village focal person. It is **simulated** and saved in an alerts table.
6. **Reality check:** the satellite's next pass is shown, and the app counts how many new detections fell inside the predicted ellipses (for example "7 of 9").

## 4. Honesty rules (these must also appear in the video)

- It is a replay of a past fire, not live monitoring, and not an official warning system.
- Satellite detections are pixels of roughly 375 m, not exact fire lines. Satellites pass about every 12 hours.
- The spread model is an estimate. We show a range (slow and fast), not one exact time.
- Wind data is coarse. The SMS is simulated.
- Do not invent data. If something is an assumption, label it in the code and in the UI.

## 5. Tech stack

- **Web app:** Next.js (App Router, TypeScript, Tailwind, `src/` folder) in `web/`.
- **Map:** Leaflet with react-leaflet (load the map client-side only), plus turf.js for geometry such as ellipses and point-in-polygon.
- **Database:** Supabase Postgres with the PostGIS extension.
- **Data scripts:** Python in `scripts/` (requests, pandas, psycopg). They run locally and are not deployed.
- **Data sources:**
  - Satellite fires: NASA FIRMS area API (free MAP_KEY). Use the archive-type sources (for example VIIRS_SNPP_SP) with a date. Up to 10 days per request. Area is west,south,east,north.
  - Villages: OpenStreetMap place=village and place=hamlet points inside our bounding box.
  - Wind: Open-Meteo historical weather API, hourly wind speed and direction (to be confirmed with one test request).
  - Reserve boundary: from Protected Planet / OpenStreetMap if available, otherwise traced by hand.

## 6. Repository layout and ownership

```
fire-sentinel/
  README.md  .gitignore
  docs/      PROJECT_BRIEF.md, DATA_MODEL.md, TEAM_PROMPTS.md
  db/        schema.sql, queries.sql             OWNER: backend/data person
  scripts/   Python data scripts                 OWNER: backend/data person
  web/
    src/app/api/      backend routes             OWNER: backend/data person
    src/components/   map, slider, panels, alert UI   OWNER: Atusaye
    src/lib/spread.ts ellipse + arrival windows + validation   OWNER: Gilbert
    src/types.ts      shared data shapes         OWNER: backend/data person (change only after telling the others)
```

Only edit files in your own area. If you need a change elsewhere, ask the owner.

## 7. Spatial methods (these go on the slide)

- Point-in-polygon (which reserve, which villages are inside the ellipse).
- Elliptical fire spread model: the front is stretched downwind and compressed upwind. Speed depends on wind. We compute a slow and a fast case.
- Distance along the wind direction converted to an arrival time window.
- Validation: hit rate of later satellite detections inside the predicted ellipses.

## 8. Rules for the AI assistant

- The student is learning. Explain simply and step by step. Say which file you changed and why.
- Stay inside the student's own folders (see section 6). Do not rewrite other people's files.
- Never put secrets (API keys, database passwords) in code. Read them from environment variables. Never commit `.env` files.
- Prefer simple solutions. Use TypeScript types from `web/src/types.ts`.
- Leaflet needs the browser, so map components must be client components (loaded without server-side rendering).
- Do not invent data or claim accuracy we have not measured. Flag assumptions.
- Ask before making large design decisions.
- Keep changes small so they are easy to commit.

## 9. Git rules

- Never work directly on `main`. Work on a branch named for your task, for example `feature/map-ui`.
- Pull `main` before you start a new task. Commit small and often. Open a Pull Request when a piece works.
- Only merge after a teammate has looked at the pull request.
