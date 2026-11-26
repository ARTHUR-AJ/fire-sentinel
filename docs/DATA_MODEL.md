# Data Model (draft)

Owner: backend/data person. This is a draft: change it only after telling the team.
All geometry uses SRID 4326 (longitude, latitude).

The shapes below are the "contract". Atusaye and Gilbert can build with the mock examples
before the database is ready, and the backend person must return exactly these shapes from the API.

## Tables

| Table | Purpose | Main columns |
|---|---|---|
| reserves | forest reserve outlines | id, name, geom (Polygon) |
| fire_events | the one past fire we replay | id, name, reserve_id, started_at |
| fire_detections | satellite detections for the event | id, event_id, detected_at, geom (Point), confidence, frp, satellite |
| villages | village points near the reserve | id, name, geom (Point), osm_id |
| wind_hourly | wind for the event period | id, event_id, ts, speed_ms, direction_deg |
| spread_forecasts | predicted ellipses | id, event_id, hours_since_detection, scenario ('slow' or 'fast'), geom (Polygon) |
| village_alerts | arrival windows and simulated SMS | id, event_id, village_id, window_min_h, window_max_h, message, created_at |
| validation_results | reality check score | id, event_id, hits, total, notes |

Column names for the fire data come from the FIRMS CSV (latitude, longitude, acq_date, acq_time,
confidence, frp, satellite). Check the real CSV header before writing the loader.

Wind direction convention: degrees the wind blows FROM (as most weather services report).
Fire spreads in the opposite direction (downwind). State this in the code comments.

## Mock examples (GeoJSON-style)

Fire detection:
```json
{ "id": 1, "detected_at": "2025-09-14T10:42:00Z", "lat": -15.35, "lng": 35.30,
  "confidence": "nominal", "frp": 4.2, "satellite": "VIIRS" }
```

Village:
```json
{ "id": 7, "name": "Example Village", "lat": -15.40, "lng": 35.36 }
```

Wind (one hour):
```json
{ "ts": "2025-09-14T11:00:00Z", "speed_ms": 4.5, "direction_deg": 120 }
```

Forecast ellipse (one hour, one scenario):
```json
{ "hours_since_detection": 3, "scenario": "fast",
  "geometry": { "type": "Polygon", "coordinates": [[[35.30,-15.35],[35.34,-15.37],[35.38,-15.36],[35.30,-15.35]]] } }
```

Village alert:
```json
{ "village_id": 7, "window_min_h": 2, "window_max_h": 5,
  "message": "Fire detected 8 km upwind. Likely to reach you in 2 to 5 hours. Move livestock and clear around homes." }
```

All numbers above are placeholders to show the shape. They are not real data.
