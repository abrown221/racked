import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 10;

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

    const body = await req.json();
    const { action } = body;

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

    // ─── Skip All ─────────────────────────────────────────────
    if (action === "skip_all") {
      const { error: skipErr, count } = await supabase
        .from("scan_results")
        .update({ status: "skipped" })
        .eq("cellar_id", cellarId)
        .eq("status", "pending_review");

      if (skipErr) {
        return NextResponse.json(
          { error: "Failed to skip all" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, skipped: count || 0 });
    }

    // ─── Add or Skip Individual ───────────────────────────────
    const { resultId, overrides } = body;

    if (!resultId) {
      return NextResponse.json(
        { error: "Missing resultId" },
        { status: 400 }
      );
    }

    // Load the scan result
    const { data: scanResult, error: loadErr } = await supabase
      .from("scan_results")
      .select("*")
      .eq("id", resultId)
      .eq("cellar_id", cellarId)
      .single();

    if (loadErr || !scanResult) {
      return NextResponse.json(
        { error: "Scan result not found" },
        { status: 404 }
      );
    }

    if (action === "skip") {
      await supabase
        .from("scan_results")
        .update({ status: "skipped" })
        .eq("id", resultId);

      return NextResponse.json({ success: true });
    }

    if (action === "add") {
      const quantity = Math.max(1, Math.min(overrides?.quantity || 1, 24));
      const winesAdded: string[] = [];

      // Get the scan photo for the image
      const { data: scanPhoto } = await supabase
        .from("scan_photos")
        .select("photo_path, photo_url")
        .eq("id", scanResult.scan_photo_id)
        .single();

      for (let i = 0; i < quantity; i++) {
        // Copy photo to permanent wine-labels path if available
        let photoUrl: string | null = null;
        let photoPath: string | null = null;

        if (scanPhoto?.photo_path) {
          const newPath = `${cellarId}/${Date.now()}_${i}.jpg`;
          const { error: copyErr } = await supabase.storage
            .from("wine-labels")
            .copy(scanPhoto.photo_path, newPath);

          if (!copyErr) {
            photoPath = newPath;
            const {
              data: { publicUrl },
            } = supabase.storage.from("wine-labels").getPublicUrl(newPath);
            photoUrl = publicUrl;
          }
        }

        const { data: wine, error: insertErr } = await supabase
          .from("wines")
          .insert({
            cellar_id: cellarId,
            name: overrides?.name || scanResult.name,
            producer: overrides?.producer || scanResult.producer,
            vintage:
              overrides?.vintage !== undefined
                ? overrides.vintage
                : scanResult.vintage,
            region: scanResult.region,
            appellation: scanResult.appellation,
            varietal: scanResult.varietal,
            blend: scanResult.blend,
            alcohol: scanResult.alcohol,
            estimated_price: scanResult.estimated_price,
            drinking_window_start: scanResult.drinking_window_start,
            drinking_window_end: scanResult.drinking_window_end,
            fridge_suggestion: scanResult.fridge_suggestion,
            fridge_reason: scanResult.fridge_reason,
            suggested_tags: scanResult.suggested_tags,
            fridge_id: overrides?.fridge_id || null,
            price_paid: overrides?.price_paid || null,
            status: "sealed",
            photo_url: photoUrl,
            photo_path: photoPath,
          })
          .select("id")
          .single();

        if (insertErr) {
          console.error("[scan-action] Insert wine failed:", insertErr.message);
        } else if (wine) {
          winesAdded.push(wine.id);
        }
      }

      // Mark scan result as added
      await supabase
        .from("scan_results")
        .update({ status: "added" })
        .eq("id", resultId);

      return NextResponse.json({
        success: true,
        winesAdded: winesAdded.length,
        wineIds: winesAdded,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[scan-action] Error:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
