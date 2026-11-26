import assert from "node:assert/strict";
import { area, booleanPointInPolygon, destination, point } from "@turf/turf";
import { buildSpreadEllipse } from "./spread.ts";

const ignition = [35.3, -15.35];
const slow = buildSpreadEllipse(ignition, 4.5, 120, 3, "slow");
const fast = buildSpreadEllipse(ignition, 4.5, 120, 3, "fast");
const downwindPoint = destination(ignition, 0.45, 300, { units: "kilometers" });
const upwindPoint = destination(ignition, 0.15, 120, { units: "kilometers" });
const ring = slow.geometry.coordinates[0];

assert.equal(slow.geometry.type, "Polygon");
assert.deepEqual(ring[0], ring[ring.length - 1], "polygon ring should be closed");
assert.ok(booleanPointInPolygon(point(ignition), slow), "ignition should be inside the ellipse");
assert.ok(booleanPointInPolygon(downwindPoint, slow), "slow ellipse should extend downwind");
assert.ok(!booleanPointInPolygon(upwindPoint, slow), "slow ellipse should be shorter upwind");
assert.ok(area(fast) > area(slow), "fast scenario should cover more area than slow");
assert.equal(fast.properties?.scenario, "fast");

console.log("Spread smoke test passed: polygon, closure, wind direction, and slow/fast size.");
