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
    max_tokens: 2000,
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
    const cleaned = text.replace(/```json?|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON parse error:", e, "Text was:", text.substring(0, 200));
    return null;
  }
}
