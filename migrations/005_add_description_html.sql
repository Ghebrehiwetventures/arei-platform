-- Migration 005: Add description_html column for structured HTML descriptions
-- Stores sanitized HTML (h2, h3, h4, p, ul, ol, li, strong, em, a, br only)
-- Plain text stays in `description`; structured HTML goes in `description_html`

ALTER TABLE listings ADD COLUMN IF NOT EXISTS description_html TEXT;

COMMENT ON COLUMN listings.description_html IS 'Sanitized HTML description (whitelist: h2,h3,h4,p,ul,ol,li,strong,em,a,br)';
