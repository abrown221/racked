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

  const activeWines = wines.filter((w) => w.status !== "consumed");

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setState("processing");
    setCameraResult(null);
    setShopResults(null);
    setBookResults(null);
    setIntent(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      const mediaType = file.type || "image/jpeg";

      try {
        // Detect intent
        const intentRes = await fetch("/api/wine/detect-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, mediaType }),
        });
        const { intent: detectedIntent } = await intentRes.json();
        setIntent(detectedIntent);

        if (
          detectedIntent === "label" ||
          detectedIntent === "bottles" ||
          detectedIntent === "fridge" ||
          detectedIntent === "other"
        ) {
          const identRes = await fetch("/api/wine/identify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64, mediaType }),
          });
          const result = await identRes.json();
          if (result && !result.error) {
            result.photoDataUrl = dataUrl;
            // Auto-suggest fridge
            const dailyF = fridges.find((f) => f.type === "daily");
            const cellarF = fridges.find((f) => f.type === "cellar");
            setSelectedFridge(
              result.fridgeSuggestion === "daily" && dailyF
                ? dailyF.id
                : cellarF?.id || fridges[0]?.id || null
            );
            setCameraResult(result);
          }
          setState("result");
        } else if (detectedIntent === "shelf") {
          const cellarNames = wines
            .map((w) => `${w.vintage} ${w.producer} ${w.name}`)
            .join(", ");
          const wishNames = wishlist.map((w) => w.name).join(", ");
          const shelfRes = await fetch("/api/wine/analyze-shelf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64,
              mediaType,
              cellarNames,
              wishNames,
            }),
          });
          const results = await shelfRes.json();
          setShopResults(Array.isArray(results) ? results : []);
          setState("result");
        } else if (detectedIntent === "book" || detectedIntent === "winelist") {
          const bookRes = await fetch("/api/wine/extract-book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64, mediaType }),
          });
          const results = await bookRes.json();
          setBookResults(Array.isArray(results) ? results : []);
          setState("result");
        } else {
          // Fallback to label
          const identRes = await fetch("/api/wine/identify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64, mediaType }),
          });
          const result = await identRes.json();
          if (result && !result.error) {
            result.photoDataUrl = dataUrl;
            setCameraResult(result);
          }
          setState("result");
        }
      } catch (err) {
        console.error(err);
        setState("idle");
      }
    };
    reader.readAsDataURL(file);
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

    await addWine(
      {
        name: cameraResult.name,
        producer: cameraResult.producer,
        vintage: cameraResult.vintage,
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
        status: "sealed",
      },
      photoFile
    );

    setState("idle");
    setCameraResult(null);
    router.push("/cellar");
  };

  return (
    <div className="fade-in px-5 pt-5 pb-24">
      <h1 className="font-serif text-[30px] font-bold mb-1">Camera</h1>
      <div className="text-[13px] text-[var(--color-text-muted)] mb-7">
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

      {state === "idle" && (
        <div className="text-center py-10">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-[140px] h-[140px] rounded-full border-none text-white text-5xl cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, var(--color-accent), var(--color-accent-light))",
              boxShadow: "0 8px 40px rgba(114,47,55,0.4)",
            }}
          >
            ◉
          </button>
          <div className="mt-6 text-[var(--color-text-muted)] text-[13px] leading-[1.8]">
            Wine label · Retail shelf · Book page
            <br />
            Receipt · Wine list · Your fridge
          </div>
        </div>
      )}

      {state === "processing" && (
        <div className="text-center py-16 text-[var(--color-text-muted)] animate-pulse-slow">
          <div className="text-5xl mb-4">🔍</div>
          <div className="font-serif text-lg text-[var(--color-text-primary)]">
            Analyzing...
          </div>
          <div className="text-[13px] mt-2">
            Claude is figuring out what you&apos;re looking at
          </div>
        </div>
      )}

      {/* Label identification result */}
      {state === "result" && cameraResult && (
        <div>
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-5">
            {cameraResult.photoDataUrl && (
              <div
                className="h-[200px]"
                style={{
                  background: `url(${cameraResult.photoDataUrl}) center/cover`,
                }}
              />
            )}
            <div className="p-5">
              <div className="text-[11px] text-[var(--color-gold)] uppercase tracking-wider mb-1.5">
                Identified
              </div>
              <h2 className="font-serif text-[22px] font-bold mb-1">
                {cameraResult.vintage} {cameraResult.name}
              </h2>
              <div className="text-sm text-[var(--color-text-muted)] mb-4">
                {cameraResult.producer} · {cameraResult.varietal}
                <br />
                {cameraResult.appellation || cameraResult.region}
              </div>

              {cameraResult.drinkingWindow && (
                <div className="text-[13px] text-[var(--color-text-muted)] mb-3">
                  Drinking window: {cameraResult.drinkingWindow.start}–
                  {cameraResult.drinkingWindow.end}
                </div>
              )}
              {cameraResult.estimatedPrice && (
                <div className="text-[13px] text-[var(--color-text-muted)] mb-3">
                  Market price: ~${cameraResult.estimatedPrice}
                </div>
              )}
              {cameraResult.fridgeReason && (
                <div className="text-[13px] text-[var(--color-text-muted)] mb-4">
                  💡 {cameraResult.fridgeReason}
                </div>
              )}

              {/* Fridge picker */}
              {fridges.length > 0 ? (
                <div className="mb-4">
                  <div className="text-xs text-[var(--color-text-muted)] mb-2">
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
                          className="flex-[1_1_auto] min-w-[90px] py-2.5 px-2 rounded-xl text-xs cursor-pointer border"
                          style={{
                            background:
                              selectedFridge === f.id
                                ? "rgba(114,47,55,0.22)"
                                : "transparent",
                            borderColor:
                              selectedFridge === f.id
                                ? "var(--color-accent)"
                                : full
                                  ? "rgba(155,51,51,0.25)"
                                  : "var(--color-border)",
                            color: full
                              ? "var(--color-status-red)"
                              : selectedFridge === f.id
                                ? "var(--color-accent-light)"
                                : "var(--color-text-muted)",
                            opacity: full ? 0.5 : 1,
                            cursor: full ? "not-allowed" : "pointer",
                          }}
                        >
                          {f.name}
                          {f.capacity > 0 && (
                            <div className="text-[10px] mt-0.5 opacity-70">
                              {count}/{f.capacity}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <button
                    onClick={() => router.push("/profile")}
                    className="w-full py-3.5 bg-transparent border border-dashed border-[var(--color-border)] rounded-xl text-[var(--color-gold)] text-[13px] cursor-pointer"
                  >
                    + Add a wine fridge first
                  </button>
                </div>
              )}

              {/* Price */}
              <div className="mb-4">
                <div className="text-xs text-[var(--color-text-muted)] mb-2">
                  Price paid (optional)
                </div>
                <input
                  type="number"
                  value={pricePaid}
                  onChange={(e) => setPricePaid(e.target.value)}
                  placeholder="$"
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-[var(--color-text-primary)] text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={() => {
                setState("idle");
                setCameraResult(null);
              }}
              className="flex-1 py-3.5 bg-transparent border border-[var(--color-border)] rounded-xl text-[var(--color-text-muted)] text-[15px] cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAddToCellar}
              className="flex-[2] py-3.5 bg-[var(--color-accent)] border-none rounded-xl text-white text-[15px] font-semibold cursor-pointer"
            >
              Add to Cellar
            </button>
          </div>
        </div>
      )}

      {/* Shop results */}
      {state === "result" && shopResults && (
        <div>
          <div className="text-[11px] text-[var(--color-gold)] uppercase tracking-wider mb-3">
            Shop Mode — {shopResults.length} wines identified
          </div>
          {shopResults.map((r, i) => (
            <div
              key={i}
              className="p-4 bg-[var(--color-card)] border rounded-xl mb-2"
              style={{
                borderColor:
                  r.recommendation === "buy"
                    ? "rgba(90,122,74,0.19)"
                    : r.recommendation === "wishlist-match"
                      ? "rgba(160,134,78,0.25)"
                      : "var(--color-border)",
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-serif text-[15px] font-semibold">
                    {r.name}
                  </div>
                  {r.price && (
                    <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
                      {r.price}
                    </div>
                  )}
                </div>
                <div
                  className="text-[11px] px-2.5 py-1 rounded-xl font-semibold uppercase"
                  style={{
                    background:
                      r.recommendation === "buy"
                        ? "rgba(90,122,74,0.12)"
                        : r.recommendation === "wishlist-match"
                          ? "rgba(160,134,78,0.15)"
                          : "rgba(140,126,114,0.12)",
                    color:
                      r.recommendation === "buy"
                        ? "var(--color-status-green)"
                        : r.recommendation === "wishlist-match"
                          ? "var(--color-gold)"
                          : "var(--color-text-muted)",
                  }}
                >
                  {r.recommendation === "wishlist-match"
                    ? "On Wish List!"
                    : r.recommendation}
                </div>
              </div>
              <div className="text-[13px] text-[var(--color-text-muted)] mt-2">
                {r.reason}
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              setState("idle");
              setShopResults(null);
            }}
            className="w-full py-3.5 bg-transparent border border-[var(--color-border)] rounded-xl text-[var(--color-text-muted)] text-[15px] cursor-pointer mt-3"
          >
            Done
          </button>
        </div>
      )}

      {/* Book results */}
      {state === "result" && bookResults && (
        <div>
          <div className="text-[11px] text-[var(--color-gold)] uppercase tracking-wider mb-3">
            Book Scan — {bookResults.length} wines found
          </div>
          {bookResults.map((r, i) => (
            <div
              key={i}
              className="p-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl mb-2"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-serif text-[15px] font-semibold">
                    {r.name}
                  </div>
                  {r.vintage && (
                    <div className="text-xs text-[var(--color-text-muted)]">
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
                  className="text-[11px] px-2.5 py-1 rounded-xl border border-[var(--color-gold)] bg-transparent text-[var(--color-gold)] cursor-pointer"
                >
                  + Wish List
                </button>
              </div>
              <div className="text-[13px] text-[var(--color-text-muted)] mt-2 leading-relaxed">
                {r.context}
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              setState("idle");
              setBookResults(null);
            }}
            className="w-full py-3.5 bg-transparent border border-[var(--color-border)] rounded-xl text-[var(--color-text-muted)] text-[15px] cursor-pointer mt-3"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
