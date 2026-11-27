"""Fetch hourly historical wind from Open-Meteo and load it into wind_hourly.

Example (dry run):
    python fetch_wind.py --lat -15.35 --lon 35.35 --start 2025-09-10 --end 2025-09-14 --event-id 1 --dry-run

Wind direction convention:
    Open-Meteo reports wind_direction_10m as the direction the wind blows FROM (degrees).
    Fire spreads downwind (the opposite direction).

Secrets come from scripts/.env (never commit that file):
    DATABASE_URL=postgresql://...
"""
import argparse
import os
import sys
from datetime import datetime, timezone

import psycopg
import requests
from dotenv import load_dotenv

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"


def fetch_hourly_wind(lat: float, lon: float, start_date: str, end_date: str) -> list[dict]:
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": "wind_speed_10m,wind_direction_10m",
        "wind_speed_unit": "ms",
        "timezone": "UTC",
    }
    try:
        response = requests.get(ARCHIVE_URL, params=params, timeout=30)
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as err:
        sys.exit(f"Open-Meteo request failed: {err}")

    hourly = payload.get("hourly", {})
    times = hourly.get("time", [])
    speeds = hourly.get("wind_speed_10m", [])
    directions = hourly.get("wind_direction_10m", [])

    if not times or not (len(times) == len(speeds) == len(directions)):
        sys.exit("Unexpected or empty hourly wind payload from Open-Meteo.")

    rows = []
    for ts_str, speed, direction in zip(times, speeds, directions):
        if speed is None or direction is None:
            continue
        dt = datetime.fromisoformat(ts_str).replace(tzinfo=timezone.utc)
        rows.append(
            {
                "ts": dt,
                "speed_ms": float(speed),
                "direction_deg": float(direction),
            }
        )
    return rows


def load_wind_into_db(event_id: int, wind_rows: list[dict]) -> int:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        sys.exit("DATABASE_URL is missing. Put it in scripts/.env")

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("select id from fire_events where id = %s", (event_id,))
            if cur.fetchone() is None:
                sys.exit(f"fire_events row with id={event_id} does not exist.")

            records = [
                (event_id, r["ts"], r["speed_ms"], r["direction_deg"])
                for r in wind_rows
            ]
            cur.executemany(
                """
                insert into wind_hourly (event_id, ts, speed_ms, direction_deg)
                values (%s, %s, %s, %s)
                on conflict (event_id, ts) do update set
                    speed_ms = excluded.speed_ms,
                    direction_deg = excluded.direction_deg
                """,
                records,
            )
            cur.execute("select count(*) from wind_hourly where event_id = %s", (event_id,))
            return cur.fetchone()[0]


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--lat", type=float, default=-15.35, help="Latitude (default: -15.35 near Zomba)")
    parser.add_argument("--lon", type=float, default=35.35, help="Longitude (default: 35.35 near Zomba)")
    parser.add_argument("--start", required=True, help="Start date YYYY-MM-DD (UTC)")
    parser.add_argument("--end", required=True, help="End date YYYY-MM-DD (UTC)")
    parser.add_argument("--event-id", type=int, required=True, help="Target fire_events.id")
    parser.add_argument("--dry-run", action="store_true", help="Fetch and preview without writing to DB")
    args = parser.parse_args()

    load_dotenv()

    rows = fetch_hourly_wind(args.lat, args.lon, args.start, args.end)
    print(f"Fetched {len(rows)} hourly wind records from {args.start} to {args.end} (UTC).")
    for r in rows[:5]:
        print(f"  {r['ts'].isoformat()}  speed={r['speed_ms']} m/s  from={r['direction_deg']} deg")

    if args.dry_run:
        print("Dry run: nothing was written to wind_hourly.")
        return

    total = load_wind_into_db(args.event_id, rows)
    print(f"Done. wind_hourly now has {total} rows for event_id={args.event_id}.")


if __name__ == "__main__":
    main()