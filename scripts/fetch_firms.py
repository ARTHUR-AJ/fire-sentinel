"""Fetch NASA FIRMS fire detections for a box and date range, then load them into Postgres.

Example (dry run, nothing is written to the database):
    python fetch_firms.py --bbox "35.15,-15.55,35.55,-15.15" --start 2025-09-10 --days 5 \
        --name "Zomba area Sept 2025" --dry-run

Secrets come from scripts/.env (never commit that file):
    FIRMS_MAP_KEY=...
    DATABASE_URL=postgresql://...
"""
import argparse
import io
import os
import sys

import pandas as pd
import requests
from dotenv import load_dotenv

FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/{source}/{bbox}/{days}/{date}"
CONFIDENCE_WORDS = {"l": "low", "n": "nominal", "h": "high"}  # VIIRS confidence letters


def fetch_csv_text(key, source, bbox, days, start):
    """Ask FIRMS for detections. We never print the URL because it contains the key."""
    url = FIRMS_URL.format(key=key, source=source, bbox=bbox, days=days, date=start)
    try:
        response = requests.get(url, timeout=60)
        response.raise_for_status()
    except requests.RequestException as err:
        sys.exit(f"Request to FIRMS failed ({type(err).__name__}). Check your network and key.")
    return response.text


def parse_detections(csv_text):
    """Turn FIRMS CSV text into a table with a real UTC timestamp column."""
    if not csv_text.startswith("latitude"):
        sys.exit(f"FIRMS did not return a CSV. It said: {csv_text[:200]!r}")
    # acq_time is HHMM in UTC. Read it as text so 31 can become "0031".
    df = pd.read_csv(io.StringIO(csv_text), dtype={"acq_time": str})
    df["detected_at"] = pd.to_datetime(
        df["acq_date"] + " " + df["acq_time"].str.zfill(4), format="%Y-%m-%d %H%M", utc=True
    )
    return df.sort_values("detected_at").reset_index(drop=True)


def none_if_missing(value):
    return None if pd.isna(value) else value


def load_into_database(df, event_name, source):
    import psycopg  # imported here so a dry run works without a database

    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        with conn.cursor() as cur:
            cur.execute("select id from fire_events where name = %s", (event_name,))
            if cur.fetchone():
                sys.exit(f"An event named {event_name!r} already exists. Pick another name or delete it first.")

            cur.execute(
                "insert into fire_events (name, started_at) values (%s, %s) returning id",
                (event_name, df["detected_at"].min().to_pydatetime()),
            )
            event_id = cur.fetchone()[0]

            rows = [
                (
                    event_id,
                    row.detected_at.to_pydatetime(),
                    float(row.longitude),
                    float(row.latitude),
                    CONFIDENCE_WORDS.get(str(row.confidence).lower(), str(row.confidence)),
                    none_if_missing(row.frp),
                    source,
                )
                for row in df.itertuples()
            ]
            cur.executemany(
                """
                insert into fire_detections (event_id, detected_at, geom, confidence, frp, satellite)
                values (%s, %s, extensions.st_setsrid(extensions.st_makepoint(%s, %s), 4326), %s, %s, %s)
                """,
                rows,
            )
    return event_id


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--bbox", help='"west,south,east,north" (longitude first)')
    parser.add_argument("--start", help="start date, YYYY-MM-DD")
    parser.add_argument("--days", type=int, default=5, help="1 to 5 (the live endpoint says 1..5)")
    parser.add_argument("--source", default="VIIRS_SNPP_SP")
    parser.add_argument("--name", required=True, help="name for the fire event, e.g. 'Zomba area Sept 2025'")
    parser.add_argument("--csv", help="read a saved FIRMS CSV file instead of calling the API")
    parser.add_argument("--dry-run", action="store_true", help="show what would be loaded, write nothing")
    args = parser.parse_args()

    load_dotenv()

    if args.csv:
        with open(args.csv, encoding="utf-8") as handle:
            csv_text = handle.read()
    else:
        if not (args.bbox and args.start):
            sys.exit("Give --bbox and --start, or use --csv.")
        key = os.environ.get("FIRMS_MAP_KEY")
        if not key:
            sys.exit("FIRMS_MAP_KEY is missing. Put it in scripts/.env")
        csv_text = fetch_csv_text(key, args.source, args.bbox, args.days, args.start)

    df = parse_detections(csv_text)
    print(f"Fetched {len(df)} detections from {df['detected_at'].min()} to {df['detected_at'].max()} (UTC)")
    print(df[["detected_at", "latitude", "longitude", "confidence", "frp"]].head(5).to_string(index=False))

    if args.dry_run:
        print("Dry run: nothing was written.")
        return

    if not os.environ.get("DATABASE_URL"):
        sys.exit("DATABASE_URL is missing. Put it in scripts/.env")
    event_id = load_into_database(df, args.name, args.source)
    print(f"Loaded {len(df)} detections into event id {event_id}.")


if __name__ == "__main__":
    main()
