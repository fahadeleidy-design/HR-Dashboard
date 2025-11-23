/*
  # Add x-apikey to GOSI Configuration

  1. Changes
    - Add `x_apikey` column to store GOSI x-apikey header value
    - Default value is the standard GOSI key: L6LK4GEAAIVrQbVo4AOVrQk781kvIT3X

  2. Notes
    - x-apikey is required for all GOSI API calls
    - Same key for both Sandbox and Production environments
    - Can be overridden if GOSI provides a different key
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gosi_api_config' AND column_name = 'x_apikey'
  ) THEN
    ALTER TABLE gosi_api_config 
    ADD COLUMN x_apikey text DEFAULT 'L6LK4GEAAIVrQbVo4AOVrQk781kvIT3X';
  END IF;
END $$;
