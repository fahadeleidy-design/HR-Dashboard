/*
  # Employee Views and Saved Filters System

  1. New Tables
    - `employee_views`
      - Stores saved custom views and filter combinations
      - Supports personal and shared views
      - Includes column visibility preferences
    - `employee_import_templates`
      - Custom import templates for bulk uploads
      - Field mapping configurations
    - `employee_lifecycle_events`
      - Track employee lifecycle stages (onboarding, probation, contract renewal)
      - Automated alerts and notifications

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated users to manage their own views
    - Policies for shared views based on company access

  3. Important Notes
    - Views can be marked as default for quick access
    - Lifecycle events trigger automated notifications
    - Import templates support custom field mapping
*/

-- Employee Views Table
CREATE TABLE IF NOT EXISTS employee_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  is_shared boolean DEFAULT false,
  filter_config jsonb DEFAULT '{}'::jsonb,
  column_config jsonb DEFAULT '[]'::jsonb,
  sort_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_view_name UNIQUE(user_id, company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_employee_views_company ON employee_views(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_views_user ON employee_views(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_views_default ON employee_views(company_id, user_id, is_default);

-- Employee Import Templates Table
CREATE TABLE IF NOT EXISTS employee_import_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  field_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_rules jsonb DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_import_templates_company ON employee_import_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_import_templates_user ON employee_import_templates(user_id);

-- Employee Lifecycle Events Table
CREATE TABLE IF NOT EXISTS employee_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('onboarding', 'probation_start', 'probation_end', 'contract_renewal', 'promotion', 'transfer', 'warning', 'termination_notice', 'exit')),
  event_date date NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid REFERENCES auth.users(id),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_company ON employee_lifecycle_events(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_employee ON employee_lifecycle_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_status ON employee_lifecycle_events(status);
CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_due_date ON employee_lifecycle_events(due_date);
CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_assigned ON employee_lifecycle_events(assigned_to);

-- Employee Quick Notes Table
CREATE TABLE IF NOT EXISTS employee_quick_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  note text NOT NULL,
  category text CHECK (category IN ('general', 'performance', 'attendance', 'behavior', 'achievement', 'concern')),
  is_private boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_quick_notes_employee ON employee_quick_notes(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_quick_notes_company ON employee_quick_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_quick_notes_created_by ON employee_quick_notes(created_by);

-- Enable Row Level Security
ALTER TABLE employee_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_import_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_quick_notes ENABLE ROW LEVEL SECURITY;

-- Policies for employee_views
CREATE POLICY "Users can view own and shared views in their company"
  ON employee_views FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
    AND (user_id = auth.uid() OR is_shared = true)
  );

CREATE POLICY "Users can create views in their company"
  ON employee_views FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own views"
  ON employee_views FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own views"
  ON employee_views FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for employee_import_templates
CREATE POLICY "Users can view templates in their company"
  ON employee_import_templates FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create templates in their company"
  ON employee_import_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own templates"
  ON employee_import_templates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON employee_import_templates FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for employee_lifecycle_events
CREATE POLICY "Users can view lifecycle events in their company"
  ON employee_lifecycle_events FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create lifecycle events in their company"
  ON employee_lifecycle_events FOR INSERT
  TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update lifecycle events in their company"
  ON employee_lifecycle_events FOR UPDATE
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete lifecycle events in their company"
  ON employee_lifecycle_events FOR DELETE
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

-- Policies for employee_quick_notes
CREATE POLICY "Users can view notes in their company"
  ON employee_quick_notes FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
    AND (is_private = false OR created_by = auth.uid())
  );

CREATE POLICY "Users can create notes in their company"
  ON employee_quick_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own notes"
  ON employee_quick_notes FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own notes"
  ON employee_quick_notes FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Function to automatically create lifecycle events for new employees
CREATE OR REPLACE FUNCTION create_onboarding_lifecycle_events()
RETURNS TRIGGER AS $$
BEGIN
  -- Create onboarding event
  INSERT INTO employee_lifecycle_events (
    company_id,
    employee_id,
    event_type,
    event_date,
    due_date,
    status,
    priority,
    notes,
    created_by
  ) VALUES (
    NEW.company_id,
    NEW.id,
    'onboarding',
    NEW.hire_date,
    NEW.hire_date + INTERVAL '7 days',
    'pending',
    'high',
    'Complete onboarding process',
    auth.uid()
  );

  -- Create probation start event (if applicable)
  IF NEW.employment_type = 'full_time' THEN
    INSERT INTO employee_lifecycle_events (
      company_id,
      employee_id,
      event_type,
      event_date,
      due_date,
      status,
      priority,
      notes,
      created_by
    ) VALUES (
      NEW.company_id,
      NEW.id,
      'probation_start',
      NEW.hire_date,
      NEW.hire_date + INTERVAL '90 days',
      'pending',
      'normal',
      'Probation period starts',
      auth.uid()
    );

    -- Create probation end event
    INSERT INTO employee_lifecycle_events (
      company_id,
      employee_id,
      event_type,
      event_date,
      due_date,
      status,
      priority,
      notes,
      created_by
    ) VALUES (
      NEW.company_id,
      NEW.id,
      'probation_end',
      NEW.hire_date + INTERVAL '90 days',
      NEW.hire_date + INTERVAL '90 days',
      'pending',
      'high',
      'Review probation period performance',
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create lifecycle events on employee creation
DROP TRIGGER IF EXISTS trigger_create_onboarding_events ON employees;
CREATE TRIGGER trigger_create_onboarding_events
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION create_onboarding_lifecycle_events();

-- Function to check overdue lifecycle events
CREATE OR REPLACE FUNCTION update_overdue_lifecycle_events()
RETURNS void AS $$
BEGIN
  UPDATE employee_lifecycle_events
  SET status = 'overdue'
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
