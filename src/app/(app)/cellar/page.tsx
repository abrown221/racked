"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCellar } from "@/hooks/useCellar";
import WineCard from "@/components/WineCard";
import WineDetail from "@/components/WineDetail";
import TastingFlow from "@/components/TastingFlow";
import type { Wine } from "@/lib/supabase/types";

export default function CellarPage() {
  const { wines, fridges, loading, updateWine, saveDossier, getDossier } =
    useCellar();
  const router = useRouter();
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [tastingWine, setTastingWine] = useState<Wine | null>(null);
  const [filter, setFilter] = useState("all");
  const [loadingDossier, setLoadingDossier] = useState(false);

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
    await updateWine(tastingWine.id, {
      status: "consumed",
      consumed_date: new Date().toISOString().split("T")[0],
    });
    setTastingWine(null);
  };

  const handleResearch = async (wine: Wine) => {
    if (getDossier(wine.id)) return;
    setLoadingDossier(true);
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
    } catch {}
    setLoadingDossier(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[var(--color-text-muted)]">
        <div className="animate-pulse-slow">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="fade-in px-5 pt-5 pb-24">
        <h1 className="font-serif text-[30px] font-bold mb-1">Cellar</h1>
        <div className="text-[13px] text-[var(--color-text-muted)] mb-5">
          {activeWines.length} bottle{activeWines.length !== 1 ? "s" : ""}
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 overflow-x-auto mb-5 pb-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="whitespace-nowrap px-3.5 py-2 rounded-full text-xs cursor-pointer border"
              style={{
                borderColor:
                  filter === f.id
                    ? "var(--color-accent)"
                    : "var(--color-border)",
                background:
                  filter === f.id
                    ? "rgba(114,47,55,0.15)"
                    : "transparent",
                color:
                  filter === f.id
                    ? "var(--color-accent-light)"
                    : "var(--color-text-muted)",
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
          <div className="text-center py-16 text-[var(--color-text-muted)]">
            {fridges.length === 0 ? (
              <div>
                <div className="text-5xl mb-4">🍷</div>
                <div className="font-serif text-lg text-[var(--color-text-primary)] mb-2">
                  Set up your storage first
                </div>
                <div className="text-[13px] leading-relaxed mb-5">
                  Add your wine fridges in the Profile tab, then start snapping
                  bottles
                </div>
                <button
                  onClick={() => router.push("/profile")}
                  className="px-6 py-3 bg-[var(--color-accent)] border-none rounded-xl text-white text-sm font-semibold cursor-pointer"
                >
                  Go to Profile →
                </button>
              </div>
            ) : (
              "No wines here yet"
            )}
          </div>
        )}
      </div>

      {selectedWine && (
        <WineDetail
          wine={selectedWine}
          fridges={fridges}
          dossier={getDossier(selectedWine.id) || null}
          loadingDossier={loadingDossier}
          onClose={() => setSelectedWine(null)}
          onConsume={handleConsume}
          onCoravin={handleCoravin}
          onResearch={() => handleResearch(selectedWine)}
        />
      )}

      {tastingWine && (
        <TastingFlow
          wine={tastingWine}
          onSave={handleTastingSave}
          onCancel={() => {
            updateWine(tastingWine.id, {
              status: "consumed",
              consumed_date: new Date().toISOString().split("T")[0],
            });
            setTastingWine(null);
          }}
        />
      )}
    </>
  );
}
