/*
  # Add next payment date to real estate properties

  1. Modified Tables
    - `real_estate_properties`
      - `next_payment_date` (date, nullable) - The date of the next rent payment

  2. Important Notes
    - This field helps track upcoming payment obligations for rented/leased properties
    - Only relevant when ownership_type is 'rented' or 'leased'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'real_estate_properties' AND column_name = 'next_payment_date'
  ) THEN
    ALTER TABLE real_estate_properties ADD COLUMN next_payment_date date;
  END IF;
END $$;