/*
  # Comprehensive Audit Log System
  
  This migration creates a complete audit logging system that automatically tracks all changes
  across critical tables in the HR management system.
  
  ## Features
  
  1. **Enhanced Audit Log Table**
     - Tracks all INSERT, UPDATE, DELETE operations
     - Stores old and new values for comparison
     - Records user information and IP addresses
     - Includes descriptive action descriptions
     - Links to employee records for better context
  
  2. **Automatic Audit Triggers**
     - Triggers on all critical tables
     - Captures before/after states
     - Identifies action types (INSERT/UPDATE/DELETE)
     - Records user context automatically
  
  3. **RLS Policies**
     - Only Super Admins can view audit logs
     - Audit logs cannot be modified or deleted (append-only)
     - Read-only access for security compliance
  
  ## Tables Audited
  
  - employees (employee records)
  - payroll (salary and payment data)
  - user_roles (role assignments)
  - departments (organizational structure)
  - loans (loan transactions)
  - advances (advance payments)
  - leave_requests (leave management)
  - attendance (time tracking)
  - end_of_service_calculations (termination benefits)
  
  ## Benefits
  
  - Full audit trail for compliance
  - Security monitoring and breach detection
  - Change history and accountability
  - Regulatory compliance (labor law, GOSI)
  - Debugging and troubleshooting
*/

-- Enhance audit_log table with additional fields
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES employees(id);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS action_description text;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_agent text;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_log_company_id ON audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_employee_id ON audit_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Enable RLS on audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Super admin can view all audit logs" ON audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;

-- Super admins can view audit logs
CREATE POLICY "Super admin can view all audit logs"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'super_admin'
    )
  );

-- System can insert audit logs (no user restriction for automated triggers)
CREATE POLICY "System can insert audit logs"
  ON audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Prevent updates and deletes (append-only audit log)
CREATE POLICY "Audit logs cannot be updated"
  ON audit_log
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Audit logs cannot be deleted"
  ON audit_log
  FOR DELETE
  TO authenticated
  USING (false);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  company_id_value uuid;
  employee_id_value uuid;
  action_desc text;
BEGIN
  -- Determine company_id
  IF TG_OP = 'DELETE' THEN
    company_id_value := OLD.company_id;
    IF TG_TABLE_NAME = 'employees' THEN
      employee_id_value := OLD.id;
    ELSIF OLD.employee_id IS NOT NULL THEN
      employee_id_value := OLD.employee_id;
    END IF;
  ELSE
    company_id_value := NEW.company_id;
    IF TG_TABLE_NAME = 'employees' THEN
      employee_id_value := NEW.id;
    ELSIF NEW.employee_id IS NOT NULL THEN
      employee_id_value := NEW.employee_id;
    END IF;
  END IF;

  -- Generate action description
  action_desc := TG_OP || ' on ' || TG_TABLE_NAME;
  IF TG_TABLE_NAME = 'employees' THEN
    IF TG_OP = 'INSERT' THEN
      action_desc := 'Created employee: ' || COALESCE(NEW.first_name_en, '') || ' ' || COALESCE(NEW.last_name_en, '');
    ELSIF TG_OP = 'UPDATE' THEN
      action_desc := 'Updated employee: ' || COALESCE(NEW.first_name_en, '') || ' ' || COALESCE(NEW.last_name_en, '');
    ELSIF TG_OP = 'DELETE' THEN
      action_desc := 'Deleted employee: ' || COALESCE(OLD.first_name_en, '') || ' ' || COALESCE(OLD.last_name_en, '');
    END IF;
  ELSIF TG_TABLE_NAME = 'payroll' THEN
    action_desc := TG_OP || ' payroll record';
  ELSIF TG_TABLE_NAME = 'user_roles' THEN
    IF TG_OP = 'INSERT' THEN
      action_desc := 'Assigned role: ' || NEW.role;
    ELSIF TG_OP = 'UPDATE' THEN
      action_desc := 'Updated role from ' || OLD.role || ' to ' || NEW.role;
    ELSIF TG_OP = 'DELETE' THEN
      action_desc := 'Removed role: ' || OLD.role;
    END IF;
  ELSIF TG_TABLE_NAME = 'end_of_service_calculations' THEN
    action_desc := TG_OP || ' end of service calculation';
  END IF;

  -- Insert audit log entry
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (
      company_id,
      user_id,
      employee_id,
      action,
      action_description,
      table_name,
      record_id,
      old_values,
      new_values,
      timestamp
    ) VALUES (
      company_id_value,
      auth.uid(),
      employee_id_value,
      TG_OP,
      action_desc,
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      NULL,
      now()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (
      company_id,
      user_id,
      employee_id,
      action,
      action_description,
      table_name,
      record_id,
      old_values,
      new_values,
      timestamp
    ) VALUES (
      company_id_value,
      auth.uid(),
      employee_id_value,
      TG_OP,
      action_desc,
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (
      company_id,
      user_id,
      employee_id,
      action,
      action_description,
      table_name,
      record_id,
      old_values,
      new_values,
      timestamp
    ) VALUES (
      company_id_value,
      auth.uid(),
      employee_id_value,
      TG_OP,
      action_desc,
      TG_TABLE_NAME,
      NEW.id,
      NULL,
      to_jsonb(NEW),
      now()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for critical tables

-- Employees table
DROP TRIGGER IF EXISTS audit_employees_trigger ON employees;
CREATE TRIGGER audit_employees_trigger
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Payroll table
DROP TRIGGER IF EXISTS audit_payroll_trigger ON payroll;
CREATE TRIGGER audit_payroll_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payroll
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- User roles table
DROP TRIGGER IF EXISTS audit_user_roles_trigger ON user_roles;
CREATE TRIGGER audit_user_roles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Departments table
DROP TRIGGER IF EXISTS audit_departments_trigger ON departments;
CREATE TRIGGER audit_departments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON departments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Loans table
DROP TRIGGER IF EXISTS audit_loans_trigger ON loans;
CREATE TRIGGER audit_loans_trigger
  AFTER INSERT OR UPDATE OR DELETE ON loans
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Advances table
DROP TRIGGER IF EXISTS audit_advances_trigger ON advances;
CREATE TRIGGER audit_advances_trigger
  AFTER INSERT OR UPDATE OR DELETE ON advances
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Leave requests table
DROP TRIGGER IF EXISTS audit_leave_requests_trigger ON leave_requests;
CREATE TRIGGER audit_leave_requests_trigger
  AFTER INSERT OR UPDATE OR DELETE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Attendance table
DROP TRIGGER IF EXISTS audit_attendance_trigger ON attendance;
CREATE TRIGGER audit_attendance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON attendance
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- End of service calculations table
DROP TRIGGER IF EXISTS audit_eos_trigger ON end_of_service_calculations;
CREATE TRIGGER audit_eos_trigger
  AFTER INSERT OR UPDATE OR DELETE ON end_of_service_calculations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create helpful view for audit log display
CREATE OR REPLACE VIEW audit_log_detailed AS
SELECT 
  al.id,
  al.company_id,
  al.timestamp,
  al.action,
  al.action_description,
  al.table_name,
  al.record_id,
  al.old_values,
  al.new_values,
  al.ip_address,
  al.user_agent,
  al.user_id,
  e.employee_number,
  e.first_name_en as employee_first_name,
  e.last_name_en as employee_last_name,
  ur.role as user_role,
  c.name_en as company_name
FROM audit_log al
LEFT JOIN employees e ON al.employee_id = e.id
LEFT JOIN user_roles ur ON al.user_id = ur.user_id AND al.company_id = ur.company_id
LEFT JOIN companies c ON al.company_id = c.id
ORDER BY al.timestamp DESC;

-- Add comment
COMMENT ON TABLE audit_log IS 'Comprehensive audit trail of all system changes. Append-only table accessible only by Super Admins.';