"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCellar } from "@/hooks/useCellar";
import WineCard from "@/components/WineCard";
import WineDetail from "@/components/WineDetail";
import TastingFlow from "@/components/TastingFlow";
import type { Wine } from "@/lib/supabase/types";

export default function CellarPage() {
  const { wines, fridges, tastingNotes, loading, updateWine, deleteWine, saveDossier, getDossier, saveTastingNote, loadTastingNotes } =
    useCellar();
  const router = useRouter();
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [tastingWine, setTastingWine] = useState<Wine | null>(null);
  const [filter, setFilter] = useState("all");
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
    { id: "all", label: `All (${wines.length})` },
    { id: "active", label: `Active (${activeWines.length})` },
    ...fridges.map((f) => ({
      id: f.id,
      label: `${f.name} (${activeWines.filter((w) => w.fridge_id === f.id).length})`,
    })),
    {
      id: "consumed",
      label: `Drank (${wines.filter((w) => w.status === "consumed").length})`,
    },
  ];

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

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ color: "#8C7E72" }}
      >
        <div className="animate-pulse-slow">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="fade-in" style={{ padding: "24px 20px 112px" }}>
        {/* Header */}
        <h1
          className="font-serif font-bold"
          style={{
            fontSize: "32px",
            color: "#2D241B",
            letterSpacing: "-0.3px",
            marginBottom: "4px",
            lineHeight: 1.15,
          }}
        >
          Cellar
        </h1>
        <div
          style={{
            fontSize: "13px",
            color: "#8C7E72",
            marginBottom: "24px",
          }}
        >
          {activeWines.length} bottle{activeWines.length !== 1 ? "s" : ""}
        </div>

        {/* Filter pills */}
        <div
          className="flex gap-2 overflow-x-auto"
          style={{
            marginBottom: "24px",
            paddingBottom: "4px",
            paddingLeft: "2px",
            paddingRight: "2px",
          }}
        >
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="whitespace-nowrap cursor-pointer transition-all duration-150"
              style={{
                padding: "8px 16px",
                borderRadius: "100px",
                fontSize: "12px",
                fontWeight: 500,
                border: `1px solid ${filter === f.id ? "#722F37" : "#DDD5CA"}`,
                background: filter === f.id ? "rgba(114,47,55,0.12)" : "transparent",
                color: filter === f.id ? "#722F37" : "#8C7E72",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Wine grid */}
        {filteredWines.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredWines.map((w) => (
              <WineCard
                key={w.id}
                wine={w}
                onClick={() => setSelectedWine(w)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center" style={{ padding: "64px 20px", color: "#8C7E72" }}>
            {fridges.length === 0 ? (
              <div>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🍷</div>
                <div
                  className="font-serif"
                  style={{
                    fontSize: "20px",
                    color: "#2D241B",
                    marginBottom: "8px",
                    fontWeight: 600,
                  }}
                >
                  Set up your storage first
                </div>
                <div
                  className="leading-relaxed"
                  style={{
                    fontSize: "13px",
                    color: "#6B5E52",
                    marginBottom: "20px",
                  }}
                >
                  Add your wine fridges in the Profile tab, then start snapping
                  bottles
                </div>
                <button
                  onClick={() => router.push("/profile")}
                  className="font-semibold cursor-pointer"
                  style={{
                    padding: "12px 28px",
                    background: "#722F37",
                    border: "none",
                    borderRadius: "14px",
                    color: "#FFFFFF",
                    fontSize: "14px",
                    boxShadow: "0 4px 16px rgba(114,47,55,0.25)",
                  }}
                >
                  Go to Profile →
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "40px", marginBottom: "12px", opacity: 0.6 }}>🍷</div>
                <div
                  className="font-serif"
                  style={{ fontSize: "18px", color: "#6B5E52", fontWeight: 500 }}
                >
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
