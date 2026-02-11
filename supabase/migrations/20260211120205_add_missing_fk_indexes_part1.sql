/*
  # Add Missing Foreign Key Indexes - Part 1
  
  This migration adds indexes for unindexed foreign keys to improve query performance.
  Foreign keys without indexes can lead to suboptimal query performance, especially for joins and cascading operations.
  
  ## Tables affected (Part 1 - A to F):
  - advances
  - alert_subscriptions
  - approval_actions
  - approval_requests
  - approval_workflow_steps
  - assessment_attempts
  - assessment_question_bank
  - assessment_templates
  - attendance
  - attendance_exceptions
  - attendance_requests
  - background_checks
  - business_travel
  - calibration_participants
  - calibration_sessions
  - candidate_screenings
  - competencies
  - competency_frameworks
  - competency_levels
  - compliance_assignments
  - compliance_requirements
  - cost_impact_analysis
  - country_compliance_checklist
  - course_catalog
  - course_prerequisites
  - course_ratings_reviews
  - course_tag_mappings
  - cross_border_transfers
  - cross_company_reports
  - custom_reports
  - development_activities
  - development_plans
  - email_queue
  - employee_competency_assessments
  - employee_lifecycle_events
  - employee_metric_values
  - employee_penalties
  - employee_shifts
  - employee_status_history
  - employee_warnings
  - employees
  - exchange_rates
  - expense_approvers
  - expense_claims
  - expense_mileage
  - expense_per_diem
  - expense_receipts
  - expense_reports
  - expense_violations
  - external_content_items
  - external_content_sources
  - feedback_questions
  - feedback_requests
  - feedback_responses
*/

-- advances table
CREATE INDEX IF NOT EXISTS idx_advances_finance_approved_by ON public.advances(finance_approved_by);
CREATE INDEX IF NOT EXISTS idx_advances_hr_approved_by ON public.advances(hr_approved_by);
CREATE INDEX IF NOT EXISTS idx_advances_manager_approved_by ON public.advances(manager_approved_by);
CREATE INDEX IF NOT EXISTS idx_advances_rejected_by ON public.advances(rejected_by);

-- alert_subscriptions table
CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_company_id ON public.alert_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_employee_id ON public.alert_subscriptions(employee_id);

-- approval_actions table
CREATE INDEX IF NOT EXISTS idx_approval_actions_approval_request_id ON public.approval_actions(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_approver_id ON public.approval_actions(approver_id);

-- approval_requests table
CREATE INDEX IF NOT EXISTS idx_approval_requests_current_approver_id ON public.approval_requests(current_approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_final_approver_id ON public.approval_requests(final_approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_workflow_id ON public.approval_requests(workflow_id);

-- approval_workflow_steps table
CREATE INDEX IF NOT EXISTS idx_approval_workflow_steps_approver_employee_id ON public.approval_workflow_steps(approver_employee_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflow_steps_workflow_id ON public.approval_workflow_steps(workflow_id);

-- assessment_attempts table
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assessment_template_id ON public.assessment_attempts(assessment_template_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_graded_by ON public.assessment_attempts(graded_by);

-- assessment_question_bank table
CREATE INDEX IF NOT EXISTS idx_assessment_question_bank_created_by ON public.assessment_question_bank(created_by);

-- assessment_templates table
CREATE INDEX IF NOT EXISTS idx_assessment_templates_created_by ON public.assessment_templates(created_by);

-- attendance table
CREATE INDEX IF NOT EXISTS idx_attendance_device_id ON public.attendance(device_id);
CREATE INDEX IF NOT EXISTS idx_attendance_location_id ON public.attendance(location_id);

-- attendance_exceptions table
CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_attendance_id ON public.attendance_exceptions(attendance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_company_id ON public.attendance_exceptions(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_rejected_by ON public.attendance_exceptions(rejected_by);
CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_resolved_by ON public.attendance_exceptions(resolved_by);

-- attendance_requests table
CREATE INDEX IF NOT EXISTS idx_attendance_requests_approver_id ON public.attendance_requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_attendance_requests_attendance_id ON public.attendance_requests(attendance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_requests_company_id ON public.attendance_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_requests_rejected_by ON public.attendance_requests(rejected_by);

-- background_checks table
CREATE INDEX IF NOT EXISTS idx_background_checks_application_id ON public.background_checks(application_id);
CREATE INDEX IF NOT EXISTS idx_background_checks_verified_by ON public.background_checks(verified_by);

-- business_travel table
CREATE INDEX IF NOT EXISTS idx_business_travel_rejected_by ON public.business_travel(rejected_by);

-- calibration_participants table
CREATE INDEX IF NOT EXISTS idx_calibration_participants_participant_id ON public.calibration_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_calibration_participants_session_id ON public.calibration_participants(session_id);

-- calibration_sessions table
CREATE INDEX IF NOT EXISTS idx_calibration_sessions_company_id ON public.calibration_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_calibration_sessions_facilitator_id ON public.calibration_sessions(facilitator_id);

-- candidate_screenings table
CREATE INDEX IF NOT EXISTS idx_candidate_screenings_screened_by ON public.candidate_screenings(screened_by);

-- competencies table
CREATE INDEX IF NOT EXISTS idx_competencies_framework_id ON public.competencies(framework_id);

-- competency_frameworks table
CREATE INDEX IF NOT EXISTS idx_competency_frameworks_company_id ON public.competency_frameworks(company_id);

-- competency_levels table
CREATE INDEX IF NOT EXISTS idx_competency_levels_competency_id ON public.competency_levels(competency_id);

-- compliance_assignments table
CREATE INDEX IF NOT EXISTS idx_compliance_assignments_assigned_by ON public.compliance_assignments(assigned_by);

-- compliance_requirements table
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_course_id ON public.compliance_requirements(course_id);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_created_by ON public.compliance_requirements(created_by);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_learning_path_id ON public.compliance_requirements(learning_path_id);

-- cost_impact_analysis table
CREATE INDEX IF NOT EXISTS idx_cost_impact_analysis_company_id ON public.cost_impact_analysis(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_impact_analysis_review_cycle_id ON public.cost_impact_analysis(review_cycle_id);

-- country_compliance_checklist table
CREATE INDEX IF NOT EXISTS idx_country_compliance_checklist_assigned_to ON public.country_compliance_checklist(assigned_to);

-- course_catalog table
CREATE INDEX IF NOT EXISTS idx_course_catalog_created_by ON public.course_catalog(created_by);
CREATE INDEX IF NOT EXISTS idx_course_catalog_published_by ON public.course_catalog(published_by);

-- course_prerequisites table
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_prerequisite_course_id ON public.course_prerequisites(prerequisite_course_id);

-- course_ratings_reviews table
CREATE INDEX IF NOT EXISTS idx_course_ratings_reviews_employee_id ON public.course_ratings_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_course_ratings_reviews_moderated_by ON public.course_ratings_reviews(moderated_by);

-- course_tag_mappings table
CREATE INDEX IF NOT EXISTS idx_course_tag_mappings_tag_id ON public.course_tag_mappings(tag_id);

-- cross_border_transfers table
CREATE INDEX IF NOT EXISTS idx_cross_border_transfers_approved_by ON public.cross_border_transfers(approved_by);

-- cross_company_reports table
CREATE INDEX IF NOT EXISTS idx_cross_company_reports_created_by ON public.cross_company_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_cross_company_reports_tenant_group_id ON public.cross_company_reports(tenant_group_id);

-- custom_reports table
CREATE INDEX IF NOT EXISTS idx_custom_reports_company_id ON public.custom_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_custom_reports_created_by ON public.custom_reports(created_by);

-- development_activities table
CREATE INDEX IF NOT EXISTS idx_development_activities_development_plan_id ON public.development_activities(development_plan_id);

-- development_plans table
CREATE INDEX IF NOT EXISTS idx_development_plans_company_id ON public.development_plans(company_id);

-- email_queue table
CREATE INDEX IF NOT EXISTS idx_email_queue_template_id ON public.email_queue(template_id);

-- employee_competency_assessments table
CREATE INDEX IF NOT EXISTS idx_employee_competency_assessments_assessor_id ON public.employee_competency_assessments(assessor_id);
CREATE INDEX IF NOT EXISTS idx_employee_competency_assessments_competency_id ON public.employee_competency_assessments(competency_id);
CREATE INDEX IF NOT EXISTS idx_employee_competency_assessments_cycle_id ON public.employee_competency_assessments(cycle_id);

-- employee_lifecycle_events table
CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_events_completed_by ON public.employee_lifecycle_events(completed_by);
CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_events_created_by ON public.employee_lifecycle_events(created_by);
CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_events_employee_id ON public.employee_lifecycle_events(employee_id);

-- employee_metric_values table
CREATE INDEX IF NOT EXISTS idx_employee_metric_values_recorded_by ON public.employee_metric_values(recorded_by);

-- employee_penalties table
CREATE INDEX IF NOT EXISTS idx_employee_penalties_finance_approved_by ON public.employee_penalties(finance_approved_by);
CREATE INDEX IF NOT EXISTS idx_employee_penalties_hr_approved_by ON public.employee_penalties(hr_approved_by);
CREATE INDEX IF NOT EXISTS idx_employee_penalties_manager_approved_by ON public.employee_penalties(manager_approved_by);
CREATE INDEX IF NOT EXISTS idx_employee_penalties_penalty_type_id ON public.employee_penalties(penalty_type_id);
CREATE INDEX IF NOT EXISTS idx_employee_penalties_rejected_by ON public.employee_penalties(rejected_by);

-- employee_shifts table
CREATE INDEX IF NOT EXISTS idx_employee_shifts_company_id ON public.employee_shifts(company_id);

-- employee_status_history table
CREATE INDEX IF NOT EXISTS idx_employee_status_history_changed_by ON public.employee_status_history(changed_by);

-- employee_warnings table
CREATE INDEX IF NOT EXISTS idx_employee_warnings_issued_by ON public.employee_warnings(issued_by);

-- employees table
CREATE INDEX IF NOT EXISTS idx_employees_salary_band_id ON public.employees(salary_band_id);

-- exchange_rates table
CREATE INDEX IF NOT EXISTS idx_exchange_rates_created_by ON public.exchange_rates(created_by);

-- expense_approvers table
CREATE INDEX IF NOT EXISTS idx_expense_approvers_company_id ON public.expense_approvers(company_id);

-- expense_claims table
CREATE INDEX IF NOT EXISTS idx_expense_claims_rejected_by ON public.expense_claims(rejected_by);

-- expense_mileage table
CREATE INDEX IF NOT EXISTS idx_expense_mileage_company_id ON public.expense_mileage(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_mileage_report_id ON public.expense_mileage(report_id);

-- expense_per_diem table
CREATE INDEX IF NOT EXISTS idx_expense_per_diem_company_id ON public.expense_per_diem(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_per_diem_report_id ON public.expense_per_diem(report_id);

-- expense_receipts table
CREATE INDEX IF NOT EXISTS idx_expense_receipts_company_id ON public.expense_receipts(company_id);

-- expense_reports table
CREATE INDEX IF NOT EXISTS idx_expense_reports_approved_by_id ON public.expense_reports(approved_by_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_finance_approved_by ON public.expense_reports(finance_approved_by);
CREATE INDEX IF NOT EXISTS idx_expense_reports_hr_approved_by ON public.expense_reports(hr_approved_by);
CREATE INDEX IF NOT EXISTS idx_expense_reports_manager_approved_by ON public.expense_reports(manager_approved_by);
CREATE INDEX IF NOT EXISTS idx_expense_reports_rejected_by ON public.expense_reports(rejected_by);

-- expense_violations table
CREATE INDEX IF NOT EXISTS idx_expense_violations_company_id ON public.expense_violations(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_violations_resolved_by ON public.expense_violations(resolved_by);

-- external_content_items table
CREATE INDEX IF NOT EXISTS idx_external_content_items_course_id ON public.external_content_items(course_id);

-- external_content_sources table
CREATE INDEX IF NOT EXISTS idx_external_content_sources_created_by ON public.external_content_sources(created_by);

-- feedback_questions table
CREATE INDEX IF NOT EXISTS idx_feedback_questions_company_id ON public.feedback_questions(company_id);

-- feedback_requests table
CREATE INDEX IF NOT EXISTS idx_feedback_requests_company_id ON public.feedback_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_review_id ON public.feedback_requests(review_id);

-- feedback_responses table
CREATE INDEX IF NOT EXISTS idx_feedback_responses_feedback_request_id ON public.feedback_responses(feedback_request_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_question_id ON public.feedback_responses(question_id);
