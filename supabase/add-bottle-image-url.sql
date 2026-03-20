-- Add bottle_image_url to scan_results for wines without camera photos
-- Run AFTER the initial scan-queue-schema.sql migration

ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS bottle_image_url text;
