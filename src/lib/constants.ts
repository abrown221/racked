export const CORAVIN_RUNWAY: Record<string, number> = {
  "Cabernet Sauvignon": 30,
  "Merlot": 21,
  "Malbec": 21,
  "Syrah": 25,
  "Shiraz": 25,
  "Pinot Noir": 14,
  "Nebbiolo": 21,
  "Sangiovese": 21,
  "Tempranillo": 21,
  "Chardonnay": 10,
  "Sauvignon Blanc": 7,
  "Riesling": 10,
  "Rosé": 7,
  default: 14,
};

export const FRIDGE_TYPES = [
  { value: "daily", label: "Daily Drinkers", description: "Drink soon" },
  { value: "cellar", label: "Cellar", description: "Age-worthy" },
  { value: "mixed", label: "Mixed", description: "Both" },
] as const;

export const PALETTE = {
  bg: "#FAF7F2",
  card: "#FFFFFF",
  surface: "#F0EBE3",
  border: "#DDD5CA",
  textPrimary: "#2D241B",
  textSecondary: "#6B5E52",
  textMuted: "#8C7E72",
  accent: "#722F37",
  accentLight: "#8E3A48",
  gold: "#A0864E",
  statusGreen: "#5A7A4A",
  statusAmber: "#A07830",
  statusRed: "#9B3333",
  statusBlue: "#6878A0",
  overlay: "rgba(45,36,27,0.75)",
} as const;
