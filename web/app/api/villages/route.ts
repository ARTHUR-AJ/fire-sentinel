import { NextResponse } from "next/server";
import { db } from "../../../src/lib/db";
import type { Village } from "../../../src/types";

export async function GET() {
  try {
    const result = await db.query<Village>(`
      select
        id,
        name,
        st_y(geom)::float8 as lat,
        st_x(geom)::float8 as lng,
        osm_id
      from villages
      where geom is not null
      order by id asc
    `);

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("GET /api/villages failed:", err);
    return NextResponse.json(
      { error: "Failed to load villages" },
      { status: 500 }
    );
  }
}