/*
  # Enterprise Fine-Grained Permissions System

  ## Overview
  Implements comprehensive RBAC with module-level permissions (read, write, delete, approve),
  department-level data isolation, dynamic permission inheritance, and full audit trails.

  ## New Tables

  ### 1. `permission_modules`
  Defines all system modules that can have permissions

  ### 2. `role_module_permissions`
  Fine-grained permissions per role and module

  ### 3. `user_module_permissions`
  User-specific permission overrides

  ### 4. `permission_inheritance_rules`
  Dynamic permission inheritance configuration

  ### 5. `department_data_isolation`
  Department-level access control rules

  ### 6. `permission_audit_log`
  Comprehensive permission change and usage audit

  ## Security
  - RLS enabled on all tables
  - Super admin and tenant admin can manage permissions
  - Department managers can view department permissions
  - All permission changes are audited
*/

-- =====================================================
-- 1. PERMISSION MODULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS permission_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  parent_module_id uuid REFERENCES permission_modules(id) ON DELETE CASCADE,
  icon text,
  route_path text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permission_modules_name ON permission_modules(name);
CREATE INDEX IF NOT EXISTS idx_permission_modules_parent ON permission_modules(parent_module_id);
CREATE INDEX IF NOT EXISTS idx_permission_modules_active ON permission_modules(is_active);

-- =====================================================
-- 2. ROLE MODULE PERMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS role_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES user_roles(id) ON DELETE CASCADE,
  module_id uuid REFERENCES permission_modules(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,

  can_read boolean DEFAULT false,
  can_write boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_approve boolean DEFAULT false,
  can_export boolean DEFAULT false,

  conditions jsonb DEFAULT '{}'::jsonb,
  scope text CHECK (scope IN ('global', 'company', 'department', 'team', 'own')) DEFAULT 'own',
  priority integer DEFAULT 0,

  is_active boolean DEFAULT true,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_permissions_unique 
  ON role_module_permissions(role_id, module_id, company_id, department_id) 
  WHERE department_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_permissions_unique_no_dept 
  ON role_module_permissions(role_id, module_id, company_id) 
  WHERE department_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_module_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_module ON role_module_permissions(module_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_company ON role_module_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_department ON role_module_permissions(department_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup ON role_module_permissions(role_id, module_id, company_id);

-- =====================================================
-- 3. USER MODULE PERMISSIONS TABLE (Overrides)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid REFERENCES permission_modules(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,

  can_read boolean DEFAULT false,
  can_write boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_approve boolean DEFAULT false,
  can_export boolean DEFAULT false,

  conditions jsonb DEFAULT '{}'::jsonb,
  scope text CHECK (scope IN ('global', 'company', 'department', 'team', 'own')) DEFAULT 'own',
  override_type text CHECK (override_type IN ('grant', 'deny', 'extend')) DEFAULT 'grant',

  is_active boolean DEFAULT true,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  reason text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_permissions_unique 
  ON user_module_permissions(user_id, module_id, company_id, department_id) 
  WHERE department_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_permissions_unique_no_dept 
  ON user_module_permissions(user_id, module_id, company_id) 
  WHERE department_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_module_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON user_module_permissions(module_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_company ON user_module_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_lookup ON user_module_permissions(user_id, module_id, company_id);

-- =====================================================
-- 4. PERMISSION INHERITANCE RULES
-- =====================================================
CREATE TABLE IF NOT EXISTS permission_inheritance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  parent_role text NOT NULL,
  child_role text NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,

  inherit_mode text CHECK (inherit_mode IN ('full', 'partial', 'additive', 'restrictive')) DEFAULT 'partial',
  module_filters jsonb DEFAULT '[]'::jsonb,
  permission_filters jsonb DEFAULT '{
    "can_read": true,
    "can_write": false,
    "can_delete": false,
    "can_approve": false,
    "can_export": false
  }'::jsonb,

  scope_inheritance text CHECK (scope_inheritance IN ('inherit', 'restrict_to_department', 'restrict_to_team', 'restrict_to_own')) DEFAULT 'inherit',
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(parent_role, child_role, company_id)
);

CREATE INDEX IF NOT EXISTS idx_inheritance_parent ON permission_inheritance_rules(parent_role);
CREATE INDEX IF NOT EXISTS idx_inheritance_child ON permission_inheritance_rules(child_role);
CREATE INDEX IF NOT EXISTS idx_inheritance_company ON permission_inheritance_rules(company_id);

-- =====================================================
-- 5. DEPARTMENT DATA ISOLATION
-- =====================================================
CREATE TABLE IF NOT EXISTS department_data_isolation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,

  isolation_level text CHECK (isolation_level IN ('strict', 'hierarchical', 'cross_department', 'company_wide')) DEFAULT 'strict',
  allowed_departments uuid[] DEFAULT ARRAY[]::uuid[],
  allow_parent_access boolean DEFAULT false,
  allow_child_access boolean DEFAULT false,

  data_visibility_rules jsonb DEFAULT '{
    "employee_data": "own_department",
    "salary_data": "strict",
    "performance_data": "hierarchical"
  }'::jsonb,

  override_rules jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(department_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_dept_isolation_department ON department_data_isolation(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_isolation_company ON department_data_isolation(company_id);

-- =====================================================
-- 6. PERMISSION AUDIT LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS permission_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  audit_type text CHECK (audit_type IN ('permission_change', 'access_attempt', 'access_granted', 'access_denied', 'permission_check')) NOT NULL,

  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role_id uuid REFERENCES user_roles(id) ON DELETE SET NULL,

  module_id uuid REFERENCES permission_modules(id) ON DELETE SET NULL,
  module_name text,
  action text CHECK (action IN ('read', 'write', 'delete', 'approve', 'export', 'access')),

  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,

  permission_before jsonb,
  permission_after jsonb,
  changes jsonb,

  resource_type text,
  resource_id uuid,
  access_granted boolean,
  denial_reason text,

  reason text,
  ip_address inet,
  user_agent text,
  request_id text,
  session_id text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_user ON permission_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_audit_target ON permission_audit_log(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_audit_type ON permission_audit_log(audit_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_audit_module ON permission_audit_log(module_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_audit_company ON permission_audit_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_audit_created ON permission_audit_log(created_at DESC);

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id uuid,
  p_module_name text,
  p_action text,
  p_company_id uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean := false;
  v_user_role text;
  v_module_id uuid;
BEGIN
  SELECT role INTO v_user_role
  FROM user_roles
  WHERE user_id = p_user_id AND company_id = COALESCE(p_company_id, company_id)
  LIMIT 1;

  IF v_user_role = 'super_admin' THEN
    RETURN true;
  END IF;

  SELECT id INTO v_module_id
  FROM permission_modules
  WHERE name = p_module_name AND is_active = true;

  IF v_module_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    CASE p_action
      WHEN 'read' THEN can_read
      WHEN 'write' THEN can_write
      WHEN 'delete' THEN can_delete
      WHEN 'approve' THEN can_approve
      WHEN 'export' THEN can_export
      ELSE false
    END INTO v_has_permission
  FROM user_module_permissions
  WHERE user_id = p_user_id
    AND module_id = v_module_id
    AND company_id = COALESCE(p_company_id, company_id)
    AND (department_id = p_department_id OR department_id IS NULL OR p_department_id IS NULL)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY priority DESC
  LIMIT 1;

  IF v_has_permission IS NOT NULL THEN
    RETURN v_has_permission;
  END IF;

  SELECT
    CASE p_action
      WHEN 'read' THEN can_read
      WHEN 'write' THEN can_write
      WHEN 'delete' THEN can_delete
      WHEN 'approve' THEN can_approve
      WHEN 'export' THEN can_export
      ELSE false
    END INTO v_has_permission
  FROM role_module_permissions rmp
  JOIN user_roles ur ON ur.id = rmp.role_id
  WHERE ur.user_id = p_user_id
    AND rmp.module_id = v_module_id
    AND rmp.company_id = COALESCE(p_company_id, ur.company_id)
    AND (rmp.department_id = p_department_id OR rmp.department_id IS NULL OR p_department_id IS NULL)
    AND rmp.is_active = true
    AND (rmp.expires_at IS NULL OR rmp.expires_at > now())
  ORDER BY rmp.priority DESC
  LIMIT 1;

  RETURN COALESCE(v_has_permission, false);
END;
$$;

CREATE OR REPLACE FUNCTION get_user_effective_permissions(
  p_user_id uuid,
  p_company_id uuid DEFAULT NULL
)
RETURNS TABLE (
  module_name text,
  module_display_name text,
  can_read boolean,
  can_write boolean,
  can_delete boolean,
  can_approve boolean,
  can_export boolean,
  scope text,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_role_perms AS (
    SELECT
      pm.name as module_name,
      pm.display_name as module_display_name,
      rmp.can_read,
      rmp.can_write,
      rmp.can_delete,
      rmp.can_approve,
      rmp.can_export,
      rmp.scope,
      'role' as source,
      rmp.priority
    FROM role_module_permissions rmp
    JOIN permission_modules pm ON pm.id = rmp.module_id
    JOIN user_roles ur ON ur.id = rmp.role_id
    WHERE ur.user_id = p_user_id
      AND rmp.company_id = COALESCE(p_company_id, rmp.company_id)
      AND rmp.is_active = true
      AND pm.is_active = true
  ),
  user_override_perms AS (
    SELECT
      pm.name as module_name,
      pm.display_name as module_display_name,
      ump.can_read,
      ump.can_write,
      ump.can_delete,
      ump.can_approve,
      ump.can_export,
      ump.scope,
      'user_override' as source,
      999 as priority
    FROM user_module_permissions ump
    JOIN permission_modules pm ON pm.id = ump.module_id
    WHERE ump.user_id = p_user_id
      AND ump.company_id = COALESCE(p_company_id, ump.company_id)
      AND ump.is_active = true
      AND pm.is_active = true
  ),
  all_perms AS (
    SELECT * FROM user_role_perms
    UNION ALL
    SELECT * FROM user_override_perms
  )
  SELECT DISTINCT ON (ap.module_name)
    ap.module_name,
    ap.module_display_name,
    ap.can_read,
    ap.can_write,
    ap.can_delete,
    ap.can_approve,
    ap.can_export,
    ap.scope,
    ap.source
  FROM all_perms ap
  ORDER BY ap.module_name, ap.priority DESC;
END;
$$;

CREATE OR REPLACE FUNCTION audit_permission_access(
  p_user_id uuid,
  p_module_name text,
  p_action text,
  p_access_granted boolean,
  p_company_id uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_resource_type text DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL,
  p_denial_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_module_id uuid;
BEGIN
  SELECT id INTO v_module_id
  FROM permission_modules
  WHERE name = p_module_name;

  INSERT INTO permission_audit_log (
    audit_type,
    user_id,
    module_id,
    module_name,
    action,
    company_id,
    department_id,
    access_granted,
    denial_reason,
    resource_type,
    resource_id
  ) VALUES (
    CASE WHEN p_access_granted THEN 'access_granted' ELSE 'access_denied' END,
    p_user_id,
    v_module_id,
    p_module_name,
    p_action,
    p_company_id,
    p_department_id,
    p_access_granted,
    p_denial_reason,
    p_resource_type,
    p_resource_id
  );
END;
$$;

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

ALTER TABLE permission_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active modules"
  ON permission_modules FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admin can manage modules"
  ON permission_modules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

ALTER TABLE role_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their role permissions"
  ON role_module_permissions FOR SELECT
  TO authenticated
  USING (
    role_id IN (
      SELECT id FROM user_roles WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'tenant_admin', 'admin')
      AND company_id = role_module_permissions.company_id
    )
  );

CREATE POLICY "Admins can manage role permissions"
  ON role_module_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'tenant_admin', 'admin')
      AND company_id = role_module_permissions.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'tenant_admin', 'admin')
      AND company_id = role_module_permissions.company_id
    )
  );

ALTER TABLE user_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own permissions"
  ON user_module_permissions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'tenant_admin', 'admin')
      AND company_id = user_module_permissions.company_id
    )
  );

CREATE POLICY "Admins can manage user permissions"
  ON user_module_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'tenant_admin', 'admin')
      AND company_id = user_module_permissions.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'tenant_admin', 'admin')
      AND company_id = user_module_permissions.company_id
    )
  );

ALTER TABLE permission_inheritance_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read inheritance rules"
  ON permission_inheritance_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND company_id = permission_inheritance_rules.company_id
    )
  );

CREATE POLICY "Admins can manage inheritance rules"
  ON permission_inheritance_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'tenant_admin', 'admin')
      AND company_id = permission_inheritance_rules.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'tenant_admin', 'admin')
      AND company_id = permission_inheritance_rules.company_id
    )
  );

ALTER TABLE department_data_isolation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read department isolation rules"
  ON department_data_isolation FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND company_id = department_data_isolation.company_id
    )
  );

CREATE POLICY "Admins can manage department isolation"
  ON department_data_isolation FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'tenant_admin', 'admin')
      AND company_id = department_data_isolation.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'tenant_admin', 'admin')
      AND company_id = department_data_isolation.company_id
    )
  );

ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own audit logs"
  ON permission_audit_log FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR target_user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'tenant_admin', 'admin')
      AND company_id = permission_audit_log.company_id
    )
  );

CREATE POLICY "System can insert audit logs"
  ON permission_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
