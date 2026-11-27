import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../src/lib/db";

interface AlertRow {
  id: number;
  event_id: number;
  village_id: number;
  village_name: string | null;
  window_min_h: number;
  window_max_h: number;
  message: string;
}

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
            va.id,
            va.event_id,
            va.village_id,
            v.name as village_name,
            va.window_min_h::float8 as window_min_h,
            va.window_max_h::float8 as window_max_h,
            va.message
          from village_alerts va
          left join villages v on v.id = va.village_id
          where va.event_id = $1
          order by va.window_min_h asc, va.id asc
        `
        : `
          select
            va.id,
            va.event_id,
            va.village_id,
            v.name as village_name,
            va.window_min_h::float8 as window_min_h,
            va.window_max_h::float8 as window_max_h,
            va.message
          from village_alerts va
          left join villages v on v.id = va.village_id
          order by va.window_min_h asc, va.id asc
        `;

    const result =
      eventId !== null
        ? await db.query<AlertRow>(sql, [eventId])
        : await db.query<AlertRow>(sql);

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("GET /api/alerts failed:", err);
    return NextResponse.json(
      { error: "Failed to load village alerts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventId = Number(body?.event_id);
    const villageId = Number(body?.village_id);
    const windowMinH = Number(body?.window_min_h);
    const windowMaxH = Number(body?.window_max_h);
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json(
        { error: "event_id must be a positive integer" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(villageId) || villageId <= 0) {
      return NextResponse.json(
        { error: "village_id must be a positive integer" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(windowMinH) || !Number.isFinite(windowMaxH)) {
      return NextResponse.json(
        { error: "window_min_h and window_max_h must be valid numbers" },
        { status: 400 }
      );
    }

    if (windowMaxH < windowMinH) {
      return NextResponse.json(
        { error: "window_max_h must be greater than or equal to window_min_h" },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const result = await db.query<AlertRow>(
      `
        insert into village_alerts (
          event_id,
          village_id,
          window_min_h,
          window_max_h,
          message
        )
        values ($1, $2, $3, $4, $5)
        returning
          id,
          event_id,
          village_id,
          null::text as village_name,
          window_min_h::float8 as window_min_h,
          window_max_h::float8 as window_max_h,
          message
      `,
      [eventId, villageId, windowMinH, windowMaxH, message]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/alerts failed:", err);
    return NextResponse.json(
      { error: "Failed to create village alert" },
      { status: 500 }
    );
  }
}