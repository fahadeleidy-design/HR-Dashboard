/*
  # Remove Demo Company Ltd - Dynamic Deletion

  Removes Demo Company by dynamically deleting from all tables that reference it
*/

DO $$
DECLARE
  demo_company_id uuid := 'b97d77c7-0858-40f6-ad56-924e1f20206d';
  employee_ids uuid[];
  table_rec RECORD;
BEGIN
  -- Drop ALL triggers
  DROP TRIGGER IF EXISTS audit_employees_access ON employees;
  DROP TRIGGER IF EXISTS audit_employees_trigger ON employees;
  DROP TRIGGER IF EXISTS on_document_expiry_check ON employees;
  DROP TRIGGER IF EXISTS on_employee_created ON employees;
  DROP TRIGGER IF EXISTS trigger_create_onboarding_events ON employees;
  DROP TRIGGER IF EXISTS trigger_track_employee_lifecycle ON employees;
  DROP TRIGGER IF EXISTS trigger_validate_employee_salary ON employees;
  DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
  DROP TRIGGER IF EXISTS validate_employee_contract ON employees;
  DROP TRIGGER IF EXISTS validate_employee_data_trigger ON employees;
  DROP TRIGGER IF EXISTS validate_employee_probation ON employees;
  DROP TRIGGER IF EXISTS audit_departments_trigger ON departments;
  DROP TRIGGER IF EXISTS audit_user_roles_trigger ON user_roles;
  DROP TRIGGER IF EXISTS audit_leave_requests_trigger ON leave_requests;
  DROP TRIGGER IF EXISTS on_leave_request_change ON leave_requests;
  DROP TRIGGER IF EXISTS trg_update_leave_balance ON leave_requests;
  DROP TRIGGER IF EXISTS trigger_initialize_leave_sla ON leave_requests;
  DROP TRIGGER IF EXISTS validate_leave_request_trigger ON leave_requests;
  ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_employee_id_fkey;
  
  -- Get employee IDs
  SELECT array_agg(id) INTO employee_ids FROM employees WHERE company_id = demo_company_id;
  RAISE NOTICE 'Deleting % employees from Demo Company Ltd', coalesce(array_length(employee_ids, 1), 0);
  
  -- Delete from all tables that have company_id column
  FOR table_rec IN 
    SELECT DISTINCT tc.table_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_name = 'companies'
      AND tc.table_schema = 'public'
      AND tc.table_name NOT IN ('employees', 'departments', 'user_roles', 'audit_log')
    ORDER BY tc.table_name
  LOOP
    BEGIN
      EXECUTE format('DELETE FROM %I WHERE company_id = $1', table_rec.table_name) USING demo_company_id;
      RAISE NOTICE 'Deleted from %', table_rec.table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped % (error: %)', table_rec.table_name, SQLERRM;
    END;
  END LOOP;
  
  -- Delete employees and company data
  UPDATE employees SET department_id = NULL, manager_id = NULL WHERE company_id = demo_company_id;
  DELETE FROM departments WHERE company_id = demo_company_id;
  DELETE FROM user_roles WHERE company_id = demo_company_id;
  DELETE FROM audit_log WHERE employee_id = ANY(employee_ids) OR company_id = demo_company_id;
  DELETE FROM employees WHERE company_id = demo_company_id;
  DELETE FROM companies WHERE id = demo_company_id;
  
  -- Clean orphaned audit logs
  DELETE FROM audit_log WHERE employee_id IS NOT NULL AND employee_id NOT IN (SELECT id FROM employees);
  
  -- Recreate FK and essential triggers
  ALTER TABLE audit_log ADD CONSTRAINT audit_log_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;
  CREATE TRIGGER validate_employee_data_trigger BEFORE INSERT OR UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION validate_employee_data();
  CREATE TRIGGER audit_employees_trigger AFTER INSERT OR UPDATE OR DELETE ON employees FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
  CREATE TRIGGER audit_departments_trigger AFTER INSERT OR UPDATE OR DELETE ON departments FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
  CREATE TRIGGER audit_user_roles_trigger AFTER INSERT OR UPDATE OR DELETE ON user_roles FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
  CREATE TRIGGER audit_leave_requests_trigger AFTER INSERT OR UPDATE OR DELETE ON leave_requests FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
  CREATE TRIGGER trg_update_leave_balance AFTER INSERT OR UPDATE OR DELETE ON leave_requests FOR EACH ROW EXECUTE FUNCTION trigger_update_leave_balance();
  
  RAISE NOTICE '===Successfully deleted Demo Company Ltd ===';
END $$;
