import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaudeWithTools } from "@/lib/anthropic-tools";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { base64, mediaType, cellarNames, wishNames, forceIntent } = body;

    if (!base64 || !mediaType) {
      return NextResponse.json(
        { error: "Missing required fields: base64, mediaType" },
        { status: 400 }
      );
    }

    console.log("[analyze-photo] Starting", {
      userId: user.id,
      mediaType,
      hasCellarContext: !!cellarNames,
      hasWishlistContext: !!wishNames,
      forceIntent: forceIntent || "auto",
    });

    // Single Claude API call with strict tools — intent detection + analysis in one round trip
    const result = await callClaudeWithTools({
      base64,
      mediaType,
      cellarNames: cellarNames || undefined,
      wishNames: wishNames || undefined,
      forceIntent: forceIntent || undefined,
    });

    return NextResponse.json({
      intent: result.intent,
      data: result.data,
    });
  } catch (error) {
    console.error("[analyze-photo] Error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to analyze photo";

    // Map specific error messages to appropriate HTTP status codes
    const status = message.includes("AI service error")
      ? 502
      : message.includes("not configured")
        ? 500
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
