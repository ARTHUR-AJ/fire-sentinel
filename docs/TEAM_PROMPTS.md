# Team Prompts

How to use these:

1. Open your AI assistant in a new chat.
2. **Paste Prompt 0 first** and then paste the full contents of `docs/PROJECT_BRIEF.md` and `docs/DATA_MODEL.md` after it.
   (If your AI tool can read files in your project, say: "Read docs/PROJECT_BRIEF.md and docs/DATA_MODEL.md" instead.)
3. Then paste **your own role prompt** below.
4. Do the work on your own git branch (see the Git rules in the brief).

---

## Prompt 0 (everyone, paste first)

```
I am a university student working in a team of three on a GIS course project called "Fire Sentinel Lite".
You do not know this project yet, so I will give you two documents: PROJECT_BRIEF.md and DATA_MODEL.md.
Read both completely before answering anything.
Then reply with: (1) the project in two sentences, (2) which files and folders I am responsible for,
(3) any question you have. Do not write code until I give you my role and my first task.
I am still learning, so explain things simply and step by step, and tell me which file you changed and why.
Stay inside my own folders. Never put secrets in code.
```

---

## Role 1: Backend and data (you)

Folders: `db/`, `scripts/`, `web/src/app/api/`, `web/src/types.ts`.

```
My role: backend and data. I own db/, scripts/, web/src/app/api/ and web/src/types.ts.
Goal for the next days:
Day 1: create the Supabase project, enable PostGIS, write db/schema.sql from DATA_MODEL.md and apply it.
Write a Python script in scripts/ that fetches NASA FIRMS fire detections for a bounding box and date range
and loads them into fire_detections. Write a second script that loads OpenStreetMap villages for the same box.
Day 2: a script that loads hourly wind from Open-Meteo for the event. API routes: GET /api/fires, /api/villages, /api/wind
that return exactly the shapes in DATA_MODEL.md. Define the shared TypeScript types in web/src/types.ts.
Day 3: API routes to save and read spread forecasts and village alerts.
Rules: read secrets from environment variables (scripts/.env and web/.env.local), never commit them.
Start with Day 1, step 1 only. Give me the exact steps and explain each one. Wait for me to confirm before the next step.
```

---

## Role 2: Map and animation (Atusaye)

Folders: `web/src/components/` and the page files that use them.

```
My role: map and user interface. I own web/src/components/ (and the page that uses them).
I work with MOCK DATA first, using the shapes in DATA_MODEL.md, so I do not wait for the database.
Goal for the next days:
Day 1: a Next.js page with a Leaflet map (react-leaflet, loaded client-side only) centred on the reserve area.
Show villages and fire detections from a mock JSON file in web/src/mock/.
Day 2: a play/pause button and time slider that moves hour by hour through the event.
Day 3: draw the slow and fast ellipse polygons for the current hour, colour the villages that fall inside,
and add a side panel listing villages with their arrival windows.
Day 4: an alert screen showing the simulated SMS, and a final polish for the video.
Rules: use types from web/src/types.ts, do not edit other people's files, keep components small.
Start with Day 1 only. Explain what each file does as you create it.
```

---

## Role 3: Spread logic, validation, slide and video (Gilbert)

Folders: `web/src/lib/spread.ts`, tests, and `docs/` for the slide and video script.

```
My role: spread logic and validation. I own web/src/lib/spread.ts (and its tests) and the slide and video script in docs/.
I work with MOCK DATA first, using the shapes in DATA_MODEL.md.
Goal for the next days:
Day 1: write pure TypeScript functions using turf.js. Function 1 builds an ellipse polygon from a start point,
wind speed, wind direction (the wind blows FROM that direction, the fire spreads the opposite way), hours elapsed,
and a scenario ('slow' or 'fast'). The ellipse is longer downwind than upwind. State every assumption in comments.
Day 2: a function that, for each village, tells whether it is inside an ellipse and returns an arrival window
(earliest and latest hour) from the slow and fast cases.
Day 3: a validation function: given later satellite detections and the predicted ellipses, return hits, total and hit rate.
Day 4: write the one-slide text (problem and spatial methods) and the video script, including the honesty rules.
Rules: no network calls inside these functions, keep them easy to test, do not edit other people's files.
Start with Day 1 only. Explain the maths in simple words and give me a small test I can run.
```

---

## Daily check-in (5 minutes)

Each person says: what I finished, what I am doing next, what is blocking me.
Checkpoint at the end of Day 2: fire detections and villages must be loaded and visible on the map.
If not, the team switches to the Borehole Doctor plan.
