import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../src/lib/db";

interface ForecastRow {
  id: number;
  event_id: number;
  hours_since_detection: number;
  scenario: string;
  geometry: Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  try {
    const eventIdParam = req.nextUrl.searchParams.get("eventId");
    const scenarioParam = req.nextUrl.searchParams.get("scenario");

    const conditions: string[] = ["geom is not null"];
    const params: Array<number | string> = [];

    if (eventIdParam !== null) {
      const eventId = Number(eventIdParam);
      if (!Number.isInteger(eventId) || eventId <= 0) {
        return NextResponse.json(
          { error: "Invalid eventId query parameter" },
          { status: 400 }
        );
      }
      params.push(eventId);
      conditions.push(`event_id = $${params.length}`);
    }

    if (scenarioParam !== null && scenarioParam.trim() !== "") {
      params.push(scenarioParam.trim());
      conditions.push(`scenario = $${params.length}`);
    }

    const sql = `
      select
        id,
        event_id,
        hours_since_detection,
        scenario,
        st_asgeojson(geom)::jsonb as geometry
      from spread_forecasts
      where ${conditions.join(" and ")}
      order by event_id asc, scenario asc, hours_since_detection asc, id asc
    `;

    const result = await db.query<ForecastRow>(sql, params);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("GET /api/forecasts failed:", err);
    return NextResponse.json(
      { error: "Failed to load spread forecasts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventId = Number(body?.event_id);
    const hoursSinceDetection = Number(body?.hours_since_detection);
    const scenario =
      typeof body?.scenario === "string" ? body.scenario.trim() : "";
    const geometry = body?.geometry;

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json(
        { error: "event_id must be a positive integer" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(hoursSinceDetection) || hoursSinceDetection < 0) {
      return NextResponse.json(
        { error: "hours_since_detection must be a non-negative integer" },
        { status: 400 }
      );
    }

    if (!scenario) {
      return NextResponse.json(
        { error: "scenario is required" },
        { status: 400 }
      );
    }

    if (
      !geometry ||
      typeof geometry !== "object" ||
      !["Polygon", "MultiPolygon"].includes(String((geometry as { type?: unknown }).type))
    ) {
      return NextResponse.json(
        { error: "geometry must be a valid GeoJSON Polygon or MultiPolygon" },
        { status: 400 }
      );
    }

    const result = await db.query<ForecastRow>(
      `
        insert into spread_forecasts (
          event_id,
          hours_since_detection,
          scenario,
          geom
        )
        values (
          $1,
          $2,
          $3,
          st_setsrid(st_geomfromgeojson($4), 4326)
        )
        returning
          id,
          event_id,
          hours_since_detection,
          scenario,
          st_asgeojson(geom)::jsonb as geometry
      `,
      [eventId, hoursSinceDetection, scenario, JSON.stringify(geometry)]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/forecasts failed:", err);
    return NextResponse.json(
      { error: "Failed to create spread forecast" },
      { status: 500 }
    );
  }
}