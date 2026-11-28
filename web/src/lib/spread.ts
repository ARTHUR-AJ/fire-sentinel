import { destination, ellipse } from "@turf/turf";

export type SpreadScenario = "slow" | "fast";
export type LngLat = [longitude: number, latitude: number];

// These are demo assumptions, not rates measured for Malawi or calibrated against a fire.
// They let the team show a slow/fast range until validation data is available.
const HEAD_RATE_AS_WIND_FRACTION: Record<SpreadScenario, number> = {
  slow: 0.01,
  fast: 0.02,
};
const BACKING_RATE_AS_HEAD_FRACTION = 0.25;
const ELLIPSE_STEPS = 64;

/**
 * Build a simple, illustrative fire-spread polygon around an ignition point.
 * Wind direction follows the weather convention: it is the direction wind blows FROM.
 *
 * Model assumptions: head-fire speed is 1% (slow) or 2% (fast) of wind speed;
 * backing spread is 25% of head spread. Terrain, fuel, moisture, and changing wind
 * are ignored. The ignition point is the ellipse focus, not its center.
 */
export function buildSpreadEllipse(
  start: LngLat,
  windSpeedMps: number,
  windDirectionFromDeg: number,
  hoursElapsed: number,
  scenario: SpreadScenario,
): ReturnType<typeof ellipse> {
  if (
    !Array.isArray(start) ||
    start.length !== 2 ||
    !Number.isFinite(start[0]) ||
    !Number.isFinite(start[1]) ||
    start[0] < -180 ||
    start[0] > 180 ||
    start[1] < -90 ||
    start[1] > 90
  ) {
    throw new RangeError("start must be a valid [longitude, latitude] coordinate");
  }
  if (!Number.isFinite(windSpeedMps) || windSpeedMps <= 0) {
    throw new RangeError("windSpeedMps must be greater than zero for this model");
  }
  if (
    !Number.isFinite(windDirectionFromDeg) ||
    windDirectionFromDeg < 0 ||
    windDirectionFromDeg >= 360
  ) {
    throw new RangeError("windDirectionFromDeg must be in the range 0 to less than 360");
  }
  if (!Number.isFinite(hoursElapsed) || hoursElapsed <= 0) {
    throw new RangeError("hoursElapsed must be greater than zero");
  }
  if (scenario !== "slow" && scenario !== "fast") {
    throw new RangeError('scenario must be "slow" or "fast"');
  }

  const headRateMps = windSpeedMps * HEAD_RATE_AS_WIND_FRACTION[scenario];
  const headDistanceM = headRateMps * hoursElapsed * 60 * 60;
  const backingDistanceM = headDistanceM * BACKING_RATE_AS_HEAD_FRACTION;

  // For an ellipse with the ignition at one focus, these give its axes and center offset.
  const semiMajorAxisM = (headDistanceM + backingDistanceM) / 2;
  const semiMinorAxisM = Math.sqrt(headDistanceM * backingDistanceM);
  const centerOffsetM = (headDistanceM - backingDistanceM) / 2;

  // Wind blows FROM this bearing, so the fire spreads in the opposite (downwind) direction.
  const downwindBearingDeg = (windDirectionFromDeg + 180) % 360;
  const center = destination(start, centerOffsetM, downwindBearingDeg, {
    units: "meters",
  });

  // Turf's ellipse starts with its major axis east-west; this rotates it to the downwind line.
  const turfRotationDeg = 90 + downwindBearingDeg;

  return ellipse(center, semiMajorAxisM, semiMinorAxisM, {
    units: "meters",
    angle: turfRotationDeg,
    steps: ELLIPSE_STEPS,
    properties: {
      scenario,
      hoursElapsed,
      windSpeedMps,
      windDirectionFromDeg,
      downwindBearingDeg,
      model: "illustrative-unvalidated",
    },
  });
}
