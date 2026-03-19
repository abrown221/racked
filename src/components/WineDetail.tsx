"use client";

import { useState } from "react";
import type { Wine, Fridge, Dossier } from "@/lib/supabase/types";
import {
  getDrinkingWindowStatus,
  WINDOW_COLORS,
  WINDOW_LABELS,
} from "@/lib/wine-utils";
import CoravinBadge from "./CoravinBadge";

type Props = {
  wine: Wine;
  fridges: Fridge[];
  dossier: Dossier | null;
  loadingDossier: boolean;
  onClose: () => void;
  onConsume: (wine: Wine) => void;
  onCoravin: (wine: Wine) => void;
  onResearch: () => void;
};

export default function WineDetail({
  wine,
  fridges,
  dossier,
  loadingDossier,
  onClose,
  onConsume,
  onCoravin,
  onResearch,
}: Props) {
  const [tab, setTab] = useState<"overview" | "dossier" | "notes">("overview");
  const windowStatus = getDrinkingWindowStatus(wine);
  const windowColor = WINDOW_COLORS[windowStatus];

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--color-bg)] overflow-y-auto max-w-[430px] mx-auto">
      {/* Hero image */}
      <div
        className="h-[260px] relative"
        style={{
          background: wine.photo_url
            ? `url(${wine.photo_url}) center/cover`
            : "linear-gradient(135deg, rgba(114,47,55,0.12), #F0EBE3)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--color-bg)]" />
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-lg border-none text-white text-xl cursor-pointer flex items-center justify-center"
        >
          ←
        </button>
      </div>

      <div className="px-5 pb-[120px]">
        {/* Name */}
        <h1 className="font-serif text-[26px] font-bold leading-tight mb-1">
          {wine.vintage} {wine.name}
        </h1>
        <div className="text-[15px] text-[var(--color-text-muted)] mb-3">
          {wine.producer} · {wine.appellation || wine.region}
        </div>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap mb-5">
          {wine.status === "coravined" && <CoravinBadge wine={wine} />}
          <div
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
            style={{
              background: `${windowColor}18`,
              border: `1px solid ${windowColor}40`,
              color: windowColor,
            }}
          >
            {WINDOW_LABELS[windowStatus]}
            {wine.drinking_window_start && (
              <span className="opacity-70">
                {" "}
                ({wine.drinking_window_start}–{wine.drinking_window_end})
              </span>
            )}
          </div>
          {wine.fridge_id && (
            <div className="text-xs text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-full px-2.5 py-1">
              📍 {fridges.find((f) => f.id === wine.fridge_id)?.name || "Unknown"}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Varietal", value: wine.varietal || "—" },
            { label: "Alcohol", value: wine.alcohol || "—" },
            {
              label: "Paid",
              value: wine.price_paid ? `$${wine.price_paid}` : "—",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-[var(--color-surface)] rounded-xl p-3 text-center"
            >
              <div className="text-[11px] text-[var(--color-text-muted)] mb-1">
                {s.label}
              </div>
              <div className="text-sm font-medium">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--color-border)] mb-5">
          {(["overview", "dossier", "notes"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                if (t === "dossier" && !dossier && !loadingDossier) onResearch();
              }}
              className="flex-1 bg-transparent border-none py-2.5 text-[13px] font-medium cursor-pointer capitalize"
              style={{
                borderBottom:
                  tab === t
                    ? "2px solid var(--color-gold)"
                    : "2px solid transparent",
                color:
                  tab === t
                    ? "var(--color-text-primary)"
                    : "var(--color-text-muted)",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "overview" && (
          <div>
            {wine.blend && (
              <div className="mb-4">
                <div className="text-xs text-[var(--color-text-muted)] mb-1.5">
                  Blend
                </div>
                <div className="text-sm">{wine.blend}</div>
              </div>
            )}
            {wine.suggested_tags && wine.suggested_tags.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-[var(--color-text-muted)] mb-2">
                  Flavor Profile
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {wine.suggested_tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full px-3 py-1 text-xs"
                      style={{
                        background: "rgba(114,47,55,0.15)",
                        border: "1px solid rgba(114,47,55,0.25)",
                        color: "var(--color-accent-light)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {wine.estimated_price && (
              <div className="mb-4">
                <div className="text-xs text-[var(--color-text-muted)] mb-1.5">
                  Market Price
                </div>
                <div className="text-sm">~${wine.estimated_price}</div>
              </div>
            )}
          </div>
        )}

        {tab === "dossier" && (
          <div>
            {loadingDossier ? (
              <div className="text-center py-10 text-[var(--color-text-muted)]">
                <div className="text-xl mb-3">🍷</div>
                <div className="animate-pulse-slow">Researching this wine...</div>
              </div>
            ) : dossier ? (
              <div className="flex flex-col gap-6">
                {[
                  { title: "The Estate", content: dossier.estate },
                  { title: "The Winemaker", content: dossier.winemaker },
                  { title: "Vinification", content: dossier.vinification },
                  { title: "What Makes It Special", content: dossier.special },
                  { title: "Critical Reception", content: dossier.sentiment },
                ].map(
                  (section) =>
                    section.content && (
                      <div key={section.title}>
                        <h3 className="font-serif text-base text-[var(--color-gold)] mb-2">
                          {section.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap">
                          {section.content}
                        </p>
                      </div>
                    )
                )}
                {dossier.scores && dossier.scores.length > 0 && (
                  <div>
                    <h3 className="font-serif text-base text-[var(--color-gold)] mb-2.5">
                      Scores
                    </h3>
                    <div className="flex gap-2.5 flex-wrap">
                      {dossier.scores.map((s, i) => (
                        <div
                          key={i}
                          className="bg-[var(--color-surface)] rounded-xl px-4 py-2.5 text-center"
                        >
                          <div className="text-[22px] font-bold text-[var(--color-gold)]">
                            {s.score}
                          </div>
                          <div className="text-[11px] text-[var(--color-text-muted)]">
                            {s.source}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="text-center py-10 text-[var(--color-text-muted)] cursor-pointer"
                onClick={onResearch}
              >
                Tap to research this wine
              </div>
            )}
          </div>
        )}

        {tab === "notes" && (
          <div className="text-center py-10 text-[var(--color-text-muted)]">
            No tasting notes yet
          </div>
        )}
      </div>

      {/* Action buttons */}
      {wine.status !== "consumed" && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 py-4 flex gap-2.5 z-[101] bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)] to-transparent">
          <button
            onClick={() => onConsume(wine)}
            className="flex-1 py-3.5 bg-[var(--color-accent)] border-none rounded-xl text-white text-[15px] font-semibold cursor-pointer"
          >
            Drank It
          </button>
          {wine.status !== "coravined" && (
            <button
              onClick={() => onCoravin(wine)}
              className="flex-1 py-3.5 bg-transparent border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] text-[15px] font-semibold cursor-pointer"
            >
              Coravined
            </button>
          )}
        </div>
      )}
    </div>
  );
}
