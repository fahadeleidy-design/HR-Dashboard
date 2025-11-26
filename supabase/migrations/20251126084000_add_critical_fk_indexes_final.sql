/*
  # Add Critical Foreign Key Indexes - Final

  Adds indexes for unindexed foreign keys to improve query performance.
  Focuses on the most critical tables and relationships.
*/

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_advances_company_id ON advances(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_company_id ON attendance(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_company_id ON leave_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_approver_id ON leave_requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type_id ON leave_requests(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_loans_company_id ON loans(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_department_id ON contracts(department_id);
CREATE INDEX IF NOT EXISTS idx_contracts_approved_by_id ON contracts(approved_by_id);
CREATE INDEX IF NOT EXISTS idx_contracts_responsible_person_id ON contracts(responsible_person_id);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_employee_id ON user_roles(employee_id);

-- Payroll system
CREATE INDEX IF NOT EXISTS idx_payroll_batches_company_status ON payroll_batches(company_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_items_batch_id ON payroll_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee_id ON payroll_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_company_id ON payslips(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_approvals_approver_id ON payroll_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_payroll_approvals_company_id ON payroll_approvals(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_approvals_delegated_to ON payroll_approvals(delegated_to);
CREATE INDEX IF NOT EXISTS idx_payroll_item_components_component_id ON payroll_item_components(component_id);
CREATE INDEX IF NOT EXISTS idx_payroll_components_formula_id ON payroll_components(formula_id);
CREATE INDEX IF NOT EXISTS idx_payroll_corrections_company_id ON payroll_corrections(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_corrections_approved_by ON payroll_corrections(approved_by);
CREATE INDEX IF NOT EXISTS idx_payroll_corrections_created_by ON payroll_corrections(created_by);
CREATE INDEX IF NOT EXISTS idx_payroll_corrections_original_item_id ON payroll_corrections(original_item_id);
CREATE INDEX IF NOT EXISTS idx_payroll_corrections_corrected_item_id ON payroll_corrections(corrected_item_id);
CREATE INDEX IF NOT EXISTS idx_payroll_processing_log_batch_id ON payroll_processing_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_payroll_processing_log_company_id ON payroll_processing_log(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_processing_log_performed_by ON payroll_processing_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_bank_files_company_id ON bank_files(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_files_generated_by ON bank_files(generated_by);
CREATE INDEX IF NOT EXISTS idx_wps_files_company_id ON wps_files(company_id);
CREATE INDEX IF NOT EXISTS idx_wps_files_generated_by ON wps_files(generated_by);
CREATE INDEX IF NOT EXISTS idx_employee_earnings_company_id ON employee_earnings(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_earnings_earning_type_id ON employee_earnings(earning_type_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_company_id ON employee_deductions(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_deduction_type_id ON employee_deductions(deduction_type_id);

-- Documents
CREATE INDEX IF NOT EXISTS idx_document_shares_shared_with_user ON document_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_shared_by ON document_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_uploaded_by ON document_versions(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_document_approvals_document_id ON document_approvals(document_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_approver_id ON document_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_workflow_id ON document_approvals(workflow_id);
CREATE INDEX IF NOT EXISTS idx_document_reminders_remind_user_id ON document_reminders(remind_user_id);
CREATE INDEX IF NOT EXISTS idx_document_renewals_company_id ON document_renewals(company_id);
CREATE INDEX IF NOT EXISTS idx_document_workflows_company_id ON document_workflows(company_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_company_id ON document_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON document_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_document_storage_locations_company_id ON document_storage_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_document_tag_assignments_tag_id ON document_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_document_compliance_checks_document_id ON document_compliance_checks(document_id);

-- GOSI & Compliance
CREATE INDEX IF NOT EXISTS idx_gosi_contributions_company_id ON gosi_contributions(company_id);
CREATE INDEX IF NOT EXISTS idx_nitaqat_tracking_current_band_id ON nitaqat_tracking(current_band_id);

-- Vehicles
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_company_id ON vehicle_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_company_id ON vehicle_maintenance(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_violations_company_id ON vehicle_violations(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_violations_assigned_employee_id ON vehicle_violations(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_company_id ON asset_maintenance(company_id);

-- Business operations
CREATE INDEX IF NOT EXISTS idx_business_travel_approved_by_id ON business_travel(approved_by_id);
CREATE INDEX IF NOT EXISTS idx_business_travel_hr_approval_id ON business_travel(hr_approval_id);
CREATE INDEX IF NOT EXISTS idx_business_travel_manager_approval_id ON business_travel(manager_approval_id);
CREATE INDEX IF NOT EXISTS idx_business_travel_finance_approval_id ON business_travel(finance_approval_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_approved_by_id ON expense_claims(approved_by_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_manager_approval_id ON expense_claims(manager_approval_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_finance_approval_id ON expense_claims(finance_approval_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_related_travel_id ON expense_claims(related_travel_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_approved_by_id ON insurance_policies(approved_by_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_company_id ON insurance_claims(company_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_related_employee_id ON insurance_claims(related_employee_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_related_vehicle_id ON insurance_claims(related_vehicle_id);

-- Contracts
CREATE INDEX IF NOT EXISTS idx_contract_amendments_created_by ON contract_amendments(created_by);
CREATE INDEX IF NOT EXISTS idx_contract_renewals_approved_by_id ON contract_renewals(approved_by_id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_created_by ON contract_templates(created_by);

-- Employee lifecycle (partial - most critical)
CREATE INDEX IF NOT EXISTS idx_employee_documents_company_id ON employee_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_uploaded_by ON employee_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_employee_certifications_company_id ON employee_certifications(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_onboarding_company_id ON employee_onboarding(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_onboarding_buddy_id ON employee_onboarding(buddy_id);
CREATE INDEX IF NOT EXISTS idx_employee_onboarding_hr_coordinator_id ON employee_onboarding(hr_coordinator_id);
CREATE INDEX IF NOT EXISTS idx_employee_assessments_company_id ON employee_assessments(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_assessments_reviewer_id ON employee_assessments(reviewer_id);

-- Performance
CREATE INDEX IF NOT EXISTS idx_performance_reviews_company_id ON performance_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer_id ON performance_reviews(reviewer_id);

-- Recruitment
CREATE INDEX IF NOT EXISTS idx_application_stage_history_application_id ON application_stage_history(application_id);
CREATE INDEX IF NOT EXISTS idx_application_stage_history_changed_by ON application_stage_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_interviews_company_id ON interviews(company_id);
CREATE INDEX IF NOT EXISTS idx_interviews_created_by ON interviews(created_by);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_interview_id ON interview_feedback(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_interviewer_id ON interview_feedback(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_created_by ON job_postings(created_by);
CREATE INDEX IF NOT EXISTS idx_job_postings_hiring_manager_id ON job_postings(hiring_manager_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_candidate_id ON job_offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_company_id ON job_offers(company_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_created_by ON job_offers(created_by);
CREATE INDEX IF NOT EXISTS idx_job_offers_job_posting_id ON job_offers(job_posting_id);

-- Visas
CREATE INDEX IF NOT EXISTS idx_work_visas_quota_id ON work_visas(quota_id);
CREATE INDEX IF NOT EXISTS idx_work_visas_used_for_employee_id ON work_visas(used_for_employee_id);
CREATE INDEX IF NOT EXISTS idx_visa_requests_assigned_to_id ON visa_requests(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_visa_requests_current_step_assigned_to ON visa_requests(current_step_assigned_to);
CREATE INDEX IF NOT EXISTS idx_visa_requests_employee_id ON visa_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_exit_reentry_permits_company_id ON exit_reentry_permits(company_id);

-- EOS
CREATE INDEX IF NOT EXISTS idx_eos_calculations_approved_by ON end_of_service_calculations(approved_by);
CREATE INDEX IF NOT EXISTS idx_eos_calculations_created_by ON end_of_service_calculations(created_by);

-- Org structure
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_manager_id ON cost_centers(manager_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_parent_id ON cost_centers(parent_id);
CREATE INDEX IF NOT EXISTS idx_employee_cost_centers_cost_center_id ON employee_cost_centers(cost_center_id);

-- Handbooks & contracts
CREATE INDEX IF NOT EXISTS idx_employee_handbooks_uploaded_by ON employee_handbooks(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_employee_contracts_uploaded_by ON employee_contracts(uploaded_by);

-- Audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_company_timestamp ON audit_log(company_id, timestamp DESC);

-- Salary history
CREATE INDEX IF NOT EXISTS idx_salary_history_company_id ON salary_history(company_id);

-- Drop duplicate index
DROP INDEX IF EXISTS idx_audit_company;
