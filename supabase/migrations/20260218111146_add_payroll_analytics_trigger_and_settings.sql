/*
  # Payroll Analytics Auto-Population & Settings

  1. Auto-populate payroll_analytics after payroll batch is marked processed/paid
  2. Create payroll_settings table for persisting configuration
  3. Add IBAN/bank fields to payroll table (already has them)
  4. Add function to generate analytics from batch data

  ## Changes:
  - New table: payroll_settings
  - Function: refresh_payroll_analytics(company_id, year, month)
  - Trigger: After payroll_batches update to processed/paid status
*/

-- Payroll settings table
CREATE TABLE IF NOT EXISTS payroll_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, setting_key)
);

ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Privileged roles can manage payroll settings"
  ON payroll_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.company_id = payroll_settings.company_id
      AND user_roles.role IN ('super_admin','admin','hr','finance')
    )
  );

CREATE POLICY "Privileged roles can insert payroll settings"
  ON payroll_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.company_id = payroll_settings.company_id
      AND user_roles.role IN ('super_admin','admin','hr','finance')
    )
  );

CREATE POLICY "Privileged roles can update payroll settings"
  ON payroll_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.company_id = payroll_settings.company_id
      AND user_roles.role IN ('super_admin','admin','hr','finance')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.company_id = payroll_settings.company_id
      AND user_roles.role IN ('super_admin','admin','hr','finance')
    )
  );

-- Function to refresh payroll analytics from batch data
CREATE OR REPLACE FUNCTION refresh_payroll_analytics(p_company_id uuid, p_batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year integer;
  v_month integer;
  v_batch payroll_batches%ROWTYPE;
BEGIN
  SELECT * INTO v_batch FROM payroll_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_year := EXTRACT(YEAR FROM v_batch.period_start);
  v_month := EXTRACT(MONTH FROM v_batch.period_start);

  INSERT INTO payroll_analytics (
    company_id,
    period_year,
    period_month,
    total_employees,
    saudi_employees,
    non_saudi_employees,
    total_gross,
    total_net,
    total_deductions,
    total_gosi_employee,
    total_gosi_employer,
    total_loans,
    total_advances,
    total_overtime,
    total_bonuses,
    avg_salary,
    avg_saudi_salary,
    avg_non_saudi_salary,
    gross_change_percentage,
    employee_count_change,
    cost_center_breakdown,
    department_breakdown,
    calculated_at
  )
  SELECT
    p_company_id,
    v_year,
    v_month,
    COUNT(pi.id),
    COUNT(pi.id) FILTER (WHERE e.is_saudi = true),
    COUNT(pi.id) FILTER (WHERE e.is_saudi = false),
    COALESCE(SUM(pi.total_earnings), 0),
    COALESCE(SUM(pi.net_salary), 0),
    COALESCE(SUM(pi.total_deductions), 0),
    COALESCE(SUM(pi.gosi_employee), 0),
    COALESCE(SUM(pi.gosi_employer), 0),
    COALESCE(SUM(pi.loan_deduction), 0),
    COALESCE(SUM(pi.advance_deduction), 0),
    COALESCE(SUM(pi.overtime_amount), 0),
    COALESCE(SUM(pi.bonus_amount), 0),
    CASE WHEN COUNT(pi.id) > 0 THEN COALESCE(SUM(pi.net_salary), 0) / COUNT(pi.id) ELSE 0 END,
    CASE WHEN COUNT(pi.id) FILTER (WHERE e.is_saudi = true) > 0 
      THEN COALESCE(SUM(pi.net_salary) FILTER (WHERE e.is_saudi = true), 0) / COUNT(pi.id) FILTER (WHERE e.is_saudi = true) 
      ELSE 0 END,
    CASE WHEN COUNT(pi.id) FILTER (WHERE e.is_saudi = false) > 0 
      THEN COALESCE(SUM(pi.net_salary) FILTER (WHERE e.is_saudi = false), 0) / COUNT(pi.id) FILTER (WHERE e.is_saudi = false) 
      ELSE 0 END,
    0,
    0,
    '{}',
    '{}',
    now()
  FROM payroll_items pi
  JOIN employees e ON e.id = pi.employee_id
  WHERE pi.batch_id = p_batch_id
  ON CONFLICT (company_id, period_year, period_month)
  DO UPDATE SET
    total_employees = EXCLUDED.total_employees,
    saudi_employees = EXCLUDED.saudi_employees,
    non_saudi_employees = EXCLUDED.non_saudi_employees,
    total_gross = EXCLUDED.total_gross,
    total_net = EXCLUDED.total_net,
    total_deductions = EXCLUDED.total_deductions,
    total_gosi_employee = EXCLUDED.total_gosi_employee,
    total_gosi_employer = EXCLUDED.total_gosi_employer,
    total_loans = EXCLUDED.total_loans,
    total_advances = EXCLUDED.total_advances,
    total_overtime = EXCLUDED.total_overtime,
    total_bonuses = EXCLUDED.total_bonuses,
    avg_salary = EXCLUDED.avg_salary,
    avg_saudi_salary = EXCLUDED.avg_saudi_salary,
    avg_non_saudi_salary = EXCLUDED.avg_non_saudi_salary,
    calculated_at = now();
END;
$$;

-- Add unique constraint on payroll_analytics if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payroll_analytics_company_period_unique'
  ) THEN
    ALTER TABLE payroll_analytics 
    ADD CONSTRAINT payroll_analytics_company_period_unique 
    UNIQUE (company_id, period_year, period_month);
  END IF;
END $$;

-- Trigger function to auto-refresh analytics when batch is paid/processed
CREATE OR REPLACE FUNCTION trigger_refresh_payroll_analytics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IN ('processed', 'paid') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM refresh_payroll_analytics(NEW.company_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payroll_batch_analytics_trigger ON payroll_batches;
CREATE TRIGGER payroll_batch_analytics_trigger
  AFTER UPDATE ON payroll_batches
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_payroll_analytics();
