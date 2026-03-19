import { CORAVIN_RUNWAY } from "./constants";
import type { Wine } from "./supabase/types";

export function getCoravinDays(wine: Wine): number {
  if (!wine.coravined_date) return 0;
  const diff = Date.now() - new Date(wine.coravined_date).getTime();
  return Math.floor(diff / 86400000);
}

export function getCoravinRunway(wine: Wine): number {
  return CORAVIN_RUNWAY[wine.varietal || ""] || CORAVIN_RUNWAY.default;
}

export type CoravinStatus = "green" | "amber" | "red";

export function getCoravinStatus(wine: Wine): CoravinStatus {
  const days = getCoravinDays(wine);
  const runway = getCoravinRunway(wine);
  const pct = days / runway;
  if (pct < 0.5) return "green";
  if (pct < 0.8) return "amber";
  return "red";
}

export type DrinkingWindowStatus =
  | "too-young"
  | "in-window"
  | "drink-soon"
  | "past-peak"
  | "unknown";

export function getDrinkingWindowStatus(wine: Wine): DrinkingWindowStatus {
  const year = new Date().getFullYear();
  if (!wine.drinking_window_start || !wine.drinking_window_end) return "unknown";
  if (year < wine.drinking_window_start) return "too-young";
  if (year > wine.drinking_window_end) return "past-peak";
  if (year >= wine.drinking_window_end - 1) return "drink-soon";
  return "in-window";
}

export const WINDOW_COLORS: Record<DrinkingWindowStatus, string> = {
  "too-young": "#6878A0",
  "in-window": "#5A7A4A",
  "drink-soon": "#A07830",
  "past-peak": "#9B3333",
  unknown: "#8C7E72",
};

export const WINDOW_LABELS: Record<DrinkingWindowStatus, string> = {
  "too-young": "Too Young",
  "in-window": "In Window",
  "drink-soon": "Drink Soon",
  "past-peak": "Past Peak",
  unknown: "Unknown",
};

export const CORAVIN_COLORS: Record<CoravinStatus, string> = {
  green: "#5A7A4A",
  amber: "#A07830",
  red: "#9B3333",
};

export const DEFAULT_TASTING_TAGS = [
  "Dark Fruit",
  "Red Fruit",
  "Floral",
  "Earthy",
  "Spicy",
  "Oaky",
  "Mineral",
  "Herbal",
  "Savory",
  "Tannic",
];
