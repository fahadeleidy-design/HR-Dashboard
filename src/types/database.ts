export interface Company {
  id: string;
  name_en: string;
  name_ar?: string;
  commercial_registration?: string;
  nitaqat_entity_id?: string;
  nitaqat_color: 'platinum' | 'green' | 'yellow' | 'red';
  labor_office_number?: string;
  gosi_registration?: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  company_id: string;
  name_en: string;
  name_ar?: string;
  code: string;
  manager_id?: string;
  cost_center?: string;
  created_at: string;
}

export interface Employee {
  id: string;
  company_id: string;
  department_id?: string;
  employee_number: string;
  iqama_number?: string;
  passport_number?: string;
  first_name_en: string;
  last_name_en: string;
  first_name_ar?: string;
  last_name_ar?: string;
  email?: string;
  phone?: string;
  nationality: string;
  is_saudi: boolean;
  has_disability?: boolean;
  gender: 'male' | 'female';
  date_of_birth?: string;
  hire_date: string;
  probation_end_date?: string;
  job_title_en: string;
  job_title_ar?: string;
  employment_type: 'indefinite' | 'fixed_term' | 'temporary' | 'part_time' | 'seasonal';
  status: 'active' | 'on_leave' | 'terminated';
  termination_date?: string;
  termination_reason?: string;
  iqama_expiry?: string;
  passport_expiry?: string;
  manager_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Payroll {
  id: string;
  employee_id: string;
  company_id: string;
  basic_salary: number;
  housing_allowance: number;
  transportation_allowance: number;
  other_allowances: number;
  gross_salary: number;
  gosi_employee: number;
  gosi_employer: number;
  other_deductions: number;
  net_salary: number;
  payment_method: 'wps' | 'cash' | 'check';
  iban?: string;
  bank_name?: string;
  effective_from: string;
  effective_to?: string;
  created_at: string;
}

export interface LeaveType {
  id: string;
  company_id: string;
  name_en: string;
  name_ar?: string;
  max_days_per_year: number;
  is_paid: boolean;
  requires_approval: boolean;
  saudi_labor_law_based: boolean;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  company_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approver_id?: string;
  approved_at?: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  company_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  working_hours: number;
  overtime_hours: number;
  late_minutes: number;
  early_leave_minutes: number;
  status: 'present' | 'absent' | 'half_day' | 'weekend' | 'holiday';
  created_at: string;
}

export interface NitaqatTracking {
  id: string;
  company_id: string;
  calculation_date: string;
  total_employees: number;
  saudi_employees: number;
  non_saudi_employees: number;
  saudization_percentage: number;
  required_percentage: number;
  nitaqat_color: 'platinum' | 'green' | 'yellow' | 'red';
  entity_size?: 'small' | 'medium' | 'large' | 'very_large';
  notes?: string;
  created_at: string;
}

export interface GOSIContribution {
  id: string;
  employee_id: string;
  company_id: string;
  month: string;
  wage_subject_to_gosi: number;
  employee_contribution: number;
  employer_contribution: number;
  total_contribution: number;
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_date?: string;
  created_at: string;
}

export interface WPSPayrollFile {
  id: string;
  company_id: string;
  period_month: string;
  total_employees: number;
  total_amount: number;
  file_generated_at: string;
  submitted_to_bank: boolean;
  submission_date?: string;
  mol_reference?: string;
  created_at: string;
}

export interface Document {
  id: string;
  employee_id: string;
  company_id: string;
  document_type: 'iqama' | 'passport' | 'contract' | 'certificate' | 'visa' | 'medical' | 'other';
  document_name: string;
  document_url?: string;
  issue_date?: string;
  expiry_date?: string;
  version: number;
  status: 'active' | 'expired' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  company_id: string;
  reviewer_id?: string;
  review_period_start: string;
  review_period_end: string;
  overall_rating?: number;
  goals_achievement?: number;
  competencies_rating?: number;
  comments?: string;
  status: 'draft' | 'submitted' | 'acknowledged';
  created_at: string;
  updated_at: string;
}

export interface TrainingProgram {
  id: string;
  company_id: string;
  program_name_en: string;
  program_name_ar?: string;
  description?: string;
  trainer_name?: string;
  start_date: string;
  end_date: string;
  duration_hours: number;
  cost: number;
  max_participants?: number;
  created_at: string;
}

export interface TrainingEnrollment {
  id: string;
  training_program_id: string;
  employee_id: string;
  enrollment_date: string;
  completion_status: 'enrolled' | 'completed' | 'cancelled';
  completion_date?: string;
  certificate_issued: boolean;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  employee_id?: string;
  role: 'super_admin' | 'hr_admin' | 'hr_manager' | 'manager' | 'employee';
  company_id: string;
  permissions: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  company_id?: string;
  user_id?: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  timestamp: string;
}
