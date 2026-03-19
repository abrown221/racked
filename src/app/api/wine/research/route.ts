import { NextRequest, NextResponse } from "next/server";
import { callClaude, parseJSON } from "@/lib/anthropic";
import { getResearchPrompt } from "@/lib/prompts";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
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
