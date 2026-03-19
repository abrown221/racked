"use client";

import type { Wine } from "@/lib/supabase/types";
import CoravinBadge from "./CoravinBadge";

export default function WineCard({
  wine,
  onClick,
}: {
  wine: Wine;
  onClick: () => void;
}) {
  const isCoravined = wine.status === "coravined";

  return (
    <div
      onClick={onClick}
      className="bg-[var(--color-card)] rounded-xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
      style={{
        border: `1px solid ${isCoravined ? "rgba(142,58,72,0.19)" : "var(--color-border)"}`,
        boxShadow: "0 1px 8px rgba(45,36,27,0.06)",
      }}
    >
      <div
        className="h-40 flex items-end p-2"
        style={{
          background: wine.photo_url
            ? `url(${wine.photo_url}) center/cover`
            : "linear-gradient(135deg, rgba(114,47,55,0.07), var(--color-surface))",
        }}
      >
        {isCoravined && <CoravinBadge wine={wine} />}
      </div>
      <div className="px-3 py-2.5">
        <div className="font-serif text-sm font-semibold leading-tight truncate">
          {wine.vintage} {wine.producer}
        </div>
        <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
          {wine.varietal} · {wine.appellation || wine.region}
        </div>
      </div>
    </div>
  );
}
