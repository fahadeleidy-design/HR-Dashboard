/*
  # Add effective_saudi_count to nitaqat_tracking table

  1. Changes
    - Add `effective_saudi_count` column to track the weighted count of Saudi employees
    - This accounts for:
      - Full count (SAR 4,000+): 1.0
      - Half count (< SAR 4,000): 0.5
      - Disabled employees (SAR 4,000+): 4.0

  2. Notes
    - This is essential for accurate 2024-2025 Nitaqat compliance tracking
    - Allows historical trend analysis with proper weighted calculations
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'nitaqat_tracking' AND column_name = 'effective_saudi_count'
  ) THEN
    ALTER TABLE nitaqat_tracking ADD COLUMN effective_saudi_count numeric DEFAULT 0;
  END IF;
END $$;
