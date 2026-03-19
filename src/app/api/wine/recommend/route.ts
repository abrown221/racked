import { NextRequest, NextResponse } from "next/server";
import { callClaude, parseJSON } from "@/lib/anthropic";
import { getRecommendationsPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
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
