/*
  # Vehicle Management Module

  ## Overview
  Complete vehicle fleet management system for company vehicles, assignments, maintenance, 
  insurance, and Saudi traffic violations (Absher integration ready).

  ## Tables Created

  ### vehicles
  - Complete vehicle information
  - Ownership details
  - Registration and insurance tracking
  - Status management

  ### vehicle_assignments
  - Employee vehicle assignments
  - Assignment periods
  - Responsibility tracking

  ### vehicle_maintenance
  - Maintenance schedules
  - Service history
  - Cost tracking
  - Vendor management

  ### vehicle_violations
  - Traffic violation tracking
  - Absher violation integration
  - Fine management
  - Status tracking

  ## Security
  - RLS enabled on all tables
  - Authenticated user access
*/

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  vehicle_number text NOT NULL,
  plate_number text NOT NULL,
  plate_number_ar text,
  vehicle_type text NOT NULL, -- sedan, suv, van, truck, bus
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  color text,
  vin_number text,
  registration_number text,
  registration_expiry date,
  insurance_company text,
  insurance_policy_number text,
  insurance_expiry date,
  insurance_amount decimal(15, 2),
  purchase_date date,
  purchase_price decimal(15, 2),
  current_value decimal(15, 2),
  current_mileage integer DEFAULT 0,
  fuel_type text, -- petrol, diesel, electric, hybrid
  ownership_type text NOT NULL, -- owned, leased, rented
  lease_start_date date,
  lease_end_date date,
  lease_monthly_cost decimal(15, 2),
  status text NOT NULL DEFAULT 'active', -- active, maintenance, inactive, sold
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, plate_number)
);

-- Vehicle assignments table
CREATE TABLE IF NOT EXISTS vehicle_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  assigned_date date NOT NULL,
  return_date date,
  purpose text,
  starting_mileage integer,
  ending_mileage integer,
  fuel_card_issued boolean DEFAULT false,
  notes text,
  status text NOT NULL DEFAULT 'active', -- active, completed
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Vehicle maintenance table
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  maintenance_type text NOT NULL, -- routine, repair, inspection, oil_change, tire_change
  scheduled_date date,
  completed_date date,
  service_provider text,
  description text NOT NULL,
  cost decimal(15, 2) DEFAULT 0,
  mileage_at_service integer,
  next_service_date date,
  next_service_mileage integer,
  invoice_number text,
  warranty_until date,
  parts_replaced text[],
  technician_name text,
  status text NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Vehicle violations table (Saudi traffic violations)
CREATE TABLE IF NOT EXISTS vehicle_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  assigned_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  violation_number text,
  violation_date date NOT NULL,
  violation_type text NOT NULL,
  violation_location text,
  fine_amount decimal(15, 2) NOT NULL,
  discount_amount decimal(15, 2) DEFAULT 0,
  paid_amount decimal(15, 2) DEFAULT 0,
  payment_date date,
  payment_method text, -- sadad, credit_card, cash
  payment_reference text,
  black_points integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending, paid, appealed, cancelled
  appeal_status text, -- under_review, approved, rejected
  responsible_party text, -- employee, company
  deducted_from_salary boolean DEFAULT false,
  absher_violation_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_company ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_vehicle ON vehicle_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_employee ON vehicle_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_status ON vehicle_assignments(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle ON vehicle_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_status ON vehicle_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_violations_vehicle ON vehicle_violations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_violations_status ON vehicle_violations(status);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_violations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view vehicles"
  ON vehicles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage vehicles"
  ON vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view vehicle assignments"
  ON vehicle_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage vehicle assignments"
  ON vehicle_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view vehicle maintenance"
  ON vehicle_maintenance FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage vehicle maintenance"
  ON vehicle_maintenance FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view vehicle violations"
  ON vehicle_violations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage vehicle violations"
  ON vehicle_violations FOR ALL TO authenticated USING (true) WITH CHECK (true);
