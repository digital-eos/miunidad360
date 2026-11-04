export type FloorPlanRoom = {
  label: string;
  x: number;
  y: number;
  width: number;
  depth: number;
};

export type FloorPlan = {
  totalWidth: number;
  totalDepth: number;
  rooms: FloorPlanRoom[];
  balcony: FloorPlanRoom;
};

const ASPECT_RATIO = 1.4;
const BATHROOM_DEPTH = 1.9;
const WALL_GAP = 0.08;

/**
 * Procedurally lays out a schematic (not architectural) floor plan from a unit's
 * program: a living/dining + kitchen column, one row per bedroom plus a bathroom,
 * and an attached balcony. Dimensions are in meters.
 */
export function generateFloorPlan(params: {
  bedrooms: number;
  areaM2: number;
  balconyM2: number;
}): FloorPlan {
  const { bedrooms, areaM2, balconyM2 } = params;

  const totalWidth = Math.sqrt(areaM2 * ASPECT_RATIO);
  const totalDepth = areaM2 / totalWidth;

  const livingColumnWidth = totalWidth * 0.56;
  const bedroomColumnWidth = totalWidth - livingColumnWidth - WALL_GAP;

  const livingDepth = totalDepth * 0.66;
  const kitchenDepth = totalDepth - livingDepth - WALL_GAP;

  const bedroomRows = Math.max(1, bedrooms);
  const bathroomDepth = Math.min(BATHROOM_DEPTH, totalDepth * 0.3);
  const bedroomsDepth = totalDepth - bathroomDepth - WALL_GAP;
  const bedroomRowDepth = (bedroomsDepth - WALL_GAP * (bedroomRows - 1)) / bedroomRows;

  const rooms: FloorPlanRoom[] = [
    { label: "Estar / Comedor", x: 0, y: 0, width: livingColumnWidth, depth: livingDepth },
    {
      label: "Cocina",
      x: 0,
      y: livingDepth + WALL_GAP,
      width: livingColumnWidth,
      depth: kitchenDepth,
    },
  ];

  for (let i = 0; i < bedroomRows; i += 1) {
    rooms.push({
      label: bedroomRows === 1 ? "Dormitorio" : `Dormitorio ${i + 1}`,
      x: livingColumnWidth + WALL_GAP,
      y: i * (bedroomRowDepth + WALL_GAP),
      width: bedroomColumnWidth,
      depth: bedroomRowDepth,
    });
  }

  rooms.push({
    label: "Baño",
    x: livingColumnWidth + WALL_GAP,
    y: bedroomsDepth + WALL_GAP,
    width: bedroomColumnWidth,
    depth: bathroomDepth,
  });

  const balcony: FloorPlanRoom = {
    label: "Balcón",
    x: 0,
    y: totalDepth + WALL_GAP,
    width: livingColumnWidth,
    depth: balconyM2 / livingColumnWidth,
  };

  return { totalWidth, totalDepth, rooms, balcony };
}
