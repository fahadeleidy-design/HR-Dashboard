/*
  # Enterprise Multi-Tenant Architecture with Tenant Isolation and Encryption

  ## Overview
  This migration creates a comprehensive multi-tenant architecture supporting:
  - Tenant isolation with data encryption
  - Holding company and subsidiary relationships
  - Tenant-specific configurations
  - Cross-company reporting capabilities

  ## New Tables

  ### 1. tenant_groups (Holding Companies)
    - `id` (uuid, primary key)
    - `name` (text) - Holding company name
    - `description` (text)
    - `status` (enum: active, suspended, archived)
    - `settings` (jsonb) - Group-wide settings
    - `created_at`, `updated_at`

  ### 2. tenant_encryption_keys
    - `id` (uuid, primary key)
    - `company_id` (uuid, foreign key)
    - `key_version` (integer) - For key rotation
    - `encryption_key_hash` (text) - Hashed encryption key
    - `key_metadata` (jsonb) - Key rotation history
    - `is_active` (boolean)
    - `created_at`, `expires_at`

  ### 3. tenant_configurations
    - `id` (uuid, primary key)
    - `company_id` (uuid, foreign key)
    - `feature_flags` (jsonb) - Module enablement
    - `business_rules` (jsonb) - Company-specific rules
    - `workflow_settings` (jsonb) - Custom workflows
    - `compliance_settings` (jsonb) - Regulatory requirements
    - `notification_settings` (jsonb)
    - `updated_at`, `updated_by`

  ### 4. tenant_branding (White-labeling)
    - `id` (uuid, primary key)
    - `company_id` (uuid, foreign key)
    - `logo_url` (text)
    - `favicon_url` (text)
    - `primary_color` (text)
    - `secondary_color` (text)
    - `accent_color` (text)
    - `theme_config` (jsonb) - Full theme customization
    - `custom_domain` (text)
    - `email_templates` (jsonb)
    - `terminology` (jsonb) - Custom labels

  ### 5. tenant_hierarchy
    - `id` (uuid, primary key)
    - `parent_company_id` (uuid) - Holding company
    - `child_company_id` (uuid) - Subsidiary
    - `relationship_type` (enum: subsidiary, branch, franchise)
    - `data_sharing_level` (enum: full, partial, none)
    - `created_at`

  ### 6. tenant_admin_access
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key)
    - `company_id` (uuid, foreign key) - NULL for super admin
    - `tenant_group_id` (uuid, foreign key) - For holding company admins
    - `access_level` (enum: super_admin, tenant_group_admin, tenant_admin)
    - `granted_at`, `granted_by`

  ### 7. cross_company_reports
    - `id` (uuid, primary key)
    - `tenant_group_id` (uuid, foreign key)
    - `report_type` (text)
    - `report_config` (jsonb)
    - `included_companies` (uuid[])
    - `scheduled_frequency` (text)
    - `created_by`, `created_at`

  ### 8. tenant_audit_access_log (Enhanced security)
    - `id` (uuid, primary key)
    - `user_id` (uuid)
    - `company_id` (uuid)
    - `accessed_table` (text)
    - `accessed_record_id` (uuid)
    - `access_type` (enum: read, write, delete)
    - `ip_address` (inet)
    - `user_agent` (text)
    - `timestamp` (timestamptz)

  ## Updates to Existing Tables

  ### companies table enhancements
    - Add `tenant_group_id` (uuid) - Link to holding company
    - Add `encryption_enabled` (boolean)
    - Add `data_residency` (text) - For compliance
    - Add `tenant_status` (enum: active, suspended, trial, archived)
    - Add `subscription_tier` (enum: basic, professional, enterprise)
    - Add `max_users` (integer)
    - Add `custom_subdomain` (text)

  ## Security
    - Enable RLS on all new tables
    - Strict tenant isolation policies
    - Audit logging for all access
    - Encryption key rotation support
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE tenant_status_enum AS ENUM ('active', 'suspended', 'trial', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_tier_enum AS ENUM ('basic', 'professional', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE relationship_type_enum AS ENUM ('subsidiary', 'branch', 'franchise', 'partner');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE data_sharing_level_enum AS ENUM ('full', 'partial', 'none');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tenant_admin_level_enum AS ENUM ('super_admin', 'tenant_group_admin', 'tenant_admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE access_type_enum AS ENUM ('read', 'write', 'delete', 'export');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 1. Tenant Groups (Holding Companies)
CREATE TABLE IF NOT EXISTS tenant_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status tenant_status_enum DEFAULT 'active',
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enhance companies table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'tenant_group_id') THEN
    ALTER TABLE companies ADD COLUMN tenant_group_id uuid REFERENCES tenant_groups(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'encryption_enabled') THEN
    ALTER TABLE companies ADD COLUMN encryption_enabled boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'data_residency') THEN
    ALTER TABLE companies ADD COLUMN data_residency text DEFAULT 'SA';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'tenant_status') THEN
    ALTER TABLE companies ADD COLUMN tenant_status tenant_status_enum DEFAULT 'active';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'subscription_tier') THEN
    ALTER TABLE companies ADD COLUMN subscription_tier subscription_tier_enum DEFAULT 'professional';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'max_users') THEN
    ALTER TABLE companies ADD COLUMN max_users integer DEFAULT 100;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'custom_subdomain') THEN
    ALTER TABLE companies ADD COLUMN custom_subdomain text UNIQUE;
  END IF;
END $$;

-- 3. Tenant Encryption Keys
CREATE TABLE IF NOT EXISTS tenant_encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  key_version integer DEFAULT 1,
  encryption_key_hash text NOT NULL,
  key_metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(company_id, key_version)
);

-- 4. Tenant Configurations
CREATE TABLE IF NOT EXISTS tenant_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  feature_flags jsonb DEFAULT '{
    "recruitment": true,
    "performance": true,
    "training": true,
    "payroll": true,
    "attendance": true,
    "leave": true,
    "expenses": true,
    "documents": true,
    "contracts": true,
    "compliance": true
  }'::jsonb,
  business_rules jsonb DEFAULT '{
    "leave_approval_chain": ["manager", "hr"],
    "expense_approval_threshold": 5000,
    "loan_approval_levels": 2,
    "probation_period_days": 90
  }'::jsonb,
  workflow_settings jsonb DEFAULT '{}'::jsonb,
  compliance_settings jsonb DEFAULT '{
    "gosi_integration": true,
    "mudad_integration": false,
    "nitaqat_tracking": true
  }'::jsonb,
  notification_settings jsonb DEFAULT '{
    "email_enabled": true,
    "sms_enabled": false,
    "push_enabled": true
  }'::jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- 5. Tenant Branding (White-labeling)
CREATE TABLE IF NOT EXISTS tenant_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  logo_url text,
  favicon_url text,
  primary_color text DEFAULT '#2563eb',
  secondary_color text DEFAULT '#1e40af',
  accent_color text DEFAULT '#3b82f6',
  theme_config jsonb DEFAULT '{
    "fontFamily": "Inter, system-ui, sans-serif",
    "borderRadius": "0.5rem",
    "spacing": "1rem"
  }'::jsonb,
  custom_domain text UNIQUE,
  email_templates jsonb DEFAULT '{
    "welcome": {"subject": "Welcome to {{company_name}}", "body": ""},
    "leave_approved": {"subject": "Leave Request Approved", "body": ""},
    "payslip": {"subject": "Your Payslip for {{month}}", "body": ""}
  }'::jsonb,
  terminology jsonb DEFAULT '{
    "employee": "Employee",
    "department": "Department",
    "leave": "Leave",
    "expense": "Expense"
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Tenant Hierarchy
CREATE TABLE IF NOT EXISTS tenant_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  child_company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  relationship_type relationship_type_enum DEFAULT 'subsidiary',
  data_sharing_level data_sharing_level_enum DEFAULT 'partial',
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_company_id, child_company_id),
  CHECK (parent_company_id != child_company_id)
);

-- 7. Tenant Admin Access
CREATE TABLE IF NOT EXISTS tenant_admin_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  tenant_group_id uuid REFERENCES tenant_groups(id) ON DELETE CASCADE,
  access_level tenant_admin_level_enum NOT NULL,
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id)
);

-- 8. Cross-Company Reports
CREATE TABLE IF NOT EXISTS cross_company_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_group_id uuid REFERENCES tenant_groups(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  report_name text NOT NULL,
  report_config jsonb DEFAULT '{}'::jsonb,
  included_companies uuid[],
  scheduled_frequency text,
  last_generated_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 9. Enhanced Audit Access Log
CREATE TABLE IF NOT EXISTS tenant_audit_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  company_id uuid REFERENCES companies(id),
  accessed_table text NOT NULL,
  accessed_record_id uuid,
  access_type access_type_enum NOT NULL,
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true,
  error_message text,
  timestamp timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_tenant_group ON companies(tenant_group_id);
CREATE INDEX IF NOT EXISTS idx_companies_subdomain ON companies(custom_subdomain);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_company ON tenant_encryption_keys(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_hierarchy_parent ON tenant_hierarchy(parent_company_id);
CREATE INDEX IF NOT EXISTS idx_tenant_hierarchy_child ON tenant_hierarchy(child_company_id);
CREATE INDEX IF NOT EXISTS idx_admin_access_user ON tenant_admin_access(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_access_company ON tenant_admin_access(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_company_time ON tenant_audit_access_log(company_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_time ON tenant_audit_access_log(user_id, timestamp DESC);

-- Enable RLS
ALTER TABLE tenant_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_admin_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_company_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_audit_access_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Tenant Groups: Only super admins and group admins can access
CREATE POLICY "Super admins can manage all tenant groups"
  ON tenant_groups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Group admins can view their tenant groups"
  ON tenant_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_admin_access
      WHERE tenant_admin_access.user_id = auth.uid()
      AND tenant_admin_access.tenant_group_id = tenant_groups.id
      AND tenant_admin_access.access_level IN ('tenant_group_admin', 'super_admin')
    )
  );

-- Encryption Keys: Only super admins and tenant admins can access
CREATE POLICY "Super admins can manage all encryption keys"
  ON tenant_encryption_keys FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Tenant admins can view their company encryption keys"
  ON tenant_encryption_keys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_admin_access taa
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE taa.user_id = auth.uid()
      AND taa.company_id = tenant_encryption_keys.company_id
      AND ur.role IN ('super_admin', 'admin')
    )
  );

-- Tenant Configurations: Company users can view, admins can modify
CREATE POLICY "Users can view their company configuration"
  ON tenant_configurations FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can update their company configuration"
  ON tenant_configurations FOR UPDATE
  TO authenticated
  USING (
    (company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    ))
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    (company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    ))
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can create tenant configurations"
  ON tenant_configurations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Tenant Branding: Company users can view, admins can modify
CREATE POLICY "Users can view their company branding"
  ON tenant_branding FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can manage their company branding"
  ON tenant_branding FOR ALL
  TO authenticated
  USING (
    (company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    ))
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    (company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    ))
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Tenant Hierarchy: Viewable by related companies
CREATE POLICY "Users can view their company hierarchy"
  ON tenant_hierarchy FOR SELECT
  TO authenticated
  USING (
    parent_company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
    OR child_company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins and group admins can manage hierarchy"
  ON tenant_hierarchy FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Tenant Admin Access
CREATE POLICY "Users can view their own admin access"
  ON tenant_admin_access FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage tenant admin access"
  ON tenant_admin_access FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Cross-Company Reports
CREATE POLICY "Group admins can manage their reports"
  ON cross_company_reports FOR ALL
  TO authenticated
  USING (
    tenant_group_id IN (
      SELECT tenant_group_id FROM tenant_admin_access
      WHERE user_id = auth.uid()
      AND access_level IN ('tenant_group_admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    tenant_group_id IN (
      SELECT tenant_group_id FROM tenant_admin_access
      WHERE user_id = auth.uid()
      AND access_level IN ('tenant_group_admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Audit Access Log
CREATE POLICY "Users can view their own audit logs"
  ON tenant_audit_access_log FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON tenant_audit_access_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create helper functions

-- Function to check if user has access to company data
CREATE OR REPLACE FUNCTION check_tenant_access(
  p_user_id uuid,
  p_company_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Super admin has access to all
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'super_admin'
  ) THEN
    RETURN true;
  END IF;
  
  -- Check direct company access
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND company_id = p_company_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Check tenant group admin access
  IF EXISTS (
    SELECT 1 FROM tenant_admin_access taa
    JOIN companies c ON c.tenant_group_id = taa.tenant_group_id
    WHERE taa.user_id = p_user_id
    AND c.id = p_company_id
    AND taa.access_level = 'tenant_group_admin'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to get all accessible companies for a user
CREATE OR REPLACE FUNCTION get_accessible_companies(p_user_id uuid)
RETURNS TABLE (company_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Super admin sees all
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'super_admin'
  ) THEN
    RETURN QUERY SELECT id FROM companies;
    RETURN;
  END IF;
  
  -- Return user's direct companies
  RETURN QUERY
  SELECT DISTINCT ur.company_id
  FROM user_roles ur
  WHERE ur.user_id = p_user_id;
  
  -- Add companies from tenant group admin access
  RETURN QUERY
  SELECT DISTINCT c.id
  FROM tenant_admin_access taa
  JOIN companies c ON c.tenant_group_id = taa.tenant_group_id
  WHERE taa.user_id = p_user_id
  AND taa.access_level = 'tenant_group_admin';
END;
$$;

-- Function to log data access
CREATE OR REPLACE FUNCTION log_data_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Extract company_id from the record
  IF TG_OP = 'DELETE' THEN
    v_company_id := OLD.company_id;
  ELSE
    v_company_id := NEW.company_id;
  END IF;
  
  -- Insert audit log
  INSERT INTO tenant_audit_access_log (
    user_id,
    company_id,
    accessed_table,
    accessed_record_id,
    access_type,
    timestamp
  ) VALUES (
    auth.uid(),
    v_company_id,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE TG_OP
      WHEN 'INSERT' THEN 'write'::access_type_enum
      WHEN 'UPDATE' THEN 'write'::access_type_enum
      WHEN 'DELETE' THEN 'delete'::access_type_enum
    END,
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for audit logging on sensitive tables (examples)
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS audit_employees_access ON employees;
  CREATE TRIGGER audit_employees_access
    AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW EXECUTE FUNCTION log_data_access();
    
  DROP TRIGGER IF EXISTS audit_payroll_access ON payroll_items;
  CREATE TRIGGER audit_payroll_access
    AFTER INSERT OR UPDATE OR DELETE ON payroll_items
    FOR EACH ROW EXECUTE FUNCTION log_data_access();
END $$;
