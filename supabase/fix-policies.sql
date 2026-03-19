-- Racked: Fix RLS Policies Migration
-- Run this in Supabase SQL Editor to fix the infinite recursion bug
-- This drops ALL existing policies and recreates them correctly

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Cellars
DROP POLICY IF EXISTS "Members can view their cellars" ON cellars;
DROP POLICY IF EXISTS "Users can create cellars" ON cellars;
DROP POLICY IF EXISTS "Owners can update cellars" ON cellars;

-- Cellar Members (THE BUG WAS HERE - old recursive policy)
DROP POLICY IF EXISTS "Members can view membership" ON cellar_members;
DROP POLICY IF EXISTS "Owners can manage members" ON cellar_members;
DROP POLICY IF EXISTS "Users can insert own membership" ON cellar_members;
DROP POLICY IF EXISTS "Owners can update members" ON cellar_members;
DROP POLICY IF EXISTS "Owners can delete members" ON cellar_members;

-- Fridges
DROP POLICY IF EXISTS "Members can view fridges" ON fridges;
DROP POLICY IF EXISTS "Editors can manage fridges" ON fridges;
DROP POLICY IF EXISTS "Editors can insert fridges" ON fridges;
DROP POLICY IF EXISTS "Editors can update fridges" ON fridges;
DROP POLICY IF EXISTS "Editors can delete fridges" ON fridges;

-- Wines
DROP POLICY IF EXISTS "Members can view wines" ON wines;
DROP POLICY IF EXISTS "Editors can manage wines" ON wines;
DROP POLICY IF EXISTS "Editors can insert wines" ON wines;
DROP POLICY IF EXISTS "Editors can update wines" ON wines;
DROP POLICY IF EXISTS "Editors can delete wines" ON wines;

-- Tasting Notes
DROP POLICY IF EXISTS "Members can view tasting notes" ON tasting_notes;
DROP POLICY IF EXISTS "Users can manage own tasting notes" ON tasting_notes;
DROP POLICY IF EXISTS "Users can insert own tasting notes" ON tasting_notes;
DROP POLICY IF EXISTS "Users can update own tasting notes" ON tasting_notes;
DROP POLICY IF EXISTS "Users can delete own tasting notes" ON tasting_notes;

-- Dossiers
DROP POLICY IF EXISTS "Members can view dossiers" ON dossiers;
DROP POLICY IF EXISTS "Editors can manage dossiers" ON dossiers;
DROP POLICY IF EXISTS "Editors can insert dossiers" ON dossiers;
DROP POLICY IF EXISTS "Editors can update dossiers" ON dossiers;

-- Wishlist
DROP POLICY IF EXISTS "Members can view wishlist" ON wishlist;
DROP POLICY IF EXISTS "Editors can manage wishlist" ON wishlist;
DROP POLICY IF EXISTS "Editors can insert wishlist" ON wishlist;
DROP POLICY IF EXISTS "Editors can update wishlist" ON wishlist;
DROP POLICY IF EXISTS "Editors can delete wishlist" ON wishlist;

-- Storage
DROP POLICY IF EXISTS "Public read access for wine labels" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload wine labels" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own wine label uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own wine label uploads" ON storage.objects;

-- ============================================
-- RECREATE ALL POLICIES (FIXED)
-- ============================================

-- Profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Cellars: use owner_id check for INSERT (no membership exists yet)
CREATE POLICY "Members can view their cellars"
  ON cellars FOR SELECT
  USING (
    auth.uid() = owner_id
    OR EXISTS (
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

-- Cellar Members: NO self-referencing queries!
-- Users can view their own memberships
CREATE POLICY "Members can view membership"
  ON cellar_members FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own membership row (needed for signup)
CREATE POLICY "Users can insert own membership"
  ON cellar_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Owners can update members (checked via cellars table, NOT cellar_members)
CREATE POLICY "Owners can update members"
  ON cellar_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cellars
      WHERE cellars.id = cellar_members.cellar_id
      AND cellars.owner_id = auth.uid()
    )
  );

-- Owners can delete members (checked via cellars table, NOT cellar_members)
CREATE POLICY "Owners can delete members"
  ON cellar_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cellars
      WHERE cellars.id = cellar_members.cellar_id
      AND cellars.owner_id = auth.uid()
    )
  );

-- Fridges
CREATE POLICY "Members can view fridges"
  ON fridges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = fridges.cellar_id
      AND cellar_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can insert fridges"
  ON fridges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = fridges.cellar_id
      AND cellar_members.user_id = auth.uid()
      AND cellar_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can update fridges"
  ON fridges FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = fridges.cellar_id
      AND cellar_members.user_id = auth.uid()
      AND cellar_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can delete fridges"
  ON fridges FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = fridges.cellar_id
      AND cellar_members.user_id = auth.uid()
      AND cellar_members.role IN ('owner', 'editor')
    )
  );

-- Wines
CREATE POLICY "Members can view wines"
  ON wines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = wines.cellar_id
      AND cellar_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can insert wines"
  ON wines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = wines.cellar_id
      AND cellar_members.user_id = auth.uid()
      AND cellar_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can update wines"
  ON wines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = wines.cellar_id
      AND cellar_members.user_id = auth.uid()
      AND cellar_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can delete wines"
  ON wines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = wines.cellar_id
      AND cellar_members.user_id = auth.uid()
      AND cellar_members.role IN ('owner', 'editor')
    )
  );

-- Tasting Notes
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

CREATE POLICY "Users can insert own tasting notes"
  ON tasting_notes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tasting notes"
  ON tasting_notes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tasting notes"
  ON tasting_notes FOR DELETE
  USING (user_id = auth.uid());

-- Dossiers
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

CREATE POLICY "Editors can insert dossiers"
  ON dossiers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wines
      JOIN cellar_members ON cellar_members.cellar_id = wines.cellar_id
      WHERE wines.id = dossiers.wine_id
      AND cellar_members.user_id = auth.uid()
      AND cellar_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can update dossiers"
  ON dossiers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM wines
      JOIN cellar_members ON cellar_members.cellar_id = wines.cellar_id
      WHERE wines.id = dossiers.wine_id
      AND cellar_members.user_id = auth.uid()
      AND cellar_members.role IN ('owner', 'editor')
    )
  );

-- Wishlist
CREATE POLICY "Members can view wishlist"
  ON wishlist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = wishlist.cellar_id
      AND cellar_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can insert wishlist"
  ON wishlist FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = wishlist.cellar_id
      AND cellar_members.user_id = auth.uid()
      AND cellar_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can update wishlist"
  ON wishlist FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = wishlist.cellar_id
      AND cellar_members.user_id = auth.uid()
      AND cellar_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can delete wishlist"
  ON wishlist FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cellar_members
      WHERE cellar_members.cellar_id = wishlist.cellar_id
      AND cellar_members.user_id = auth.uid()
      AND cellar_members.role IN ('owner', 'editor')
    )
  );

-- ============================================
-- STORAGE
-- ============================================

-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('wine-labels', 'wine-labels', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read access for wine labels"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wine-labels');

CREATE POLICY "Authenticated users can upload wine labels"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wine-labels' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own wine label uploads"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'wine-labels' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own wine label uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'wine-labels' AND auth.role() = 'authenticated');

-- ============================================
-- CLEANUP: Delete any orphaned data from failed signups
-- ============================================
DELETE FROM cellar_members WHERE cellar_id NOT IN (SELECT id FROM cellars);
DELETE FROM cellars WHERE owner_id NOT IN (SELECT id FROM profiles);
