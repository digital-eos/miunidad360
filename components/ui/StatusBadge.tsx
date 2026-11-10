import { cn } from "@/lib/utils";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/units/status-colors";
import type { UnitStatus } from "@/lib/units/demo-data";

/**
 * Availability badge: a status-colored dot and a dark label, so the text stays readable
 * whatever the status color.
 */
export function StatusBadge({
  status,
  size = "sm",
  className,
}: {
  status: UnitStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md bg-surface-muted font-medium text-foreground",
        size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: STATUS_COLORS[status] }}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
