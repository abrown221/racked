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
      className="overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
      style={{
        background: "#FFFFFF",
        borderRadius: "16px",
        border: `1px solid ${isCoravined ? "rgba(142,58,72,0.19)" : "#DDD5CA"}`,
        boxShadow: "0 2px 12px rgba(45,36,27,0.06)",
      }}
    >
      <div
        className="flex items-end p-2.5"
        style={{
          height: "160px",
          background: wine.photo_url
            ? `url(${wine.photo_url}) center/cover`
            : "linear-gradient(145deg, rgba(114,47,55,0.08), #F0EBE3 60%, rgba(160,134,78,0.08))",
        }}
      >
        {isCoravined && <CoravinBadge wine={wine} />}
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <div
          className="font-serif font-semibold leading-tight truncate"
          style={{ fontSize: "14px", color: "#2D241B" }}
        >
          {wine.vintage} {wine.producer}
        </div>
        <div
          className="mt-1 truncate"
          style={{ fontSize: "12px", color: "#8C7E72" }}
        >
          {wine.varietal} · {wine.appellation || wine.region}
        </div>
      </div>
    </div>
  );
}
