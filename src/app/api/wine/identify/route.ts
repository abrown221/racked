import { NextRequest, NextResponse } from "next/server";
import { callClaude, parseJSON } from "@/lib/anthropic";
import { IDENTIFY_WINE_PROMPT } from "@/lib/prompts";

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
          { type: "text", text: IDENTIFY_WINE_PROMPT },
        ],
      },
    ]);

    const result = parseJSON(text);
    if (!result) {
      return NextResponse.json(
        { error: "Failed to parse wine data" },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("identify error:", error);
    return NextResponse.json(
      { error: "Failed to identify wine" },
      { status: 500 }
    );
  }
}
