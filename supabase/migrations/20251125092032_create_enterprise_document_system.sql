/*
  # Enterprise Document Management System

  1. New Tables
    - `document_categories`: Hierarchical document categorization
    - `document_tags`: Flexible tagging system
    - `document_versions`: Complete version history
    - `document_workflows`: Approval workflows and states
    - `document_approvals`: Approval chain tracking
    - `document_shares`: Sharing and permissions
    - `document_templates`: Reusable document templates
    - `document_reminders`: Automated reminder system
    - `document_activities`: Complete audit trail
    - `document_storage_locations`: Storage management
    - `document_compliance_checks`: Compliance tracking
    
  2. Enhanced Features
    - Multi-level categorization
    - Version control with rollback
    - Workflow automation
    - E-signature support
    - Advanced permissions
    - Activity logging
    - Compliance tracking
    - Template management
    - Automated notifications
    
  3. Security
    - Row Level Security on all tables
    - Role-based access control
    - Audit trail for all actions
*/

-- Document Categories (Hierarchical)
CREATE TABLE IF NOT EXISTS document_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_ar text,
  description text,
  parent_id uuid REFERENCES document_categories(id) ON DELETE CASCADE,
  color text DEFAULT '#6B7280',
  icon text DEFAULT 'folder',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document Tags
CREATE TABLE IF NOT EXISTS document_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Document-Tag Junction
CREATE TABLE IF NOT EXISTS document_tag_assignments (
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES document_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (document_id, tag_id)
);

-- Document Versions
CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  file_hash text,
  changes_summary text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(document_id, version_number)
);

-- Workflow States
CREATE TABLE IF NOT EXISTS document_workflows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  states jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document Approvals
CREATE TABLE IF NOT EXISTS document_approvals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES document_workflows(id),
  approver_id uuid NOT NULL REFERENCES auth.users(id),
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approval_level integer DEFAULT 1,
  comments text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document Sharing & Permissions
CREATE TABLE IF NOT EXISTS document_shares (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  shared_with_user_id uuid REFERENCES auth.users(id),
  shared_with_role text,
  permission_level text DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'manage', 'admin')),
  can_download boolean DEFAULT true,
  can_share boolean DEFAULT false,
  expires_at timestamptz,
  shared_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Document Templates
CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  template_url text,
  fields jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document Reminders
CREATE TABLE IF NOT EXISTS document_reminders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('expiry', 'renewal', 'review', 'custom')),
  remind_before_days integer DEFAULT 30,
  remind_user_id uuid REFERENCES auth.users(id),
  remind_role text,
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Document Activity Log
CREATE TABLE IF NOT EXISTS document_activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('created', 'uploaded', 'viewed', 'downloaded', 'edited', 'deleted', 'shared', 'approved', 'rejected', 'expired', 'renewed', 'archived')),
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  performed_by uuid REFERENCES auth.users(id),
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Storage Locations
CREATE TABLE IF NOT EXISTS document_storage_locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_type text NOT NULL CHECK (storage_type IN ('supabase', 's3', 'azure', 'google', 'local')),
  configuration jsonb DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Compliance Checks
CREATE TABLE IF NOT EXISTS document_compliance_checks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  check_type text NOT NULL CHECK (check_type IN ('expiry_check', 'required_field', 'signature_required', 'approval_required', 'retention_policy')),
  check_status text DEFAULT 'pending' CHECK (check_status IN ('pending', 'passed', 'failed', 'warning')),
  check_result jsonb DEFAULT '{}'::jsonb,
  checked_at timestamptz DEFAULT now(),
  next_check_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add new fields to documents table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'category_id') THEN
    ALTER TABLE documents ADD COLUMN category_id uuid REFERENCES document_categories(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'workflow_status') THEN
    ALTER TABLE documents ADD COLUMN workflow_status text DEFAULT 'draft' 
      CHECK (workflow_status IN ('draft', 'pending_approval', 'approved', 'rejected', 'archived', 'expired'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'requires_approval') THEN
    ALTER TABLE documents ADD COLUMN requires_approval boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'requires_signature') THEN
    ALTER TABLE documents ADD COLUMN requires_signature boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'signature_data') THEN
    ALTER TABLE documents ADD COLUMN signature_data jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'is_template') THEN
    ALTER TABLE documents ADD COLUMN is_template boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'template_id') THEN
    ALTER TABLE documents ADD COLUMN template_id uuid REFERENCES document_templates(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'retention_period_days') THEN
    ALTER TABLE documents ADD COLUMN retention_period_days integer;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'auto_delete_after_retention') THEN
    ALTER TABLE documents ADD COLUMN auto_delete_after_retention boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'is_confidential') THEN
    ALTER TABLE documents ADD COLUMN is_confidential boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'encryption_status') THEN
    ALTER TABLE documents ADD COLUMN encryption_status text DEFAULT 'none' 
      CHECK (encryption_status IN ('none', 'at_rest', 'in_transit', 'end_to_end'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'last_accessed_at') THEN
    ALTER TABLE documents ADD COLUMN last_accessed_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'last_accessed_by') THEN
    ALTER TABLE documents ADD COLUMN last_accessed_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'download_count') THEN
    ALTER TABLE documents ADD COLUMN download_count integer DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'view_count') THEN
    ALTER TABLE documents ADD COLUMN view_count integer DEFAULT 0;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_categories_company ON document_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_document_categories_parent ON document_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_company ON document_tags(company_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_document ON document_approvals(document_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_approver ON document_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_document ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_user ON document_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_document_reminders_document ON document_reminders(document_id);
CREATE INDEX IF NOT EXISTS idx_document_activities_document ON document_activities(document_id);
CREATE INDEX IF NOT EXISTS idx_document_activities_user ON document_activities(performed_by);
CREATE INDEX IF NOT EXISTS idx_document_activities_created ON document_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_workflow_status ON documents(workflow_status);
CREATE INDEX IF NOT EXISTS idx_documents_last_accessed ON documents(last_accessed_at);

-- Enable RLS
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_compliance_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_categories
CREATE POLICY "Users can view categories in their company"
  ON document_categories FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage categories"
  ON document_categories FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- RLS Policies for document_tags
CREATE POLICY "Users can view tags in their company"
  ON document_tags FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage tags"
  ON document_tags FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- RLS Policies for document_versions
CREATE POLICY "Users can view document versions"
  ON document_versions FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents WHERE company_id IN (
        SELECT company_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage versions"
  ON document_versions FOR ALL
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents WHERE company_id IN (
        SELECT company_id FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );

-- RLS Policies for document_approvals
CREATE POLICY "Users can view approvals"
  ON document_approvals FOR SELECT
  TO authenticated
  USING (
    approver_id = auth.uid() OR
    document_id IN (
      SELECT id FROM documents WHERE company_id IN (
        SELECT company_id FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );

CREATE POLICY "Users can update their approvals"
  ON document_approvals FOR UPDATE
  TO authenticated
  USING (approver_id = auth.uid())
  WITH CHECK (approver_id = auth.uid());

-- RLS Policies for document_shares
CREATE POLICY "Users can view their shares"
  ON document_shares FOR SELECT
  TO authenticated
  USING (
    shared_with_user_id = auth.uid() OR
    document_id IN (
      SELECT id FROM documents WHERE company_id IN (
        SELECT company_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for document_activities
CREATE POLICY "Users can view activities"
  ON document_activities FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents WHERE company_id IN (
        SELECT company_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can log activities"
  ON document_activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for templates
CREATE POLICY "Users can view templates"
  ON document_templates FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage templates"
  ON document_templates FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );
