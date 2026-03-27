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
  bottleCount?: number;
  onClose: () => void;
  onConsume: (wine: Wine) => void;
  onCoravin: (wine: Wine) => void;
  onResearch: () => void;
  onLoadNotes: () => void;
  onDelete: (wine: Wine) => void;
  onUpdate: (id: string, updates: Partial<Wine>) => void;
  onAddBottle?: () => void;
  onRemoveBottle?: () => void;
};

type ConfirmAction = "consume" | "coravin" | "delete" | null;

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
  onDelete,
  onUpdate,
  bottleCount = 1,
  onAddBottle,
  onRemoveBottle,
}: Props) {
  const [tab, setTab] = useState<"overview" | "dossier" | "notes">("overview");
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [editing, setEditing] = useState(false);
  const [showFridgePicker, setShowFridgePicker] = useState(false);
  const [editName, setEditName] = useState(wine.name);
  const [editProducer, setEditProducer] = useState(wine.producer || "");
  const [editVintage, setEditVintage] = useState(wine.vintage ? String(wine.vintage) : "");
  const [editVarietal, setEditVarietal] = useState(wine.varietal || "");
  const [editRegion, setEditRegion] = useState(wine.region || "");
  const [editPricePaid, setEditPricePaid] = useState(wine.price_paid ? String(wine.price_paid) : "");

  const windowStatus = getDrinkingWindowStatus(wine);
  const windowColor = WINDOW_COLORS[windowStatus];

  useEffect(() => {
    if (tab === "notes" && !notesLoaded) {
      onLoadNotes();
      setNotesLoaded(true);
    }
  }, [tab, notesLoaded, onLoadNotes]);

  const handleConfirm = () => {
    if (confirmAction === "consume") onConsume(wine);
    if (confirmAction === "coravin") onCoravin(wine);
    if (confirmAction === "delete") {
      onDelete(wine);
      onClose();
    }
    setConfirmAction(null);
  };

  const handleSaveEdit = () => {
    const parsedVintage = editVintage ? parseInt(editVintage, 10) : null;
    onUpdate(wine.id, {
      name: editName,
      producer: editProducer || null,
      vintage: parsedVintage !== null && !isNaN(parsedVintage) ? parsedVintage : null,
      varietal: editVarietal || null,
      region: editRegion || null,
      price_paid: editPricePaid ? parseFloat(editPricePaid) : null,
    });
    setEditing(false);
  };

  const handleRestore = () => {
    onUpdate(wine.id, {
      status: "sealed",
      consumed_date: null,
      coravined_date: null,
    });
  };

  const handleFridgeSelect = (fridgeId: string | null) => {
    onUpdate(wine.id, { fridge_id: fridgeId });
    setShowFridgePicker(false);
  };

  const confirmMessages: Record<string, { title: string; message: string; button: string; color: string }> = {
    consume: {
      title: "Mark as consumed?",
      message: "This will open the tasting flow to rate and review this wine.",
      button: "Yes, I drank it",
      color: "#722F37",
    },
    coravin: {
      title: "Mark as Coravined?",
      message: "This will start tracking the Coravin runway for this bottle.",
      button: "Yes, Coravined",
      color: "#2D241B",
    },
    delete: {
      title: "Delete this wine?",
      message: "This will permanently remove this wine, its photo, dossier, and tasting notes. This can't be undone.",
      button: "Delete",
      color: "#9B3333",
    },
  };

  const inputStyle = {
    width: "100%",
    background: "#F0EBE3",
    border: "1px solid #DDD5CA",
    borderRadius: "14px",
    padding: "10px 14px",
    color: "#2D241B",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box" as const,
  };

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
        {/* Top-right actions: edit + delete */}
        <div className="absolute flex gap-2" style={{ top: "16px", right: "16px" }}>
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center justify-center cursor-pointer"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: editing ? "rgba(114,47,55,0.6)" : "rgba(45,36,27,0.35)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#FFFFFF",
              fontSize: "16px",
            }}
          >
            ✎
          </button>
          <button
            onClick={() => setConfirmAction("delete")}
            className="flex items-center justify-center cursor-pointer"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "rgba(45,36,27,0.35)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#FFFFFF",
              fontSize: "16px",
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ padding: "0 20px 120px" }}>
        {/* Name section — editable or static */}
        {editing ? (
          <div style={{ marginBottom: "14px" }}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Wine name"
              className="font-serif font-bold w-full"
              style={{ ...inputStyle, fontSize: "22px", marginBottom: "8px" }}
            />
            <input
              type="text"
              value={editProducer}
              onChange={(e) => setEditProducer(e.target.value)}
              placeholder="Producer"
              style={{ ...inputStyle, marginBottom: "8px" }}
            />
            <div className="flex gap-2" style={{ marginBottom: "8px" }}>
              <input
                type="number"
                value={editVintage}
                onChange={(e) => setEditVintage(e.target.value)}
                placeholder="Vintage"
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                type="text"
                value={editVarietal}
                onChange={(e) => setEditVarietal(e.target.value)}
                placeholder="Varietal"
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
            <div className="flex gap-2" style={{ marginBottom: "12px" }}>
              <input
                type="text"
                value={editRegion}
                onChange={(e) => setEditRegion(e.target.value)}
                placeholder="Region"
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                type="number"
                value={editPricePaid}
                onChange={(e) => setEditPricePaid(e.target.value)}
                placeholder="Price paid"
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
            {/* Bottle quantity adjustment */}
            {(onAddBottle || onRemoveBottle) && (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "6px" }}>
                  Bottles in cellar
                </div>
                <div className="flex items-center" style={{
                  background: "#F0EBE3",
                  border: "1px solid #DDD5CA",
                  borderRadius: "14px",
                  overflow: "hidden",
                  maxWidth: "180px",
                }}>
                  <button
                    onClick={onRemoveBottle}
                    disabled={bottleCount <= 1}
                    className="cursor-pointer"
                    style={{
                      width: "44px",
                      height: "42px",
                      background: "transparent",
                      border: "none",
                      fontSize: "18px",
                      color: bottleCount <= 1 ? "#DDD5CA" : "#6B5E52",
                    }}
                  >
                    −
                  </button>
                  <div style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#2D241B",
                  }}>
                    {bottleCount}
                  </div>
                  <button
                    onClick={onAddBottle}
                    className="cursor-pointer"
                    style={{
                      width: "44px",
                      height: "42px",
                      background: "transparent",
                      border: "none",
                      fontSize: "18px",
                      color: "#6B5E52",
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 cursor-pointer"
                style={{
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid #DDD5CA",
                  borderRadius: "14px",
                  color: "#6B5E52",
                  fontSize: "13px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 font-semibold cursor-pointer"
                style={{
                  padding: "10px",
                  background: "#722F37",
                  border: "none",
                  borderRadius: "14px",
                  color: "#FFFFFF",
                  fontSize: "13px",
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1
              className="font-serif font-bold leading-tight"
              style={{ fontSize: "28px", color: "#2D241B", marginBottom: "4px" }}
            >
              {wine.vintage} {wine.name}
            </h1>
            <div className="flex items-center gap-2" style={{ fontSize: "15px", color: "#8C7E72", marginBottom: "14px" }}>
              <span>{wine.producer} · {wine.appellation || wine.region}</span>
              {bottleCount > 1 && (
                <span style={{
                  fontSize: "11px", fontWeight: 600, color: "#A0864E",
                  background: "rgba(160,134,78,0.12)", padding: "2px 8px",
                  borderRadius: "100px",
                }}>
                  ×{bottleCount}
                </span>
              )}
            </div>
          </>
        )}

        {/* Badges */}
        <div className="flex gap-2 flex-wrap" style={{ marginBottom: "20px" }}>
          {wine.status === "coravined" && <CoravinBadge wine={wine} />}
          {wine.status === "consumed" && (
            <div
              className="inline-flex items-center rounded-full"
              style={{
                padding: "5px 12px",
                fontSize: "12px",
                background: "rgba(140,126,114,0.12)",
                border: "1px solid rgba(140,126,114,0.3)",
                color: "#8C7E72",
              }}
            >
              Consumed{wine.consumed_date ? ` ${wine.consumed_date}` : ""}
            </div>
          )}
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
          {/* Fridge badge — tappable to change */}
          <button
            onClick={() => setShowFridgePicker(!showFridgePicker)}
            className="rounded-full cursor-pointer"
            style={{
              fontSize: "12px",
              color: "#8C7E72",
              border: "1px solid #DDD5CA",
              padding: "5px 12px",
              background: "transparent",
            }}
          >
            📍 {wine.fridge_id
              ? (fridges.find((f) => f.id === wine.fridge_id)?.name ?? "Unknown")
              : "No fridge"}
            {" ▾"}
          </button>
        </div>

        {/* Fridge picker dropdown */}
        {showFridgePicker && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              background: "#FFFFFF",
              border: "1px solid #DDD5CA",
              borderRadius: "14px",
            }}
          >
            <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "8px" }}>
              Move to fridge:
            </div>
            <div className="flex gap-2 flex-wrap">
              {fridges.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFridgeSelect(f.id)}
                  className="cursor-pointer"
                  style={{
                    padding: "8px 14px",
                    borderRadius: "14px",
                    fontSize: "12px",
                    fontWeight: 500,
                    background:
                      wine.fridge_id === f.id ? "rgba(114,47,55,0.15)" : "transparent",
                    border: `1px solid ${wine.fridge_id === f.id ? "#722F37" : "#DDD5CA"}`,
                    color: wine.fridge_id === f.id ? "#722F37" : "#8C7E72",
                  }}
                >
                  {f.name}
                </button>
              ))}
              <button
                onClick={() => handleFridgeSelect(null)}
                className="cursor-pointer"
                style={{
                  padding: "8px 14px",
                  borderRadius: "14px",
                  fontSize: "12px",
                  background: !wine.fridge_id ? "rgba(114,47,55,0.15)" : "transparent",
                  border: `1px solid ${!wine.fridge_id ? "#722F37" : "#DDD5CA"}`,
                  color: !wine.fridge_id ? "#722F37" : "#8C7E72",
                }}
              >
                None
              </button>
            </div>
          </div>
        )}

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

        {/* Tab content — Overview */}
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

        {/* Tab content — Dossier */}
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

        {/* Tab content — Notes */}
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
                    {note.notes && (
                      <p
                        className="leading-relaxed"
                        style={{ fontSize: "13px", color: "#6B5E52", margin: 0 }}
                      >
                        {note.notes}
                      </p>
                    )}
                    <div style={{ fontSize: "11px", color: "#8C7E72", marginTop: "10px" }}>
                      Tasted{" "}
                      {new Date(note.tasted_date).toLocaleDateString("en-US", {
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

      {/* Action buttons — different for consumed vs active wines */}
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
        {wine.status === "consumed" ? (
          <button
            onClick={handleRestore}
            className="flex-1 font-semibold cursor-pointer"
            style={{
              padding: "14px",
              background: "transparent",
              border: "1px solid #DDD5CA",
              borderRadius: "14px",
              color: "#6B5E52",
              fontSize: "15px",
            }}
          >
            Restore to Cellar
          </button>
        ) : (
          <>
            <button
              onClick={() => setConfirmAction("consume")}
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
            {wine.status === "coravined" ? (
              <button
                onClick={handleRestore}
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
                Un-Coravin
              </button>
            ) : (
              <button
                onClick={() => setConfirmAction("coravin")}
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
          </>
        )}
      </div>

      {/* Confirmation dialog overlay */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center max-w-[430px] mx-auto"
          style={{
            background: "rgba(45,36,27,0.5)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              width: "100%",
              background: "#FAF7F2",
              borderRadius: "28px 28px 0 0",
              padding: "28px 24px 36px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "4px",
                background: "#DDD5CA",
                borderRadius: "100px",
                margin: "0 auto 20px",
              }}
            />
            <h3
              className="font-serif font-bold"
              style={{ fontSize: "20px", color: "#2D241B", marginBottom: "8px" }}
            >
              {confirmMessages[confirmAction].title}
            </h3>
            <p style={{ fontSize: "14px", color: "#6B5E52", marginBottom: "24px", lineHeight: 1.6 }}>
              {confirmMessages[confirmAction].message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
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
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 font-semibold cursor-pointer"
                style={{
                  padding: "14px",
                  background: confirmMessages[confirmAction].color,
                  border: "none",
                  borderRadius: "14px",
                  color: "#FFFFFF",
                  fontSize: "15px",
                }}
              >
                {confirmMessages[confirmAction].button}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
