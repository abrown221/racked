"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCellar } from "@/hooks/useCellar";
import type { ScanResult } from "@/lib/supabase/types";

export default function ReviewQueuePage() {
  const { fridges, wines, refreshWines, refreshScanQueue } = useCellar();
  const router = useRouter();

  const [results, setResults] = useState<ScanResult[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState(0);
  const [processingPhotos, setProcessingPhotos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  // Editable fields for current card
  const [editName, setEditName] = useState("");
  const [editProducer, setEditProducer] = useState("");
  const [editVintage, setEditVintage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedFridge, setSelectedFridge] = useState<string | null>(null);
  const [pricePaid, setPricePaid] = useState("");
  const [showSkipAllConfirm, setShowSkipAllConfirm] = useState(false);

  const activeWines = wines.filter((w) => w.status !== "consumed");

  const loadQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/wine/scan-queue");
      if (!res.ok) return;
      const data = await res.json();
      setResults(data.results || []);
      setPendingPhotos(data.pendingPhotos || 0);
      setProcessingPhotos(data.processingPhotos || 0);
    } catch (err) {
      console.error("Failed to load queue:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Initialize editable fields when card changes
  const current = results[currentIndex];
  useEffect(() => {
    if (!current) return;
    setEditName(current.name);
    setEditProducer(current.producer || "");
    setEditVintage(current.vintage ? String(current.vintage) : "");
    setQuantity(1);
    setPricePaid("");

    // Auto-suggest fridge
    const dailyF = fridges.find((f) => f.type === "daily");
    const cellarF = fridges.find((f) => f.type === "cellar");
    setSelectedFridge(
      current.fridge_suggestion === "daily" && dailyF
        ? dailyF.id
        : cellarF?.id || fridges[0]?.id || null
    );
  }, [current, fridges]);

  // Poll for new results while photos are still processing
  useEffect(() => {
    if (pendingPhotos <= 0 && processingPhotos <= 0) return;
    const interval = setInterval(() => {
      loadQueue();
    }, 10000);
    return () => clearInterval(interval);
  }, [pendingPhotos, processingPhotos, loadQueue]);

  const handleAction = async (action: "add" | "skip") => {
    if (!current || actionLoading) return;
    setActionLoading(true);

    try {
      const body: Record<string, unknown> = {
        action,
        resultId: current.id,
      };

      if (action === "add") {
        const parsedVintage = editVintage ? parseInt(editVintage, 10) : null;
        body.overrides = {
          name: editName || current.name,
          producer: editProducer || current.producer,
          vintage:
            parsedVintage !== null && !isNaN(parsedVintage)
              ? parsedVintage
              : current.vintage,
          quantity: Math.max(1, Math.min(quantity, 24)),
          fridge_id: selectedFridge,
          price_paid: pricePaid ? parseFloat(pricePaid) : null,
        };
      }

      const res = await fetch("/api/wine/scan-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Scan action failed:", err);
        setActionLoading(false);
        return;
      }

      if (action === "add") {
        setAddedCount((c) => c + quantity);
        await refreshWines();
      } else {
        setSkippedCount((c) => c + 1);
      }

      // Remove from local list and advance
      setResults((prev) => prev.filter((_, i) => i !== currentIndex));
      // Keep currentIndex the same (next item slides into position)
      // If we were at the end, clamp
      setCurrentIndex((prev) =>
        prev >= results.length - 1 ? Math.max(0, results.length - 2) : prev
      );

      await refreshScanQueue();
    } catch (err) {
      console.error("Action error:", err);
    }
    setActionLoading(false);
  };

  const handleSkipAll = async () => {
    setActionLoading(true);
    try {
      await fetch("/api/wine/scan-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip_all" }),
      });
      setSkippedCount((c) => c + results.length);
      setResults([]);
      await refreshScanQueue();
    } catch (err) {
      console.error("Skip all error:", err);
    }
    setActionLoading(false);
    setShowSkipAllConfirm(false);
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

  const confidenceColors = {
    high: { bg: "rgba(90,122,74,0.1)", border: "rgba(90,122,74,0.25)", text: "#5A7A4A", label: "High confidence" },
    medium: { bg: "rgba(160,134,78,0.12)", border: "rgba(160,134,78,0.25)", text: "#A0864E", label: "Medium confidence" },
    low: { bg: "rgba(155,51,51,0.08)", border: "rgba(155,51,51,0.2)", text: "#9B3333", label: "Low confidence" },
  };

  // Loading state
  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ color: "#8C7E72" }}
      >
        <div className="animate-pulse-slow">Loading review queue...</div>
      </div>
    );
  }

  // All done state
  if (results.length === 0) {
    return (
      <div className="fade-in" style={{ padding: "24px 20px 112px" }}>
        <div className="text-center" style={{ padding: "64px 0" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>
            {addedCount > 0 ? "🎉" : "📋"}
          </div>
          <h2
            className="font-serif font-bold"
            style={{ fontSize: "22px", color: "#2D241B", marginBottom: "8px" }}
          >
            {addedCount > 0 ? "All done!" : "Queue is empty"}
          </h2>
          {addedCount > 0 && (
            <div style={{ fontSize: "14px", color: "#6B5E52", marginBottom: "8px" }}>
              Added {addedCount} wine{addedCount !== 1 ? "s" : ""}
              {skippedCount > 0 && ` · Skipped ${skippedCount}`}
            </div>
          )}
          {(pendingPhotos > 0 || processingPhotos > 0) && (
            <div style={{ fontSize: "13px", color: "#8C7E72", marginBottom: "24px" }}>
              {pendingPhotos + processingPhotos} photo{pendingPhotos + processingPhotos !== 1 ? "s" : ""} still processing...
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/cellar")}
              className="cursor-pointer font-semibold"
              style={{
                padding: "12px 24px",
                background: "#722F37",
                border: "none",
                borderRadius: "14px",
                color: "#FFFFFF",
                fontSize: "14px",
                boxShadow: "0 4px 16px rgba(114,47,55,0.25)",
              }}
            >
              View Cellar
            </button>
            <button
              onClick={() => router.push("/camera")}
              className="cursor-pointer"
              style={{
                padding: "12px 24px",
                background: "transparent",
                border: "1px solid #DDD5CA",
                borderRadius: "14px",
                color: "#6B5E52",
                fontSize: "14px",
              }}
            >
              Take More Photos
            </button>
          </div>
        </div>
      </div>
    );
  }

  const conf = confidenceColors[current?.confidence || "medium"];
  const existingDupe = current?.duplicate_of
    ? wines.find((w) => w.id === current.duplicate_of)
    : null;
  const dupeCount = existingDupe
    ? activeWines.filter(
        (w) =>
          w.name.toLowerCase() === existingDupe.name.toLowerCase() &&
          w.producer?.toLowerCase() === existingDupe.producer?.toLowerCase()
      ).length
    : 0;

  return (
    <div className="fade-in" style={{ padding: "24px 20px 112px" }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: "20px" }}>
        <button
          onClick={() => router.push("/camera")}
          className="cursor-pointer"
          style={{
            background: "transparent",
            border: "none",
            fontSize: "20px",
            color: "#6B5E52",
            padding: "4px 8px",
          }}
        >
          ←
        </button>
        <div style={{ fontSize: "14px", color: "#8C7E72", fontWeight: 500 }}>
          {currentIndex + 1} of {results.length}
        </div>
        <div style={{ width: "36px" }} />
      </div>

      {/* Processing indicator */}
      {(pendingPhotos > 0 || processingPhotos > 0) && (
        <div style={{
          padding: "8px 14px",
          background: "rgba(114,47,55,0.06)",
          borderRadius: "14px",
          marginBottom: "16px",
          fontSize: "12px",
          color: "#6B5E52",
          textAlign: "center",
        }}>
          {pendingPhotos + processingPhotos} more photo{pendingPhotos + processingPhotos !== 1 ? "s" : ""} processing...
        </div>
      )}

      {current && (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #DDD5CA",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 2px 12px rgba(45,36,27,0.06)",
            marginBottom: "16px",
          }}
        >
          {/* Confidence badge */}
          <div style={{ padding: "16px 20px 0" }}>
            <span
              className="rounded-full"
              style={{
                padding: "4px 12px",
                fontSize: "11px",
                fontWeight: 500,
                background: conf.bg,
                border: `1px solid ${conf.border}`,
                color: conf.text,
              }}
            >
              {conf.label}
            </span>
          </div>

          <div style={{ padding: "12px 20px 20px" }}>
            {/* Duplicate warning */}
            {existingDupe && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(160,134,78,0.1)",
                  border: "1px solid rgba(160,134,78,0.25)",
                  borderRadius: "12px",
                  marginBottom: "16px",
                  fontSize: "13px",
                  color: "#A07830",
                }}
              >
                Already in cellar{dupeCount > 1 ? ` (×${dupeCount})` : ""} — {existingDupe.name}
              </div>
            )}

            {/* Editable name */}
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "4px" }}>
                Wine name
              </div>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="font-serif font-bold"
                style={{ ...inputStyle, fontSize: "18px" }}
              />
            </div>

            {/* Editable producer */}
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "4px" }}>
                Producer
              </div>
              <input
                type="text"
                value={editProducer}
                onChange={(e) => setEditProducer(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Vintage + Quantity row */}
            <div className="flex gap-3" style={{ marginBottom: "12px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "4px" }}>
                  Vintage
                </div>
                <input
                  type="number"
                  value={editVintage}
                  onChange={(e) => setEditVintage(e.target.value)}
                  placeholder="NV"
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "4px" }}>
                  Quantity
                </div>
                <div className="flex items-center" style={{
                  background: "#F0EBE3",
                  border: "1px solid #DDD5CA",
                  borderRadius: "14px",
                  overflow: "hidden",
                }}>
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="cursor-pointer"
                    style={{
                      width: "40px",
                      height: "42px",
                      background: "transparent",
                      border: "none",
                      fontSize: "18px",
                      color: quantity <= 1 ? "#DDD5CA" : "#6B5E52",
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
                    {quantity}
                  </div>
                  <button
                    onClick={() => setQuantity((q) => Math.min(24, q + 1))}
                    className="cursor-pointer"
                    style={{
                      width: "40px",
                      height: "42px",
                      background: "transparent",
                      border: "none",
                      fontSize: "18px",
                      color: quantity >= 24 ? "#DDD5CA" : "#6B5E52",
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Wine metadata (read-only display) */}
            <div style={{ fontSize: "13px", color: "#8C7E72", marginBottom: "12px" }}>
              {current.varietal}
              {current.appellation || current.region
                ? ` · ${current.appellation || current.region}`
                : ""}
            </div>
            {(current.drinking_window_start || current.drinking_window_end) && (
              <div style={{ fontSize: "13px", color: "#6B5E52", marginBottom: "8px" }}>
                Window: {current.drinking_window_start}–{current.drinking_window_end}
              </div>
            )}
            {current.estimated_price && (
              <div style={{ fontSize: "13px", color: "#6B5E52", marginBottom: "8px" }}>
                Market: ~${current.estimated_price}
              </div>
            )}
            {current.fridge_reason && (
              <div style={{ fontSize: "13px", color: "#6B5E52", marginBottom: "12px" }}>
                💡 {current.fridge_reason}
              </div>
            )}

            {/* Fridge picker */}
            {fridges.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "6px" }}>
                  Which fridge?
                </div>
                <div className="flex gap-2 flex-wrap">
                  {fridges.map((f) => {
                    const count = activeWines.filter((w) => w.fridge_id === f.id).length;
                    const full = f.capacity > 0 && count >= f.capacity;
                    return (
                      <button
                        key={f.id}
                        onClick={() => !full && setSelectedFridge(f.id)}
                        className="cursor-pointer"
                        style={{
                          padding: "8px 14px",
                          borderRadius: "14px",
                          fontSize: "12px",
                          fontWeight: 500,
                          background:
                            selectedFridge === f.id ? "rgba(114,47,55,0.15)" : "transparent",
                          border: `1px solid ${selectedFridge === f.id ? "#722F37" : full ? "rgba(155,51,51,0.25)" : "#DDD5CA"}`,
                          color: full ? "#9B3333" : selectedFridge === f.id ? "#722F37" : "#8C7E72",
                          opacity: full ? 0.5 : 1,
                        }}
                      >
                        {f.name}
                        {f.capacity > 0 && (
                          <span style={{ fontSize: "10px", opacity: 0.7, marginLeft: "4px" }}>
                            {count}/{f.capacity}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price */}
            <div>
              <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "4px" }}>
                Price paid (optional)
              </div>
              <input
                type="number"
                value={pricePaid}
                onChange={(e) => setPricePaid(e.target.value)}
                placeholder="$"
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3" style={{ marginBottom: "12px" }}>
        <button
          onClick={() => handleAction("skip")}
          disabled={actionLoading}
          className="flex-1 cursor-pointer"
          style={{
            padding: "14px",
            background: "transparent",
            border: "1px solid #DDD5CA",
            borderRadius: "14px",
            color: "#6B5E52",
            fontSize: "15px",
            opacity: actionLoading ? 0.5 : 1,
          }}
        >
          Skip
        </button>
        <button
          onClick={() => handleAction("add")}
          disabled={actionLoading}
          className="font-semibold cursor-pointer"
          style={{
            flex: 2,
            padding: "14px",
            background: "#722F37",
            border: "none",
            borderRadius: "14px",
            color: "#FFFFFF",
            fontSize: "15px",
            boxShadow: "0 4px 16px rgba(114,47,55,0.25)",
            opacity: actionLoading ? 0.5 : 1,
          }}
        >
          Add to Cellar{quantity > 1 ? ` (${quantity})` : ""}
        </button>
      </div>

      {/* Skip All */}
      {results.length > 1 && (
        <button
          onClick={() => setShowSkipAllConfirm(true)}
          className="w-full cursor-pointer"
          style={{
            padding: "12px",
            background: "transparent",
            border: "1px solid #DDD5CA",
            borderRadius: "14px",
            color: "#8C7E72",
            fontSize: "13px",
          }}
        >
          Skip All Remaining ({results.length})
        </button>
      )}

      {/* Skip All confirmation */}
      {showSkipAllConfirm && (
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
            <div style={{
              width: "40px",
              height: "4px",
              background: "#DDD5CA",
              borderRadius: "100px",
              margin: "0 auto 20px",
            }} />
            <h3
              className="font-serif font-bold"
              style={{ fontSize: "20px", color: "#2D241B", marginBottom: "8px" }}
            >
              Skip all {results.length} wines?
            </h3>
            <p style={{ fontSize: "14px", color: "#6B5E52", marginBottom: "24px", lineHeight: 1.6 }}>
              This will dismiss all remaining wines in the review queue. You can always re-scan to identify them again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSkipAllConfirm(false)}
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
                onClick={handleSkipAll}
                disabled={actionLoading}
                className="flex-1 font-semibold cursor-pointer"
                style={{
                  padding: "14px",
                  background: "#9B3333",
                  border: "none",
                  borderRadius: "14px",
                  color: "#FFFFFF",
                  fontSize: "15px",
                  opacity: actionLoading ? 0.5 : 1,
                }}
              >
                Skip All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
