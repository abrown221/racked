import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Wine } from "@/lib/supabase/types";

export const maxDuration = 10;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/château|chateau/gi, "chateau")
    .replace(/domaine/gi, "domaine")
    .replace(/['']/g, "'");
}

function findDuplicate(
  wineName: string,
  wineProducer: string | null,
  wineVintage: number | null,
  cellarWines: Wine[]
): string | null {
  for (const existing of cellarWines) {
    const nameMatch = normalize(wineName) === normalize(existing.name);
    const producerMatch =
      !wineProducer ||
      !existing.producer ||
      normalize(wineProducer) === normalize(existing.producer);
    const vintageMatch =
      !wineVintage || !existing.vintage || wineVintage === existing.vintage;

    if (nameMatch && producerMatch) return existing.id;
    if (producerMatch && vintageMatch && wineProducer && existing.producer) {
      const n1 = normalize(wineName);
      const n2 = normalize(existing.name);
      if (n1.includes(n2) || n2.includes(n1)) return existing.id;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { scanPhotoId, wines: wineData } = await req.json();

    if (!scanPhotoId || !Array.isArray(wineData)) {
      return NextResponse.json(
        { error: "Missing scanPhotoId or wines array" },
        { status: 400 }
      );
    }

    // Get user's cellar
    const { data: membership } = await supabase
      .from("cellar_members")
      .select("cellar_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "No cellar found" }, { status: 404 });
    }

    const cellarId = membership.cellar_id;

    // Load cellar wines for duplicate detection
    const { data: cellarWines } = await supabase
      .from("wines")
      .select("id, name, producer, vintage")
      .eq("cellar_id", cellarId);

    // Build scan_results records
    const scanResults = wineData.map(
      (wine: {
        confidence?: string;
        name: string;
        producer: string;
        vintage: number | null;
        region: string;
        appellation: string;
        varietal: string;
        blend: string;
        alcohol: string;
        estimatedPrice: number | null;
        drinkingWindowStart: number | null;
        drinkingWindowEnd: number | null;
        fridgeSuggestion: string;
        fridgeReason: string;
        suggestedTags: string[];
      }) => {
        const duplicateId = findDuplicate(
          wine.name,
          wine.producer || null,
          wine.vintage ?? null,
          (cellarWines as Wine[]) || []
        );

        return {
          cellar_id: cellarId,
          scan_photo_id: scanPhotoId,
          status: "pending_review" as const,
          confidence: wine.confidence || "medium",
          name: wine.name,
          producer: wine.producer || null,
          vintage: wine.vintage ?? null,
          region: wine.region || null,
          appellation: wine.appellation || null,
          varietal: wine.varietal || null,
          blend: wine.blend || null,
          alcohol: wine.alcohol || null,
          estimated_price: wine.estimatedPrice ?? null,
          drinking_window_start: wine.drinkingWindowStart ?? null,
          drinking_window_end: wine.drinkingWindowEnd ?? null,
          fridge_suggestion: wine.fridgeSuggestion || null,
          fridge_reason: wine.fridgeReason || null,
          suggested_tags: wine.suggestedTags || null,
          duplicate_of: duplicateId,
        };
      }
    );

    if (scanResults.length > 0) {
      const { error: insertErr } = await supabase
        .from("scan_results")
        .insert(scanResults);

      if (insertErr) {
        console.error("[write-scan-results] Insert failed:", insertErr.message);
        return NextResponse.json(
          { error: "Failed to save results" },
          { status: 500 }
        );
      }
    }

    // Mark the scan photo as complete
    await supabase
      .from("scan_photos")
      .update({ status: "complete", bottles_found: scanResults.length })
      .eq("id", scanPhotoId);

    console.log("[write-scan-results] Wrote", {
      scanPhotoId,
      resultsCount: scanResults.length,
    });

    return NextResponse.json({
      success: true,
      resultsWritten: scanResults.length,
    });
  } catch (error) {
    console.error("[write-scan-results] Error:", error);
    return NextResponse.json(
      { error: "Failed to write results" },
      { status: 500 }
    );
  }
}
