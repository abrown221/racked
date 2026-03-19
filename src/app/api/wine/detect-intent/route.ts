import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic";
import { DETECT_INTENT_PROMPT } from "@/lib/prompts";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { base64, mediaType } = await req.json();

    const text = await callClaude([
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          { type: "text", text: DETECT_INTENT_PROMPT },
        ],
      },
    ]);

    const intent = text.trim().toLowerCase().replace(/[^a-z]/g, "");
    return NextResponse.json({ intent });
  } catch (error) {
    console.error("detect-intent error:", error);
    return NextResponse.json(
      { error: "Failed to detect intent" },
      { status: 500 }
    );
  }
}
