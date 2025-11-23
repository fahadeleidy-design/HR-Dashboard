/*
  # Employee Handbook Management System
  
  This migration creates a comprehensive employee handbook management system
  that allows companies to upload, version, and distribute their employee handbooks.
  
  ## Features
  
  1. **Employee Handbooks Table**
     - Store multiple handbook versions
     - Track upload dates and updated dates
     - Support for multiple file formats (PDF, DOCX, etc.)
     - Version control with effective dates
     - Company-specific handbooks
     - File metadata (size, type, name)
  
  2. **Handbook Acknowledgments Table**
     - Track which employees have read the handbook
     - Record acknowledgment dates
     - Digital signature capability
     - Version tracking per acknowledgment
  
  3. **RLS Policies**
     - All authenticated users can view active handbooks
     - Only admins and super admins can upload/edit handbooks
     - Employees can acknowledge handbook receipt
     - Audit trail for compliance
  
  4. **Features**
     - Multiple handbook versions
     - Active/archived status
     - File metadata storage
     - Employee acknowledgment tracking
     - Compliance reporting
  
  ## Benefits
  
  - Centralized handbook distribution
  - Version control and history
  - Employee acknowledgment tracking
  - Compliance and audit trail
  - Easy updates and distribution
*/

-- Create employee_handbooks table
CREATE TABLE IF NOT EXISTS employee_handbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  version text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  file_type text,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create handbook_acknowledgments table
CREATE TABLE IF NOT EXISTS handbook_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handbook_id uuid NOT NULL REFERENCES employee_handbooks(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  acknowledged_at timestamptz DEFAULT now(),
  ip_address text,
  signature text,
  notes text,
  UNIQUE(handbook_id, employee_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employee_handbooks_company_id ON employee_handbooks(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_handbooks_active ON employee_handbooks(is_active);
CREATE INDEX IF NOT EXISTS idx_employee_handbooks_effective_date ON employee_handbooks(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_handbook_acknowledgments_handbook_id ON handbook_acknowledgments(handbook_id);
CREATE INDEX IF NOT EXISTS idx_handbook_acknowledgments_employee_id ON handbook_acknowledgments(employee_id);
CREATE INDEX IF NOT EXISTS idx_handbook_acknowledgments_company_id ON handbook_acknowledgments(company_id);

-- Enable RLS
ALTER TABLE employee_handbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE handbook_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_handbooks

-- All authenticated users can view handbooks for their company
CREATE POLICY "Users can view company handbooks"
  ON employee_handbooks
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

-- Admins and super admins can insert handbooks
CREATE POLICY "Admins can insert handbooks"
  ON employee_handbooks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'super_admin')
    )
  );

-- Admins and super admins can update handbooks
CREATE POLICY "Admins can update handbooks"
  ON employee_handbooks
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'super_admin')
    )
  );

-- Admins and super admins can delete handbooks
CREATE POLICY "Admins can delete handbooks"
  ON employee_handbooks
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for handbook_acknowledgments

-- Users can view acknowledgments for their company
CREATE POLICY "Users can view acknowledgments"
  ON handbook_acknowledgments
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

-- Employees can acknowledge handbooks
CREATE POLICY "Employees can acknowledge handbooks"
  ON handbook_acknowledgments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT e.id 
      FROM employees e
      WHERE e.company_id = company_id
    )
  );

-- Create view for handbook acknowledgment status
CREATE OR REPLACE VIEW handbook_acknowledgment_status AS
SELECT 
  eh.id as handbook_id,
  eh.company_id,
  eh.title,
  eh.version,
  eh.effective_date,
  e.id as employee_id,
  e.employee_number,
  e.first_name_en,
  e.last_name_en,
  e.job_title_en,
  e.department_id,
  d.name_en as department_name,
  ha.id as acknowledgment_id,
  ha.acknowledged_at,
  CASE 
    WHEN ha.id IS NOT NULL THEN true 
    ELSE false 
  END as has_acknowledged
FROM employee_handbooks eh
CROSS JOIN employees e
LEFT JOIN handbook_acknowledgments ha 
  ON ha.handbook_id = eh.id 
  AND ha.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE eh.is_active = true
  AND e.status = 'active'
  AND eh.company_id = e.company_id;

-- Function to get handbook acknowledgment statistics
CREATE OR REPLACE FUNCTION get_handbook_stats(handbook_uuid uuid)
RETURNS TABLE (
  total_employees bigint,
  acknowledged_count bigint,
  pending_count bigint,
  acknowledgment_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_employees,
    COUNT(ha.id)::bigint as acknowledged_count,
    (COUNT(*) - COUNT(ha.id))::bigint as pending_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(ha.id)::numeric / COUNT(*)::numeric) * 100, 2)
      ELSE 0
    END as acknowledgment_rate
  FROM employees e
  CROSS JOIN employee_handbooks eh
  LEFT JOIN handbook_acknowledgments ha 
    ON ha.handbook_id = eh.id 
    AND ha.employee_id = e.id
  WHERE eh.id = handbook_uuid
    AND e.company_id = eh.company_id
    AND e.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_handbook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_handbook_updated_at_trigger ON employee_handbooks;
CREATE TRIGGER update_handbook_updated_at_trigger
  BEFORE UPDATE ON employee_handbooks
  FOR EACH ROW
  EXECUTE FUNCTION update_handbook_updated_at();

-- Add comments
COMMENT ON TABLE employee_handbooks IS 'Stores company employee handbooks with version control';
COMMENT ON TABLE handbook_acknowledgments IS 'Tracks employee acknowledgment of handbook receipt and review';
COMMENT ON VIEW handbook_acknowledgment_status IS 'Shows handbook acknowledgment status for all active employees';
COMMENT ON FUNCTION get_handbook_stats IS 'Returns statistics about handbook acknowledgment rates';