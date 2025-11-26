/*
  # Add Remaining Foreign Key Indexes and Remove Duplicates

  This migration completes the foreign key index coverage and removes duplicate indexes.

  ## Changes
  - Add missing foreign key indexes
  - Remove duplicate indexes
*/

-- Add missing foreign key indexes from documents table
CREATE INDEX IF NOT EXISTS idx_documents_last_accessed_by ON documents(last_accessed_by);
CREATE INDEX IF NOT EXISTS idx_documents_template_id ON documents(template_id);
CREATE INDEX IF NOT EXISTS idx_documents_verified_by ON documents(verified_by);

-- Add missing employee lifecycle indexes
CREATE INDEX IF NOT EXISTS idx_employee_dependents_company_id ON employee_dependents(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_disciplinary_actions_company_id ON employee_disciplinary_actions(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_disciplinary_actions_issued_by ON employee_disciplinary_actions(issued_by);
CREATE INDEX IF NOT EXISTS idx_employee_education_company_id ON employee_education(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_equipment_company_id ON employee_equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_exit_surveys_company_id ON employee_exit_surveys(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_goals_company_id ON employee_goals(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_goals_set_by ON employee_goals(set_by);
CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_stages_company_id ON employee_lifecycle_stages(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_stages_created_by ON employee_lifecycle_stages(created_by);
CREATE INDEX IF NOT EXISTS idx_employee_notes_company_id ON employee_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_notes_created_by ON employee_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_employee_offboarding_company_id ON employee_offboarding(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_projects_company_id ON employee_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_promotions_approved_by ON employee_promotions(approved_by);
CREATE INDEX IF NOT EXISTS idx_employee_promotions_company_id ON employee_promotions(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_recognitions_awarded_by ON employee_recognitions(awarded_by);
CREATE INDEX IF NOT EXISTS idx_employee_recognitions_company_id ON employee_recognitions(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_referrals_company_id ON employee_referrals(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_referrals_department_id ON employee_referrals(department_id);
CREATE INDEX IF NOT EXISTS idx_employee_referrals_hired_employee_id ON employee_referrals(hired_employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_rehire_requests_company_id ON employee_rehire_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_rehire_requests_department_id ON employee_rehire_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_employee_rehire_requests_reviewed_by ON employee_rehire_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_employee_salary_reviews_approved_by ON employee_salary_reviews(approved_by);
CREATE INDEX IF NOT EXISTS idx_employee_salary_reviews_company_id ON employee_salary_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_salary_reviews_reviewed_by ON employee_salary_reviews(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_employee_skills_company_id ON employee_skills(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_verified_by ON employee_skills(verified_by);
CREATE INDEX IF NOT EXISTS idx_employee_succession_planning_company_id ON employee_succession_planning(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_succession_planning_department_id ON employee_succession_planning(department_id);
CREATE INDEX IF NOT EXISTS idx_employee_succession_planning_successor_1_id ON employee_succession_planning(successor_1_id);
CREATE INDEX IF NOT EXISTS idx_employee_succession_planning_successor_2_id ON employee_succession_planning(successor_2_id);
CREATE INDEX IF NOT EXISTS idx_employee_survey_responses_company_id ON employee_survey_responses(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_surveys_company_id ON employee_surveys(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_surveys_created_by ON employee_surveys(created_by);
CREATE INDEX IF NOT EXISTS idx_employee_time_tracking_company_id ON employee_time_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_training_records_company_id ON employee_training_records(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_approved_by ON employee_transfers(approved_by);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_company_id ON employee_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_from_department_id ON employee_transfers(from_department_id);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_to_department_id ON employee_transfers(to_department_id);

-- Add property maintenance index
CREATE INDEX IF NOT EXISTS idx_property_maintenance_company_id ON property_maintenance(company_id);

-- Add recruitment metrics index
CREATE INDEX IF NOT EXISTS idx_recruitment_metrics_job_posting_id ON recruitment_metrics(job_posting_id);

-- Remove duplicate indexes (keep the newer, more descriptive names)
DROP INDEX IF EXISTS idx_contracts_company;
DROP INDEX IF EXISTS idx_document_approvals_approver;
DROP INDEX IF EXISTS idx_document_approvals_document;
DROP INDEX IF EXISTS idx_document_shares_user;
DROP INDEX IF EXISTS idx_document_versions_document;
DROP INDEX IF EXISTS idx_payroll_items_batch;
DROP INDEX IF EXISTS idx_payroll_items_employee;
