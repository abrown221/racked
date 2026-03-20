"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCellar } from "@/hooks/useCellar";

type CameraResult = {
  name: string;
  producer: string;
  vintage: number;
  region: string;
  appellation: string;
  varietal: string;
  blend: string;
  alcohol: string;
  estimatedPrice: number;
  drinkingWindow: { start: number; end: number };
  fridgeSuggestion: string;
  fridgeReason: string;
  suggestedTags: string[];
  photoDataUrl?: string;
};

type ShopResult = {
  name: string;
  vintage: number;
  price: string;
  recommendation: string;
  reason: string;
};

type BookResult = {
  name: string;
  vintage: string | null;
  context: string;
  searchQuery: string;
};

/** Resize image to max dimension, return { base64, dataUrl, mediaType } */
function resizeImage(
  file: File,
  maxDim = 1200
): Promise<{ base64: string; dataUrl: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, dataUrl, mediaType: "image/jpeg" });
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export default function CameraPage() {
  const { wines, fridges, wishlist, addWine, addWishlistItem } = useCellar();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<"idle" | "processing" | "result">("idle");
  const [intent, setIntent] = useState<string | null>(null);
  const [cameraResult, setCameraResult] = useState<CameraResult | null>(null);
  const [shopResults, setShopResults] = useState<ShopResult[] | null>(null);
  const [bookResults, setBookResults] = useState<BookResult[] | null>(null);
  const [selectedFridge, setSelectedFridge] = useState<string | null>(null);
  const [pricePaid, setPricePaid] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editProducer, setEditProducer] = useState("");
  const [editVintage, setEditVintage] = useState("");
  const [quantity, setQuantity] = useState(1);

  const activeWines = wines.filter((w) => w.status !== "consumed");

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setState("processing");
    setCameraResult(null);
    setShopResults(null);
    setBookResults(null);
    setIntent(null);
    setCameraError(null);
    setEditName("");
    setEditProducer("");
    setEditVintage("");
    setQuantity(1);

    try {
      // Resize image to prevent oversized payloads
      const { base64, dataUrl, mediaType } = await resizeImage(file);

      // Build context for shelf cross-referencing
      const cellarNames = wines
        .map((w) => `${w.vintage} ${w.producer} ${w.name}`)
        .join(", ");
      const wishNames = wishlist.map((w) => w.name).join(", ");

      // SINGLE API call — intent detection + analysis in one round trip
      const res = await fetch("/api/wine/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mediaType, cellarNames, wishNames }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Analysis failed (${res.status})`);
      }

      const { intent: detectedIntent, data } = await res.json();
      setIntent(detectedIntent);

      switch (detectedIntent) {
        case "identify_wine": {
          const result: CameraResult = {
            name: data.name,
            producer: data.producer,
            vintage: data.vintage,
            region: data.region,
            appellation: data.appellation,
            varietal: data.varietal,
            blend: data.blend,
            alcohol: data.alcohol,
            estimatedPrice: data.estimatedPrice,
            drinkingWindow: {
              start: data.drinkingWindowStart,
              end: data.drinkingWindowEnd,
            },
            fridgeSuggestion: data.fridgeSuggestion,
            fridgeReason: data.fridgeReason,
            suggestedTags: data.suggestedTags,
            photoDataUrl: dataUrl,
          };

          // Auto-suggest fridge
          const dailyF = fridges.find((f) => f.type === "daily");
          const cellarF = fridges.find((f) => f.type === "cellar");
          setSelectedFridge(
            result.fridgeSuggestion === "daily" && dailyF
              ? dailyF.id
              : cellarF?.id || fridges[0]?.id || null
          );
          setCameraResult(result);
          setEditName(result.name);
          setEditProducer(result.producer);
          setEditVintage(result.vintage ? String(result.vintage) : "");
          setQuantity(1);
          setState("result");
          break;
        }

        case "analyze_shelf": {
          setShopResults(data.wines || []);
          setState("result");
          break;
        }

        case "extract_book": {
          setBookResults(data.wines || []);
          setState("result");
          break;
        }

        default:
          throw new Error(`Unknown analysis type: ${detectedIntent}`);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError(
        err instanceof Error
          ? err.message
          : "Something went wrong analyzing the photo. Try again."
      );
      setState("idle");
    }

    e.target.value = "";
  };

  const handleAddToCellar = async () => {
    if (!cameraResult) return;

    // Convert data URL to File for upload
    let photoFile: File | undefined;
    if (cameraResult.photoDataUrl) {
      const res = await fetch(cameraResult.photoDataUrl);
      const blob = await res.blob();
      photoFile = new File([blob], "label.jpg", { type: "image/jpeg" });
    }

    const parsedVintage = editVintage ? parseInt(editVintage, 10) : null;
    const wineData = {
      name: editName || cameraResult.name,
      producer: editProducer || cameraResult.producer,
      vintage: parsedVintage !== null && !isNaN(parsedVintage) ? parsedVintage : cameraResult.vintage,
      region: cameraResult.region,
      appellation: cameraResult.appellation,
      varietal: cameraResult.varietal,
      blend: cameraResult.blend,
      alcohol: cameraResult.alcohol,
      estimated_price: cameraResult.estimatedPrice,
      drinking_window_start: cameraResult.drinkingWindow?.start,
      drinking_window_end: cameraResult.drinkingWindow?.end,
      fridge_suggestion: cameraResult.fridgeSuggestion,
      fridge_reason: cameraResult.fridgeReason,
      suggested_tags: cameraResult.suggestedTags,
      fridge_id: selectedFridge,
      price_paid: pricePaid ? parseFloat(pricePaid) : null,
      status: "sealed" as const,
    };

    // Add N bottles (each gets its own DB row for independent tracking)
    const count = Math.max(1, Math.min(quantity, 24));
    for (let i = 0; i < count; i++) {
      await addWine(wineData, photoFile);
    }

    setState("idle");
    setCameraResult(null);
    router.push("/cellar");
  };

  return (
    <div className="fade-in" style={{ padding: "24px 20px 112px" }}>
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
        Camera
      </h1>
      <div style={{ fontSize: "13px", color: "#8C7E72", marginBottom: "32px" }}>
        Point at anything wine-related
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhoto}
        className="hidden"
      />

      {cameraError && (
        <div
          style={{
            padding: "14px 16px",
            background: "rgba(155,51,51,0.1)",
            border: "1px solid rgba(155,51,51,0.25)",
            borderRadius: "14px",
            marginBottom: "16px",
            fontSize: "13px",
            color: "#9B3333",
          }}
        >
          {cameraError}
        </div>
      )}

      {state === "idle" && (
        <div className="text-center" style={{ padding: "40px 0" }}>
          <button
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer flex items-center justify-center"
            style={{
              width: "140px",
              height: "140px",
              borderRadius: "50%",
              border: "none",
              color: "#FFFFFF",
              fontSize: "48px",
              background: "linear-gradient(145deg, #722F37, #8E3A48)",
              boxShadow:
                "0 8px 40px rgba(114,47,55,0.35), 0 2px 12px rgba(114,47,55,0.2)",
              margin: "0 auto",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 12px 48px rgba(114,47,55,0.45), 0 4px 16px rgba(114,47,55,0.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 8px 40px rgba(114,47,55,0.35), 0 2px 12px rgba(114,47,55,0.2)";
            }}
          >
            ◉
          </button>
          <div
            className="leading-relaxed"
            style={{
              marginTop: "24px",
              color: "#8C7E72",
              fontSize: "13px",
              lineHeight: 1.8,
            }}
          >
            Wine label · Retail shelf · Book page
            <br />
            Receipt · Wine list · Your fridge
          </div>
        </div>
      )}

      {state === "processing" && (
        <div
          className="text-center animate-pulse-slow"
          style={{ padding: "64px 0" }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
          <div
            className="font-serif"
            style={{ fontSize: "20px", color: "#2D241B", fontWeight: 600 }}
          >
            Analyzing...
          </div>
          <div style={{ fontSize: "13px", color: "#8C7E72", marginTop: "8px" }}>
            Claude is figuring out what you&apos;re looking at
          </div>
        </div>
      )}

      {/* Label identification result */}
      {state === "result" && cameraResult && (
        <div>
          <div
            className="overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: "1px solid #DDD5CA",
              borderRadius: "16px",
              marginBottom: "20px",
              boxShadow: "0 2px 12px rgba(45,36,27,0.06)",
            }}
          >
            {cameraResult.photoDataUrl && (
              <div
                style={{
                  height: "200px",
                  background: `url(${cameraResult.photoDataUrl}) center/cover`,
                }}
              />
            )}
            <div style={{ padding: "20px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "#A0864E",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  marginBottom: "6px",
                  fontWeight: 600,
                }}
              >
                Identified
              </div>

              {/* Editable wine name */}
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="font-serif font-bold w-full"
                style={{
                  fontSize: "22px",
                  color: "#2D241B",
                  marginBottom: "4px",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid #DDD5CA",
                  outline: "none",
                  padding: "2px 0",
                  boxSizing: "border-box",
                }}
              />

              {/* Editable producer + static varietal/appellation */}
              <div className="flex items-center gap-2" style={{ marginBottom: "4px" }}>
                <input
                  type="text"
                  value={editProducer}
                  onChange={(e) => setEditProducer(e.target.value)}
                  className="flex-1"
                  style={{
                    fontSize: "14px",
                    color: "#6B5E52",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid #DDD5CA",
                    outline: "none",
                    padding: "2px 0",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ fontSize: "13px", color: "#8C7E72", marginBottom: "16px" }}>
                {cameraResult.varietal}
                {cameraResult.appellation || cameraResult.region
                  ? ` · ${cameraResult.appellation || cameraResult.region}`
                  : ""}
              </div>

              {/* Editable vintage + quantity row */}
              <div className="flex gap-3" style={{ marginBottom: "16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "6px" }}>
                    Vintage
                  </div>
                  <input
                    type="number"
                    value={editVintage}
                    onChange={(e) => setEditVintage(e.target.value)}
                    placeholder="NV"
                    style={{
                      width: "100%",
                      background: "#F0EBE3",
                      border: "1px solid #DDD5CA",
                      borderRadius: "14px",
                      padding: "10px 14px",
                      color: "#2D241B",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "6px" }}>
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

              {cameraResult.drinkingWindow && (cameraResult.drinkingWindow.start || cameraResult.drinkingWindow.end) && (
                <div style={{ fontSize: "13px", color: "#6B5E52", marginBottom: "12px" }}>
                  Drinking window: {cameraResult.drinkingWindow.start}–
                  {cameraResult.drinkingWindow.end}
                </div>
              )}
              {cameraResult.estimatedPrice && (
                <div style={{ fontSize: "13px", color: "#6B5E52", marginBottom: "12px" }}>
                  Market price: ~${cameraResult.estimatedPrice}
                </div>
              )}
              {cameraResult.fridgeReason && (
                <div style={{ fontSize: "13px", color: "#6B5E52", marginBottom: "16px" }}>
                  💡 {cameraResult.fridgeReason}
                </div>
              )}

              {/* Fridge picker */}
              {fridges.length > 0 ? (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "8px" }}>
                    Which fridge?
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {fridges.map((f) => {
                      const count = activeWines.filter(
                        (w) => w.fridge_id === f.id
                      ).length;
                      const full = f.capacity > 0 && count >= f.capacity;
                      return (
                        <button
                          key={f.id}
                          onClick={() => !full && setSelectedFridge(f.id)}
                          className="text-center cursor-pointer transition-all duration-150"
                          style={{
                            flex: "1 1 auto",
                            minWidth: "90px",
                            padding: "10px 8px",
                            borderRadius: "14px",
                            fontSize: "12px",
                            fontWeight: 500,
                            background:
                              selectedFridge === f.id
                                ? "rgba(114,47,55,0.15)"
                                : "transparent",
                            border: `1px solid ${
                              selectedFridge === f.id
                                ? "#722F37"
                                : full
                                  ? "rgba(155,51,51,0.25)"
                                  : "#DDD5CA"
                            }`,
                            color: full
                              ? "#9B3333"
                              : selectedFridge === f.id
                                ? "#722F37"
                                : "#8C7E72",
                            opacity: full ? 0.5 : 1,
                            cursor: full ? "not-allowed" : "pointer",
                          }}
                        >
                          {f.name}
                          {f.capacity > 0 && (
                            <div style={{ fontSize: "10px", marginTop: "2px", opacity: 0.7 }}>
                              {count}/{f.capacity}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: "16px" }}>
                  <button
                    onClick={() => router.push("/profile")}
                    className="w-full cursor-pointer"
                    style={{
                      padding: "14px",
                      background: "transparent",
                      border: "1px dashed #DDD5CA",
                      borderRadius: "14px",
                      color: "#A0864E",
                      fontSize: "13px",
                    }}
                  >
                    + Add a wine fridge first
                  </button>
                </div>
              )}

              {/* Price */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "8px" }}>
                  Price paid (optional)
                </div>
                <input
                  type="number"
                  value={pricePaid}
                  onChange={(e) => setPricePaid(e.target.value)}
                  placeholder="$"
                  style={{
                    width: "100%",
                    background: "#F0EBE3",
                    border: "1px solid #DDD5CA",
                    borderRadius: "14px",
                    padding: "10px 14px",
                    color: "#2D241B",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setState("idle");
                setCameraResult(null);
              }}
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
              onClick={handleAddToCellar}
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
              }}
            >
              Add to Cellar{quantity > 1 ? ` (${quantity})` : ""}
            </button>
          </div>
        </div>
      )}

      {/* Shop results */}
      {state === "result" && shopResults && (
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "#A0864E",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              marginBottom: "14px",
              fontWeight: 600,
            }}
          >
            Shop Mode — {shopResults.length} wines identified
          </div>
          {shopResults.map((r, i) => (
            <div
              key={i}
              style={{
                padding: "16px",
                background: "#FFFFFF",
                borderRadius: "16px",
                marginBottom: "8px",
                boxShadow: "0 2px 12px rgba(45,36,27,0.06)",
                border: `1px solid ${
                  r.recommendation === "buy"
                    ? "rgba(90,122,74,0.25)"
                    : r.recommendation === "wishlist-match"
                      ? "rgba(160,134,78,0.3)"
                      : "#DDD5CA"
                }`,
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div
                    className="font-serif font-semibold"
                    style={{ fontSize: "15px", color: "#2D241B" }}
                  >
                    {r.name}
                  </div>
                  {r.price && (
                    <div style={{ fontSize: "13px", color: "#8C7E72", marginTop: "2px" }}>
                      {r.price}
                    </div>
                  )}
                </div>
                <div
                  className="font-semibold uppercase"
                  style={{
                    fontSize: "11px",
                    padding: "4px 10px",
                    borderRadius: "12px",
                    background:
                      r.recommendation === "buy"
                        ? "rgba(90,122,74,0.12)"
                        : r.recommendation === "wishlist-match"
                          ? "rgba(160,134,78,0.15)"
                          : "rgba(140,126,114,0.12)",
                    color:
                      r.recommendation === "buy"
                        ? "#5A7A4A"
                        : r.recommendation === "wishlist-match"
                          ? "#A0864E"
                          : "#8C7E72",
                  }}
                >
                  {r.recommendation === "wishlist-match"
                    ? "On Wish List!"
                    : r.recommendation}
                </div>
              </div>
              <div style={{ fontSize: "13px", color: "#8C7E72", marginTop: "8px" }}>
                {r.reason}
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              setState("idle");
              setShopResults(null);
            }}
            className="w-full cursor-pointer"
            style={{
              padding: "14px",
              background: "transparent",
              border: "1px solid #DDD5CA",
              borderRadius: "14px",
              color: "#6B5E52",
              fontSize: "15px",
              marginTop: "12px",
            }}
          >
            Done
          </button>
        </div>
      )}

      {/* No results fallback */}
      {state === "result" && !cameraResult && !shopResults && !bookResults && (
        <div className="text-center" style={{ padding: "40px 0" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤷</div>
          <div
            className="font-serif"
            style={{ fontSize: "18px", color: "#2D241B", fontWeight: 600, marginBottom: "8px" }}
          >
            Couldn&apos;t identify anything
          </div>
          <div style={{ fontSize: "13px", color: "#8C7E72", marginBottom: "24px" }}>
            Try a clearer photo of a wine label
          </div>
          <button
            onClick={() => setState("idle")}
            className="cursor-pointer"
            style={{
              padding: "12px 32px",
              background: "#722F37",
              border: "none",
              borderRadius: "14px",
              color: "#FFFFFF",
              fontSize: "15px",
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Book results */}
      {state === "result" && bookResults && (
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "#A0864E",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              marginBottom: "14px",
              fontWeight: 600,
            }}
          >
            Book Scan — {bookResults.length} wines found
          </div>
          {bookResults.map((r, i) => (
            <div
              key={i}
              style={{
                padding: "16px",
                background: "#FFFFFF",
                border: "1px solid #DDD5CA",
                borderRadius: "16px",
                marginBottom: "8px",
                boxShadow: "0 2px 12px rgba(45,36,27,0.06)",
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div
                    className="font-serif font-semibold"
                    style={{ fontSize: "15px", color: "#2D241B" }}
                  >
                    {r.name}
                  </div>
                  {r.vintage && (
                    <div style={{ fontSize: "12px", color: "#8C7E72" }}>
                      {r.vintage}
                    </div>
                  )}
                </div>
                <button
                  onClick={() =>
                    addWishlistItem({
                      name: r.name,
                      context: r.context,
                      source: "book",
                      search_query: r.searchQuery,
                    })
                  }
                  className="cursor-pointer"
                  style={{
                    fontSize: "11px",
                    padding: "5px 12px",
                    borderRadius: "14px",
                    border: "1px solid #A0864E",
                    background: "transparent",
                    color: "#A0864E",
                    fontWeight: 500,
                  }}
                >
                  + Wish List
                </button>
              </div>
              <div
                className="leading-relaxed"
                style={{ fontSize: "13px", color: "#8C7E72", marginTop: "8px" }}
              >
                {r.context}
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              setState("idle");
              setBookResults(null);
            }}
            className="w-full cursor-pointer"
            style={{
              padding: "14px",
              background: "transparent",
              border: "1px solid #DDD5CA",
              borderRadius: "14px",
              color: "#6B5E52",
              fontSize: "15px",
              marginTop: "12px",
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
