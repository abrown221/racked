import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { getAskPrompt } from "@/lib/prompts";

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

    const { cellarSummary, question } = await req.json();

    const text = await callClaude([
      { role: "user", content: getAskPrompt(cellarSummary, question) },
    ]);

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("ask error:", error);
    return NextResponse.json(
      { error: "Failed to answer question" },
      { status: 500 }
    );
  }
}
