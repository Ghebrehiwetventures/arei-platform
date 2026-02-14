ALTER TABLE listings ADD COLUMN IF NOT EXISTS dedup_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_dedup_key
  ON listings (dedup_key) WHERE dedup_key IS NOT NULL;
