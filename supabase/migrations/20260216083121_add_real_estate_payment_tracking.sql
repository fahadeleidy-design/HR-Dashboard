/*
  # Real Estate Payment Tracking System

  ## Overview
  Adds comprehensive payment tracking for rental/lease properties including:
  - Monthly payment schedules
  - Payment verification by finance team
  - Payment history and audit trail
  - Next payment date calculation

  ## Changes

  1. **Adds to real_estate_properties table**:
    - `payment_frequency` - How often rent is paid (monthly, quarterly, semi_annually, annually)
    - `next_payment_date` - Auto-calculated next payment due date

  2. **New Tables**:
    - `property_payments` - Tracks each payment for each property with finance verification

  3. **Security**:
    - RLS enabled on property_payments
    - Finance and Admin roles can verify payments
    - All authenticated users can view payments

  ## Important Notes
  - Payment verification requires finance or admin role
  - Payment history provides full audit trail
  - Automatic next payment date calculation based on frequency
*/

-- Add payment tracking columns to real_estate_properties if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'real_estate_properties' AND column_name = 'payment_frequency'
  ) THEN
    ALTER TABLE real_estate_properties 
    ADD COLUMN payment_frequency text DEFAULT 'monthly';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'real_estate_properties' AND column_name = 'next_payment_date'
  ) THEN
    ALTER TABLE real_estate_properties 
    ADD COLUMN next_payment_date date;
  END IF;
END $$;

-- Create property payments tracking table
CREATE TABLE IF NOT EXISTS property_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  property_id uuid REFERENCES real_estate_properties(id) ON DELETE CASCADE NOT NULL,
  payment_date date NOT NULL,
  due_date date NOT NULL,
  amount decimal(15, 2) NOT NULL,
  payment_frequency text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_date date,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  payment_method text,
  transaction_reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_payments_property ON property_payments(property_id);
CREATE INDEX IF NOT EXISTS idx_property_payments_company ON property_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_property_payments_status ON property_payments(status);
CREATE INDEX IF NOT EXISTS idx_property_payments_due_date ON property_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_property_payments_verified_by ON property_payments(verified_by);

ALTER TABLE property_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view property payments"
  ON property_payments FOR SELECT 
  TO authenticated 
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Finance and Admin can manage property payments"
  ON property_payments FOR ALL
  TO authenticated 
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'finance')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'finance')
    )
  );

-- Function to calculate next payment date based on frequency
CREATE OR REPLACE FUNCTION calculate_next_payment_date(
  start_date date,
  frequency text
) RETURNS date AS $$
DECLARE
  months_interval integer;
  next_date date;
BEGIN
  CASE frequency
    WHEN 'monthly' THEN months_interval := 1;
    WHEN 'quarterly' THEN months_interval := 3;
    WHEN 'semi_annually' THEN months_interval := 6;
    WHEN 'annually' THEN months_interval := 12;
    ELSE RETURN NULL;
  END CASE;

  next_date := start_date;
  
  WHILE next_date < CURRENT_DATE LOOP
    next_date := next_date + (months_interval || ' months')::interval;
  END LOOP;

  RETURN next_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate payment schedule for a property
CREATE OR REPLACE FUNCTION generate_payment_schedule(
  p_property_id uuid,
  p_start_date date DEFAULT CURRENT_DATE,
  p_months_ahead integer DEFAULT 12
) RETURNS TABLE (
  payment_month date,
  due_date date,
  amount decimal,
  frequency text
) AS $$
DECLARE
  property_record RECORD;
  schedule_date date;
  payment_amount decimal;
  months_increment integer;
  periods_count integer;
BEGIN
  SELECT 
    monthly_rent,
    annual_rent,
    payment_frequency,
    lease_start_date
  INTO property_record
  FROM real_estate_properties
  WHERE id = p_property_id;

  IF NOT FOUND OR property_record.annual_rent IS NULL THEN
    RETURN;
  END IF;

  CASE property_record.payment_frequency
    WHEN 'monthly' THEN 
      months_increment := 1;
      payment_amount := property_record.monthly_rent;
      periods_count := p_months_ahead;
    WHEN 'quarterly' THEN 
      months_increment := 3;
      payment_amount := property_record.annual_rent / 4;
      periods_count := CEIL(p_months_ahead / 3.0);
    WHEN 'semi_annually' THEN 
      months_increment := 6;
      payment_amount := property_record.annual_rent / 2;
      periods_count := CEIL(p_months_ahead / 6.0);
    WHEN 'annually' THEN 
      months_increment := 12;
      payment_amount := property_record.annual_rent;
      periods_count := CEIL(p_months_ahead / 12.0);
    ELSE
      RETURN;
  END CASE;

  schedule_date := COALESCE(property_record.lease_start_date, p_start_date);
  
  FOR i IN 0..periods_count-1 LOOP
    payment_month := schedule_date + (i * months_increment || ' months')::interval;
    
    IF payment_month >= p_start_date THEN
      due_date := payment_month;
      amount := payment_amount;
      frequency := property_record.payment_frequency;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;
