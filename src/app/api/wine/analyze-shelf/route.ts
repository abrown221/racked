import { NextRequest, NextResponse } from "next/server";
import { callClaude, parseJSON } from "@/lib/anthropic";
import { getShelfAnalysisPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const { base64, mediaType, cellarNames, wishNames } = await req.json();

    const text = await callClaude(
      [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: getShelfAnalysisPrompt(cellarNames, wishNames),
            },
          ],
        },
      ],
      true
    );

    const result = parseJSON(text);
    return NextResponse.json(result || []);
  } catch (error) {
    console.error("analyze-shelf error:", error);
    return NextResponse.json(
      { error: "Failed to analyze shelf" },
      { status: 500 }
    );
  }
}
