"use client";

import { useState } from "react";
import type { Wine } from "@/lib/supabase/types";
import { DEFAULT_TASTING_TAGS } from "@/lib/wine-utils";

type TastingData = {
  rating: number;
  tags: string[];
  buyAgain: string | null;
  notes: string;
};

export default function TastingFlow({
  wine,
  onSave,
  onCancel,
}: {
  wine: Wine;
  onSave: (data: TastingData) => void;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [buyAgain, setBuyAgain] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const allTags = wine.suggested_tags?.length
    ? wine.suggested_tags
    : DEFAULT_TASTING_TAGS;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col justify-end max-w-[430px] mx-auto"
      style={{
        background: "rgba(45,36,27,0.5)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div
        className="overflow-y-auto"
        style={{
          background: "#FAF7F2",
          borderRadius: "28px 28px 0 0",
          padding: "28px 24px 40px",
          maxHeight: "85vh",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "4px",
            background: "#DDD5CA",
            borderRadius: "100px",
            margin: "0 auto 24px",
          }}
        />

        <h2
          className="font-serif font-bold"
          style={{ fontSize: "22px", color: "#2D241B", marginBottom: "4px" }}
        >
          How was it?
        </h2>
        <div style={{ fontSize: "14px", color: "#8C7E72", marginBottom: "28px" }}>
          {wine.vintage} {wine.producer} {wine.name}
        </div>

        {/* Rating */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "12px" }}>
            Rating
          </div>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className="cursor-pointer transition-all duration-200"
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "36px",
                  padding: "4px 6px",
                  color: n <= rating ? "#A0864E" : "#DDD5CA",
                  transform: n <= rating ? "scale(1.15)" : "scale(1)",
                }}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "12px" }}>
            What stood out?
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => {
              const active = tags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() =>
                    setTags((prev) =>
                      active
                        ? prev.filter((t) => t !== tag)
                        : [...prev, tag]
                    )
                  }
                  className="rounded-full cursor-pointer transition-all duration-150"
                  style={{
                    padding: "8px 18px",
                    fontSize: "13px",
                    fontWeight: 500,
                    border: `1px solid ${active ? "#722F37" : "#DDD5CA"}`,
                    background: active ? "rgba(114,47,55,0.12)" : "transparent",
                    color: active ? "#722F37" : "#8C7E72",
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Buy again */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "12px" }}>
            Buy again?
          </div>
          <div className="flex gap-2">
            {[
              { val: "yes", label: "Yes" },
              { val: "at-this-price", label: "At This Price" },
              { val: "no", label: "No" },
            ].map((opt) => {
              const active = buyAgain === opt.val;
              return (
                <button
                  key={opt.val}
                  onClick={() => setBuyAgain(opt.val)}
                  className="flex-1 cursor-pointer transition-all duration-150"
                  style={{
                    padding: "12px 8px",
                    borderRadius: "14px",
                    fontSize: "13px",
                    fontWeight: 500,
                    border: `1px solid ${active ? "#722F37" : "#DDD5CA"}`,
                    background: active ? "rgba(114,47,55,0.12)" : "transparent",
                    color: active ? "#722F37" : "#8C7E72",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "8px" }}>
            Anything else? (optional)
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Free thoughts..."
            style={{
              width: "100%",
              background: "#FFFFFF",
              border: "1px solid #DDD5CA",
              borderRadius: "14px",
              padding: "14px",
              color: "#2D241B",
              fontSize: "14px",
              fontFamily: "var(--font-sans), sans-serif",
              resize: "none",
              height: "80px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 cursor-pointer"
            style={{
              padding: "14px",
              background: "transparent",
              border: "1px solid #DDD5CA",
              borderRadius: "14px",
              color: "#6B5E52",
              fontSize: "15px",
            }}
          >
            Skip
          </button>
          <button
            onClick={() => onSave({ rating, tags, buyAgain, notes })}
            className="font-semibold cursor-pointer"
            style={{
              flex: 2,
              padding: "14px",
              background: "#722F37",
              border: "none",
              borderRadius: "14px",
              color: "#FFFFFF",
              fontSize: "15px",
              boxShadow: "0 4px 16px rgba(114,47,55,0.25)",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
