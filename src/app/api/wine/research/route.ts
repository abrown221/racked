import { NextRequest, NextResponse } from "next/server";
import { callClaude, parseJSON } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { getResearchPrompt } from "@/lib/prompts";

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

    const { name, producer, vintage } = await req.json();

    const text = await callClaude(
      [{ role: "user", content: getResearchPrompt(name, producer, vintage) }],
      true
    );

    console.log("[research] Raw text length:", text.length, "preview:", text.substring(0, 200));

    const result = parseJSON<Record<string, unknown>>(text);
    if (!result) {
      console.error("[research] JSON parse failed. Full text:", text.substring(0, 500));
      return NextResponse.json(
        { error: "Failed to parse research" },
        { status: 422 }
      );
    }

    console.log("[research] Parsed keys:", Object.keys(result));

    // Only return fields that match the dossiers table schema.
    // Claude with web search often returns extra fields that would cause
    // the Supabase upsert to fail with "column does not exist".
    const sanitized = {
      estate: result.estate || null,
      winemaker: result.winemaker || null,
      vinification: result.vinification || null,
      special: result.special || null,
      scores: Array.isArray(result.scores) ? result.scores : null,
      sentiment: result.sentiment || null,
    };

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("research error:", error);
    return NextResponse.json(
      { error: "Failed to research wine" },
      { status: 500 }
    );
  }
}
