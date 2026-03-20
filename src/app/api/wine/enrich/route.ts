import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

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

    const { wineId } = await req.json();
    if (!wineId) {
      return NextResponse.json(
        { error: "Missing wineId" },
        { status: 400 }
      );
    }

    // Load the wine
    const { data: wine, error: loadErr } = await supabase
      .from("wines")
      .select("*")
      .eq("id", wineId)
      .single();

    if (loadErr || !wine) {
      return NextResponse.json(
        { error: "Wine not found" },
        { status: 404 }
      );
    }

    // Check if there's already a dossier
    const { data: existingDossier } = await supabase
      .from("dossiers")
      .select("id")
      .eq("wine_id", wineId)
      .limit(1)
      .maybeSingle();

    const needsImage = !wine.photo_url;
    const needsDossier = !existingDossier;

    if (!needsImage && !needsDossier) {
      return NextResponse.json({
        status: "already_enriched",
        updatedImage: false,
        updatedDossier: false,
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const wineName = `${wine.vintage || "NV"} ${wine.producer || ""} ${wine.name}`.trim();

    const prompt = `Research the wine: ${wineName}

Region: ${wine.region || "unknown"}
Varietal: ${wine.varietal || "unknown"}
Appellation: ${wine.appellation || "unknown"}

Use web search to find accurate information about this wine. Return ONLY valid JSON with no markdown fences, no preamble, no explanation — just the JSON object:

{
  "bottleImageUrl": "Direct URL to a product photo of this specific wine bottle from a retailer like wine.com, vivino.com, wine-searcher.com, totalwine.com, or the producer's website. Must be a direct image URL ending in .jpg, .png, or .webp, or from an image CDN. Search for the exact wine name + vintage + 'bottle image'. Return empty string if no good image found.",
  "estate": "2-3 paragraph history of the estate/vineyard — founding, terroir, what makes the site special",
  "winemaker": "2-3 paragraph bio of the current winemaker — training, philosophy, career path",
  "vinification": "Detailed winemaking notes — fermentation, oak, aging, blend rationale",
  "special": "1-2 paragraph editorial take on why this wine matters, what makes it distinctive",
  "scores": [{"source": "critic name", "score": 92}],
  "sentiment": "2-3 sentence synthesis of community reception from Vivino, CellarTracker, etc",
  "drinkingWindowStart": 2024,
  "drinkingWindowEnd": 2035
}

For the bottle image: prioritize clear product shots on white or neutral backgrounds. Vivino and wine-searcher tend to have the best bottle images. If you can't find the exact vintage, a recent vintage of the same wine is acceptable.

For drinking windows: if you find professional recommendations, use those. Otherwise estimate based on the wine's style, vintage, and region.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        tools: [
          { type: "web_search_20250305", name: "web_search", max_uses: 5 },
        ],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("[enrich] Claude API error:", response.status, errBody);
      throw new Error(`AI service error (${response.status})`);
    }

    const data = await response.json();

    // Extract text content from response
    const textBlocks = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n");

    // Parse JSON from response
    let parsed: {
      bottleImageUrl?: string;
      estate?: string;
      winemaker?: string;
      vinification?: string;
      special?: string;
      scores?: { source: string; score: number }[];
      sentiment?: string;
      drinkingWindowStart?: number;
      drinkingWindowEnd?: number;
    } | null = null;

    try {
      // Try to extract JSON from the text
      const cleaned = textBlocks
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      // Find the first { and last }
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        parsed = JSON.parse(cleaned.slice(start, end + 1));
      }
    } catch (e) {
      console.error("[enrich] JSON parse failed:", e);
    }

    if (!parsed) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 422 }
      );
    }

    let updatedImage = false;
    let updatedDossier = false;

    // Update wine with image and drinking windows
    const wineUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (needsImage && parsed.bottleImageUrl) {
      wineUpdates.photo_url = parsed.bottleImageUrl;
      updatedImage = true;
    }

    if (parsed.drinkingWindowStart && !wine.drinking_window_start) {
      wineUpdates.drinking_window_start = parsed.drinkingWindowStart;
    }
    if (parsed.drinkingWindowEnd && !wine.drinking_window_end) {
      wineUpdates.drinking_window_end = parsed.drinkingWindowEnd;
    }

    await supabase
      .from("wines")
      .update(wineUpdates)
      .eq("id", wineId);

    // Propagate image to sibling bottles (same name/producer/vintage, no photo)
    if (updatedImage && parsed.bottleImageUrl && wine.name) {
      const { data: membership } = await supabase
        .from("cellar_members")
        .select("cellar_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (membership) {
        // Update all matching wines that lack photos
        let siblingQuery = supabase
          .from("wines")
          .update({ photo_url: parsed.bottleImageUrl, updated_at: new Date().toISOString() })
          .eq("cellar_id", membership.cellar_id)
          .ilike("name", wine.name)
          .is("photo_url", null)
          .neq("id", wineId);

        if (wine.producer) {
          siblingQuery = siblingQuery.ilike("producer", wine.producer);
        }
        if (wine.vintage) {
          siblingQuery = siblingQuery.eq("vintage", wine.vintage);
        }

        const { count } = await siblingQuery;
        if (count && count > 0) {
          console.log("[enrich] Propagated image to", count, "sibling bottles");
        }
      }
    }

    // Save dossier
    if (needsDossier && parsed.estate) {
      const dossierData = {
        estate: parsed.estate || null,
        winemaker: parsed.winemaker || null,
        vinification: parsed.vinification || null,
        special: parsed.special || null,
        scores: parsed.scores || null,
        sentiment: parsed.sentiment || null,
      };

      await supabase
        .from("dossiers")
        .upsert({
          wine_id: wineId,
          ...dossierData,
          created_at: new Date().toISOString(),
        });

      updatedDossier = true;
    }

    console.log("[enrich] Complete", {
      wineId,
      wineName,
      updatedImage,
      updatedDossier,
      hasImage: !!parsed.bottleImageUrl,
    });

    return NextResponse.json({
      status: "enriched",
      updatedImage,
      updatedDossier,
      bottleImageUrl: parsed.bottleImageUrl || null,
    });
  } catch (error) {
    console.error("[enrich] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to enrich wine";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
