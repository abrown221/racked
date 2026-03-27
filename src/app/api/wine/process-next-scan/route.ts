import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaudeWithTools } from "@/lib/anthropic-tools";
import type { Wine } from "@/lib/supabase/types";

export const maxDuration = 60;

// Normalize wine name for duplicate comparison
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

    // Exact name + producer match
    if (nameMatch && producerMatch) return existing.id;

    // Fuzzy: producer matches + vintage matches + names overlap
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

    // Reset any stuck 'processing' photos (older than 5 minutes)
    await supabase
      .from("scan_photos")
      .update({ status: "pending" })
      .eq("cellar_id", cellarId)
      .eq("status", "processing")
      .lt("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

    // Atomically claim the oldest pending photo by updating in one step
    // This prevents race conditions where two requests grab the same photo
    const { data: claimedPhotos } = await supabase
      .from("scan_photos")
      .update({ status: "processing" })
      .eq("cellar_id", cellarId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .select("*");

    const pendingPhoto = claimedPhotos?.[0] || null;

    if (!pendingPhoto) {
      // Count remaining to report
      const { count } = await supabase
        .from("scan_photos")
        .select("*", { count: "exact", head: true })
        .eq("cellar_id", cellarId)
        .in("status", ["pending", "processing"]);

      return NextResponse.json({
        status: "idle",
        pendingCount: count || 0,
      });
    }

    console.log("[process-next-scan] Processing", {
      scanPhotoId: pendingPhoto.id,
      cellarId,
    });

    try {
      // Download image from storage and convert to base64
      const { data: fileData, error: downloadErr } = await supabase.storage
        .from("wine-labels")
        .download(pendingPhoto.photo_path);

      if (downloadErr || !fileData) {
        throw new Error(`Failed to download photo: ${downloadErr?.message}`);
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      // Load cellar wines for duplicate detection
      const { data: cellarWines } = await supabase
        .from("wines")
        .select("id, name, producer, vintage")
        .eq("cellar_id", cellarId);

      // Call Claude
      const result = await callClaudeWithTools({
        base64,
        mediaType: "image/jpeg",
      });

      // Process results based on tool called
      type WineData = {
        confidence?: string;
        name: string;
        producer: string;
        vintage: number | null;
        region: string;
        appellation: string | null;
        varietal: string;
        blend: string | null;
        alcohol: string | null;
        estimatedPrice: number | null;
        drinkingWindowStart: number | null;
        drinkingWindowEnd: number | null;
        fridgeSuggestion: string;
        fridgeReason: string;
        suggestedTags: string[];
        bottleImageUrl?: string;
      };

      let wines: WineData[] = [];
      let confidence = "medium";

      if (result.intent === "scan_collection") {
        wines = result.data.wines || [];
      } else if (result.intent === "identify_wine") {
        wines = [result.data as WineData];
        confidence = "high"; // Single label = high confidence
      } else {
        // analyze_shelf or extract_book — not expected in batch mode but handle gracefully
        wines = [];
      }

      // Create scan_results with duplicate detection
      const scanResults = wines.map((wine) => {
        const duplicateId = findDuplicate(
          wine.name,
          wine.producer || null,
          wine.vintage ?? null,
          (cellarWines as Wine[]) || []
        );

        return {
          cellar_id: cellarId,
          scan_photo_id: pendingPhoto.id,
          status: "pending_review" as const,
          confidence: wine.confidence || confidence,
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
          bottle_image_url: wine.bottleImageUrl || null,
        };
      });

      if (scanResults.length > 0) {
        const { error: resultsErr } = await supabase
          .from("scan_results")
          .insert(scanResults);

        if (resultsErr) {
          console.error(
            "[process-next-scan] Failed to insert results:",
            resultsErr.message
          );
          throw new Error("Failed to save scan results");
        }
      }

      // Mark photo as complete
      await supabase
        .from("scan_photos")
        .update({
          status: "complete",
          bottles_found: scanResults.length,
        })
        .eq("id", pendingPhoto.id);

      // Count remaining
      const { count: remaining } = await supabase
        .from("scan_photos")
        .select("*", { count: "exact", head: true })
        .eq("cellar_id", cellarId)
        .in("status", ["pending", "processing"]);

      console.log("[process-next-scan] Complete", {
        scanPhotoId: pendingPhoto.id,
        bottlesFound: scanResults.length,
        tool: result.intent,
        remaining: remaining || 0,
      });

      return NextResponse.json({
        status: "processed",
        bottlesFound: scanResults.length,
        tool: result.intent,
        pendingCount: remaining || 0,
      });
    } catch (processError) {
      // Mark photo as error
      const errMsg =
        processError instanceof Error
          ? processError.message
          : "Unknown processing error";

      await supabase
        .from("scan_photos")
        .update({ status: "error", error_message: errMsg })
        .eq("id", pendingPhoto.id);

      const { count: remaining } = await supabase
        .from("scan_photos")
        .select("*", { count: "exact", head: true })
        .eq("cellar_id", cellarId)
        .in("status", ["pending", "processing"]);

      console.error("[process-next-scan] Processing failed:", errMsg);

      return NextResponse.json({
        status: "error",
        error: errMsg,
        pendingCount: remaining || 0,
      });
    }
  } catch (error) {
    console.error("[process-next-scan] Error:", error);
    return NextResponse.json(
      { error: "Failed to process scan" },
      { status: 500 }
    );
  }
}
