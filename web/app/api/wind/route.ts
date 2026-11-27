import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../src/lib/db";
import type { WindHour } from "../../../src/types";

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
            ts,
            speed_ms::float8 as speed_ms,
            direction_deg::float8 as direction_deg
          from wind_hourly
          where event_id = $1
          order by ts asc
        `
        : `
          select
            ts,
            speed_ms::float8 as speed_ms,
            direction_deg::float8 as direction_deg
          from wind_hourly
          order by ts asc
        `;

    const result =
      eventId !== null
        ? await db.query<WindHour>(sql, [eventId])
        : await db.query<WindHour>(sql);

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("GET /api/wind failed:", err);
    return NextResponse.json(
      { error: "Failed to load hourly wind data" },
      { status: 500 }
    );
  }
}