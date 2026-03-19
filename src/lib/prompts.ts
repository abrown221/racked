export const IDENTIFY_WINE_PROMPT = `You are a world-class sommelier. Identify this wine from the label photo. Return ONLY valid JSON, no markdown fences, no preamble:
{
  "name": "full wine name including vintage",
  "producer": "producer/winery",
  "vintage": year_number,
  "region": "region",
  "appellation": "specific appellation",
  "varietal": "primary grape or blend",
  "blend": "full blend breakdown if visible/known",
  "alcohol": "ABV if visible",
  "estimatedPrice": USD_number,
  "drinkingWindow": {"start": year, "end": year},
  "fridgeSuggestion": "daily" or "cellar",
  "fridgeReason": "one sentence why",
  "suggestedTags": ["tag1","tag2","tag3","tag4","tag5"]
}`;

export const DETECT_INTENT_PROMPT = `Classify this photo. Return ONLY one word - no punctuation, no explanation:
- "label" if it's a close-up of a single wine bottle label
- "shelf" if it's a retail shelf or store display with multiple wines and price tags
- "bottles" if it's multiple bottles together (a case, countertop, cellar shelf)
- "book" if it's a page from a book, magazine, or printed article about wine
- "receipt" if it's a purchase receipt or order confirmation
- "winelist" if it's a restaurant wine list or menu
- "fridge" if it's an open wine fridge or refrigerator with bottles stored
- "other" if none of the above`;

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

export function getShelfAnalysisPrompt(
  cellarNames: string,
  wishNames: string
) {
  return `You are a sommelier helping me shop. Identify the wines visible on this retail shelf. I already own: [${cellarNames}]. My wish list: [${wishNames}]. For each wine you can identify, give a buy/skip recommendation based on value, quality, and avoiding duplicates. Return ONLY valid JSON:
[{"name":"wine name","vintage":year,"price":"if visible","recommendation":"buy"|"skip"|"wishlist-match","reason":"1 sentence"}]`;
}

export function getBookExtractPrompt() {
  return `Read this page from a wine book or magazine. Extract every specific wine and producer mentioned. For each, summarize what was said about it. Return ONLY valid JSON:
[{"name":"wine or producer name","vintage":"if mentioned or null","context":"what the book says about it","searchQuery":"best search query to find this wine for purchase"}]`;
}

export function getAskPrompt(cellarSummary: string, question: string) {
  return `You are my personal sommelier. My cellar:
${cellarSummary}

Question: ${question}

Give a concise, personalized answer referencing specific wines from my cellar when relevant.`;
}
