// Tool schemas and tool-based Anthropic API calls for the camera module.
// Uses strict: true for guaranteed JSON schema compliance via constrained decoding.
// No parseJSON() needed — tool_use.input is already a validated JS object.

// ─── Tool Definitions ───────────────────────────────────────────────

export const identifyWineTool = {
  name: "identify_wine",
  description:
    "Identify a wine from a photo of a bottle label, multiple bottles, an open fridge with bottles, or any image where wine bottles are the primary subject. Extract all available metadata from the visible label. If multiple bottles are visible, identify the most prominent one.",
  strict: true,
  input_schema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description: "Full wine name including cuvée",
      },
      producer: {
        type: "string",
        description: "Producer/winery/domaine name",
      },
      vintage: {
        type: ["integer", "null"] as const,
        description: "Vintage year, null if NV or not visible",
      },
      region: {
        type: "string",
        description: "Wine region (e.g. Piedmont, Napa Valley)",
      },
      appellation: {
        type: ["string", "null"] as const,
        description: "Specific appellation (e.g. Barolo, Rutherford)",
      },
      varietal: {
        type: "string",
        description: "Primary grape variety or blend name",
      },
      blend: {
        type: ["string", "null"] as const,
        description: "Full blend breakdown if known",
      },
      alcohol: {
        type: ["string", "null"] as const,
        description: "ABV if visible on label",
      },
      estimatedPrice: {
        type: ["number", "null"] as const,
        description: "Estimated retail price in USD",
      },
      drinkingWindowStart: {
        type: ["integer", "null"] as const,
        description: "Start year of optimal drinking window",
      },
      drinkingWindowEnd: {
        type: ["integer", "null"] as const,
        description: "End year of optimal drinking window",
      },
      fridgeSuggestion: {
        type: "string",
        enum: ["daily", "cellar"],
        description:
          "'daily' for drink-soon wines, 'cellar' for age-worthy wines",
      },
      fridgeReason: {
        type: "string",
        description: "One sentence explaining the fridge suggestion",
      },
      suggestedTags: {
        type: "array",
        items: { type: "string" },
        description: "5 flavor/character tags for this wine",
      },
    },
    required: [
      "name",
      "producer",
      "vintage",
      "region",
      "appellation",
      "varietal",
      "blend",
      "alcohol",
      "estimatedPrice",
      "drinkingWindowStart",
      "drinkingWindowEnd",
      "fridgeSuggestion",
      "fridgeReason",
      "suggestedTags",
    ],
    additionalProperties: false,
  },
};

export const analyzeShelfTool = {
  name: "analyze_shelf",
  description:
    "Analyze a photo of a retail wine shelf, store display, or shop section. Identify all visible wines and provide buy/skip recommendations. Use web search to verify current pricing and ratings when helpful. Cross-reference against the user's cellar and wish list provided in the system prompt.",
  strict: true,
  input_schema: {
    type: "object" as const,
    properties: {
      wines: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Wine name as visible on shelf",
            },
            vintage: {
              type: ["integer", "null"] as const,
              description: "Vintage if visible",
            },
            price: {
              type: ["string", "null"] as const,
              description: "Price as displayed on shelf tag",
            },
            recommendation: {
              type: "string",
              enum: ["buy", "skip", "wishlist-match"],
              description:
                "buy = recommended, skip = not worth it or duplicate, wishlist-match = on user's wish list",
            },
            reason: {
              type: "string",
              description: "One sentence explaining recommendation",
            },
          },
          required: ["name", "vintage", "price", "recommendation", "reason"],
          additionalProperties: false,
        },
        description: "Array of identified wines with recommendations",
      },
    },
    required: ["wines"],
    additionalProperties: false,
  },
};

export const extractBookTool = {
  name: "extract_book",
  description:
    "Extract wine and producer mentions from a photo of a wine book page, magazine article, wine list, or menu. For each wine mentioned, summarize what the source says about it and provide a search query for finding it online.",
  strict: true,
  input_schema: {
    type: "object" as const,
    properties: {
      wines: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Wine or producer name",
            },
            vintage: {
              type: ["string", "null"] as const,
              description: "Vintage if mentioned",
            },
            context: {
              type: "string",
              description: "What the source says about this wine",
            },
            searchQuery: {
              type: "string",
              description:
                "Best search query to find this wine for purchase",
            },
          },
          required: ["name", "vintage", "context", "searchQuery"],
          additionalProperties: false,
        },
        description: "Array of wines/producers extracted from the page",
      },
    },
    required: ["wines"],
    additionalProperties: false,
  },
};

// ─── Types ──────────────────────────────────────────────────────────

export type AnalyzePhotoResult = {
  intent: "identify_wine" | "analyze_shelf" | "extract_book";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    web_search_requests: number;
  };
};

// ─── API Call ───────────────────────────────────────────────────────

export async function callClaudeWithTools({
  base64,
  mediaType,
  cellarNames,
  wishNames,
}: {
  base64: string;
  mediaType: string;
  cellarNames?: string;
  wishNames?: string;
}): Promise<AnalyzePhotoResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const startTime = Date.now();

  // System prompt with cellar/wishlist context for shelf cross-referencing
  const systemParts: string[] = [
    "You are a world-class sommelier and wine expert with perfect vision.",
    "You are analyzing a photo taken by a wine enthusiast.",
    "",
    "Based on what you see in the image, use the appropriate tool:",
    "- identify_wine: for photos of wine bottle labels, bottles on a counter, bottles in a fridge, or any image where wine bottles are the primary subject",
    "- analyze_shelf: for photos of retail store shelves, wine shop displays, or store aisles with price tags visible",
    "- extract_book: for photos of book pages, magazine articles, wine lists, restaurant menus, or any printed text about wine",
    "",
    "You MUST call exactly one tool. Choose the best match for what you see.",
  ];

  if (cellarNames) {
    systemParts.push("", `The user's current cellar contains: ${cellarNames}`);
    systemParts.push(
      "For shelf analysis, flag wines already in the cellar as 'skip' (duplicate)."
    );
  }
  if (wishNames) {
    systemParts.push("", `The user's wish list includes: ${wishNames}`);
    systemParts.push(
      "For shelf analysis, flag wish list matches as 'wishlist-match'."
    );
  }

  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemParts.join("\n"),
    tools: [
      { type: "web_search_20250305", name: "web_search" },
      identifyWineTool,
      analyzeShelfTool,
      extractBookTool,
    ],
    tool_choice: { type: "any" as const, disable_parallel_tool_use: true },
    messages: [
      {
        role: "user" as const,
        content: [
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text" as const,
            text: "Analyze this photo and use the appropriate tool.",
          },
        ],
      },
    ],
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[analyze-photo] Anthropic API error ${res.status}:`, errText);
    throw new Error(`AI service error (${res.status})`);
  }

  const data = await res.json();

  if (!data.content || !Array.isArray(data.content)) {
    throw new Error("Unexpected response format from AI service");
  }

  // Find the tool_use block — guaranteed to exist with tool_choice: "any"
  const toolUseBlock = data.content.find(
    (block: { type: string }) => block.type === "tool_use"
  );

  if (!toolUseBlock) {
    // Should never happen with tool_choice: any, but defensive
    console.error("[analyze-photo] No tool_use block found", {
      stopReason: data.stop_reason,
      contentTypes: data.content.map((b: { type: string }) => b.type),
    });
    throw new Error("AI could not analyze this photo — please try again");
  }

  const duration = Date.now() - startTime;

  console.log("[analyze-photo] Success", {
    tool: toolUseBlock.name,
    stopReason: data.stop_reason,
    inputTokens: data.usage?.input_tokens,
    outputTokens: data.usage?.output_tokens,
    webSearches: data.usage?.server_tool_use?.web_search_requests || 0,
    duration: `${duration}ms`,
  });

  return {
    intent: toolUseBlock.name,
    data: toolUseBlock.input,
    usage: {
      input_tokens: data.usage?.input_tokens || 0,
      output_tokens: data.usage?.output_tokens || 0,
      web_search_requests:
        data.usage?.server_tool_use?.web_search_requests || 0,
    },
  };
}
