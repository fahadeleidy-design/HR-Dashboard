import { z } from 'zod';

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string().email('Invalid email address');

export const phoneSchema = z.string().regex(
  /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
  'Invalid phone number format'
);

export const saudiNationalIdSchema = z.string().regex(
  /^[12]\d{9}$/,
  'Invalid Saudi National ID (must be 10 digits starting with 1 or 2)'
);

export const saudiIqamaSchema = z.string().regex(
  /^[12]\d{9}$/,
  'Invalid Iqama number (must be 10 digits starting with 1 or 2)'
);

export const ibanSchema = z.string().regex(
  /^SA\d{22}$/,
  'Invalid Saudi IBAN (must start with SA followed by 22 digits)'
);

export const positiveNumberSchema = z.number().positive('Must be a positive number');

export const nonNegativeNumberSchema = z.number().min(0, 'Must be 0 or greater');

export const percentageSchema = z.number().min(0).max(100, 'Must be between 0 and 100');

export const pastDateSchema = z.date().max(new Date(), 'Date cannot be in the future');

export const futureDateSchema = z.date().min(new Date(), 'Date must be in the future');

export const employeeBaseSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: emailSchema.optional().nullable(),
  phone: phoneSchema.optional().nullable(),
  national_id: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  nationality: z.string().min(1, 'Nationality is required'),
  marital_status: z.enum(['single', 'married', 'divorced', 'widowed']).optional().nullable(),
});

export const employeeCreateSchema = employeeBaseSchema.extend({
  company_id: uuidSchema,
  department_id: uuidSchema.optional().nullable(),
  job_title: z.string().min(1, 'Job title is required'),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'temporary', 'intern']),
  hire_date: z.string().min(1, 'Hire date is required'),
  basic_salary: positiveNumberSchema,
});

export const leaveRequestSchema = z.object({
  employee_id: uuidSchema,
  leave_type_id: uuidSchema,
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  days_requested: positiveNumberSchema,
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
}).refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
  message: 'End date must be after or equal to start date',
  path: ['end_date'],
});

export const loanRequestSchema = z.object({
  employee_id: uuidSchema,
  amount_requested: positiveNumberSchema,
  purpose: z.string().min(10, 'Purpose must be at least 10 characters').max(500),
  repayment_months: z.number().int().min(1).max(60, 'Repayment period cannot exceed 60 months'),
});

export const advanceRequestSchema = z.object({
  employee_id: uuidSchema,
  amount_requested: positiveNumberSchema,
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
  repayment_date: z.string().min(1, 'Repayment date is required'),
});

export const expenseClaimSchema = z.object({
  employee_id: uuidSchema,
  category: z.string().min(1, 'Category is required'),
  amount: positiveNumberSchema,
  expense_date: z.string().min(1, 'Expense date is required'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500),
  merchant: z.string().optional().nullable(),
});

export const attendanceRecordSchema = z.object({
  employee_id: uuidSchema,
  date: z.string().min(1, 'Date is required'),
  check_in_time: z.string().optional().nullable(),
  check_out_time: z.string().optional().nullable(),
  status: z.enum(['present', 'absent', 'late', 'half_day', 'on_leave', 'holiday']),
});

export const payrollComponentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(50),
  type: z.enum(['earning', 'deduction', 'benefit']),
  calculation_type: z.enum(['fixed', 'percentage', 'formula']),
  is_taxable: z.boolean().default(false),
  is_mandatory: z.boolean().default(false),
});

export const performanceReviewSchema = z.object({
  employee_id: uuidSchema,
  reviewer_id: uuidSchema,
  review_period_start: z.string().min(1, 'Review period start is required'),
  review_period_end: z.string().min(1, 'Review period end is required'),
  overall_rating: z.number().min(1).max(5, 'Rating must be between 1 and 5'),
  comments: z.string().optional().nullable(),
});

export const trainingProgramSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional().nullable(),
  duration_hours: positiveNumberSchema,
  max_participants: z.number().int().positive().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
});

export const candidateSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: emailSchema,
  phone: phoneSchema.optional().nullable(),
  position: z.string().min(1, 'Position is required'),
  source: z.string().optional().nullable(),
});

export const documentUploadSchema = z.object({
  entity_type: z.string().min(1, 'Entity type is required'),
  entity_id: uuidSchema,
  category: z.string().min(1, 'Category is required'),
  title: z.string().min(1, 'Title is required').max(200),
  file_size: positiveNumberSchema,
  file_type: z.string().min(1, 'File type is required'),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
export type LoanRequestInput = z.infer<typeof loanRequestSchema>;
export type AdvanceRequestInput = z.infer<typeof advanceRequestSchema>;
export type ExpenseClaimInput = z.infer<typeof expenseClaimSchema>;
export type AttendanceRecordInput = z.infer<typeof attendanceRecordSchema>;
export type PayrollComponentInput = z.infer<typeof payrollComponentSchema>;
export type PerformanceReviewInput = z.infer<typeof performanceReviewSchema>;
export type TrainingProgramInput = z.infer<typeof trainingProgramSchema>;
export type CandidateInput = z.infer<typeof candidateSchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
