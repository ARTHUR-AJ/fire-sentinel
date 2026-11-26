"""Fetch villages and hamlets from OpenStreetMap (Overpass API) for a box and load them into Postgres.

Example (dry run, nothing is written to the database):
    python fetch_villages.py --bbox "35.15,-15.55,35.55,-15.15" --dry-run

--bbox uses the same order as the FIRMS script: "west,south,east,north" (longitude first).
Overpass wants a different order (south,west,north,east), and this script converts it for you.

Secrets come from scripts/.env (never commit that file):
    DATABASE_URL=postgresql://...
"""
import argparse
import json
import os
import sys
import time

import requests
from dotenv import load_dotenv

# Public Overpass servers, tried in this order. The main one is often overloaded.
ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
HEADERS = {"User-Agent": "fire-sentinel-student-project/0.1"}


def build_query(bbox):
    """bbox is 'west,south,east,north'. Overpass expects (south,west,north,east)."""
    try:
        west, south, east, north = [float(part) for part in bbox.split(",")]
    except ValueError:
        sys.exit("--bbox must be four numbers: west,south,east,north")
    if west >= east or south >= north:
        sys.exit("Check --bbox: west must be less than east, and south less than north.")
    return f"""
[out:json][timeout:60];
node["place"~"^(village|hamlet)$"]({south},{west},{north},{east});
out;
"""


def fetch_elements(query, endpoints):
    """Try each Overpass server in turn and say exactly what went wrong with each."""
    problems = []
    for url in endpoints:
        host = url.split("/")[2]
        try:
            response = requests.post(url, data={"data": query}, headers=HEADERS, timeout=90)
        except requests.RequestException as err:
            problems.append(f"{host}: {type(err).__name__}")
        else:
            if response.status_code == 200:
                try:
                    elements = response.json().get("elements", [])
                except ValueError:
                    problems.append(f"{host}: answered 200 but not with JSON")
                else:
                    print(f"Got data from {host}")
                    return elements
            else:
                problems.append(f"{host}: HTTP {response.status_code}")
        time.sleep(3)
    sys.exit(
        "All Overpass servers failed:\n  "
        + "\n  ".join(problems)
        + "\nWait 30 seconds and try again, or use the saved-file route (--json)."
    )


def parse_villages(elements):
    """Keep only nodes with coordinates. A village may have no name in OpenStreetMap."""
    villages = []
    for element in elements:
        if element.get("type") != "node" or "lat" not in element or "lon" not in element:
            continue
        tags = element.get("tags", {})
        villages.append(
            {
                "osm_id": int(element["id"]),
                "name": tags.get("name"),
                "place": tags.get("place"),
                "lat": float(element["lat"]),
                "lon": float(element["lon"]),
            }
        )
    return villages


def load_into_database(villages):
    import psycopg  # imported here so a dry run works without a database

    rows = [(v["osm_id"], v["name"], v["lon"], v["lat"]) for v in villages]
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        with conn.cursor() as cur:
            cur.executemany(
                """
                insert into villages (osm_id, name, geom)
                values (%s, %s, extensions.st_setsrid(extensions.st_makepoint(%s, %s), 4326))
                on conflict (osm_id) do nothing
                """,
                rows,
            )
            cur.execute("select count(*) from villages")
            return cur.fetchone()[0]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--bbox", help='"west,south,east,north" (longitude first)')
    parser.add_argument("--json", help="read a saved Overpass JSON file instead of calling the API")
    parser.add_argument("--dry-run", action="store_true", help="show what would be loaded, write nothing")
    args = parser.parse_args()

    load_dotenv()

    if args.json:
        with open(args.json, encoding="utf-8") as handle:
            elements = json.load(handle).get("elements", [])
    else:
        if not args.bbox:
            sys.exit("Give --bbox, or use --json.")
        elements = fetch_elements(build_query(args.bbox), ENDPOINTS)

    villages = parse_villages(elements)
    named = sum(1 for v in villages if v["name"])
    print(f"Found {len(villages)} villages/hamlets ({named} with a name, {len(villages) - named} without).")
    for v in villages[:5]:
        print(f"  {v['osm_id']}  {(v['place'] or '-'):<8} {v['name'] or '(no name)'}  ({v['lat']}, {v['lon']})")

    if args.dry_run:
        print("Dry run: nothing was written.")
        return

    if not os.environ.get("DATABASE_URL"):
        sys.exit("DATABASE_URL is missing. Put it in scripts/.env")
    total = load_into_database(villages)
    print(f"Done. The villages table now holds {total} rows.")


if __name__ == "__main__":
    main()
