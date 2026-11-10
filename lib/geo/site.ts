import * as THREE from "three";
import { WGS84_ELLIPSOID } from "3d-tiles-renderer/three";

/**
 * Real location of Cataluña II (Buenos Aires 2771, Mar del Plata) and the transform between
 * the selector's local scene (meters, +Y up, building centered at the origin) and Earth
 * (ECEF, the frame Google's Photorealistic 3D Tiles are in).
 *
 * How the numbers were checked (Nov 2026):
 * - Position: OpenStreetMap address interpolation way 431707402 on "Buenos Aires" (odd side,
 *   2701 → 2799). 2771 sits 70/98 along it: -38.010459, -57.548978. Nominatim returns the
 *   same point (suburb "Vieja Terminal", CP B7600JUZ). OSM has no footprint for this lot.
 * - Street: OSM way 456080412 ("Buenos Aires", one-way) runs at bearing 213.1° here; the
 *   address line is 16.9 m from its centerline, on the north-west side, so the street facade
 *   faces bearing 123.1° (ESE, toward the sea; the coastline is ~1.0 km away in a straight line).
 * - Height: SRTM 30 m gives 17 m above sea level, EGM2008 geoid undulation is +14.15 m, so the
 *   ground is ~31.2 m above the WGS84 ellipsoid. That is only the starting value: the scene
 *   measures the real tile surface at runtime and adjusts (see GroundCalibration).
 * - Paseo Aldrey (OSM way 389391724, Sarmiento 2685): ~0.5 km south-east of the lot.
 */
export const SITE = {
  /** Shown name: a made-up one. The real name, street and city are not displayed. */
  name: "Torre Aldrey",
  address: "Buenos Aires 2771",
  city: "Mar del Plata",
  neighborhood: "Paseo Aldrey",
  lat: -38.010459,
  lon: -57.548978,
  /** Initial ground height above the WGS84 ellipsoid (SRTM 17 m + EGM2008 14.15 m). */
  groundEllipsoidHeight: 31.2,
  /** Compass bearing the street facade faces (degrees clockwise from north). */
  facadeBearing: 123.1,
  /**
   * Where the address point sits in the scene. The building's street facade (+Z, 22 m deep
   * → z = 11) is placed on the estimated lot line: 16.9 m to the street centerline minus
   * ~4.5 m of half road and ~3 m of sidewalk = 9.4 m from the centerline, so ≈ 7.5 m in
   * front of the address point.
   */
  addressOffset: new THREE.Vector3(0, 0, 3.5),
} as const;

/** Paseo Aldrey mall (vertex centroid of OSM way 389391724), for the flyover's waypoint. */
export const PASEO_ALDREY = { lat: -38.012184, lon: -57.543876 };

const DEG = Math.PI / 180;

/** East/north/up unit vectors (ECEF) at the site. */
function siteAxes() {
  const east = new THREE.Vector3();
  const north = new THREE.Vector3();
  const up = new THREE.Vector3();
  WGS84_ELLIPSOID.getEastNorthUpAxes(SITE.lat * DEG, SITE.lon * DEG, east, north, up);
  return { east, north, up };
}

/**
 * Scene → ECEF. Scene axes: +Z = the facade bearing (street side), +Y = up, +X = +Y × +Z
 * (bearing 33°). `groundHeight` is the ellipsoid height that maps to scene y = 0.
 */
export function sceneToEcefMatrix(groundHeight: number, target = new THREE.Matrix4()) {
  const { east, north, up } = siteAxes();
  const b = SITE.facadeBearing * DEG;
  const zAxis = new THREE.Vector3()
    .addScaledVector(east, Math.sin(b))
    .addScaledVector(north, Math.cos(b))
    .normalize();
  const yAxis = up.clone();
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();

  const origin = new THREE.Vector3();
  WGS84_ELLIPSOID.getCartographicToPosition(
    SITE.lat * DEG,
    SITE.lon * DEG,
    groundHeight,
    origin
  );

  // ecef = origin + R · (scene − addressOffset)
  const rotation = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  const offset = new THREE.Matrix4().makeTranslation(
    -SITE.addressOffset.x,
    -SITE.addressOffset.y,
    -SITE.addressOffset.z
  );
  return target
    .makeTranslation(origin.x, origin.y, origin.z)
    .multiply(rotation)
    .multiply(offset);
}

/** Geographic point → scene coordinates (for waypoints). */
export function latLonToScene(
  lat: number,
  lon: number,
  heightAboveGround: number,
  groundHeight: number,
  target = new THREE.Vector3()
) {
  WGS84_ELLIPSOID.getCartographicToPosition(
    lat * DEG,
    lon * DEG,
    groundHeight + heightAboveGround,
    target
  );
  const inv = sceneToEcefMatrix(groundHeight).invert();
  return target.applyMatrix4(inv);
}

/** Scene "up" expressed in ECEF, for flattening shapes. */
export function siteUp() {
  return siteAxes().up;
}
