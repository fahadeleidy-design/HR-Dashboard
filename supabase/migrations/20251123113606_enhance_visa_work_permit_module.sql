/*
  # Enhance Visa & Work Permit Module

  1. Changes to work_visas Table
    - Add MOL (Ministry of Labor) integration fields
    - Add Muqeem/Absher integration
    - Add quota management
    - Add cost breakdown
  
  2. Changes to residence_permits Table
    - Add dependent tracking
    - Add profession change tracking
    - Add fee structure
    - Add MOI (Ministry of Interior) integration
  
  3. Changes to visa_requests Table
    - Add workflow steps tracking
    - Add document checklist
    - Add fee breakdowns
  
  4. New Tables
    - visa_quotas - Company visa quota tracking
    - iqama_dependents - Track employee dependents' iqamas
    - visa_fees_structure - Government fees reference
    - profession_codes - Saudi profession codes (MOL)
*/

-- Add fields to work_visas table
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS profession_code text;
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS education_requirement text;
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS experience_requirement text;
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS salary_requirement decimal(15,2);
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS quota_id uuid;
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS mol_reference text;
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS mol_approval_date date;
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS absher_reference text;
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS visa_fees decimal(10,2);
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS recruitment_fees decimal(10,2);
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS medical_test_fees decimal(10,2);
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS insurance_fees decimal(10,2);
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS total_cost decimal(10,2);
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS payment_date date;
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS validity_months integer DEFAULT 3;
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS entry_date date;
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS converted_to_iqama_date date;
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS cancelled_date date;
ALTER TABLE work_visas ADD COLUMN IF NOT EXISTS cancellation_reason text;

COMMENT ON COLUMN work_visas.profession_code IS 'Saudi MOL profession code';
COMMENT ON COLUMN work_visas.mol_reference IS 'Ministry of Labor reference number';
COMMENT ON COLUMN work_visas.absher_reference IS 'Absher platform reference for visa application';

-- Add fields to residence_permits table
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS profession_code text;
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS profession_change_history jsonb;
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS blood_group text;
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS marital_status text;
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS dependents_count integer DEFAULT 0;
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS insurance_policy_number text;
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS medical_insurance_expiry date;
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS finger_print_date date;
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS collection_date date;
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS delivery_date date;
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS issuance_fees decimal(10,2);
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS renewal_fees decimal(10,2);
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS dependent_fees decimal(10,2);
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS total_fees decimal(10,2);
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS work_permit_number text;
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS work_permit_expiry date;
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS absher_account_status text;
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS last_absence_start date;
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS last_absence_end date;
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS total_absence_days integer DEFAULT 0;
ALTER TABLE residence_permits ADD COLUMN IF NOT EXISTS max_absence_exceeded boolean DEFAULT false;

COMMENT ON COLUMN residence_permits.profession_change_history IS 'JSON array tracking profession changes on iqama';
COMMENT ON COLUMN residence_permits.max_absence_exceeded IS 'Whether employee exceeded maximum allowed absence period (typically 6 months)';
COMMENT ON COLUMN residence_permits.work_permit_number IS 'Separate work permit number if applicable';

-- Add fields to visa_requests table
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS workflow_step text;
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS workflow_steps_completed text[];
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS current_step_assigned_to uuid REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS sponsor_id_number text;
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS sponsor_company_name text;
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS document_checklist jsonb;
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS missing_documents text[];
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS visa_fees decimal(10,2);
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS dependent_fees decimal(10,2);
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS insurance_fees decimal(10,2);
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS medical_fees decimal(10,2);
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS attestation_fees decimal(10,2);
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS translation_fees decimal(10,2);
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS courier_fees decimal(10,2);
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS other_fees decimal(10,2);
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS total_fees decimal(10,2);
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS urgency_fees decimal(10,2);
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS expected_completion_date date;
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS actual_completion_date date;
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS delay_reason text;
ALTER TABLE visa_requests ADD COLUMN IF NOT EXISTS assigned_to_id uuid REFERENCES employees(id) ON DELETE SET NULL;

COMMENT ON COLUMN visa_requests.document_checklist IS 'JSON object with required documents and their status';
COMMENT ON COLUMN visa_requests.workflow_steps_completed IS 'Array of completed workflow steps';

-- Visa quotas management
CREATE TABLE IF NOT EXISTS visa_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  quota_year integer NOT NULL,
  total_quota integer NOT NULL,
  saudi_quota_points integer NOT NULL DEFAULT 0,
  non_saudi_quota_points integer NOT NULL DEFAULT 0,
  quota_used integer DEFAULT 0,
  quota_available integer DEFAULT 0,
  quota_type text NOT NULL,
  profession_code text,
  profession_name text,
  nationality text,
  minimum_salary decimal(15,2),
  allocated_date date,
  expiry_date date,
  mol_reference text,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, quota_year, profession_code, nationality)
);

CREATE INDEX IF NOT EXISTS idx_visa_quotas_company ON visa_quotas(company_id);
CREATE INDEX IF NOT EXISTS idx_visa_quotas_year ON visa_quotas(quota_year);

ALTER TABLE visa_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view visa quotas"
  ON visa_quotas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage visa quotas"
  ON visa_quotas FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE visa_quotas IS 'Company visa quotas allocated by MOL based on Saudi/expat ratio and company size';

-- Add foreign key for quota_id in work_visas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'work_visas_quota_id_fkey'
  ) THEN
    ALTER TABLE work_visas 
    ADD CONSTRAINT work_visas_quota_id_fkey 
    FOREIGN KEY (quota_id) REFERENCES visa_quotas(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Iqama dependents tracking
CREATE TABLE IF NOT EXISTS iqama_dependents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  residence_permit_id uuid REFERENCES residence_permits(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  dependent_name text NOT NULL,
  dependent_name_ar text,
  relationship text NOT NULL,
  date_of_birth date NOT NULL,
  gender text NOT NULL,
  nationality text NOT NULL,
  passport_number text,
  passport_expiry date,
  iqama_number text UNIQUE,
  iqama_issue_date date,
  iqama_expiry_date date,
  border_number text,
  is_studying boolean DEFAULT false,
  school_name text,
  medical_insurance_number text,
  medical_insurance_expiry date,
  status text DEFAULT 'active',
  entry_date date,
  exit_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dependents_permit ON iqama_dependents(residence_permit_id);
CREATE INDEX IF NOT EXISTS idx_dependents_employee ON iqama_dependents(employee_id);
CREATE INDEX IF NOT EXISTS idx_dependents_iqama ON iqama_dependents(iqama_number);

ALTER TABLE iqama_dependents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dependents"
  ON iqama_dependents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage dependents"
  ON iqama_dependents FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE iqama_dependents IS 'Track employee dependents (spouse, children) with residence permits in Saudi Arabia';

-- Visa fees structure reference
CREATE TABLE IF NOT EXISTS visa_fees_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type text NOT NULL,
  description text NOT NULL,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'SAR',
  fee_category text NOT NULL,
  applicable_to text,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean DEFAULT true,
  government_fee boolean DEFAULT true,
  agent_fee boolean DEFAULT false,
  per_person boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visa_fees_type ON visa_fees_structure(fee_type);

ALTER TABLE visa_fees_structure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view visa fees"
  ON visa_fees_structure FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage visa fees"
  ON visa_fees_structure FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert standard Saudi visa fees (2024 rates)
INSERT INTO visa_fees_structure (fee_type, description, amount, fee_category, applicable_to, government_fee, notes) VALUES
('work_visa_issuance', 'Work visa issuance fee', 2000.00, 'visa', 'new_visa', true, 'Standard MOL work visa fee'),
('iqama_issuance', 'Residence permit (Iqama) issuance', 650.00, 'iqama', 'new_iqama', true, 'Per person iqama issuance'),
('iqama_renewal', 'Iqama renewal fee', 650.00, 'iqama', 'renewal', true, 'Annual iqama renewal fee'),
('exit_reentry_single', 'Single exit-reentry permit', 200.00, 'exit_reentry', 'all', true, 'Valid for 2 months'),
('exit_reentry_multiple', 'Multiple exit-reentry permit', 200.00, 'exit_reentry', 'all', true, 'Valid for duration of iqama'),
('dependent_iqama', 'Dependent iqama fee', 650.00, 'iqama', 'dependent', true, 'Per dependent family member'),
('profession_change', 'Profession change on iqama', 2000.00, 'iqama', 'profession_change', true, 'MOL profession change fee'),
('transfer_sponsorship', 'Sponsorship transfer fee', 2000.00, 'transfer', 'transfer', true, 'Transfer to new sponsor'),
('final_exit', 'Final exit visa', 0.00, 'exit', 'final_exit', true, 'No fee for final exit'),
('work_permit', 'Work permit fee', 2000.00, 'permit', 'work_permit', true, 'Annual work permit fee'),
('medical_test', 'Medical fitness test', 150.00, 'medical', 'all', true, 'Required medical examination'),
('health_insurance', 'Mandatory health insurance', 1200.00, 'insurance', 'all', false, 'Annual health insurance per person'),
('visa_stamping', 'Visa stamping at embassy', 300.00, 'visa', 'new_visa', true, 'Visa stamping fee at Saudi embassy'),
('document_attestation', 'Document attestation', 200.00, 'documents', 'all', false, 'Per document attestation'),
('translation_fee', 'Document translation', 100.00, 'documents', 'all', false, 'Per document translation to Arabic')
ON CONFLICT DO NOTHING;

-- Saudi profession codes reference
CREATE TABLE IF NOT EXISTS profession_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profession_code text UNIQUE NOT NULL,
  profession_name_en text NOT NULL,
  profession_name_ar text NOT NULL,
  profession_category text NOT NULL,
  saudization_eligible boolean DEFAULT false,
  minimum_salary decimal(15,2),
  education_requirement text,
  experience_requirement text,
  is_active boolean DEFAULT true,
  mol_category text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profession_code ON profession_codes(profession_code);
CREATE INDEX IF NOT EXISTS idx_profession_category ON profession_codes(profession_category);

ALTER TABLE profession_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view profession codes"
  ON profession_codes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage profession codes"
  ON profession_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE profession_codes IS 'Saudi Ministry of Labor profession codes for work visas and iqamas';

-- Insert common Saudi profession codes
INSERT INTO profession_codes (profession_code, profession_name_en, profession_name_ar, profession_category, saudization_eligible, minimum_salary) VALUES
('2411', 'Accountant', 'محاسب', 'Finance', true, 8000.00),
('2512', 'Software Developer', 'مطور برمجيات', 'IT', false, 10000.00),
('1120', 'General Manager', 'مدير عام', 'Management', false, 15000.00),
('2421', 'Management Consultant', 'مستشار إداري', 'Consulting', false, 12000.00),
('3313', 'Accountant Assistant', 'مساعد محاسب', 'Finance', true, 6000.00),
('2514', 'Web Designer', 'مصمم مواقع', 'IT', true, 8000.00),
('1211', 'Finance Manager', 'مدير مالي', 'Management', false, 15000.00),
('2310', 'University Professor', 'أستاذ جامعي', 'Education', false, 12000.00),
('2221', 'Nurse', 'ممرض', 'Healthcare', true, 7000.00),
('2212', 'Medical Doctor', 'طبيب', 'Healthcare', false, 15000.00),
('2166', 'Graphic Designer', 'مصمم جرافيك', 'Design', true, 7000.00),
('2433', 'Sales Representative', 'مندوب مبيعات', 'Sales', true, 5000.00),
('5223', 'Shop Sales Assistant', 'مساعد مبيعات', 'Retail', true, 4000.00),
('9333', 'Driver', 'سائق', 'Transportation', true, 3500.00),
('5120', 'Cook', 'طباخ', 'Hospitality', true, 4000.00),
('9510', 'Cleaner', 'عامل نظافة', 'Services', true, 3000.00),
('7111', 'Construction Worker', 'عامل بناء', 'Construction', true, 3500.00),
('8160', 'Food Processing Worker', 'عامل تصنيع أغذية', 'Manufacturing', true, 4000.00),
('2320', 'School Teacher', 'معلم مدرسة', 'Education', true, 8000.00),
('2434', 'Marketing Specialist', 'أخصائي تسويق', 'Marketing', true, 8000.00)
ON CONFLICT (profession_code) DO NOTHING;
