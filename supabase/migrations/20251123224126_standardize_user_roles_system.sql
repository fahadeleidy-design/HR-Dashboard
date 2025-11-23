/*
  # Standardize User Roles System
  
  This migration standardizes the role-based access control system with four clear roles:
  
  ## Roles
  
  ### 1. super_admin
  - Full system access across all modules
  - Can manage users, roles, and company settings
  - Can perform all CRUD operations on all data
  - Can approve sensitive operations (payroll, GOSI, end of service)
  
  ### 2. hr
  - Full access to employee management
  - Can manage attendance, leave, performance, training
  - Can create and edit payroll (but cannot approve)
  - Can manage compliance (Nitaqat, GOSI, visas)
  - Can create end of service calculations
  - Cannot access financial settings or approve final payroll
  
  ### 3. finance
  - Full access to payroll and financial modules
  - Can approve payroll batches
  - Can manage loans, advances, expenses
  - Can approve end of service payments
  - Limited access to employee personal data
  - Cannot modify employee records
  
  ### 4. employee
  - View-only access to own data
  - Can view own payslips, attendance, leave
  - Can submit leave requests
  - Can view own documents
  - Cannot access other employees' data
  - Cannot modify system data
  
  ## Changes
  
  1. Update user_roles table constraint to use new standardized roles
  2. Update all RLS policies to use standardized role names
  3. Maintain backward compatibility by mapping old roles to new ones
  
  ## Migration Strategy
  
  - Existing roles are mapped: hr_admin -> hr, hr_manager -> hr
  - All policies updated to use new role names
  - Safe migration with no data loss
*/

-- Drop the old constraint on user_roles
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add new standardized constraint
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
  CHECK (role IN ('super_admin', 'hr', 'finance', 'employee'));

-- Migrate existing role data (if any exists)
UPDATE user_roles SET role = 'hr' WHERE role IN ('hr_admin', 'hr_manager');

-- Update RLS policies for end_of_service_calculations

DROP POLICY IF EXISTS "HR and Admin can create EOS calculations" ON end_of_service_calculations;
CREATE POLICY "HR, Finance, and Super Admin can create EOS calculations"
  ON end_of_service_calculations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "HR and Admin can update draft EOS calculations" ON end_of_service_calculations;
CREATE POLICY "HR, Finance, and Super Admin can update draft EOS calculations"
  ON end_of_service_calculations
  FOR UPDATE
  TO authenticated
  USING (
    status = 'draft' AND
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'hr', 'finance')
    )
  );

DROP POLICY IF EXISTS "Admin can delete draft EOS calculations" ON end_of_service_calculations;
CREATE POLICY "Super Admin and Finance can delete draft EOS calculations"
  ON end_of_service_calculations
  FOR DELETE
  TO authenticated
  USING (
    status = 'draft' AND
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'finance')
    )
  );

-- Update RLS policies for end_of_service_calculation_details

DROP POLICY IF EXISTS "HR and Admin can create EOS calculation details" ON end_of_service_calculation_details;
CREATE POLICY "HR, Finance, and Super Admin can create EOS calculation details"
  ON end_of_service_calculation_details
  FOR INSERT
  TO authenticated
  WITH CHECK (
    calculation_id IN (
      SELECT eos.id 
      FROM end_of_service_calculations eos
      JOIN user_roles ur ON ur.company_id = eos.company_id
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'hr', 'finance')
      AND eos.status = 'draft'
    )
  );

DROP POLICY IF EXISTS "HR and Admin can update EOS calculation details" ON end_of_service_calculation_details;
CREATE POLICY "HR, Finance, and Super Admin can update EOS calculation details"
  ON end_of_service_calculation_details
  FOR UPDATE
  TO authenticated
  USING (
    calculation_id IN (
      SELECT eos.id 
      FROM end_of_service_calculations eos
      JOIN user_roles ur ON ur.company_id = eos.company_id
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'hr', 'finance')
      AND eos.status = 'draft'
    )
  );

DROP POLICY IF EXISTS "Admin can delete EOS calculation details" ON end_of_service_calculation_details;
CREATE POLICY "Super Admin and Finance can delete EOS calculation details"
  ON end_of_service_calculation_details
  FOR DELETE
  TO authenticated
  USING (
    calculation_id IN (
      SELECT eos.id 
      FROM end_of_service_calculations eos
      JOIN user_roles ur ON ur.company_id = eos.company_id
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'finance')
      AND eos.status = 'draft'
    )
  );

-- Add helpful view for role permissions
CREATE OR REPLACE VIEW user_role_permissions AS
SELECT 
  ur.id,
  ur.user_id,
  ur.company_id,
  ur.role,
  ur.employee_id,
  e.employee_number,
  e.first_name_en,
  e.last_name_en,
  c.name_en as company_name,
  CASE 
    WHEN ur.role = 'super_admin' THEN 'Full system access, can manage all settings and approve all operations'
    WHEN ur.role = 'hr' THEN 'Employee management, attendance, leave, performance, compliance, can create payroll and EOS'
    WHEN ur.role = 'finance' THEN 'Financial operations, approve payroll, manage loans/advances, approve EOS payments'
    WHEN ur.role = 'employee' THEN 'View own data only, submit leave requests'
    ELSE 'Unknown role'
  END as role_description,
  ur.created_at,
  ur.updated_at
FROM user_roles ur
LEFT JOIN employees e ON ur.employee_id = e.id
LEFT JOIN companies c ON ur.company_id = c.id;

-- Add comment explaining the role system
COMMENT ON TABLE user_roles IS 'User role-based access control system with four roles: super_admin (full access), hr (employee management), finance (financial operations), employee (view own data)';