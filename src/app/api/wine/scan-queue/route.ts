import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 10;

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Suppress unused variable warning — req is required by Next.js route signature
    void req;

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

    // Get pending review results, sorted by confidence DESC then created_at ASC
    const { data: results, error: resultsErr } = await supabase
      .from("scan_results")
      .select("*")
      .eq("cellar_id", cellarId)
      .eq("status", "pending_review")
      .order("created_at", { ascending: true });

    if (resultsErr) {
      console.error("[scan-queue] Query error:", resultsErr.message);
      return NextResponse.json(
        { error: "Failed to load scan queue" },
        { status: 500 }
      );
    }

    // Sort: high confidence first, then medium, then low
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    const sorted = (results || []).sort(
      (a, b) =>
        (confidenceOrder[a.confidence as keyof typeof confidenceOrder] ?? 1) -
        (confidenceOrder[b.confidence as keyof typeof confidenceOrder] ?? 1)
    );

    // Count pending and processing photos
    const { count: pendingPhotos } = await supabase
      .from("scan_photos")
      .select("*", { count: "exact", head: true })
      .eq("cellar_id", cellarId)
      .eq("status", "pending");

    const { count: processingPhotos } = await supabase
      .from("scan_photos")
      .select("*", { count: "exact", head: true })
      .eq("cellar_id", cellarId)
      .eq("status", "processing");

    return NextResponse.json({
      results: sorted,
      pendingPhotos: pendingPhotos || 0,
      processingPhotos: processingPhotos || 0,
    });
  } catch (error) {
    console.error("[scan-queue] Error:", error);
    return NextResponse.json(
      { error: "Failed to load scan queue" },
      { status: 500 }
    );
  }
}
