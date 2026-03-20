// Tool schemas and tool-based Anthropic API calls for the camera module.
// Tool schemas guide Claude's structured output. Sonnet 4.6 follows schemas accurately.
// No parseJSON() needed — tool_use.input is already a validated JS object.

// ─── Tool Definitions ───────────────────────────────────────────────

export const identifyWineTool = {
  name: "identify_wine",
  description:
    "Identify a wine from a photo of a bottle label, multiple bottles, an open fridge with bottles, or any image where wine bottles are the primary subject. IMPORTANT: Labels can be hard to read — always use web search to verify the wine name and producer actually exist before returning data. Search for the wine to confirm spelling, and to find accurate pricing, drinking windows, and region details. If multiple bottles are visible, identify the most prominent one.",

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
        type: "string",
        description: "Specific appellation if known, or empty string",
      },
      varietal: {
        type: "string",
        description: "Primary grape variety or blend name",
      },
      blend: {
        type: "string",
        description: "Full blend breakdown if known, or empty string",
      },
      alcohol: {
        type: "string",
        description: "ABV if visible on label, or empty string",
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
      bottleImageUrl: {
        type: "string",
        description:
          "URL to a reference bottle image found during web search. Look for a clear product shot from a retailer like wine.com, vivino.com, wine-searcher.com, or a producer website. Return empty string if no good image found.",
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
      "bottleImageUrl",
    ],
    additionalProperties: false,
  },
};

export const analyzeShelfTool = {
  name: "analyze_shelf",
  description:
    "Analyze a photo of a RETAIL wine shop or store shelf — ONLY use this tool when you can see printed price tags, " +
    "commercial shelving, and store signage. Do NOT use for home wine racks or personal collections. " +
    "Identify visible wines and provide buy/skip recommendations. Use web search to verify pricing. " +
    "Cross-reference against the user's cellar and wish list provided in the system prompt.",

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

export const scanCollectionTool = {
  name: "scan_collection",
  description:
    "Identify ALL visible wine bottles in a photo of a wine rack, fridge shelf, case, or collection. " +
    "This is for photos showing multiple bottles together (3 or more). " +
    "IMPORTANT: Use web search to verify each wine exists — labels at a distance are hard to read. " +
    "For each bottle you can identify, provide the wine details and your confidence level. " +
    "Mark confidence 'high' if label is clearly readable, 'medium' if fairly sure but label is at an angle, " +
    "'low' if guessing from partial information. " +
    "Report the total number of bottles visible (including unidentifiable ones) and the number you could identify.",

  input_schema: {
    type: "object" as const,
    properties: {
      total_bottles_visible: {
        type: "integer",
        description: "Total bottles visible in the image, including unidentifiable ones",
      },
      total_identified: {
        type: "integer",
        description: "Number of bottles you could identify with at least a name",
      },
      wines: {
        type: "array",
        items: {
          type: "object",
          properties: {
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Confidence in the identification",
            },
            name: { type: "string", description: "Full wine name" },
            producer: { type: "string", description: "Producer/winery name" },
            vintage: {
              type: ["integer", "null"] as const,
              description: "Vintage year, null if NV or not visible",
            },
            region: { type: "string", description: "Wine region" },
            appellation: {
              type: "string",
              description: "Specific appellation, or empty string",
            },
            varietal: { type: "string", description: "Primary grape variety" },
            blend: {
              type: "string",
              description: "Blend breakdown if known, or empty string",
            },
            alcohol: {
              type: "string",
              description: "ABV if visible, or empty string",
            },
            estimatedPrice: {
              type: ["number", "null"] as const,
              description: "Estimated retail price USD",
            },
            drinkingWindowStart: {
              type: ["integer", "null"] as const,
              description: "Drinking window start year",
            },
            drinkingWindowEnd: {
              type: ["integer", "null"] as const,
              description: "Drinking window end year",
            },
            fridgeSuggestion: {
              type: "string",
              enum: ["daily", "cellar"],
              description: "'daily' for drink-soon, 'cellar' for age-worthy",
            },
            fridgeReason: {
              type: "string",
              description: "One sentence explaining fridge suggestion",
            },
            suggestedTags: {
              type: "array",
              items: { type: "string" },
              description: "5 flavor/character tags",
            },
            bottleImageUrl: {
              type: "string",
              description: "URL to a reference bottle image from web search, or empty string",
            },
          },
          required: [
            "confidence", "name", "producer", "vintage", "region",
            "appellation", "varietal", "blend", "alcohol",
            "estimatedPrice", "drinkingWindowStart", "drinkingWindowEnd",
            "fridgeSuggestion", "fridgeReason", "suggestedTags", "bottleImageUrl",
          ],
          additionalProperties: false,
        },
        description: "Array of identified wines with confidence levels",
      },
    },
    required: ["total_bottles_visible", "total_identified", "wines"],
    additionalProperties: false,
  },
};

// ─── Types ──────────────────────────────────────────────────────────

export type AnalyzePhotoResult = {
  intent: "identify_wine" | "analyze_shelf" | "extract_book" | "scan_collection";
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
  forceIntent,
}: {
  base64: string;
  mediaType: string;
  cellarNames?: string;
  wishNames?: string;
  forceIntent?: string;
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
    "",
    "- identify_wine: for photos showing 1-2 wine bottles where labels are clearly visible.",
    "  Use this for close-up label shots, a bottle on a countertop, or 1-2 bottles held up.",
    "",
    "- scan_collection: for photos showing 3+ bottles in a HOME setting — a personal wine rack,",
    "  wine fridge, case of wine, countertop collection, or any personal storage.",
    "  Key visual cues for home/personal: wooden racks, fridge interiors, kitchen/dining settings,",
    "  bottles stored horizontally, mixed/eclectic selection, no printed price labels.",
    "  The user wants to CATALOG these wines — identify each bottle for their cellar inventory.",
    "",
    "- analyze_shelf: ONLY for photos of RETAIL STORES and WINE SHOPS.",
    "  Key visual cues for retail: printed price tags/shelf labels below bottles, uniform commercial",
    "  shelving, bottles displayed upright and facing forward, store signage, multiple identical bottles,",
    "  organized by region/type with section labels. The user wants SHOPPING ADVICE — buy/skip recommendations.",
    "  If you do NOT see printed price tags or clear commercial retail signage, do NOT use this tool.",
    "  When in doubt between scan_collection and analyze_shelf, use scan_collection.",
    "",
    "- extract_book: for photos of book pages, magazine articles, wine lists, restaurant menus,",
    "  or any printed text about wine. The user wants to extract wine mentions for their wish list.",
    "",
    "CRITICAL: For ALL wine identification (identify_wine and scan_collection), ALWAYS use web search",
    "to verify the wine exists before returning data. Labels are often hard to read — letters can look",
    "similar (e.g. 'l' vs 'f', 'n' vs 'r'). Search for what you think the wine is, confirm the correct",
    "spelling of the producer and wine name, and use the search results to fill in accurate pricing,",
    "drinking windows, and regional details. Never guess a wine name without verifying it via search.",
    "",
    "For collection scans: identify every bottle you can see, even partially obscured ones.",
    "Mark confidence 'high' if label is clearly readable, 'medium' if fairly sure but at an angle,",
    "'low' if guessing from partial information.",
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

  // Only include analyze_shelf when user explicitly tapped Shop Mode.
  // This prevents Claude from choosing shop mode for home wine racks.
  const toolSet: unknown[] = [
    { type: "web_search_20250305", name: "web_search", max_uses: 8 },
    identifyWineTool,
    scanCollectionTool,
    extractBookTool,
  ];
  if (forceIntent === "analyze_shelf") {
    toolSet.push(analyzeShelfTool);
  }

  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: systemParts.join("\n"),
    tools: toolSet,
    tool_choice: forceIntent
      ? { type: "tool" as const, name: forceIntent, disable_parallel_tool_use: true }
      : { type: "any" as const, disable_parallel_tool_use: true },
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
