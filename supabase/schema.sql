-- Racked: Wine Collection App Schema
-- Run this in Supabase SQL Editor

-- 1. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Cellars
CREATE TABLE IF NOT EXISTS cellars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) NOT NULL,
  name text DEFAULT 'My Cellar',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cellars ENABLE ROW LEVEL SECURITY;

-- 3. Cellar Members
CREATE TABLE IF NOT EXISTS cellar_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cellar_id uuid REFERENCES cellars(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'viewer',
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(cellar_id, user_id)
);

ALTER TABLE cellar_members ENABLE ROW LEVEL SECURITY;

-- Cellar policies (through membership)
CREATE POLICY "Members can view their cellars"
  ON cellars FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = cellars.id
      AND cellar_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create cellars"
  ON cellars FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update cellars"
  ON cellars FOR UPDATE
  USING (auth.uid() = owner_id);

-- Cellar members policies
CREATE POLICY "Members can view membership"
  ON cellar_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owners can manage members"
  ON cellar_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members cm
      WHERE cm.cellar_id = cellar_members.cellar_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'owner'
    )
  );

CREATE POLICY "Users can insert own membership"
  ON cellar_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 4. Fridges
CREATE TABLE IF NOT EXISTS fridges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cellar_id uuid REFERENCES cellars(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  capacity int DEFAULT 0,
  type text CHECK (type IN ('daily', 'cellar', 'mixed')) DEFAULT 'cellar',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fridges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view fridges"
  ON fridges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = fridges.cellar_id
      AND cellar_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage fridges"
  ON fridges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = fridges.cellar_id
      AND cellar_members.user_id = auth.uid()
      AND cellar_members.role IN ('owner', 'editor')
    )
  );

-- 5. Wines
CREATE TABLE IF NOT EXISTS wines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cellar_id uuid REFERENCES cellars(id) ON DELETE CASCADE NOT NULL,
  fridge_id uuid REFERENCES fridges(id) ON DELETE SET NULL,
  name text NOT NULL,
  producer text,
  vintage int,
  region text,
  appellation text,
  varietal text,
  blend text,
  alcohol text,
  estimated_price numeric,
  price_paid numeric,
  retailer text,
  drinking_window_start int,
  drinking_window_end int,
  fridge_suggestion text,
  fridge_reason text,
  suggested_tags jsonb,
  status text CHECK (status IN ('sealed', 'coravined', 'consumed')) DEFAULT 'sealed',
  coravined_date date,
  consumed_date date,
  photo_url text,
  photo_path text,
  date_added date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view wines"
  ON wines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = wines.cellar_id
      AND cellar_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage wines"
  ON wines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = wines.cellar_id
      AND cellar_members.user_id = auth.uid()
      AND cellar_members.role IN ('owner', 'editor')
    )
  );

-- 6. Tasting Notes
CREATE TABLE IF NOT EXISTS tasting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id uuid REFERENCES wines(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating int CHECK (rating BETWEEN 1 AND 5),
  tags jsonb,
  buy_again text CHECK (buy_again IN ('yes', 'at-this-price', 'no')),
  notes text,
  tasted_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(wine_id, user_id, tasted_date)
);

ALTER TABLE tasting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tasting notes"
  ON tasting_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wines
      JOIN cellar_members ON cellar_members.cellar_id = wines.cellar_id
      WHERE wines.id = tasting_notes.wine_id
      AND cellar_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own tasting notes"
  ON tasting_notes FOR ALL
  USING (user_id = auth.uid());

-- 7. Dossiers
CREATE TABLE IF NOT EXISTS dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id uuid REFERENCES wines(id) ON DELETE CASCADE NOT NULL UNIQUE,
  estate text,
  winemaker text,
  vinification text,
  special text,
  scores jsonb,
  sentiment text,
  fetched_at timestamptz DEFAULT now()
);

ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view dossiers"
  ON dossiers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wines
      JOIN cellar_members ON cellar_members.cellar_id = wines.cellar_id
      WHERE wines.id = dossiers.wine_id
      AND cellar_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage dossiers"
  ON dossiers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wines
      JOIN cellar_members ON cellar_members.cellar_id = wines.cellar_id
      WHERE wines.id = dossiers.wine_id
      AND cellar_members.user_id = auth.uid()
      AND cellar_members.role IN ('owner', 'editor')
    )
  );

-- 8. Wishlist
CREATE TABLE IF NOT EXISTS wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cellar_id uuid REFERENCES cellars(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  vintage int,
  context text,
  source text,
  search_query text,
  photo_url text,
  date_added date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view wishlist"
  ON wishlist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = wishlist.cellar_id
      AND cellar_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage wishlist"
  ON wishlist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = wishlist.cellar_id
      AND cellar_members.user_id = auth.uid()
      AND cellar_members.role IN ('owner', 'editor')
    )
  );

-- Storage bucket for wine label photos
-- Run this via Supabase dashboard or API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('wine-labels', 'wine-labels', true);
