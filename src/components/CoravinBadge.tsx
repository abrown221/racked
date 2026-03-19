"use client";

import type { Wine } from "@/lib/supabase/types";
import { getCoravinStatus, getCoravinDays, CORAVIN_COLORS } from "@/lib/wine-utils";

export default function CoravinBadge({ wine }: { wine: Wine }) {
  const status = getCoravinStatus(wine);
  const days = getCoravinDays(wine);
  const color = CORAVIN_COLORS[status];

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
      style={{
        background: `${color}15`,
        border: `1px solid ${color}35`,
      }}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{
          background: color,
          boxShadow: `0 0 4px ${color}60`,
        }}
      />
      <span style={{ color }}>Coravined {days}d ago</span>
    </div>
  );
}
