export type Wine = {
  id: string;
  cellar_id: string;
  fridge_id: string | null;
  name: string;
  producer: string | null;
  vintage: number | null;
  region: string | null;
  appellation: string | null;
  varietal: string | null;
  blend: string | null;
  alcohol: string | null;
  estimated_price: number | null;
  price_paid: number | null;
  retailer: string | null;
  drinking_window_start: number | null;
  drinking_window_end: number | null;
  fridge_suggestion: string | null;
  fridge_reason: string | null;
  suggested_tags: string[] | null;
  status: "sealed" | "coravined" | "consumed";
  coravined_date: string | null;
  consumed_date: string | null;
  photo_url: string | null;
  photo_path: string | null;
  date_added: string;
  created_at: string;
  updated_at: string;
};

export type TastingNote = {
  id: string;
  wine_id: string;
  user_id: string;
  rating: number | null;
  tags: string[] | null;
  buy_again: "yes" | "at-this-price" | "no" | null;
  notes: string | null;
  tasted_date: string;
  created_at: string;
};

export type Fridge = {
  id: string;
  cellar_id: string;
  name: string;
  capacity: number;
  type: "daily" | "cellar" | "mixed";
  sort_order: number;
  created_at: string;
};

export type Dossier = {
  id: string;
  wine_id: string;
  estate: string | null;
  winemaker: string | null;
  vinification: string | null;
  special: string | null;
  scores: { source: string; score: number }[] | null;
  sentiment: string | null;
  fetched_at: string;
};

export type WishlistItem = {
  id: string;
  cellar_id: string;
  name: string;
  vintage: number | null;
  context: string | null;
  source: string | null;
  search_query: string | null;
  photo_url: string | null;
  date_added: string;
  created_at: string;
};

export type Cellar = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
};

export type CellarMember = {
  id: string;
  cellar_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  invited_at: string;
  accepted_at: string | null;
};
