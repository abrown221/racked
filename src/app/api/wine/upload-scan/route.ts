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

    const { base64, mediaType } = await req.json();
    if (!base64 || !mediaType) {
      return NextResponse.json(
        { error: "Missing required fields: base64, mediaType" },
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
    const timestamp = Date.now();
    const path = `${cellarId}/scan/${timestamp}.jpg`;

    // Convert base64 to buffer and upload to Supabase storage
    const buffer = Buffer.from(base64, "base64");
    const { error: uploadErr } = await supabase.storage
      .from("wine-labels")
      .upload(path, buffer, { contentType: mediaType });

    if (uploadErr) {
      console.error("[upload-scan] Storage upload failed:", uploadErr.message);
      return NextResponse.json(
        { error: "Failed to upload photo" },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("wine-labels").getPublicUrl(path);

    // Create scan_photos record
    const { data: scanPhoto, error: insertErr } = await supabase
      .from("scan_photos")
      .insert({
        cellar_id: cellarId,
        photo_url: publicUrl,
        photo_path: path,
        status: "pending",
      })
      .select("id, photo_url")
      .single();

    if (insertErr) {
      console.error("[upload-scan] DB insert failed:", insertErr.message);
      return NextResponse.json(
        { error: "Failed to create scan record" },
        { status: 500 }
      );
    }

    console.log("[upload-scan] Queued", {
      scanPhotoId: scanPhoto.id,
      cellarId,
      userId: user.id,
    });

    return NextResponse.json({
      scanPhotoId: scanPhoto.id,
      photoUrl: scanPhoto.photo_url,
    });
  } catch (error) {
    console.error("[upload-scan] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload scan" },
      { status: 500 }
    );
  }
}
