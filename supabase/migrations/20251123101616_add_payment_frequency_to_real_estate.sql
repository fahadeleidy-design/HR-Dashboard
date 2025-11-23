/*
  # Add payment frequency field to real estate properties

  1. Changes
    - Add `payment_frequency` column to real_estate_properties table
    - Supports: monthly, quarterly, semi_annually, annually
    - Default value is 'monthly'
    - Only applicable for rented/leased properties

  2. Notes
    - This allows tracking how often rent payments are made
    - Helps with financial planning and cash flow management
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'real_estate_properties' AND column_name = 'payment_frequency'
  ) THEN
    ALTER TABLE real_estate_properties 
    ADD COLUMN payment_frequency text DEFAULT 'monthly' 
    CHECK (payment_frequency IN ('monthly', 'quarterly', 'semi_annually', 'annually'));
  END IF;
END $$;
