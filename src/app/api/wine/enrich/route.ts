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

    const prompt = `You must research the wine: ${wineName}
Region: ${wine.region || "unknown"} | Varietal: ${wine.varietal || "unknown"} | Appellation: ${wine.appellation || "unknown"}

IMPORTANT: You MUST perform web searches. Do at least 2 searches:
1. Search for "${wineName} wine" to find estate info, scores, and reviews
2. Search for "${wine.producer || ""} ${wine.name} bottle" on vivino.com or wine-searcher.com to find a bottle image URL

For the bottle image, look for URLs like:
- https://images.vivino.com/thumbs/...
- https://www.wine-searcher.com/images/...
- Any direct .jpg or .png URL showing the bottle

Return ONLY a JSON object. No markdown fences, no preamble, no commentary — ONLY the JSON:

{
  "bottleImageUrl": "direct URL to bottle image from vivino, wine-searcher, or producer site. Empty string only if truly not found after searching.",
  "estate": "2-3 paragraph history of the estate/vineyard",
  "winemaker": "2-3 paragraph bio of the current winemaker",
  "vinification": "detailed winemaking notes",
  "special": "1-2 paragraph editorial take on why this wine matters",
  "scores": [{"source": "critic name", "score": 92}],
  "sentiment": "2-3 sentence synthesis of community reception",
  "drinkingWindowStart": 2024,
  "drinkingWindowEnd": 2035
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        tools: [
          { type: "web_search_20250305", name: "web_search", max_uses: 8 },
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
      console.error("[enrich] JSON parse failed. Raw text:", textBlocks.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 422 }
      );
    }

    console.log("[enrich] Parsed", {
      wineId,
      wineName,
      hasImage: !!parsed.bottleImageUrl,
      hasEstate: !!parsed.estate,
      imageUrl: parsed.bottleImageUrl?.slice(0, 80),
    });

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

    const { error: wineUpdateErr } = await supabase
      .from("wines")
      .update(wineUpdates)
      .eq("id", wineId);

    if (wineUpdateErr) {
      console.error("[enrich] Wine update failed:", wineUpdateErr.message);
    }

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

      const { error: dossierErr } = await supabase
        .from("dossiers")
        .upsert(
          {
            wine_id: wineId,
            ...dossierData,
          },
          { onConflict: "wine_id" }
        );

      if (dossierErr) {
        console.error("[enrich] Dossier save failed:", dossierErr.message);
      } else {
        updatedDossier = true;
      }
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
