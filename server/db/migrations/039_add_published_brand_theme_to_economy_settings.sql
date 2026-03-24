ALTER TABLE economy_settings
ADD COLUMN IF NOT EXISTS published_brand_theme TEXT NOT NULL DEFAULT 'emorya';

UPDATE economy_settings
SET published_brand_theme = 'emorya'
WHERE published_brand_theme IS NULL
   OR published_brand_theme NOT IN ('emorya', 'multiversx', 'xportal');
