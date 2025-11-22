/*
  # Real Estate & Assets Management

  ## Overview
  Complete management of company real estate properties, facilities, equipment, and assets.
  Includes lease management, maintenance, depreciation tracking, and asset allocation.

  ## Tables Created

  ### real_estate_properties
  - Properties owned or leased
  - Rental/lease agreements
  - Maintenance tracking

  ### company_assets
  - Equipment and asset tracking
  - Depreciation management
  - Assignment and custody

  ### asset_maintenance
  - Maintenance schedules
  - Service history

  ## Security
  - RLS enabled on all tables
*/

-- Real estate properties table
CREATE TABLE IF NOT EXISTS real_estate_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  property_type text NOT NULL, -- office, warehouse, factory, showroom, land, residential
  property_name text NOT NULL,
  property_name_ar text,
  address text NOT NULL,
  city text NOT NULL,
  district text,
  building_number text,
  unit_number text,
  postal_code text,
  ownership_type text NOT NULL, -- owned, leased, rented
  deed_number text,
  deed_date date,
  purchase_price decimal(15, 2),
  current_value decimal(15, 2),
  area_sqm decimal(10, 2),
  lease_start_date date,
  lease_end_date date,
  monthly_rent decimal(15, 2),
  annual_rent decimal(15, 2),
  landlord_name text,
  landlord_contact text,
  contract_file_url text,
  electricity_account text,
  water_account text,
  municipality_number text,
  purpose text, -- what it's used for
  capacity integer, -- how many people/items it can hold
  status text NOT NULL DEFAULT 'active', -- active, vacant, under_renovation, sold
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Company assets table (equipment, furniture, IT assets, etc.)
CREATE TABLE IF NOT EXISTS company_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  asset_tag text NOT NULL, -- unique asset identification
  asset_type text NOT NULL, -- computer, furniture, machinery, vehicle, equipment, software
  asset_category text, -- IT, office, manufacturing, etc.
  asset_name text NOT NULL,
  description text,
  brand text,
  model text,
  serial_number text,
  purchase_date date NOT NULL,
  purchase_price decimal(15, 2) NOT NULL,
  current_value decimal(15, 2),
  depreciation_method text, -- straight_line, declining_balance
  depreciation_rate decimal(5, 2), -- percentage per year
  useful_life_years integer,
  salvage_value decimal(15, 2),
  supplier text,
  invoice_number text,
  warranty_expiry date,
  location text, -- which property/department
  assigned_to_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  assigned_date date,
  maintenance_required boolean DEFAULT false,
  next_maintenance_date date,
  status text NOT NULL DEFAULT 'in_use', -- in_use, available, maintenance, damaged, disposed
  disposal_date date,
  disposal_method text,
  disposal_value decimal(15, 2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, asset_tag)
);

-- Asset maintenance history
CREATE TABLE IF NOT EXISTS asset_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  asset_id uuid REFERENCES company_assets(id) ON DELETE CASCADE NOT NULL,
  maintenance_date date NOT NULL,
  maintenance_type text NOT NULL, -- preventive, corrective, emergency
  description text NOT NULL,
  service_provider text,
  cost decimal(15, 2) DEFAULT 0,
  downtime_hours integer DEFAULT 0,
  parts_replaced text[],
  performed_by text,
  next_maintenance_date date,
  status text NOT NULL DEFAULT 'completed',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Property maintenance
CREATE TABLE IF NOT EXISTS property_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  property_id uuid REFERENCES real_estate_properties(id) ON DELETE CASCADE NOT NULL,
  maintenance_date date NOT NULL,
  maintenance_type text NOT NULL, -- hvac, plumbing, electrical, structural, cleaning
  description text NOT NULL,
  contractor text,
  cost decimal(15, 2) DEFAULT 0,
  invoice_number text,
  warranty_period_months integer,
  next_scheduled_date date,
  status text NOT NULL DEFAULT 'completed',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_properties_company ON real_estate_properties(company_id);
CREATE INDEX IF NOT EXISTS idx_properties_type ON real_estate_properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_status ON real_estate_properties(status);
CREATE INDEX IF NOT EXISTS idx_assets_company ON company_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON company_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON company_assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_assigned ON company_assets(assigned_to_employee_id);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_asset ON asset_maintenance(asset_id);
CREATE INDEX IF NOT EXISTS idx_property_maintenance_property ON property_maintenance(property_id);

-- Enable RLS
ALTER TABLE real_estate_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_maintenance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view properties"
  ON real_estate_properties FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage properties"
  ON real_estate_properties FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view assets"
  ON company_assets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage assets"
  ON company_assets FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view asset maintenance"
  ON asset_maintenance FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage asset maintenance"
  ON asset_maintenance FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view property maintenance"
  ON property_maintenance FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage property maintenance"
  ON property_maintenance FOR ALL TO authenticated USING (true) WITH CHECK (true);
