-- Add load_policy column to store advanced merge/upsert settings
ALTER TABLE projects ADD COLUMN IF NOT EXISTS load_policy JSONB;

-- Add comment for the new column
COMMENT ON COLUMN projects.load_policy IS 'Advanced load policy settings for merge/upsert modes including dedup keys, conflict strategy, watermark, etc.';
