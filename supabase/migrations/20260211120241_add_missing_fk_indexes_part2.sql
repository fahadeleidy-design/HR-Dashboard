/*
  # Add Missing Foreign Key Indexes - Part 2
  
  Continuing to add indexes for unindexed foreign keys.
  
  ## Tables affected (Part 2 - G to Q):
  - global_payroll_runs
  - global_reports
  - goal_categories
  - goal_check_ins
  - goal_milestones
  - integration_links
  - job_positions
  - job_requisitions
  - learner_activity_log
  - learning_path_courses
  - learning_path_enrollments
  - learning_paths
  - learning_recommendations
  - leave_allocations
  - leave_balances
  - leave_blackout_dates
  - leave_encashment_requests
  - leave_requests
  - loans
  - market_data_points
  - mentorship_matches
  - mentorship_programs
  - merit_increase_matrix
  - nine_box_placements
  - offer_letters
  - offer_negotiations
  - penalty_audit_log
  - performance_bonuses
  - performance_goals
  - performance_improvement_plans
  - performance_metrics
  - performance_review_templates
  - performance_reviews
  - permission_audit_log
  - pip_action_items
  - pip_check_ins
  - promotion_increases
  - quiz_answers
*/

-- global_payroll_runs table
CREATE INDEX IF NOT EXISTS idx_global_payroll_runs_approved_by ON public.global_payroll_runs(approved_by);
CREATE INDEX IF NOT EXISTS idx_global_payroll_runs_processed_by ON public.global_payroll_runs(processed_by);

-- global_reports table
CREATE INDEX IF NOT EXISTS idx_global_reports_generated_by ON public.global_reports(generated_by);

-- goal_categories table
CREATE INDEX IF NOT EXISTS idx_goal_categories_company_id ON public.goal_categories(company_id);

-- goal_check_ins table
CREATE INDEX IF NOT EXISTS idx_goal_check_ins_created_by ON public.goal_check_ins(created_by);

-- goal_milestones table
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON public.goal_milestones(goal_id);

-- integration_links table
CREATE INDEX IF NOT EXISTS idx_integration_links_company_id ON public.integration_links(company_id);

-- job_positions table
CREATE INDEX IF NOT EXISTS idx_job_positions_department_id ON public.job_positions(department_id);
CREATE INDEX IF NOT EXISTS idx_job_positions_reports_to_position_id ON public.job_positions(reports_to_position_id);

-- job_requisitions table
CREATE INDEX IF NOT EXISTS idx_job_requisitions_approved_by ON public.job_requisitions(approved_by);
CREATE INDEX IF NOT EXISTS idx_job_requisitions_hiring_manager_id ON public.job_requisitions(hiring_manager_id);
CREATE INDEX IF NOT EXISTS idx_job_requisitions_requested_by ON public.job_requisitions(requested_by);

-- learner_activity_log table
CREATE INDEX IF NOT EXISTS idx_learner_activity_log_course_id ON public.learner_activity_log(course_id);

-- learning_path_courses table
CREATE INDEX IF NOT EXISTS idx_learning_path_courses_course_id ON public.learning_path_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_courses_unlock_after_course_id ON public.learning_path_courses(unlock_after_course_id);

-- learning_path_enrollments table
CREATE INDEX IF NOT EXISTS idx_learning_path_enrollments_enrolled_by ON public.learning_path_enrollments(enrolled_by);

-- learning_paths table
CREATE INDEX IF NOT EXISTS idx_learning_paths_created_by ON public.learning_paths(created_by);

-- learning_recommendations table
CREATE INDEX IF NOT EXISTS idx_learning_recommendations_course_id ON public.learning_recommendations(course_id);

-- leave_allocations table
CREATE INDEX IF NOT EXISTS idx_leave_allocations_allocated_by ON public.leave_allocations(allocated_by);
CREATE INDEX IF NOT EXISTS idx_leave_allocations_leave_type_id ON public.leave_allocations(leave_type_id);

-- leave_balances table
CREATE INDEX IF NOT EXISTS idx_leave_balances_leave_type_id ON public.leave_balances(leave_type_id);

-- leave_blackout_dates table
CREATE INDEX IF NOT EXISTS idx_leave_blackout_dates_applies_to_department_id ON public.leave_blackout_dates(applies_to_department_id);
CREATE INDEX IF NOT EXISTS idx_leave_blackout_dates_created_by ON public.leave_blackout_dates(created_by);

-- leave_encashment_requests table
CREATE INDEX IF NOT EXISTS idx_leave_encashment_requests_approved_by ON public.leave_encashment_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_encashment_requests_employee_id ON public.leave_encashment_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_encashment_requests_leave_type_id ON public.leave_encashment_requests(leave_type_id);

-- leave_requests table
CREATE INDEX IF NOT EXISTS idx_leave_requests_finance_approved_by ON public.leave_requests(finance_approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_hr_approved_by ON public.leave_requests(hr_approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_manager_approved_by ON public.leave_requests(manager_approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_override_approved_by ON public.leave_requests(override_approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_rejected_by ON public.leave_requests(rejected_by);

-- loans table
CREATE INDEX IF NOT EXISTS idx_loans_finance_approved_by ON public.loans(finance_approved_by);
CREATE INDEX IF NOT EXISTS idx_loans_hr_approved_by ON public.loans(hr_approved_by);
CREATE INDEX IF NOT EXISTS idx_loans_manager_approved_by ON public.loans(manager_approved_by);
CREATE INDEX IF NOT EXISTS idx_loans_rejected_by ON public.loans(rejected_by);

-- market_data_points table
CREATE INDEX IF NOT EXISTS idx_market_data_points_job_position_id ON public.market_data_points(job_position_id);
CREATE INDEX IF NOT EXISTS idx_market_data_points_survey_id ON public.market_data_points(survey_id);

-- mentorship_matches table
CREATE INDEX IF NOT EXISTS idx_mentorship_matches_program_id ON public.mentorship_matches(program_id);

-- mentorship_programs table
CREATE INDEX IF NOT EXISTS idx_mentorship_programs_program_manager ON public.mentorship_programs(program_manager);

-- merit_increase_matrix table
CREATE INDEX IF NOT EXISTS idx_merit_increase_matrix_company_id ON public.merit_increase_matrix(company_id);

-- nine_box_placements table
CREATE INDEX IF NOT EXISTS idx_nine_box_placements_calibration_session_id ON public.nine_box_placements(calibration_session_id);
CREATE INDEX IF NOT EXISTS idx_nine_box_placements_company_id ON public.nine_box_placements(company_id);
CREATE INDEX IF NOT EXISTS idx_nine_box_placements_placed_by_id ON public.nine_box_placements(placed_by_id);

-- offer_letters table
CREATE INDEX IF NOT EXISTS idx_offer_letters_generated_by ON public.offer_letters(generated_by);

-- offer_negotiations table
CREATE INDEX IF NOT EXISTS idx_offer_negotiations_responded_by ON public.offer_negotiations(responded_by);

-- penalty_audit_log table
CREATE INDEX IF NOT EXISTS idx_penalty_audit_log_performed_by ON public.penalty_audit_log(performed_by);

-- performance_bonuses table
CREATE INDEX IF NOT EXISTS idx_performance_bonuses_company_id ON public.performance_bonuses(company_id);
CREATE INDEX IF NOT EXISTS idx_performance_bonuses_cycle_id ON public.performance_bonuses(cycle_id);
CREATE INDEX IF NOT EXISTS idx_performance_bonuses_review_id ON public.performance_bonuses(review_id);

-- performance_goals table
CREATE INDEX IF NOT EXISTS idx_performance_goals_category_id ON public.performance_goals(category_id);
CREATE INDEX IF NOT EXISTS idx_performance_goals_company_id ON public.performance_goals(company_id);
CREATE INDEX IF NOT EXISTS idx_performance_goals_created_by ON public.performance_goals(created_by);
CREATE INDEX IF NOT EXISTS idx_performance_goals_parent_goal_id ON public.performance_goals(parent_goal_id);

-- performance_improvement_plans table
CREATE INDEX IF NOT EXISTS idx_performance_improvement_plans_company_id ON public.performance_improvement_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_performance_improvement_plans_manager_id ON public.performance_improvement_plans(manager_id);
CREATE INDEX IF NOT EXISTS idx_performance_improvement_plans_review_id ON public.performance_improvement_plans(review_id);

-- performance_metrics table
CREATE INDEX IF NOT EXISTS idx_performance_metrics_company_id ON public.performance_metrics(company_id);

-- performance_review_templates table
CREATE INDEX IF NOT EXISTS idx_performance_review_templates_company_id ON public.performance_review_templates(company_id);

-- performance_reviews table
CREATE INDEX IF NOT EXISTS idx_performance_reviews_cycle_id ON public.performance_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_template_id ON public.performance_reviews(template_id);

-- permission_audit_log table
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_department_id ON public.permission_audit_log(department_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_role_id ON public.permission_audit_log(role_id);

-- pip_action_items table
CREATE INDEX IF NOT EXISTS idx_pip_action_items_pip_id ON public.pip_action_items(pip_id);

-- pip_check_ins table
CREATE INDEX IF NOT EXISTS idx_pip_check_ins_created_by ON public.pip_check_ins(created_by);
CREATE INDEX IF NOT EXISTS idx_pip_check_ins_pip_id ON public.pip_check_ins(pip_id);

-- promotion_increases table
CREATE INDEX IF NOT EXISTS idx_promotion_increases_company_id ON public.promotion_increases(company_id);
CREATE INDEX IF NOT EXISTS idx_promotion_increases_from_grade_id ON public.promotion_increases(from_grade_id);
CREATE INDEX IF NOT EXISTS idx_promotion_increases_to_grade_id ON public.promotion_increases(to_grade_id);

-- quiz_answers table
CREATE INDEX IF NOT EXISTS idx_quiz_answers_selected_option_id ON public.quiz_answers(selected_option_id);
