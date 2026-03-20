"use client";

import { useState, useMemo, useCallback } from "react";
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
    refreshWines,
  } = useCellar();
  const router = useRouter();
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [tastingWine, setTastingWine] = useState<Wine | null>(null);
  const [filter, setFilter] = useState("active");
  const [sortMode, setSortMode] = useState<"region" | "urgency">("region");
  const [researchingWineId, setResearchingWineId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ done: 0, total: 0, current: "" });

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

  // Apply search filter
  const searchedWines = useMemo(() => {
    if (!searchQuery.trim()) return filteredWines;
    const q = searchQuery.toLowerCase();
    return filteredWines.filter(
      (w) =>
        w.name?.toLowerCase().includes(q) ||
        w.producer?.toLowerCase().includes(q) ||
        w.varietal?.toLowerCase().includes(q) ||
        w.region?.toLowerCase().includes(q) ||
        (w.vintage && String(w.vintage).includes(q))
    );
  }, [filteredWines, searchQuery]);

  // Enrich all wines missing photos or dossiers
  const handleEnrichAll = useCallback(async () => {
    const seen = new Set<string>();
    const needsEnrich: Wine[] = [];
    for (const wine of activeWines) {
      const key = `${(wine.name || "").toLowerCase()}|${(wine.producer || "").toLowerCase()}|${wine.vintage || "NV"}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const hasDossier = !!getDossier(wine.id);
      if (!wine.photo_url || !hasDossier) {
        needsEnrich.push(wine);
      }
    }

    if (needsEnrich.length === 0) return;

    setEnriching(true);
    setEnrichProgress({ done: 0, total: needsEnrich.length, current: "" });
    let errors = 0;

    for (let i = 0; i < needsEnrich.length; i++) {
      const wine = needsEnrich[i];
      const label = `${wine.vintage || "NV"} ${wine.producer || ""} ${wine.name}`.trim();
      setEnrichProgress({
        done: i,
        total: needsEnrich.length,
        current: errors > 0 ? `${label} (${errors} failed)` : label,
      });

      try {
        const res = await fetch("/api/wine/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wineId: wine.id }),
        });

        if (!res.ok) {
          errors++;
          const err = await res.json().catch(() => ({}));
          console.error("Enrich failed for", label, err.error || res.status);
        }
      } catch (err) {
        errors++;
        console.error("Enrich failed for", label, err);
      }

      // Refresh UI every 5 wines so user sees progress
      if ((i + 1) % 5 === 0) {
        await refreshWines();
      }
    }

    setEnrichProgress({
      done: needsEnrich.length,
      total: needsEnrich.length,
      current: errors > 0 ? `Done — ${errors} failed` : "Done!",
    });
    await refreshWines();
    setTimeout(() => setEnriching(false), 2000);
  }, [activeWines, getDossier, refreshWines]);

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
    for (const wine of searchedWines) {
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
  }, [searchedWines]);

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
        className="w-full cursor-pointer text-left nm-raised-sm"
        style={{
          display: "flex",
          gap: "14px",
          padding: "14px 16px",
          borderRadius: "16px",
          alignItems: "center",
          transition: "all 0.15s ease",
        }}
      >
        <div
          className={wine.photo_url ? "" : "nm-inset"}
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "12px",
            flexShrink: 0,
            ...(wine.photo_url
              ? { background: `url(${wine.photo_url}) center/cover` }
              : {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                }),
          }}
        >
          {!wine.photo_url && (
            <span style={{ opacity: 0.5 }}>
              {wine.varietal?.toLowerCase().includes("pinot noir") || wine.varietal?.toLowerCase().includes("cabernet") || wine.varietal?.toLowerCase().includes("merlot") || wine.varietal?.toLowerCase().includes("syrah") || wine.varietal?.toLowerCase().includes("malbec") || wine.varietal?.toLowerCase().includes("zinfandel") || wine.varietal?.toLowerCase().includes("sangiovese") || wine.varietal?.toLowerCase().includes("gamay") || wine.varietal?.toLowerCase().includes("red")
                ? "🍷"
                : wine.varietal?.toLowerCase().includes("chardonnay") || wine.varietal?.toLowerCase().includes("riesling") || wine.varietal?.toLowerCase().includes("sauvignon") || wine.varietal?.toLowerCase().includes("chenin") || wine.varietal?.toLowerCase().includes("greco")
                  ? "🥂"
                  : wine.varietal?.toLowerCase().includes("champagne") || wine.varietal?.toLowerCase().includes("sparkling")
                    ? "🍾"
                    : "🍷"}
            </span>
          )}
        </div>
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
        <div style={{ fontSize: "13px", color: "#8C7E72", marginBottom: "12px" }}>
          {activeWines.length} bottle{activeWines.length !== 1 ? "s" : ""}
          {wineGroups.length !== searchedWines.length && filter === "active" && ` · ${wineGroups.length} unique`}
        </div>

        {/* Search bar */}
        <div className="nm-inset" style={{ borderRadius: "14px", marginBottom: "12px", padding: "2px" }}>
          <div className="flex items-center" style={{ padding: "10px 14px", gap: "10px" }}>
            <span style={{ fontSize: "16px", opacity: 0.5 }}>🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wines, producers, regions..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                fontSize: "14px",
                color: "#2D241B",
                outline: "none",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="cursor-pointer"
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "14px",
                  color: "#8C7E72",
                  padding: "2px 6px",
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Refresh / Enrich button */}
        {!enriching && activeWines.some((w) => !w.photo_url || !getDossier(w.id)) && (
          <button
            onClick={handleEnrichAll}
            className="w-full cursor-pointer nm-raised-sm"
            style={{
              padding: "12px 16px",
              borderRadius: "14px",
              fontSize: "13px",
              fontWeight: 500,
              color: "#722F37",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <span>✨</span> Enrich Cellar — add images & dossiers
          </button>
        )}

        {/* Enrichment progress */}
        {enriching && (
          <div className="nm-inset" style={{
            padding: "14px 16px",
            borderRadius: "14px",
            marginBottom: "12px",
          }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#2D241B" }}>
                Enriching wines...
              </span>
              <span style={{ fontSize: "12px", color: "#8C7E72" }}>
                {enrichProgress.done}/{enrichProgress.total}
              </span>
            </div>
            <div style={{
              height: "4px",
              borderRadius: "2px",
              background: "#DDD5CA",
              overflow: "hidden",
              marginBottom: "6px",
            }}>
              <div style={{
                height: "100%",
                borderRadius: "2px",
                background: "linear-gradient(90deg, #722F37, #8E3A48)",
                width: `${enrichProgress.total > 0 ? (enrichProgress.done / enrichProgress.total) * 100 : 0}%`,
                transition: "width 0.5s ease",
              }} />
            </div>
            <div className="truncate" style={{ fontSize: "11px", color: "#8C7E72" }}>
              {enrichProgress.current}
            </div>
          </div>
        )}

        {/* Sort toggle */}
        <div className="flex gap-1 nm-inset" style={{ borderRadius: "100px", padding: "4px", marginBottom: "12px" }}>
          {(["region", "urgency"] as const).map((m) => (
            <button key={m} onClick={() => setSortMode(m)} className={`flex-1 cursor-pointer ${sortMode === m ? "nm-raised-sm" : ""}`} style={{
              padding: "8px 16px", borderRadius: "100px", fontSize: "13px", fontWeight: 500,
              border: "none", background: sortMode === m ? "#FAF7F2" : "transparent",
              color: sortMode === m ? "#2D241B" : "#8C7E72",
              transition: "all 0.2s",
            }}>
              {m === "region" ? "By Region" : "By Urgency"}
            </button>
          ))}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto" style={{ marginBottom: "20px", paddingBottom: "4px", paddingLeft: "2px", paddingRight: "2px" }}>
          {filters.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`whitespace-nowrap cursor-pointer transition-all duration-150 ${filter === f.id ? "nm-raised-sm" : ""}`} style={{
              padding: "7px 14px", borderRadius: "100px", fontSize: "12px", fontWeight: 500,
              border: "none",
              background: filter === f.id ? "#FAF7F2" : "transparent",
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
