import { NextRequest, NextResponse } from "next/server";
import { callClaude, parseJSON } from "@/lib/anthropic";
import { getBookExtractPrompt } from "@/lib/prompts";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { base64, mediaType } = await req.json();

    const text = await callClaude(
      [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: getBookExtractPrompt() },
          ],
        },
      ],
      true
    );

    const result = parseJSON(text);
    return NextResponse.json(result || []);
  } catch (error) {
    console.error("extract-book error:", error);
    return NextResponse.json(
      { error: "Failed to extract from book" },
      { status: 500 }
    );
  }
}
