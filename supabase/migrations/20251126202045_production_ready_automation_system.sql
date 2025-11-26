/*
  # Production-Ready System Automation
  
  Complete automation covering:
  1. Notification system for all modules
  2. Saudi Labor Law validation
  3. Document expiry monitoring
  4. Workflow automation
  5. System health checks
*/

-- =======================
-- CORE NOTIFICATION FUNCTIONS
-- =======================

CREATE OR REPLACE FUNCTION create_notification(
  p_company_id uuid,
  p_user_id uuid,
  p_employee_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_priority text,
  p_category text,
  p_module text,
  p_entity_type text,
  p_entity_id uuid,
  p_action_url text
) RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO system_notifications (
    company_id, user_id, recipient_employee_id, notification_type,
    title, message, priority, category, related_module,
    related_entity_type, related_entity_id, action_url
  ) VALUES (
    p_company_id, p_user_id, p_employee_id, p_type,
    p_title, p_message, p_priority, p_category, p_module,
    p_entity_type, p_entity_id, p_action_url
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_system_alert(
  p_company_id uuid,
  p_alert_type text,
  p_category text,
  p_title text,
  p_description text,
  p_severity text,
  p_module text,
  p_entity_type text,
  p_entity_id uuid,
  p_trigger_date date,
  p_expiry_date date
) RETURNS uuid AS $$
DECLARE
  v_alert_id uuid;
BEGIN
  INSERT INTO system_alerts (
    company_id, alert_type, alert_category, title, description,
    severity, related_module, related_entity_type, related_entity_id,
    trigger_date, expiry_date
  ) VALUES (
    p_company_id, p_alert_type, p_category, p_title, p_description,
    p_severity, p_module, p_entity_type, p_entity_id,
    p_trigger_date, p_expiry_date
  ) RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- SAUDI LABOR LAW COMPLIANCE
-- =======================

-- Calculate annual leave entitlement per Saudi Labor Law
CREATE OR REPLACE FUNCTION calculate_annual_leave_entitlement(
  p_employee_id uuid
) RETURNS integer AS $$
DECLARE
  v_years_of_service numeric;
  v_entitlement integer := 21;
BEGIN
  SELECT EXTRACT(YEAR FROM AGE(CURRENT_DATE, hire_date))
  INTO v_years_of_service
  FROM employees WHERE id = p_employee_id;
  
  -- Saudi Labor Law Article 109: 21 days for <5 years, 30 days for 5+ years
  IF v_years_of_service >= 5 THEN
    v_entitlement := 30;
  END IF;
  
  RETURN v_entitlement;
END;
$$ LANGUAGE plpgsql;

-- Validate contract duration (Saudi Labor Law Article 53)
CREATE OR REPLACE FUNCTION validate_contract_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Fixed-term contracts cannot exceed 4 years
  IF NEW.employment_type = 'fixed_term' THEN
    IF NEW.contract_end_date IS NOT NULL AND 
       NEW.contract_start_date IS NOT NULL THEN
      IF (NEW.contract_end_date - NEW.contract_start_date) > 1460 THEN
        RAISE EXCEPTION 'Fixed-term contracts cannot exceed 4 years (Article 53, Saudi Labor Law)';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validate probation period (Saudi Labor Law Article 54)
CREATE OR REPLACE FUNCTION validate_probation_period()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.probation_end_date IS NOT NULL AND NEW.hire_date IS NOT NULL THEN
    -- Probation cannot exceed 90 days (extendable to 180 for specific cases)
    IF (NEW.probation_end_date - NEW.hire_date) > 180 THEN
      RAISE EXCEPTION 'Probation period cannot exceed 180 days (Article 54, Saudi Labor Law)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate end of service benefit (Saudi Labor Law Article 84)
CREATE OR REPLACE FUNCTION calculate_end_of_service_benefit(
  p_employee_id uuid,
  p_termination_date date,
  p_termination_reason text
) RETURNS numeric AS $$
DECLARE
  v_hire_date date;
  v_basic_salary numeric;
  v_years_of_service numeric;
  v_months_of_service numeric;
  v_benefit numeric := 0;
  v_is_resignation boolean;
BEGIN
  -- Get employee details
  SELECT hire_date INTO v_hire_date
  FROM employees WHERE id = p_employee_id;
  
  -- Get current basic salary
  SELECT basic_salary INTO v_basic_salary
  FROM payroll 
  WHERE employee_id = p_employee_id 
  ORDER BY effective_from DESC 
  LIMIT 1;
  
  -- Calculate service period
  v_months_of_service := EXTRACT(YEAR FROM AGE(p_termination_date, v_hire_date)) * 12 + 
                        EXTRACT(MONTH FROM AGE(p_termination_date, v_hire_date));
  v_years_of_service := v_months_of_service / 12;
  
  v_is_resignation := p_termination_reason IN ('resignation', 'employee_initiated');
  
  -- Article 84 calculation
  IF NOT v_is_resignation THEN
    -- Termination by employer: Full entitlement
    IF v_years_of_service <= 5 THEN
      -- Half month salary per year for first 5 years
      v_benefit := v_basic_salary * (v_months_of_service / 12) * 0.5;
    ELSE
      -- Half month for first 5 years + full month for years after 5
      v_benefit := (v_basic_salary * 5 * 0.5) + 
                   (v_basic_salary * (v_years_of_service - 5) * 1);
    END IF;
  ELSE
    -- Resignation: Reduced entitlement
    IF v_years_of_service < 2 THEN
      v_benefit := 0; -- No benefit if less than 2 years
    ELSIF v_years_of_service < 5 THEN
      -- 1/3 of entitlement for 2-5 years
      v_benefit := v_basic_salary * (v_months_of_service / 12) * 0.5 * 0.33;
    ELSIF v_years_of_service < 10 THEN
      -- 2/3 of entitlement for 5-10 years
      v_benefit := (v_basic_salary * 5 * 0.5 * 0.33) + 
                   (v_basic_salary * (v_years_of_service - 5) * 1 * 0.66);
    ELSE
      -- Full entitlement after 10 years
      v_benefit := (v_basic_salary * 5 * 0.5) + 
                   (v_basic_salary * (v_years_of_service - 5) * 1);
    END IF;
  END IF;
  
  RETURN ROUND(v_benefit, 2);
END;
$$ LANGUAGE plpgsql;

-- =======================
-- EMPLOYEE LIFECYCLE AUTOMATION
-- =======================

-- New employee welcome notification
CREATE OR REPLACE FUNCTION notify_new_employee()
RETURNS TRIGGER AS $$
BEGIN
  -- Welcome notification to employee
  PERFORM create_notification(
    NEW.company_id, NULL, NEW.id, 'employee_onboarding',
    'Welcome to the Team!',
    'Your employee profile has been created. Please complete your onboarding checklist.',
    'medium', 'HR', 'employees', 'employee', NEW.id, '/employees/' || NEW.id
  );
  
  -- Notification to manager
  IF NEW.manager_id IS NOT NULL THEN
    PERFORM create_notification(
      NEW.company_id, NULL, NEW.manager_id, 'new_hire',
      'New Team Member',
      NEW.first_name_en || ' ' || NEW.last_name_en || ' has joined your team.',
      'medium', 'HR', 'employees', 'employee', NEW.id, '/employees/' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_employee_created ON employees;
CREATE TRIGGER on_employee_created
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_employee();

-- Document expiry monitoring
CREATE OR REPLACE FUNCTION monitor_document_expiry()
RETURNS TRIGGER AS $$
DECLARE
  v_days_to_iqama_expiry integer;
  v_days_to_passport_expiry integer;
  v_days_to_contract_expiry integer;
BEGIN
  -- Iqama expiry check
  IF NEW.iqama_expiry IS NOT NULL THEN
    v_days_to_iqama_expiry := NEW.iqama_expiry - CURRENT_DATE;
    
    IF v_days_to_iqama_expiry > 0 AND v_days_to_iqama_expiry <= 90 THEN
      PERFORM create_system_alert(
        NEW.company_id, 'document_expiry', 'compliance',
        'Iqama Expiring Soon',
        'Employee ' || NEW.first_name_en || ' ' || NEW.last_name_en || 
        ' (' || NEW.employee_number || ') - Iqama expires in ' || v_days_to_iqama_expiry || ' days on ' || NEW.iqama_expiry,
        CASE 
          WHEN v_days_to_iqama_expiry <= 30 THEN 'critical'
          WHEN v_days_to_iqama_expiry <= 60 THEN 'warning'
          ELSE 'info'
        END,
        'employees', 'employee', NEW.id, CURRENT_DATE, NEW.iqama_expiry
      );
      
      -- Also notify employee and manager
      PERFORM create_notification(
        NEW.company_id, NULL, NEW.id, 'document_expiry',
        'Your Iqama is Expiring Soon',
        'Your Iqama will expire in ' || v_days_to_iqama_expiry || ' days. Please coordinate with HR for renewal.',
        'urgent', 'Compliance', 'employees', 'employee', NEW.id, '/employees/' || NEW.id
      );
    END IF;
  END IF;
  
  -- Passport expiry check
  IF NEW.passport_expiry IS NOT NULL THEN
    v_days_to_passport_expiry := NEW.passport_expiry - CURRENT_DATE;
    
    IF v_days_to_passport_expiry > 0 AND v_days_to_passport_expiry <= 90 THEN
      PERFORM create_system_alert(
        NEW.company_id, 'document_expiry', 'compliance',
        'Passport Expiring Soon',
        'Employee ' || NEW.first_name_en || ' ' || NEW.last_name_en || 
        ' (' || NEW.employee_number || ') - Passport expires in ' || v_days_to_passport_expiry || ' days on ' || NEW.passport_expiry,
        CASE 
          WHEN v_days_to_passport_expiry <= 30 THEN 'critical'
          WHEN v_days_to_passport_expiry <= 60 THEN 'warning'
          ELSE 'info'
        END,
        'employees', 'employee', NEW.id, CURRENT_DATE, NEW.passport_expiry
      );
    END IF;
  END IF;
  
  -- Contract expiry check
  IF NEW.contract_end_date IS NOT NULL AND NEW.employment_type = 'fixed_term' THEN
    v_days_to_contract_expiry := NEW.contract_end_date - CURRENT_DATE;
    
    IF v_days_to_contract_expiry > 0 AND v_days_to_contract_expiry <= 90 THEN
      PERFORM create_system_alert(
        NEW.company_id, 'contract_expiry', 'compliance',
        'Contract Expiring Soon',
        'Employee ' || NEW.first_name_en || ' ' || NEW.last_name_en || 
        ' (' || NEW.employee_number || ') - Contract expires in ' || v_days_to_contract_expiry || ' days on ' || NEW.contract_end_date,
        CASE 
          WHEN v_days_to_contract_expiry <= 30 THEN 'critical'
          WHEN v_days_to_contract_expiry <= 60 THEN 'warning'
          ELSE 'info'
        END,
        'employees', 'employee', NEW.id, CURRENT_DATE, NEW.contract_end_date
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_document_expiry_check ON employees;
CREATE TRIGGER on_document_expiry_check
  AFTER INSERT OR UPDATE OF iqama_expiry, passport_expiry, contract_end_date ON employees
  FOR EACH ROW
  EXECUTE FUNCTION monitor_document_expiry();

-- Apply contract validation
DROP TRIGGER IF EXISTS validate_employee_contract ON employees;
CREATE TRIGGER validate_employee_contract
  BEFORE INSERT OR UPDATE OF employment_type, contract_start_date, contract_end_date ON employees
  FOR EACH ROW
  EXECUTE FUNCTION validate_contract_duration();

-- Apply probation validation
DROP TRIGGER IF EXISTS validate_employee_probation ON employees;
CREATE TRIGGER validate_employee_probation
  BEFORE INSERT OR UPDATE OF hire_date, probation_end_date ON employees
  FOR EACH ROW
  EXECUTE FUNCTION validate_probation_period();

-- =======================
-- LEAVE REQUEST AUTOMATION
-- =======================

CREATE OR REPLACE FUNCTION automate_leave_requests()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_name text;
  v_manager_id uuid;
  v_company_id uuid;
BEGIN
  -- Get employee details
  SELECT 
    first_name_en || ' ' || last_name_en, 
    manager_id,
    company_id
  INTO v_employee_name, v_manager_id, v_company_id
  FROM employees WHERE id = NEW.employee_id;
  
  IF TG_OP = 'INSERT' OR (NEW.status = 'pending' AND (OLD.status IS NULL OR OLD.status != 'pending')) THEN
    -- Notify manager of new leave request
    IF v_manager_id IS NOT NULL THEN
      PERFORM create_notification(
        v_company_id, NULL, v_manager_id, 'leave_request',
        'Leave Request Awaiting Approval',
        v_employee_name || ' has requested ' || 
        COALESCE((SELECT name_en FROM leave_types WHERE id = NEW.leave_type_id), 'leave') || 
        ' from ' || NEW.start_date || ' to ' || NEW.end_date || 
        ' (' || (NEW.end_date - NEW.start_date + 1) || ' days)',
        'high', 'Leave Management', 'leave', 'leave_request', NEW.id, '/leave'
      );
    END IF;
    
    -- Confirm submission to employee
    PERFORM create_notification(
      v_company_id, NULL, NEW.employee_id, 'leave_request_submitted',
      'Leave Request Submitted',
      'Your leave request has been submitted successfully and is awaiting approval.',
      'medium', 'Leave Management', 'leave', 'leave_request', NEW.id, '/leave'
    );
    
  ELSIF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Notify employee of approval
    PERFORM create_notification(
      v_company_id, NULL, NEW.employee_id, 'leave_approved',
      'Leave Request Approved ✓',
      'Your leave request from ' || NEW.start_date || ' to ' || NEW.end_date || ' has been approved.',
      'high', 'Leave Management', 'leave', 'leave_request', NEW.id, '/leave'
    );
    
  ELSIF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    -- Notify employee of rejection
    PERFORM create_notification(
      v_company_id, NULL, NEW.employee_id, 'leave_rejected',
      'Leave Request Declined',
      'Your leave request from ' || NEW.start_date || ' to ' || NEW.end_date || ' has been declined.' ||
      CASE WHEN NEW.rejection_reason IS NOT NULL THEN ' Reason: ' || NEW.rejection_reason ELSE '' END,
      'urgent', 'Leave Management', 'leave', 'leave_request', NEW.id, '/leave'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_leave_request_change ON leave_requests;
CREATE TRIGGER on_leave_request_change
  AFTER INSERT OR UPDATE OF status ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION automate_leave_requests();

-- =======================
-- EXPENSE CLAIM AUTOMATION
-- =======================

CREATE OR REPLACE FUNCTION automate_expense_claims()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_name text;
  v_manager_id uuid;
BEGIN
  SELECT e.first_name_en || ' ' || e.last_name_en, e.manager_id
  INTO v_employee_name, v_manager_id
  FROM employees e WHERE e.id = NEW.employee_id;
  
  IF TG_OP = 'INSERT' OR (NEW.approval_status = 'pending' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'pending')) THEN
    -- Create approval request
    INSERT INTO approval_requests (
      company_id, request_type, related_module, related_entity_id,
      requester_id, status
    ) VALUES (
      NEW.company_id, 'expense_claim', 'expenses', NEW.id,
      NEW.employee_id, 'pending'
    );
    
    -- Notify manager
    IF v_manager_id IS NOT NULL THEN
      PERFORM create_notification(
        NEW.company_id, NULL, v_manager_id, 'expense_approval',
        'Expense Claim Awaiting Approval',
        v_employee_name || ' submitted an expense claim for ' || NEW.amount || ' ' || NEW.currency,
        'high', 'Expenses', 'expenses', 'expense_claim', NEW.id, '/expenses'
      );
    END IF;
    
  ELSIF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    PERFORM create_notification(
      NEW.company_id, NULL, NEW.employee_id, 'expense_approved',
      'Expense Claim Approved',
      'Your expense claim for ' || NEW.amount || ' ' || NEW.currency || ' has been approved.',
      'medium', 'Expenses', 'expenses', 'expense_claim', NEW.id, '/expenses'
    );
    
  ELSIF NEW.approval_status = 'rejected' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'rejected') THEN
    PERFORM create_notification(
      NEW.company_id, NULL, NEW.employee_id, 'expense_rejected',
      'Expense Claim Rejected',
      'Your expense claim for ' || NEW.amount || ' ' || NEW.currency || ' has been rejected.' ||
      CASE WHEN NEW.rejection_reason IS NOT NULL THEN ' Reason: ' || NEW.rejection_reason ELSE '' END,
      'high', 'Expenses', 'expenses', 'expense_claim', NEW.id, '/expenses'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_expense_claim_change ON expense_claims;
CREATE TRIGGER on_expense_claim_change
  AFTER INSERT OR UPDATE OF approval_status ON expense_claims
  FOR EACH ROW
  EXECUTE FUNCTION automate_expense_claims();

-- =======================
-- SYSTEM HEALTH MONITORING
-- =======================

CREATE OR REPLACE FUNCTION check_system_health(p_company_id uuid)
RETURNS TABLE(
  category text,
  status text,
  message text,
  metric_value integer
) AS $$
BEGIN
  -- Expiring Iqamas (30 days)
  RETURN QUERY
  SELECT 
    'Iqama Expiry'::text,
    CASE 
      WHEN COUNT(*) > 5 THEN 'critical'
      WHEN COUNT(*) > 0 THEN 'warning' 
      ELSE 'ok' 
    END::text,
    'Iqamas expiring in next 30 days'::text,
    COUNT(*)::integer
  FROM employees
  WHERE company_id = p_company_id
    AND status = 'active'
    AND iqama_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + 30;
  
  -- Pending Leave Requests
  RETURN QUERY
  SELECT 
    'Leave Approvals'::text,
    CASE 
      WHEN COUNT(*) > 10 THEN 'warning'
      ELSE 'ok' 
    END::text,
    'Pending leave requests'::text,
    COUNT(*)::integer
  FROM leave_requests
  WHERE company_id = p_company_id
    AND status = 'pending';
  
  -- Nitaqat Compliance
  RETURN QUERY
  SELECT 
    'Nitaqat Status'::text,
    CASE 
      WHEN COALESCE((COUNT(*) FILTER (WHERE is_saudi = true)::float / NULLIF(COUNT(*), 0)) * 100, 0) < 20 THEN 'critical'
      WHEN COALESCE((COUNT(*) FILTER (WHERE is_saudi = true)::float / NULLIF(COUNT(*), 0)) * 100, 0) < 30 THEN 'warning'
      ELSE 'ok'
    END::text,
    'Saudization percentage'::text,
    ROUND(COALESCE((COUNT(*) FILTER (WHERE is_saudi = true)::float / NULLIF(COUNT(*), 0)) * 100, 0))::integer
  FROM employees
  WHERE company_id = p_company_id
    AND status = 'active';
  
  -- Pending Expense Claims
  RETURN QUERY
  SELECT 
    'Expense Approvals'::text,
    CASE 
      WHEN COUNT(*) > 15 THEN 'warning'
      ELSE 'ok' 
    END::text,
    'Pending expense claims'::text,
    COUNT(*)::integer
  FROM expense_claims
  WHERE company_id = p_company_id
    AND approval_status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;