import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic";
import { getAskPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
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
