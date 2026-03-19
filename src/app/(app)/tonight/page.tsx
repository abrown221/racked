"use client";

import { useState, useEffect } from "react";
import { useCellar } from "@/hooks/useCellar";
import CoravinBadge from "@/components/CoravinBadge";
import WineDetail from "@/components/WineDetail";
import TastingFlow from "@/components/TastingFlow";
import type { Wine } from "@/lib/supabase/types";
import { getCoravinDays } from "@/lib/wine-utils";

type Recommendation = { wine: string; reason: string };

export default function TonightPage() {
  const {
    wines,
    fridges,
    dossiers,
    loading,
    updateWine,
    saveDossier,
    getDossier,
  } = useCellar();
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [tastingWine, setTastingWine] = useState<Wine | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [askInput, setAskInput] = useState("");
  const [askResponse, setAskResponse] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [loadingDossier, setLoadingDossier] = useState(false);

  const activeWines = wines.filter((w) => w.status !== "consumed");
  const coravinedWines = activeWines
    .filter((w) => w.status === "coravined")
    .sort((a, b) => getCoravinDays(b) - getCoravinDays(a));

  const buildCellarSummary = () =>
    activeWines
      .map(
        (w) =>
          `${w.vintage} ${w.producer} ${w.name} | ${w.varietal} | ${w.region} | Window: ${w.drinking_window_start}-${w.drinking_window_end} | Status: ${w.status}${w.coravined_date ? ` (Coravined ${w.coravined_date})` : ""}`
      )
      .join("\n");

  const loadRecommendations = async () => {
    if (activeWines.length === 0) return;
    setLoadingRecs(true);
    try {
      const res = await fetch("/api/wine/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cellarSummary: buildCellarSummary() }),
      });
      const data = await res.json();
      if (Array.isArray(data)) setRecommendations(data);
    } catch {}
    setLoadingRecs(false);
  };

  useEffect(() => {
    if (!loading && activeWines.length > 0 && recommendations.length === 0) {
      loadRecommendations();
    }
  }, [loading]);

  const handleAsk = async () => {
    if (!askInput.trim()) return;
    setAskLoading(true);
    try {
      const res = await fetch("/api/wine/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cellarSummary: buildCellarSummary(),
          question: askInput,
        }),
      });
      const data = await res.json();
      setAskResponse(data.response || "");
    } catch {}
    setAskLoading(false);
    setAskInput("");
  };

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
        <div className="animate-pulse-slow">Loading your cellar...</div>
      </div>
    );
  }

  return (
    <>
      <div className="fade-in px-5 pt-5 pb-24">
        <h1 className="font-serif text-[30px] font-bold mb-1">Tonight</h1>
        <div className="text-[13px] text-[var(--color-text-muted)] mb-7">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </div>

        {/* Coravined */}
        {coravinedWines.length > 0 && (
          <div className="mb-7">
            <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-text-muted)] mb-3">
              Coravined — Finish These
            </div>
            {coravinedWines.map((w) => (
              <div
                key={w.id}
                onClick={() => setSelectedWine(w)}
                className="flex items-center gap-3.5 p-3.5 bg-[var(--color-card)] border border-[rgba(142,58,72,0.19)] rounded-xl mb-2 cursor-pointer"
              >
                <div
                  className="w-12 h-16 rounded-lg shrink-0"
                  style={{
                    background: w.photo_url
                      ? `url(${w.photo_url}) center/cover`
                      : "rgba(114,47,55,0.19)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-[15px] font-semibold truncate">
                    {w.vintage} {w.producer}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {w.varietal}
                  </div>
                  <div className="mt-1.5">
                    <CoravinBadge wine={w} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {activeWines.length > 0 ? (
          <div className="mb-7">
            <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-text-muted)] mb-3">
              Recommended
            </div>
            {loadingRecs ? (
              <div className="text-center py-10 text-[var(--color-text-muted)] animate-pulse-slow">
                Thinking about your cellar...
              </div>
            ) : recommendations.length > 0 ? (
              recommendations.map((rec, i) => {
                const match = activeWines.find(
                  (w) =>
                    rec.wine &&
                    (`${w.vintage} ${w.producer} ${w.name}`
                      .toLowerCase()
                      .includes(rec.wine.toLowerCase()) ||
                      rec.wine
                        .toLowerCase()
                        .includes((w.producer || "").toLowerCase()))
                );
                return (
                  <div
                    key={i}
                    onClick={() => match && setSelectedWine(match)}
                    className="p-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl mb-2 cursor-pointer"
                  >
                    <div className="font-serif text-[15px] font-semibold mb-1.5">
                      {rec.wine}
                    </div>
                    <div className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
                      {rec.reason}
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                onClick={loadRecommendations}
                className="text-center py-8 text-[var(--color-text-muted)] cursor-pointer border border-dashed border-[var(--color-border)] rounded-xl"
              >
                Tap for recommendations
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-[var(--color-text-muted)]">
            <div className="text-5xl mb-4">🍷</div>
            <div className="font-serif text-xl text-[var(--color-text-primary)] mb-2">
              {fridges.length === 0
                ? "Welcome to Racked"
                : "Your cellar is empty"}
            </div>
            <div className="text-sm leading-relaxed">
              {fridges.length === 0
                ? "Start by adding your wine fridges in Profile, then snap your first bottle"
                : "Tap the camera below to photograph your first bottle"}
            </div>
          </div>
        )}

        {/* Ask sommelier */}
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-text-muted)] mb-3">
            Ask Your Sommelier
          </div>
          <div className="flex gap-2">
            <input
              value={askInput}
              onChange={(e) => setAskInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="What goes with grilled lamb?"
              className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text-primary)] text-sm"
            />
            <button
              onClick={handleAsk}
              disabled={askLoading}
              className="bg-[var(--color-accent)] border-none rounded-xl px-[18px] text-white text-base cursor-pointer disabled:opacity-50"
            >
              →
            </button>
          </div>
          {askLoading && (
            <div className="py-4 text-[var(--color-text-muted)] text-[13px] animate-pulse-slow">
              Thinking...
            </div>
          )}
          {askResponse && (
            <div className="mt-3 p-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-secondary)] leading-relaxed shadow-sm">
              {askResponse}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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
