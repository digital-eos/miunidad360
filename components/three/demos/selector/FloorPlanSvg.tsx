import { generateFloorPlan, type FloorPlanRoom } from "@/lib/units/floor-plan";

const PX_PER_M = 30;
const PADDING_LEFT = 14;
const PADDING_TOP = 14;
const DIM_GAP = 26;

function Room({ room }: { room: FloorPlanRoom }) {
  const x = PADDING_LEFT + room.x * PX_PER_M;
  const y = PADDING_TOP + room.y * PX_PER_M;
  const w = room.width * PX_PER_M;
  const h = room.depth * PX_PER_M;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="var(--background-elevated)"
        stroke="var(--border-subtle)"
        strokeWidth={1.5}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 - 4}
        textAnchor="middle"
        fontSize={10}
        fill="var(--foreground)"
        fontFamily="var(--font-sans)"
      >
        {room.label}
      </text>
      <text
        x={x + w / 2}
        y={y + h / 2 + 10}
        textAnchor="middle"
        fontSize={8.5}
        fill="var(--foreground-muted)"
        fontFamily="var(--font-mono)"
      >
        {room.width.toFixed(1)} × {room.depth.toFixed(1)} m
      </text>
    </g>
  );
}

export function FloorPlanSvg({
  bedrooms,
  areaM2,
  balconyM2,
  className,
}: {
  bedrooms: number;
  areaM2: number;
  balconyM2: number;
  className?: string;
}) {
  const plan = generateFloorPlan({ bedrooms, areaM2, balconyM2 });
  const bottomY = PADDING_TOP + (plan.balcony.y + plan.balcony.depth) * PX_PER_M;
  const rightX = PADDING_LEFT + plan.totalWidth * PX_PER_M;
  const viewWidth = rightX + DIM_GAP + 10;
  const viewHeight = bottomY + DIM_GAP + 10;

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className={className}
      role="img"
      aria-label={`Plano esquemático, ${areaM2} m² cubiertos más ${balconyM2} m² de balcón`}
    >
      {plan.rooms.map((room) => (
        <Room key={room.label} room={room} />
      ))}

      {/* Balcony */}
      <rect
        x={PADDING_LEFT + plan.balcony.x * PX_PER_M}
        y={PADDING_TOP + plan.balcony.y * PX_PER_M}
        width={plan.balcony.width * PX_PER_M}
        height={plan.balcony.depth * PX_PER_M}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      <text
        x={PADDING_LEFT + (plan.balcony.x + plan.balcony.width / 2) * PX_PER_M}
        y={PADDING_TOP + (plan.balcony.y + plan.balcony.depth / 2) * PX_PER_M + 3}
        textAnchor="middle"
        fontSize={9}
        fill="var(--accent)"
        fontFamily="var(--font-sans)"
      >
        Balcón · {balconyM2.toFixed(1)} m²
      </text>

      {/* Width dimension (bottom) */}
      <line
        x1={PADDING_LEFT}
        y1={bottomY + 8}
        x2={rightX}
        y2={bottomY + 8}
        stroke="var(--foreground-muted)"
        strokeWidth={1}
      />
      <text
        x={(PADDING_LEFT + rightX) / 2}
        y={bottomY + 20}
        textAnchor="middle"
        fontSize={9}
        fill="var(--foreground-muted)"
        fontFamily="var(--font-mono)"
      >
        {plan.totalWidth.toFixed(1)} m
      </text>

      {/* Depth dimension (right) */}
      <line
        x1={rightX + 8}
        y1={PADDING_TOP}
        x2={rightX + 8}
        y2={PADDING_TOP + plan.totalDepth * PX_PER_M}
        stroke="var(--foreground-muted)"
        strokeWidth={1}
      />
      <text
        x={rightX + 20}
        y={(PADDING_TOP * 2 + plan.totalDepth * PX_PER_M) / 2}
        textAnchor="middle"
        fontSize={9}
        fill="var(--foreground-muted)"
        fontFamily="var(--font-mono)"
        transform={`rotate(90 ${rightX + 20} ${(PADDING_TOP * 2 + plan.totalDepth * PX_PER_M) / 2})`}
      >
        {plan.totalDepth.toFixed(1)} m
      </text>
    </svg>
  );
}
