import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../src/lib/db";
import type { FireEventDetail, ReserveBoundary } from "../../../../src/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface EventReserveRow {
  id: number;
  name: string;
  started_at: string;
  reserve_id: number | null;
  reserve_name: string | null;
  reserve_geojson: string | null;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id: rawId } = await context.params;
    const eventId = Number(rawId);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json(
        { error: "Invalid event id parameter" },
        { status: 400 }
      );
    }

    const result = await db.query<EventReserveRow>(
      `
        select
          fe.id,
          fe.name,
          fe.started_at,
          r.id as reserve_id,
          r.name as reserve_name,
          st_asgeojson(r.geom) as reserve_geojson
        from fire_events fe
        left join reserves r on r.id = fe.reserve_id
        where fe.id = $1
      `,
      [eventId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Fire event not found" },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    let reserve: ReserveBoundary | null = null;

    if (row.reserve_id !== null && row.reserve_name && row.reserve_geojson) {
      reserve = {
        id: row.reserve_id,
        name: row.reserve_name,
        geometry: JSON.parse(row.reserve_geojson) as ReserveBoundary["geometry"],
      };
    }

    const payload: FireEventDetail = {
      id: row.id,
      name: row.name,
      started_at: row.started_at,
      reserve,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("GET /api/events/[id] failed:", err);
    return NextResponse.json(
      { error: "Failed to load fire event details" },
      { status: 500 }
    );
  }
}