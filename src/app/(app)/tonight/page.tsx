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
    tastingNotes,
    loading,
    updateWine,
    deleteWine,
    saveDossier,
    getDossier,
    saveTastingNote,
    loadTastingNotes,
  } = useCellar();
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [tastingWine, setTastingWine] = useState<Wine | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [askInput, setAskInput] = useState("");
  const [askResponse, setAskResponse] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [researchingWineId, setResearchingWineId] = useState<string | null>(null);

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
    } catch (err) {
      console.error("Recommendations error:", err);
    }
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
    } catch (err) {
      console.error("Ask sommelier error:", err);
      setAskResponse("Sorry, I couldn't process that. Please try again.");
    }
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
        <div className="animate-pulse-slow">Loading your cellar...</div>
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
          Tonight
        </h1>
        <div
          style={{
            fontSize: "13px",
            color: "#8C7E72",
            marginBottom: "32px",
          }}
        >
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </div>

        {/* Coravined */}
        {coravinedWines.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <div
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                color: "#8C7E72",
                marginBottom: "14px",
              }}
            >
              Coravined — Finish These
            </div>
            {coravinedWines.map((w) => (
              <div
                key={w.id}
                onClick={() => setSelectedWine(w)}
                className="flex items-center gap-3.5 cursor-pointer"
                style={{
                  padding: "14px",
                  background: "#FFFFFF",
                  border: "1px solid rgba(142,58,72,0.19)",
                  borderRadius: "16px",
                  marginBottom: "8px",
                  boxShadow: "0 2px 12px rgba(45,36,27,0.06)",
                }}
              >
                <div
                  className="shrink-0"
                  style={{
                    width: "48px",
                    height: "64px",
                    borderRadius: "10px",
                    background: w.photo_url
                      ? `url(${w.photo_url}) center/cover`
                      : "rgba(114,47,55,0.12)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="font-serif font-semibold truncate"
                    style={{ fontSize: "15px", color: "#2D241B" }}
                  >
                    {w.vintage} {w.producer}
                  </div>
                  <div style={{ fontSize: "12px", color: "#8C7E72", marginTop: "2px" }}>
                    {w.varietal}
                  </div>
                  <div style={{ marginTop: "6px" }}>
                    <CoravinBadge wine={w} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {activeWines.length > 0 ? (
          <div style={{ marginBottom: "32px" }}>
            <div
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                color: "#8C7E72",
                marginBottom: "14px",
              }}
            >
              Recommended
            </div>
            {loadingRecs ? (
              <div
                className="text-center animate-pulse-slow"
                style={{ padding: "40px 0", color: "#8C7E72" }}
              >
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
                    className="cursor-pointer"
                    style={{
                      padding: "16px",
                      background: "#FFFFFF",
                      border: "1px solid #DDD5CA",
                      borderRadius: "16px",
                      marginBottom: "8px",
                      boxShadow: "0 2px 12px rgba(45,36,27,0.06)",
                    }}
                  >
                    <div
                      className="font-serif font-semibold"
                      style={{ fontSize: "15px", color: "#2D241B", marginBottom: "6px" }}
                    >
                      {rec.wine}
                    </div>
                    <div
                      className="leading-relaxed"
                      style={{ fontSize: "13px", color: "#8C7E72" }}
                    >
                      {rec.reason}
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                onClick={loadRecommendations}
                className="text-center cursor-pointer"
                style={{
                  padding: "32px 0",
                  color: "#8C7E72",
                  border: "1px dashed #DDD5CA",
                  borderRadius: "16px",
                }}
              >
                Tap for recommendations
              </div>
            )}
          </div>
        ) : (
          <div className="text-center" style={{ padding: "64px 20px", color: "#8C7E72" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🍷</div>
            <div
              className="font-serif"
              style={{
                fontSize: "22px",
                color: "#2D241B",
                marginBottom: "8px",
                fontWeight: 600,
              }}
            >
              {fridges.length === 0 ? "Welcome to Racked" : "Your cellar is empty"}
            </div>
            <div
              className="leading-relaxed"
              style={{ fontSize: "14px", color: "#6B5E52", marginBottom: "20px" }}
            >
              {fridges.length === 0
                ? "Start by adding your wine fridges in Profile, then snap your first bottle"
                : "Tap the camera below to photograph your first bottle"}
            </div>
            {fridges.length === 0 && (
              <button
                onClick={() => (window.location.href = "/profile")}
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
                Set Up Fridges →
              </button>
            )}
          </div>
        )}

        {/* Ask sommelier */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: "#8C7E72",
              marginBottom: "14px",
            }}
          >
            Ask Your Sommelier
          </div>
          <div className="flex gap-2.5 items-stretch">
            <input
              value={askInput}
              onChange={(e) => setAskInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="What goes with grilled lamb?"
              style={{
                flex: 1,
                background: "#F0EBE3",
                border: "1px solid #DDD5CA",
                borderRadius: "14px",
                padding: "12px 16px",
                color: "#2D241B",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <button
              onClick={handleAsk}
              disabled={askLoading}
              className="flex items-center justify-center cursor-pointer disabled:opacity-50"
              style={{
                width: "46px",
                height: "46px",
                background: "#722F37",
                border: "none",
                borderRadius: "50%",
                color: "#FFFFFF",
                fontSize: "18px",
                flexShrink: 0,
              }}
            >
              →
            </button>
          </div>
          {askLoading && (
            <div
              className="animate-pulse-slow"
              style={{ padding: "16px 0", color: "#8C7E72", fontSize: "13px" }}
            >
              Thinking...
            </div>
          )}
          {askResponse && (
            <div
              className="leading-relaxed"
              style={{
                marginTop: "12px",
                padding: "16px",
                background: "#FFFFFF",
                border: "1px solid #DDD5CA",
                borderRadius: "16px",
                fontSize: "14px",
                color: "#6B5E52",
                boxShadow: "0 2px 12px rgba(45,36,27,0.06)",
              }}
            >
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
