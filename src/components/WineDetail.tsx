"use client";

import { useState, useEffect } from "react";
import type { Wine, Fridge, Dossier, TastingNote } from "@/lib/supabase/types";
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
  tastingNotes: TastingNote[];
  onClose: () => void;
  onConsume: (wine: Wine) => void;
  onCoravin: (wine: Wine) => void;
  onResearch: () => void;
  onLoadNotes: () => void;
};

export default function WineDetail({
  wine,
  fridges,
  dossier,
  loadingDossier,
  tastingNotes,
  onClose,
  onConsume,
  onCoravin,
  onResearch,
  onLoadNotes,
}: Props) {
  const [tab, setTab] = useState<"overview" | "dossier" | "notes">("overview");
  const [notesLoaded, setNotesLoaded] = useState(false);
  const windowStatus = getDrinkingWindowStatus(wine);
  const windowColor = WINDOW_COLORS[windowStatus];

  useEffect(() => {
    if (tab === "notes" && !notesLoaded) {
      onLoadNotes();
      setNotesLoaded(true);
    }
  }, [tab, notesLoaded, onLoadNotes]);

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto max-w-[430px] mx-auto"
      style={{ background: "#FAF7F2" }}
    >
      {/* Hero image */}
      <div
        className="relative"
        style={{
          height: "280px",
          background: wine.photo_url
            ? `url(${wine.photo_url}) center/cover`
            : "linear-gradient(145deg, rgba(114,47,55,0.12), #F0EBE3 50%, rgba(160,134,78,0.08))",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 40%, rgba(250,247,242,0.4) 65%, #FAF7F2 100%)",
          }}
        />
        <button
          onClick={onClose}
          className="absolute flex items-center justify-center cursor-pointer"
          style={{
            top: "16px",
            left: "16px",
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "rgba(45,36,27,0.35)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#FFFFFF",
            fontSize: "20px",
          }}
        >
          ←
        </button>
      </div>

      <div style={{ padding: "0 20px 120px" }}>
        {/* Name */}
        <h1
          className="font-serif font-bold leading-tight"
          style={{ fontSize: "28px", color: "#2D241B", marginBottom: "4px" }}
        >
          {wine.vintage} {wine.name}
        </h1>
        <div style={{ fontSize: "15px", color: "#8C7E72", marginBottom: "14px" }}>
          {wine.producer} · {wine.appellation || wine.region}
        </div>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap" style={{ marginBottom: "20px" }}>
          {wine.status === "coravined" && <CoravinBadge wine={wine} />}
          <div
            className="inline-flex items-center gap-1 rounded-full"
            style={{
              padding: "5px 12px",
              fontSize: "12px",
              background: `${windowColor}18`,
              border: `1px solid ${windowColor}40`,
              color: windowColor,
            }}
          >
            {WINDOW_LABELS[windowStatus]}
            {wine.drinking_window_start && (
              <span style={{ opacity: 0.7 }}>
                {" "}
                ({wine.drinking_window_start}–{wine.drinking_window_end})
              </span>
            )}
          </div>
          {wine.fridge_id && (
            <div
              className="rounded-full"
              style={{
                fontSize: "12px",
                color: "#8C7E72",
                border: "1px solid #DDD5CA",
                padding: "5px 12px",
              }}
            >
              📍 {fridges.find((f) => f.id === wine.fridge_id)?.name ?? "Unknown"}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3" style={{ marginBottom: "24px" }}>
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
              className="text-center"
              style={{
                background: "#F0EBE3",
                borderRadius: "14px",
                padding: "12px",
              }}
            >
              <div style={{ fontSize: "11px", color: "#8C7E72", marginBottom: "4px" }}>
                {s.label}
              </div>
              <div className="font-medium" style={{ fontSize: "14px", color: "#2D241B" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div
          className="flex"
          style={{
            borderBottom: "1px solid #DDD5CA",
            marginBottom: "20px",
          }}
        >
          {(["overview", "dossier", "notes"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                if (t === "dossier" && !dossier && !loadingDossier) onResearch();
              }}
              className="flex-1 capitalize cursor-pointer"
              style={{
                background: "transparent",
                border: "none",
                padding: "10px 0",
                fontSize: "13px",
                fontWeight: 500,
                borderBottom:
                  tab === t
                    ? "2px solid #A0864E"
                    : "2px solid transparent",
                color: tab === t ? "#2D241B" : "#8C7E72",
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
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "6px" }}>
                  Blend
                </div>
                <div style={{ fontSize: "14px", color: "#2D241B" }}>{wine.blend}</div>
              </div>
            )}
            {wine.suggested_tags && wine.suggested_tags.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "8px" }}>
                  Flavor Profile
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {wine.suggested_tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full"
                      style={{
                        padding: "5px 14px",
                        fontSize: "12px",
                        background: "rgba(114,47,55,0.1)",
                        border: "1px solid rgba(114,47,55,0.2)",
                        color: "#722F37",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {wine.estimated_price && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "6px" }}>
                  Market Price
                </div>
                <div style={{ fontSize: "14px", color: "#2D241B" }}>
                  ~${wine.estimated_price}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "dossier" && (
          <div>
            {loadingDossier ? (
              <div className="text-center" style={{ padding: "40px 0", color: "#8C7E72" }}>
                <div style={{ fontSize: "24px", marginBottom: "12px" }}>🍷</div>
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
                        <h3
                          className="font-serif"
                          style={{
                            fontSize: "16px",
                            color: "#A0864E",
                            marginBottom: "8px",
                            fontWeight: 600,
                          }}
                        >
                          {section.title}
                        </h3>
                        <p
                          className="leading-relaxed whitespace-pre-wrap"
                          style={{ fontSize: "14px", color: "#6B5E52", margin: 0 }}
                        >
                          {section.content}
                        </p>
                      </div>
                    )
                )}
                {dossier.scores && dossier.scores.length > 0 && (
                  <div>
                    <h3
                      className="font-serif"
                      style={{
                        fontSize: "16px",
                        color: "#A0864E",
                        marginBottom: "12px",
                        fontWeight: 600,
                      }}
                    >
                      Scores
                    </h3>
                    <div className="flex gap-3 flex-wrap">
                      {dossier.scores.map((s, i) => (
                        <div
                          key={i}
                          className="text-center"
                          style={{
                            background: "#F0EBE3",
                            borderRadius: "14px",
                            padding: "12px 18px",
                          }}
                        >
                          <div
                            className="font-bold"
                            style={{ fontSize: "22px", color: "#A0864E" }}
                          >
                            {s.score}
                          </div>
                          <div style={{ fontSize: "11px", color: "#8C7E72" }}>
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
                className="text-center cursor-pointer"
                onClick={onResearch}
                style={{ padding: "40px 0", color: "#8C7E72" }}
              >
                Tap to research this wine
              </div>
            )}
          </div>
        )}

        {tab === "notes" && (
          <div>
            {tastingNotes.length > 0 ? (
              <div className="flex flex-col gap-4">
                {tastingNotes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DDD5CA",
                      borderRadius: "16px",
                      padding: "16px",
                      boxShadow: "0 2px 12px rgba(45,36,27,0.06)",
                    }}
                  >
                    {/* Rating */}
                    {note.rating && (
                      <div style={{ marginBottom: "10px" }}>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span
                              key={n}
                              style={{
                                fontSize: "20px",
                                color: n <= note.rating! ? "#A0864E" : "#DDD5CA",
                              }}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5" style={{ marginBottom: "10px" }}>
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full"
                            style={{
                              padding: "4px 12px",
                              fontSize: "11px",
                              background: "rgba(114,47,55,0.1)",
                              border: "1px solid rgba(114,47,55,0.2)",
                              color: "#722F37",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Buy again */}
                    {note.buy_again && (
                      <div style={{ marginBottom: "8px" }}>
                        <span
                          className="rounded-full"
                          style={{
                            padding: "4px 12px",
                            fontSize: "11px",
                            fontWeight: 500,
                            background:
                              note.buy_again === "yes"
                                ? "rgba(90,122,74,0.12)"
                                : note.buy_again === "at-this-price"
                                  ? "rgba(160,134,78,0.15)"
                                  : "rgba(155,51,51,0.1)",
                            color:
                              note.buy_again === "yes"
                                ? "#5A7A4A"
                                : note.buy_again === "at-this-price"
                                  ? "#A0864E"
                                  : "#9B3333",
                          }}
                        >
                          {note.buy_again === "yes"
                            ? "Buy again"
                            : note.buy_again === "at-this-price"
                              ? "Buy again at this price"
                              : "Would not buy again"}
                        </span>
                      </div>
                    )}

                    {/* Free text notes */}
                    {note.notes && (
                      <p
                        className="leading-relaxed"
                        style={{ fontSize: "13px", color: "#6B5E52", margin: 0 }}
                      >
                        {note.notes}
                      </p>
                    )}

                    {/* Date */}
                    <div style={{ fontSize: "11px", color: "#8C7E72", marginTop: "10px" }}>
                      Tasted {new Date(note.tasted_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="text-center"
                style={{ padding: "40px 0", color: "#8C7E72" }}
              >
                No tasting notes yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {wine.status !== "consumed" && (
        <div
          className="fixed z-[101] flex gap-3"
          style={{
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "430px",
            padding: "16px 20px 20px",
            background:
              "linear-gradient(to top, #FAF7F2 70%, rgba(250,247,242,0.8) 85%, transparent 100%)",
          }}
        >
          <button
            onClick={() => onConsume(wine)}
            className="flex-1 font-semibold cursor-pointer"
            style={{
              padding: "14px",
              background: "#722F37",
              border: "none",
              borderRadius: "14px",
              color: "#FFFFFF",
              fontSize: "15px",
              boxShadow: "0 4px 16px rgba(114,47,55,0.25)",
            }}
          >
            Drank It
          </button>
          {wine.status !== "coravined" && (
            <button
              onClick={() => onCoravin(wine)}
              className="flex-1 font-semibold cursor-pointer"
              style={{
                padding: "14px",
                background: "transparent",
                border: "1px solid #DDD5CA",
                borderRadius: "14px",
                color: "#2D241B",
                fontSize: "15px",
              }}
            >
              Coravined
            </button>
          )}
        </div>
      )}
    </div>
  );
}
