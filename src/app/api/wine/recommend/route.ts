import { NextRequest, NextResponse } from "next/server";
import { callClaude, parseJSON } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { getRecommendationsPrompt } from "@/lib/prompts";

export const maxDuration = 30;

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

    const { cellarSummary } = await req.json();

    const text = await callClaude([
      { role: "user", content: getRecommendationsPrompt(cellarSummary) },
    ]);

    const result = parseJSON<{ wine: string; reason: string }[]>(text);
    return NextResponse.json(result || []);
  } catch (error) {
    console.error("recommend error:", error);
    return NextResponse.json(
      { error: "Failed to get recommendations" },
      { status: 500 }
    );
  }
}
