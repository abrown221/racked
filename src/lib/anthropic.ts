type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    };

type Message = {
  role: "user" | "assistant";
  content: string | ContentBlock[];
};

export async function callClaude(
  messages: Message[],
  useSearch = false
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const body: Record<string, unknown> = {
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages,
  };

  if (useSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

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
    const err = await res.text();
    console.error(`Anthropic API error ${res.status}:`, err);
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();

  if (!data.content || !Array.isArray(data.content)) {
    throw new Error("Unexpected response format from Anthropic API");
  }

  return data.content
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n");
}

export function parseJSON<T>(text: string): T | null {
  try {
    // Strip markdown fences
    const cleaned = text.replace(/```json?|```/g, "").trim();
    // Try direct parse first (fastest path)
    return JSON.parse(cleaned);
  } catch {
    // Web search responses often include reasoning text before/after JSON.
    // Extract the JSON object by finding the outermost { ... } or [ ... ].
    try {
      const objStart = text.indexOf("{");
      const objEnd = text.lastIndexOf("}");
      if (objStart !== -1 && objEnd > objStart) {
        return JSON.parse(text.slice(objStart, objEnd + 1));
      }
      const arrStart = text.indexOf("[");
      const arrEnd = text.lastIndexOf("]");
      if (arrStart !== -1 && arrEnd > arrStart) {
        return JSON.parse(text.slice(arrStart, arrEnd + 1));
      }
    } catch (e2) {
      console.error("JSON parse error:", e2, "Text was:", text.substring(0, 300));
    }
    return null;
  }
}
