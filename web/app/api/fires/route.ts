import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../src/lib/db";
import type { FireDetection } from "../../../src/types";

export async function GET(req: NextRequest) {
  try {
    const eventIdParam = req.nextUrl.searchParams.get("eventId");
    let eventId: number | null = null;

    if (eventIdParam !== null) {
      eventId = Number(eventIdParam);
      if (!Number.isInteger(eventId) || eventId <= 0) {
        return NextResponse.json(
          { error: "Invalid eventId query parameter" },
          { status: 400 }
        );
      }
    }

    const sql =
      eventId !== null
        ? `
          select
            id,
            detected_at,
            st_y(geom)::float8 as lat,
            st_x(geom)::float8 as lng,
            confidence,
            frp,
            satellite
          from fire_detections
          where event_id = $1 and geom is not null
          order by detected_at asc, id asc
        `
        : `
          select
            id,
            detected_at,
            st_y(geom)::float8 as lat,
            st_x(geom)::float8 as lng,
            confidence,
            frp,
            satellite
          from fire_detections
          where geom is not null
          order by detected_at asc, id asc
        `;

    const result =
      eventId !== null
        ? await db.query<FireDetection>(sql, [eventId])
        : await db.query<FireDetection>(sql);

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("GET /api/fires failed:", err);
    return NextResponse.json(
      { error: "Failed to load fire detections" },
      { status: 500 }
    );
  }
}