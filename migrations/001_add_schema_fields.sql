-- Migration: Add missing schema fields for pan-African index
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Date: 2026-02-09

-- 1. Add new columns (country already exists)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS property_type TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS price_period TEXT DEFAULT 'sale';

-- 2. Backfill country for existing listings
UPDATE listings SET country = 'Cape Verde' WHERE source_id LIKE 'cv_%' AND country IS NULL;
UPDATE listings SET country = 'Kenya' WHERE source_id LIKE 'ke_%' AND country IS NULL;
UPDATE listings SET country = 'Ghana' WHERE source_id LIKE 'gh_%' AND country IS NULL;
UPDATE listings SET country = 'Nigeria' WHERE source_id LIKE 'ng_%' AND country IS NULL;
UPDATE listings SET country = 'South Africa' WHERE source_id LIKE 'za_%' AND country IS NULL;

-- 3. Backfill price_period for existing listings (all current data is sale)
UPDATE listings SET price_period = 'sale' WHERE price_period IS NULL;

-- 4. Verify
SELECT
  country,
  COUNT(*) as count,
  COUNT(property_type) as has_property_type,
  COUNT(CASE WHEN array_length(amenities, 1) > 0 THEN 1 END) as has_amenities,
  COUNT(price_period) as has_price_period
FROM listings
GROUP BY country
ORDER BY count DESC;
