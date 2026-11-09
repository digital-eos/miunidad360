import { defaultBuildingConfig } from "@/lib/three/building-config";
import { buildFacadePoints } from "./facade-points";
import { buildSceneOccluders } from "./scene-occluders";
import { rayIntersectsAABB, SUN_RAY_MAX_DISTANCE } from "./occlusion";
import { buenosAiresDate, getSunPosition, sunDirectionVector, type CivilDate } from "./sun-position";

const SAMPLE_START_HOUR = 6;
const SAMPLE_END_HOUR = 21;
export const SAMPLE_STEP_HOURS = 0.25; // 15 minutes

export type SunHoursResult = Record<string, number>;

/** Direct-sun hours per apartment (by unit id/code) for one Buenos Aires calendar day. */
export function computeSunHours(
  civilDate: CivilDate,
  lat: number,
  lng: number,
  facadeBearing?: number,
): SunHoursResult {
  const facades = buildFacadePoints(defaultBuildingConfig);
  const occluders = buildSceneOccluders(defaultBuildingConfig);

  const hours: SunHoursResult = {};
  for (const facade of facades) hours[facade.unitId] = 0;

  for (let hour = SAMPLE_START_HOUR; hour <= SAMPLE_END_HOUR; hour += SAMPLE_STEP_HOURS) {
    const date = buenosAiresDate(civilDate, hour);
    const sunPos = getSunPosition(date, lat, lng);
    if (sunPos.altitude <= 0) continue;

    const dir = sunDirectionVector(sunPos, facadeBearing);

    for (const facade of facades) {
      const facingSun = facade.normal[0] * dir[0] + facade.normal[1] * dir[2] > 0.05;
      if (!facingSun) continue;

      let blocked = false;
      for (const box of occluders) {
        if (rayIntersectsAABB(facade.position, dir, box, SUN_RAY_MAX_DISTANCE)) {
          blocked = true;
          break;
        }
      }
      if (!blocked) hours[facade.unitId] += SAMPLE_STEP_HOURS;
    }
  }

  return hours;
}
