// Prompt templates for non-camera AI routes.
// Camera prompts are now embedded in tool schemas — see anthropic-tools.ts

export function getResearchPrompt(
  wineName: string,
  producer: string,
  vintage: number
) {
  return `Research the wine: ${vintage} ${producer} ${wineName}. Return ONLY valid JSON, no markdown, no preamble:
{
  "estate": "2-3 paragraph history of the estate/vineyard — founding, terroir, what makes the site special",
  "winemaker": "2-3 paragraph bio of the current winemaker — training, philosophy, career path",
  "vinification": "detailed winemaking notes — fermentation, oak, aging, blend rationale",
  "special": "1-2 paragraph editorial take on why this wine matters",
  "scores": [{"source":"critic","score":number}],
  "sentiment": "2-3 sentence synthesis of community reception from Vivino, CellarTracker, etc"
}`;
}

export function getRecommendationsPrompt(cellarSummary: string) {
  return `You are a personal sommelier. Today is ${new Date().toLocaleDateString()}. Here is my cellar:

${cellarSummary}

Give me 3 specific wine recommendations for tonight. Consider drinking windows, variety (what have I been drinking lately), and the season. Return ONLY valid JSON, no markdown:
[{"wine":"exact wine name from list","reason":"1-2 sentence personal recommendation"}]`;
}

export function getAskPrompt(cellarSummary: string, question: string) {
  return `You are my personal sommelier. My cellar:
${cellarSummary}

Question: ${question}

Give a concise, personalized answer referencing specific wines from my cellar when relevant.`;
}
