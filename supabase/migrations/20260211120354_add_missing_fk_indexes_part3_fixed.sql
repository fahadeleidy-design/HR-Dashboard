/*
  # Add Missing Foreign Key Indexes - Part 3 (Fixed)
  
  Final part of adding indexes for unindexed foreign keys.
  
  ## Tables affected (Part 3 - R to W):
  - recruitment_campaigns
  - report_schedules
  - review_acknowledgments
  - review_comments
  - review_competency_ratings
  - review_goal_ratings
  - review_responses
  - review_template_questions
  - review_template_sections
  - role_module_permissions
  - role_skill_requirements
  - salary_adjustments
  - salary_bands
  - salary_budget_allocations
  - salary_comparison_ratios
  - salary_component_bands
  - salary_progression_rules
  - salary_proposals
  - salary_review_cycles
  - skill_categories
  - skill_development_plans
  - skill_gap_analysis
  - skill_matches
  - skill_matching_requests
  - succession_plans
  - system_alerts
  - system_cache_stats
  - system_error_logs
  - system_performance_metrics
  - talent_pool
  - tax_calculations
  - tenant_admin_access
  - tenant_configurations
  - training_department_assignments
  - training_module_completions
  - training_modules
  - training_quizzes
  - user_module_permissions
  - workflow_approvals
  - workflow_connections
  - workflow_delegations
  - workflow_escalations
  - workflow_instance_steps
  - workflow_instances
  - workflow_notifications
  - workflow_steps
  - workflow_templates
  - workflow_templates_audit
*/

-- recruitment_campaigns table
CREATE INDEX IF NOT EXISTS idx_recruitment_campaigns_campaign_manager_id ON public.recruitment_campaigns(campaign_manager_id);

-- report_schedules table
CREATE INDEX IF NOT EXISTS idx_report_schedules_company_id ON public.report_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_report_id ON public.report_schedules(report_id);

-- review_acknowledgments table
CREATE INDEX IF NOT EXISTS idx_review_acknowledgments_acknowledged_by ON public.review_acknowledgments(acknowledged_by);

-- review_comments table
CREATE INDEX IF NOT EXISTS idx_review_comments_commenter_id ON public.review_comments(commenter_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_parent_comment_id ON public.review_comments(parent_comment_id);

-- review_competency_ratings table
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_competency_id ON public.review_competency_ratings(competency_id);
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_review_id ON public.review_competency_ratings(review_id);

-- review_goal_ratings table
CREATE INDEX IF NOT EXISTS idx_review_goal_ratings_goal_id ON public.review_goal_ratings(goal_id);
CREATE INDEX IF NOT EXISTS idx_review_goal_ratings_review_id ON public.review_goal_ratings(review_id);

-- review_responses table
CREATE INDEX IF NOT EXISTS idx_review_responses_question_id ON public.review_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_responder_id ON public.review_responses(responder_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_review_id ON public.review_responses(review_id);

-- review_template_questions table
CREATE INDEX IF NOT EXISTS idx_review_template_questions_section_id ON public.review_template_questions(section_id);

-- review_template_sections table
CREATE INDEX IF NOT EXISTS idx_review_template_sections_template_id ON public.review_template_sections(template_id);

-- role_module_permissions table
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_granted_by ON public.role_module_permissions(granted_by);

-- role_skill_requirements table
CREATE INDEX IF NOT EXISTS idx_role_skill_requirements_department_id ON public.role_skill_requirements(department_id);

-- salary_adjustments table
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_approved_by_id ON public.salary_adjustments(approved_by_id);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_company_id ON public.salary_adjustments(company_id);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_new_grade_id ON public.salary_adjustments(new_grade_id);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_old_grade_id ON public.salary_adjustments(old_grade_id);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_proposal_id ON public.salary_adjustments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_review_cycle_id ON public.salary_adjustments(review_cycle_id);

-- salary_bands table
CREATE INDEX IF NOT EXISTS idx_salary_bands_position_id ON public.salary_bands(position_id);

-- salary_budget_allocations table
CREATE INDEX IF NOT EXISTS idx_salary_budget_allocations_company_id ON public.salary_budget_allocations(company_id);
CREATE INDEX IF NOT EXISTS idx_salary_budget_allocations_department_id ON public.salary_budget_allocations(department_id);
CREATE INDEX IF NOT EXISTS idx_salary_budget_allocations_review_cycle_id ON public.salary_budget_allocations(review_cycle_id);

-- salary_comparison_ratios table
CREATE INDEX IF NOT EXISTS idx_salary_comparison_ratios_employee_id ON public.salary_comparison_ratios(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_comparison_ratios_market_data_point_id ON public.salary_comparison_ratios(market_data_point_id);
CREATE INDEX IF NOT EXISTS idx_salary_comparison_ratios_salary_band_id ON public.salary_comparison_ratios(salary_band_id);

-- salary_component_bands table
CREATE INDEX IF NOT EXISTS idx_salary_component_bands_component_id ON public.salary_component_bands(component_id);
CREATE INDEX IF NOT EXISTS idx_salary_component_bands_grade_id ON public.salary_component_bands(grade_id);
CREATE INDEX IF NOT EXISTS idx_salary_component_bands_salary_scale_id ON public.salary_component_bands(salary_scale_id);

-- salary_progression_rules table
CREATE INDEX IF NOT EXISTS idx_salary_progression_rules_company_id ON public.salary_progression_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_salary_progression_rules_salary_scale_id ON public.salary_progression_rules(salary_scale_id);

-- salary_proposals table
CREATE INDEX IF NOT EXISTS idx_salary_proposals_proposed_by_id ON public.salary_proposals(proposed_by_id);

-- salary_review_cycles table
CREATE INDEX IF NOT EXISTS idx_salary_review_cycles_company_id ON public.salary_review_cycles(company_id);

-- skill_categories table (fixed column name)
CREATE INDEX IF NOT EXISTS idx_skill_categories_parent_category_id ON public.skill_categories(parent_category_id);

-- skill_development_plans table
CREATE INDEX IF NOT EXISTS idx_skill_development_plans_company_id ON public.skill_development_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_skill_development_plans_created_by ON public.skill_development_plans(created_by);

-- skill_gap_analysis table
CREATE INDEX IF NOT EXISTS idx_skill_gap_analysis_department_id ON public.skill_gap_analysis(department_id);

-- skill_matches table
CREATE INDEX IF NOT EXISTS idx_skill_matches_manager_approved_by ON public.skill_matches(manager_approved_by);

-- skill_matching_requests table
CREATE INDEX IF NOT EXISTS idx_skill_matching_requests_department_id ON public.skill_matching_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_skill_matching_requests_requested_by ON public.skill_matching_requests(requested_by);

-- succession_plans table
CREATE INDEX IF NOT EXISTS idx_succession_plans_current_incumbent_id ON public.succession_plans(current_incumbent_id);
CREATE INDEX IF NOT EXISTS idx_succession_plans_department_id ON public.succession_plans(department_id);

-- system_alerts table
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved_by ON public.system_alerts(resolved_by);

-- system_cache_stats table
CREATE INDEX IF NOT EXISTS idx_system_cache_stats_company_id ON public.system_cache_stats(company_id);

-- system_error_logs table
CREATE INDEX IF NOT EXISTS idx_system_error_logs_resolved_by ON public.system_error_logs(resolved_by);

-- system_performance_metrics table
CREATE INDEX IF NOT EXISTS idx_system_performance_metrics_company_id ON public.system_performance_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_system_performance_metrics_user_id ON public.system_performance_metrics(user_id);

-- talent_pool table
CREATE INDEX IF NOT EXISTS idx_talent_pool_succession_plan_id ON public.talent_pool(succession_plan_id);

-- tax_calculations table
CREATE INDEX IF NOT EXISTS idx_tax_calculations_calculated_by ON public.tax_calculations(calculated_by);

-- tenant_admin_access table
CREATE INDEX IF NOT EXISTS idx_tenant_admin_access_granted_by ON public.tenant_admin_access(granted_by);
CREATE INDEX IF NOT EXISTS idx_tenant_admin_access_tenant_group_id ON public.tenant_admin_access(tenant_group_id);

-- tenant_configurations table
CREATE INDEX IF NOT EXISTS idx_tenant_configurations_updated_by ON public.tenant_configurations(updated_by);

-- training_department_assignments table
CREATE INDEX IF NOT EXISTS idx_training_department_assignments_assigned_by ON public.training_department_assignments(assigned_by);

-- training_module_completions table
CREATE INDEX IF NOT EXISTS idx_training_module_completions_user_id ON public.training_module_completions(user_id);

-- training_modules table
CREATE INDEX IF NOT EXISTS idx_training_modules_created_by ON public.training_modules(created_by);

-- training_quizzes table
CREATE INDEX IF NOT EXISTS idx_training_quizzes_created_by ON public.training_quizzes(created_by);

-- user_module_permissions table
CREATE INDEX IF NOT EXISTS idx_user_module_permissions_department_id ON public.user_module_permissions(department_id);
CREATE INDEX IF NOT EXISTS idx_user_module_permissions_granted_by ON public.user_module_permissions(granted_by);

-- workflow_approvals table
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_delegated_from_user_id ON public.workflow_approvals(delegated_from_user_id);

-- workflow_connections table
CREATE INDEX IF NOT EXISTS idx_workflow_connections_target_step_id ON public.workflow_connections(target_step_id);

-- workflow_delegations table
CREATE INDEX IF NOT EXISTS idx_workflow_delegations_created_by ON public.workflow_delegations(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_delegations_workflow_template_id ON public.workflow_delegations(workflow_template_id);

-- workflow_escalations table
CREATE INDEX IF NOT EXISTS idx_workflow_escalations_escalated_from_user_id ON public.workflow_escalations(escalated_from_user_id);

-- workflow_instance_steps table
CREATE INDEX IF NOT EXISTS idx_workflow_instance_steps_escalated_to_user_id ON public.workflow_instance_steps(escalated_to_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instance_steps_workflow_step_id ON public.workflow_instance_steps(workflow_step_id);

-- workflow_instances table
CREATE INDEX IF NOT EXISTS idx_workflow_instances_completed_by ON public.workflow_instances(completed_by);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_current_step_id ON public.workflow_instances(current_step_id);

-- workflow_notifications table
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_workflow_instance_step_id ON public.workflow_notifications(workflow_instance_step_id);

-- workflow_steps table
CREATE INDEX IF NOT EXISTS idx_workflow_steps_escalation_to_user_id ON public.workflow_steps(escalation_to_user_id);

-- workflow_templates table
CREATE INDEX IF NOT EXISTS idx_workflow_templates_created_by ON public.workflow_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_parent_template_id ON public.workflow_templates(parent_template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_updated_by ON public.workflow_templates(updated_by);

-- workflow_templates_audit table
CREATE INDEX IF NOT EXISTS idx_workflow_templates_audit_changed_by ON public.workflow_templates_audit(changed_by);
