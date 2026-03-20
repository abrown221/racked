"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCellar } from "@/hooks/useCellar";
import WineDetail from "@/components/WineDetail";
import TastingFlow from "@/components/TastingFlow";
import CoravinBadge from "@/components/CoravinBadge";
import type { Wine } from "@/lib/supabase/types";
import {
  getDrinkingWindowStatus,
  WINDOW_COLORS,
  WINDOW_LABELS,
  type DrinkingWindowStatus,
} from "@/lib/wine-utils";

type WineGroup = {
  key: string;
  representative: Wine;
  bottles: Wine[];
  count: number;
  windowStatus: DrinkingWindowStatus;
};

const URGENCY_ORDER: Record<DrinkingWindowStatus, number> = {
  "past-peak": 0,
  "drink-soon": 1,
  "in-window": 2,
  "too-young": 3,
  unknown: 4,
};

export default function CellarPage() {
  const {
    wines,
    fridges,
    tastingNotes,
    loading,
    updateWine,
    deleteWine,
    saveDossier,
    getDossier,
    saveTastingNote,
    loadTastingNotes,
  } = useCellar();
  const router = useRouter();
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [tastingWine, setTastingWine] = useState<Wine | null>(null);
  const [filter, setFilter] = useState("active");
  const [sortMode, setSortMode] = useState<"region" | "urgency">("region");
  const [researchingWineId, setResearchingWineId] = useState<string | null>(null);

  const activeWines = wines.filter((w) => w.status !== "consumed");

  const filteredWines =
    filter === "all"
      ? wines
      : filter === "active"
        ? activeWines
        : filter === "consumed"
          ? wines.filter((w) => w.status === "consumed")
          : wines.filter(
              (w) => w.fridge_id === filter && w.status !== "consumed"
            );

  const filters = [
    { id: "active", label: `Active (${activeWines.length})` },
    { id: "all", label: `All (${wines.length})` },
    ...fridges.map((f) => ({
      id: f.id,
      label: `${f.name} (${activeWines.filter((w) => w.fridge_id === f.id).length})`,
    })),
    {
      id: "consumed",
      label: `Drank (${wines.filter((w) => w.status === "consumed").length})`,
    },
  ];

  // Group wines by name+producer+vintage
  const wineGroups = useMemo(() => {
    const groupMap = new Map<string, Wine[]>();
    for (const wine of filteredWines) {
      const key = `${(wine.name || "").toLowerCase()}|${(wine.producer || "").toLowerCase()}|${wine.vintage || "NV"}`;
      const existing = groupMap.get(key) || [];
      existing.push(wine);
      groupMap.set(key, existing);
    }
    const groups: WineGroup[] = [];
    for (const [key, bottles] of groupMap) {
      const representative = bottles.find((b) => b.status !== "consumed") || bottles[0];
      groups.push({
        key,
        representative,
        bottles,
        count: bottles.length,
        windowStatus: getDrinkingWindowStatus(representative),
      });
    }
    return groups;
  }, [filteredWines]);

  // Sort and organize by mode
  const organizedContent = useMemo(() => {
    if (sortMode === "urgency") {
      return {
        type: "flat" as const,
        groups: [...wineGroups].sort(
          (a, b) => URGENCY_ORDER[a.windowStatus] - URGENCY_ORDER[b.windowStatus]
        ),
      };
    }
    const regionMap = new Map<string, WineGroup[]>();
    for (const group of wineGroups) {
      const region = group.representative.region || "Unknown Region";
      const existing = regionMap.get(region) || [];
      existing.push(group);
      regionMap.set(region, existing);
    }
    const sections = Array.from(regionMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([region, groups]) => ({
        region,
        groups: groups.sort((a, b) => {
          const prodA = a.representative.producer || "";
          const prodB = b.representative.producer || "";
          if (prodA !== prodB) return prodA.localeCompare(prodB);
          return (a.representative.name || "").localeCompare(b.representative.name || "");
        }),
      }));
    return { type: "sections" as const, sections };
  }, [wineGroups, sortMode]);

  const handleConsume = (wine: Wine) => {
    setSelectedWine(null);
    setTastingWine(wine);
  };

  const handleCoravin = async (wine: Wine) => {
    const date = new Date().toISOString().split("T")[0];
    await updateWine(wine.id, { status: "coravined", coravined_date: date });
    setSelectedWine(null);
  };

  const handleTastingSave = async (data: {
    rating: number;
    tags: string[];
    buyAgain: string | null;
    notes: string;
  }) => {
    if (!tastingWine) return;
    await saveTastingNote(tastingWine.id, data);
    await updateWine(tastingWine.id, {
      status: "consumed",
      consumed_date: new Date().toISOString().split("T")[0],
    });
    setTastingWine(null);
  };

  const handleResearch = async (wine: Wine) => {
    if (getDossier(wine.id)) return;
    setResearchingWineId(wine.id);
    try {
      const res = await fetch("/api/wine/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wine.name,
          producer: wine.producer,
          vintage: wine.vintage,
        }),
      });
      const data = await res.json();
      if (data && !data.error) {
        await saveDossier(wine.id, data);
      }
    } catch (err) {
      console.error("Research error:", err);
    }
    setResearchingWineId(null);
  };

  // Shared wine list item renderer
  const renderWineRow = (group: WineGroup) => {
    const wine = group.representative;
    const windowColor = WINDOW_COLORS[group.windowStatus];
    const fridge = wine.fridge_id ? fridges.find((f) => f.id === wine.fridge_id) : null;
    return (
      <button
        key={group.key}
        onClick={() => setSelectedWine(wine)}
        className="w-full cursor-pointer text-left"
        style={{
          display: "flex",
          gap: "14px",
          padding: "14px 16px",
          background: "#FFFFFF",
          border: `1px solid ${wine.status === "coravined" ? "rgba(142,58,72,0.19)" : "#DDD5CA"}`,
          borderRadius: "16px",
          boxShadow: "0 1px 6px rgba(45,36,27,0.04)",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "12px",
            flexShrink: 0,
            background: wine.photo_url
              ? `url(${wine.photo_url}) center/cover`
              : "linear-gradient(145deg, rgba(114,47,55,0.08), #F0EBE3 60%)",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2">
            <div className="font-serif font-semibold truncate" style={{ fontSize: "14px", color: "#2D241B", flex: 1 }}>
              {wine.vintage ? `${wine.vintage} ` : ""}{wine.name}
            </div>
            {group.count > 1 && (
              <span style={{
                fontSize: "11px", fontWeight: 600, color: "#A0864E",
                background: "rgba(160,134,78,0.12)", padding: "2px 8px",
                borderRadius: "100px", flexShrink: 0,
              }}>
                ×{group.count}
              </span>
            )}
          </div>
          <div className="truncate" style={{ fontSize: "12px", color: "#6B5E52", marginTop: "2px" }}>
            {wine.producer}{wine.varietal ? ` · ${wine.varietal}` : ""}
          </div>
          <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: "4px" }}>
            {group.windowStatus !== "unknown" && (
              <span className="rounded-full" style={{
                fontSize: "10px", padding: "2px 8px",
                background: `${windowColor}15`, border: `1px solid ${windowColor}30`,
                color: windowColor, fontWeight: 500,
              }}>
                {WINDOW_LABELS[group.windowStatus]}
              </span>
            )}
            {wine.status === "coravined" && <CoravinBadge wine={wine} />}
            {fridge && <span style={{ fontSize: "10px", color: "#8C7E72" }}>📍 {fridge.name}</span>}
          </div>
        </div>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ color: "#8C7E72" }}>
        <div className="animate-pulse-slow">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="fade-in" style={{ padding: "24px 20px 112px" }}>
        <h1 className="font-serif font-bold" style={{ fontSize: "32px", color: "#2D241B", letterSpacing: "-0.3px", marginBottom: "4px", lineHeight: 1.15 }}>
          Cellar
        </h1>
        <div style={{ fontSize: "13px", color: "#8C7E72", marginBottom: "16px" }}>
          {activeWines.length} bottle{activeWines.length !== 1 ? "s" : ""}
          {wineGroups.length !== filteredWines.length && filter === "active" && ` · ${wineGroups.length} unique`}
        </div>

        {/* Sort toggle */}
        <div className="flex gap-1" style={{ background: "#F0EBE3", borderRadius: "100px", padding: "3px", marginBottom: "12px" }}>
          {(["region", "urgency"] as const).map((m) => (
            <button key={m} onClick={() => setSortMode(m)} className="flex-1 cursor-pointer" style={{
              padding: "8px 16px", borderRadius: "100px", fontSize: "13px", fontWeight: 500,
              border: "none", background: sortMode === m ? "#FFFFFF" : "transparent",
              color: sortMode === m ? "#2D241B" : "#8C7E72",
              boxShadow: sortMode === m ? "0 1px 4px rgba(45,36,27,0.1)" : "none", transition: "all 0.2s",
            }}>
              {m === "region" ? "By Region" : "By Urgency"}
            </button>
          ))}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto" style={{ marginBottom: "20px", paddingBottom: "4px", paddingLeft: "2px", paddingRight: "2px" }}>
          {filters.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className="whitespace-nowrap cursor-pointer transition-all duration-150" style={{
              padding: "7px 14px", borderRadius: "100px", fontSize: "12px", fontWeight: 500,
              border: `1px solid ${filter === f.id ? "#722F37" : "#DDD5CA"}`,
              background: filter === f.id ? "rgba(114,47,55,0.12)" : "transparent",
              color: filter === f.id ? "#722F37" : "#8C7E72",
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Wine list */}
        {wineGroups.length > 0 ? (
          <div>
            {organizedContent.type === "sections" ? (
              organizedContent.sections.map((section) => (
                <div key={section.region} style={{ marginBottom: "24px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#A0864E", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px", paddingLeft: "4px" }}>
                    {section.region} ({section.groups.length})
                  </div>
                  <div className="flex flex-col gap-2">
                    {section.groups.map(renderWineRow)}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col gap-2">
                {organizedContent.groups.map(renderWineRow)}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center" style={{ padding: "64px 20px", color: "#8C7E72" }}>
            {fridges.length === 0 ? (
              <div>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🍷</div>
                <div className="font-serif" style={{ fontSize: "20px", color: "#2D241B", marginBottom: "8px", fontWeight: 600 }}>
                  Set up your storage first
                </div>
                <div className="leading-relaxed" style={{ fontSize: "13px", color: "#6B5E52", marginBottom: "20px" }}>
                  Add your wine fridges in the Profile tab, then start snapping bottles
                </div>
                <button onClick={() => router.push("/profile")} className="font-semibold cursor-pointer" style={{
                  padding: "12px 28px", background: "#722F37", border: "none", borderRadius: "14px",
                  color: "#FFFFFF", fontSize: "14px", boxShadow: "0 4px 16px rgba(114,47,55,0.25)",
                }}>
                  Go to Profile →
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "40px", marginBottom: "12px", opacity: 0.6 }}>🍷</div>
                <div className="font-serif" style={{ fontSize: "18px", color: "#6B5E52", fontWeight: 500 }}>
                  No wines here yet
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedWine && (
        <WineDetail
          wine={selectedWine}
          fridges={fridges}
          dossier={getDossier(selectedWine.id) || null}
          loadingDossier={researchingWineId === selectedWine.id}
          tastingNotes={tastingNotes[selectedWine.id] || []}
          onClose={() => setSelectedWine(null)}
          onConsume={handleConsume}
          onCoravin={handleCoravin}
          onResearch={() => handleResearch(selectedWine)}
          onLoadNotes={() => loadTastingNotes(selectedWine.id)}
          onDelete={(wine) => {
            deleteWine(wine.id);
            setSelectedWine(null);
          }}
          onUpdate={(id, updates) => {
            updateWine(id, updates);
            setSelectedWine((prev) => prev ? { ...prev, ...updates } : null);
          }}
        />
      )}

      {tastingWine && (
        <TastingFlow
          wine={tastingWine}
          onSave={handleTastingSave}
          onCancel={() => setTastingWine(null)}
        />
      )}
    </>
  );
}
