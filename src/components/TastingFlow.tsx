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
    <div className="fixed inset-0 z-[200] bg-[var(--color-overlay)] backdrop-blur-[20px] flex flex-col justify-end max-w-[430px] mx-auto">
      <div className="bg-[var(--color-surface)] rounded-t-3xl px-6 pt-7 pb-10 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-5" />

        <h2 className="font-serif text-[22px] font-bold mb-1">How was it?</h2>
        <div className="text-sm text-[var(--color-text-muted)] mb-7">
          {wine.vintage} {wine.producer} {wine.name}
        </div>

        {/* Rating */}
        <div className="mb-7">
          <div className="text-xs text-[var(--color-text-muted)] mb-3">
            Rating
          </div>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className="bg-transparent border-none text-4xl cursor-pointer transition-all"
                style={{
                  color:
                    n <= rating
                      ? "var(--color-gold)"
                      : "var(--color-border)",
                  transform: n <= rating ? "scale(1.1)" : "scale(1)",
                }}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="mb-7">
          <div className="text-xs text-[var(--color-text-muted)] mb-3">
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
                  className="rounded-full px-4 py-2 text-[13px] cursor-pointer transition-all border"
                  style={{
                    background: active
                      ? "rgba(114,47,55,0.22)"
                      : "transparent",
                    borderColor: active
                      ? "var(--color-accent)"
                      : "var(--color-border)",
                    color: active
                      ? "var(--color-accent-light)"
                      : "var(--color-text-muted)",
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Buy again */}
        <div className="mb-7">
          <div className="text-xs text-[var(--color-text-muted)] mb-3">
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
                  className="flex-1 py-3 px-2 rounded-xl text-[13px] cursor-pointer border"
                  style={{
                    background: active
                      ? "rgba(114,47,55,0.22)"
                      : "transparent",
                    borderColor: active
                      ? "var(--color-accent)"
                      : "var(--color-border)",
                    color: active
                      ? "var(--color-accent-light)"
                      : "var(--color-text-muted)",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-7">
          <div className="text-xs text-[var(--color-text-muted)] mb-2">
            Anything else? (optional)
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Free thoughts..."
            className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-3.5 text-[var(--color-text-primary)] text-sm font-[var(--font-sans)] resize-none h-20"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 bg-transparent border border-[var(--color-border)] rounded-xl text-[var(--color-text-muted)] text-[15px] cursor-pointer"
          >
            Skip
          </button>
          <button
            onClick={() => onSave({ rating, tags, buyAgain, notes })}
            className="flex-[2] py-3.5 bg-[var(--color-accent)] border-none rounded-xl text-white text-[15px] font-semibold cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
