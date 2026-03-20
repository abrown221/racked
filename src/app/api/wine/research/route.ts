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

    const result = parseJSON(text);
    if (!result) {
      return NextResponse.json(
        { error: "Failed to parse research" },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("research error:", error);
    return NextResponse.json(
      { error: "Failed to research wine" },
      { status: 500 }
    );
  }
}
