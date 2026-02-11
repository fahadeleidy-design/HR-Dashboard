/*
  # Fix RLS Policies That Are Always True - Simplified
  
  This migration removes RLS policies that effectively bypass row-level security
  by using USING (true) or WITH CHECK (true). 
  
  We're dropping overly permissive policies where more specific policies already exist
  for the same operations. This ensures proper row-level security is enforced.
  
  ## Critical security fix:
  - Removes policies that allow unrestricted access to authenticated users
  - Relies on existing role-based and ownership-based policies for access control
  
  ## Tables affected:
  - advances
  - asset_maintenance  
  - business_travel
  - company_assets
  - contract_renewals
  - contracts
  - deduction_types
  - document_renewals
  - earnings_types
  - employee_deductions
  - employee_earnings
  - exit_reentry_permits
  - expense_categories_limits
  - gosi_api_config (partial - keeping necessary admin policies)
  - gosi_contributions
  - gosi_rates_config (partial - keeping necessary admin policies)
  - governmental_documents
  - insurance_beneficiaries
  - insurance_claims
  - insurance_policies
  - iqama_dependents
  - nitaqat_tracking
  - payroll (partial)
  - payroll_batches (partial)
  - payroll_items (partial)
  - payslips
  - profession_codes
  - property_maintenance
  - real_estate_properties
  - residence_permits
  - salary_history (partial)
  - travel_per_diem_rates
  - vehicle_assignments
  - vehicle_maintenance
  - vehicle_violations
  - vehicles
  - visa_fees_structure
  - visa_quotas
  - visa_requests
  - work_visas
  - wps_payroll_files
*/

-- Drop overly permissive "Authenticated users can manage" policies
DROP POLICY IF EXISTS "Authenticated users can manage advances" ON public.advances;
DROP POLICY IF EXISTS "Authenticated users can manage asset maintenance" ON public.asset_maintenance;
DROP POLICY IF EXISTS "Authenticated users can manage travel" ON public.business_travel;
DROP POLICY IF EXISTS "Authenticated users can manage assets" ON public.company_assets;
DROP POLICY IF EXISTS "Authenticated users can manage contract renewals" ON public.contract_renewals;
DROP POLICY IF EXISTS "Authenticated users can manage contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can manage deduction types" ON public.deduction_types;
DROP POLICY IF EXISTS "Authenticated users can manage document renewals" ON public.document_renewals;
DROP POLICY IF EXISTS "Authenticated users can manage earnings types" ON public.earnings_types;
DROP POLICY IF EXISTS "Authenticated users can manage employee deductions" ON public.employee_deductions;
DROP POLICY IF EXISTS "Authenticated users can manage employee earnings" ON public.employee_earnings;
DROP POLICY IF EXISTS "Authenticated users can manage exit reentry permits" ON public.exit_reentry_permits;
DROP POLICY IF EXISTS "Authenticated users can manage expense limits" ON public.expense_categories_limits;
DROP POLICY IF EXISTS "Authenticated users can delete GOSI config" ON public.gosi_api_config;
DROP POLICY IF EXISTS "Authenticated users can insert GOSI config" ON public.gosi_api_config;
DROP POLICY IF EXISTS "Authenticated users can update GOSI config" ON public.gosi_api_config;
DROP POLICY IF EXISTS "Authenticated users can manage GOSI contributions" ON public.gosi_contributions;
DROP POLICY IF EXISTS "Authenticated users can delete GOSI rates" ON public.gosi_rates_config;
DROP POLICY IF EXISTS "Authenticated users can insert GOSI rates" ON public.gosi_rates_config;
DROP POLICY IF EXISTS "Authenticated users can update GOSI rates" ON public.gosi_rates_config;
DROP POLICY IF EXISTS "Authenticated users can manage governmental documents" ON public.governmental_documents;
DROP POLICY IF EXISTS "Authenticated users can manage insurance beneficiaries" ON public.insurance_beneficiaries;
DROP POLICY IF EXISTS "Authenticated users can manage insurance claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Authenticated users can manage insurance policies" ON public.insurance_policies;
DROP POLICY IF EXISTS "Authenticated users can manage dependents" ON public.iqama_dependents;
DROP POLICY IF EXISTS "Authenticated users can manage nitaqat tracking" ON public.nitaqat_tracking;
DROP POLICY IF EXISTS "Authenticated users can insert payroll" ON public.payroll;
DROP POLICY IF EXISTS "Authenticated users can delete payroll batches" ON public.payroll_batches;
DROP POLICY IF EXISTS "Authenticated users can insert payroll batches" ON public.payroll_batches;
DROP POLICY IF EXISTS "Authenticated users can update payroll batches" ON public.payroll_batches;
DROP POLICY IF EXISTS "Authenticated users can delete payroll items" ON public.payroll_items;
DROP POLICY IF EXISTS "Authenticated users can insert payroll items" ON public.payroll_items;
DROP POLICY IF EXISTS "Authenticated users can update payroll items" ON public.payroll_items;
DROP POLICY IF EXISTS "Authenticated users can manage payslips" ON public.payslips;
DROP POLICY IF EXISTS "Authenticated users can manage profession codes" ON public.profession_codes;
DROP POLICY IF EXISTS "Authenticated users can manage property maintenance" ON public.property_maintenance;
DROP POLICY IF EXISTS "Authenticated users can manage properties" ON public.real_estate_properties;
DROP POLICY IF EXISTS "Authenticated users can manage residence permits" ON public.residence_permits;
DROP POLICY IF EXISTS "Authenticated users can delete salary history" ON public.salary_history;
DROP POLICY IF EXISTS "Authenticated users can insert salary history" ON public.salary_history;
DROP POLICY IF EXISTS "Authenticated users can update salary history" ON public.salary_history;
DROP POLICY IF EXISTS "Authenticated users can manage per diem rates" ON public.travel_per_diem_rates;
DROP POLICY IF EXISTS "Authenticated users can manage vehicle assignments" ON public.vehicle_assignments;
DROP POLICY IF EXISTS "Authenticated users can manage vehicle maintenance" ON public.vehicle_maintenance;
DROP POLICY IF EXISTS "Authenticated users can manage vehicle violations" ON public.vehicle_violations;
DROP POLICY IF EXISTS "Authenticated users can manage vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can manage visa fees" ON public.visa_fees_structure;
DROP POLICY IF EXISTS "Authenticated users can manage visa quotas" ON public.visa_quotas;
DROP POLICY IF EXISTS "Authenticated users can manage visa requests" ON public.visa_requests;
DROP POLICY IF EXISTS "Authenticated users can manage work visas" ON public.work_visas;
DROP POLICY IF EXISTS "Authenticated users can manage WPS files" ON public.wps_payroll_files;

-- Also drop the redundant "Admins can manage candidates" policy (it uses true)
DROP POLICY IF EXISTS "Admins can manage candidates" ON public.candidates;

-- Drop audit log policies that are overly permissive
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_log;
