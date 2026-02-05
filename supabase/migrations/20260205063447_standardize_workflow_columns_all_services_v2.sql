/*
  # Standardize Workflow Columns Across All HR Services

  This migration standardizes the multi-level approval workflow across all services
  that require approval workflows: expenses, penalties, travel, attendance exceptions.

  1. Changes to expense_claims
    - Add manager_approved_by, manager_approved_at
    - Add hr_approved_by, hr_approved_at  
    - Add finance_approved_by, finance_approved_at
    - Add rejected_by, rejected_at, rejection_reason
    - Add sla_deadline

  2. Changes to expense_reports
    - Add standard workflow columns

  3. Changes to employee_penalties
    - Standardize existing columns

  4. Changes to business_travel
    - Add multi-level approval columns

  5. Changes to attendance_exceptions
    - Add approval workflow columns

  6. Security
    - All existing RLS policies remain in effect
*/

-- =====================================================
-- EXPENSE CLAIMS - Add Multi-Level Workflow
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_claims' AND column_name = 'manager_approved_by') THEN
    ALTER TABLE expense_claims ADD COLUMN manager_approved_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_claims' AND column_name = 'manager_approved_at') THEN
    ALTER TABLE expense_claims ADD COLUMN manager_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_claims' AND column_name = 'hr_approved_by') THEN
    ALTER TABLE expense_claims ADD COLUMN hr_approved_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_claims' AND column_name = 'hr_approved_at') THEN
    ALTER TABLE expense_claims ADD COLUMN hr_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_claims' AND column_name = 'finance_approved_by') THEN
    ALTER TABLE expense_claims ADD COLUMN finance_approved_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_claims' AND column_name = 'finance_approved_at') THEN
    ALTER TABLE expense_claims ADD COLUMN finance_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_claims' AND column_name = 'rejected_by') THEN
    ALTER TABLE expense_claims ADD COLUMN rejected_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_claims' AND column_name = 'rejected_at') THEN
    ALTER TABLE expense_claims ADD COLUMN rejected_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_claims' AND column_name = 'workflow_rejection_reason') THEN
    ALTER TABLE expense_claims ADD COLUMN workflow_rejection_reason text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_claims' AND column_name = 'sla_deadline') THEN
    ALTER TABLE expense_claims ADD COLUMN sla_deadline timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expense_claims_manager_approved ON expense_claims(manager_approved_by);
CREATE INDEX IF NOT EXISTS idx_expense_claims_hr_approved ON expense_claims(hr_approved_by);
CREATE INDEX IF NOT EXISTS idx_expense_claims_finance_approved ON expense_claims(finance_approved_by);
CREATE INDEX IF NOT EXISTS idx_expense_claims_sla ON expense_claims(sla_deadline);

-- =====================================================
-- EXPENSE REPORTS - Add Multi-Level Workflow
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_reports' AND column_name = 'manager_approved_by') THEN
    ALTER TABLE expense_reports ADD COLUMN manager_approved_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_reports' AND column_name = 'manager_approved_at') THEN
    ALTER TABLE expense_reports ADD COLUMN manager_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_reports' AND column_name = 'hr_approved_by') THEN
    ALTER TABLE expense_reports ADD COLUMN hr_approved_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_reports' AND column_name = 'hr_approved_at') THEN
    ALTER TABLE expense_reports ADD COLUMN hr_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_reports' AND column_name = 'finance_approved_by') THEN
    ALTER TABLE expense_reports ADD COLUMN finance_approved_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_reports' AND column_name = 'finance_approved_at') THEN
    ALTER TABLE expense_reports ADD COLUMN finance_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_reports' AND column_name = 'rejected_by') THEN
    ALTER TABLE expense_reports ADD COLUMN rejected_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_reports' AND column_name = 'rejected_at') THEN
    ALTER TABLE expense_reports ADD COLUMN rejected_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_reports' AND column_name = 'workflow_rejection_reason') THEN
    ALTER TABLE expense_reports ADD COLUMN workflow_rejection_reason text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_reports' AND column_name = 'sla_deadline') THEN
    ALTER TABLE expense_reports ADD COLUMN sla_deadline timestamptz;
  END IF;
END $$;

-- =====================================================
-- EMPLOYEE PENALTIES - Standardize Workflow Columns
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_penalties' AND column_name = 'manager_approved_by') THEN
    ALTER TABLE employee_penalties ADD COLUMN manager_approved_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_penalties' AND column_name = 'manager_approved_at') THEN
    ALTER TABLE employee_penalties ADD COLUMN manager_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_penalties' AND column_name = 'rejected_by') THEN
    ALTER TABLE employee_penalties ADD COLUMN rejected_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_penalties' AND column_name = 'rejected_at') THEN
    ALTER TABLE employee_penalties ADD COLUMN rejected_at timestamptz;
  END IF;
END $$;

-- =====================================================
-- BUSINESS TRAVEL - Add Multi-Level Workflow
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_travel' AND column_name = 'manager_approved_by') THEN
    ALTER TABLE business_travel ADD COLUMN manager_approved_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_travel' AND column_name = 'manager_approved_at') THEN
    ALTER TABLE business_travel ADD COLUMN manager_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_travel' AND column_name = 'hr_approved_by') THEN
    ALTER TABLE business_travel ADD COLUMN hr_approved_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_travel' AND column_name = 'hr_approved_at') THEN
    ALTER TABLE business_travel ADD COLUMN hr_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_travel' AND column_name = 'finance_approved_by') THEN
    ALTER TABLE business_travel ADD COLUMN finance_approved_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_travel' AND column_name = 'finance_approved_at') THEN
    ALTER TABLE business_travel ADD COLUMN finance_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_travel' AND column_name = 'rejected_by') THEN
    ALTER TABLE business_travel ADD COLUMN rejected_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_travel' AND column_name = 'rejected_at') THEN
    ALTER TABLE business_travel ADD COLUMN rejected_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_travel' AND column_name = 'rejection_reason') THEN
    ALTER TABLE business_travel ADD COLUMN rejection_reason text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_travel' AND column_name = 'sla_deadline') THEN
    ALTER TABLE business_travel ADD COLUMN sla_deadline timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_business_travel_manager_approved ON business_travel(manager_approved_by);
CREATE INDEX IF NOT EXISTS idx_business_travel_hr_approved ON business_travel(hr_approved_by);
CREATE INDEX IF NOT EXISTS idx_business_travel_finance_approved ON business_travel(finance_approved_by);

-- =====================================================
-- ATTENDANCE EXCEPTIONS - Add Workflow Columns
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_exceptions' AND column_name = 'manager_approved_by') THEN
    ALTER TABLE attendance_exceptions ADD COLUMN manager_approved_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_exceptions' AND column_name = 'manager_approved_at') THEN
    ALTER TABLE attendance_exceptions ADD COLUMN manager_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_exceptions' AND column_name = 'hr_approved_by') THEN
    ALTER TABLE attendance_exceptions ADD COLUMN hr_approved_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_exceptions' AND column_name = 'hr_approved_at') THEN
    ALTER TABLE attendance_exceptions ADD COLUMN hr_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_exceptions' AND column_name = 'rejected_by') THEN
    ALTER TABLE attendance_exceptions ADD COLUMN rejected_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_exceptions' AND column_name = 'rejected_at') THEN
    ALTER TABLE attendance_exceptions ADD COLUMN rejected_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_exceptions' AND column_name = 'rejection_reason') THEN
    ALTER TABLE attendance_exceptions ADD COLUMN rejection_reason text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_exceptions' AND column_name = 'sla_deadline') THEN
    ALTER TABLE attendance_exceptions ADD COLUMN sla_deadline timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_manager_approved ON attendance_exceptions(manager_approved_by);
CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_hr_approved ON attendance_exceptions(hr_approved_by);

-- =====================================================
-- ATTENDANCE REQUESTS - Add Workflow Columns
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_requests' AND column_name = 'manager_approved_by') THEN
    ALTER TABLE attendance_requests ADD COLUMN manager_approved_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_requests' AND column_name = 'manager_approved_at') THEN
    ALTER TABLE attendance_requests ADD COLUMN manager_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_requests' AND column_name = 'hr_approved_by') THEN
    ALTER TABLE attendance_requests ADD COLUMN hr_approved_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_requests' AND column_name = 'hr_approved_at') THEN
    ALTER TABLE attendance_requests ADD COLUMN hr_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_requests' AND column_name = 'rejected_by') THEN
    ALTER TABLE attendance_requests ADD COLUMN rejected_by uuid REFERENCES employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_requests' AND column_name = 'rejected_at') THEN
    ALTER TABLE attendance_requests ADD COLUMN rejected_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_requests' AND column_name = 'rejection_reason') THEN
    ALTER TABLE attendance_requests ADD COLUMN rejection_reason text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_requests' AND column_name = 'sla_deadline') THEN
    ALTER TABLE attendance_requests ADD COLUMN sla_deadline timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_requests_manager_approved ON attendance_requests(manager_approved_by);
CREATE INDEX IF NOT EXISTS idx_attendance_requests_hr_approved ON attendance_requests(hr_approved_by);
