"use client";

import type { Wine } from "@/lib/supabase/types";
import { getCoravinStatus, getCoravinDays, CORAVIN_COLORS } from "@/lib/wine-utils";

export default function CoravinBadge({ wine }: { wine: Wine }) {
  const status = getCoravinStatus(wine);
  const days = getCoravinDays(wine);
  const color = CORAVIN_COLORS[status];

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full text-xs"
      style={{
        background: `${color}15`,
        border: `1px solid ${color}35`,
        padding: "5px 12px",
      }}
    >
      <div
        className="rounded-full"
        style={{
          width: "7px",
          height: "7px",
          background: color,
          boxShadow: `0 0 6px ${color}80, 0 0 12px ${color}40`,
        }}
      />
      <span style={{ color, fontWeight: 500 }}>Coravined {days}d ago</span>
    </div>
  );
}
