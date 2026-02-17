# Complete Business Rules and Use Cases

## Saudi HR Management System - Comprehensive Documentation

**Document Version**: 1.0
**Last Updated**: February 17, 2026

---

## Table of Contents

1. [Business Rules Catalog](#business-rules-catalog)
2. [User Journey Maps](#user-journey-maps)
3. [Complete Use Case Specifications](#complete-use-case-specifications)
4. [Decision Tables](#decision-tables)
5. [Calculation Formulas](#calculation-formulas)
6. [Validation Rules](#validation-rules)

---

## Business Rules Catalog

### BR-001: Employee Management Rules

| Rule ID | Category | Description | Formula/Logic |
|---------|----------|-------------|---------------|
| BR-EMP-001 | Uniqueness | Employee number must be unique per company | CHECK: NOT EXISTS (SELECT 1 FROM employees WHERE employee_number = NEW.employee_number AND company_id = NEW.company_id AND id != NEW.id) |
| BR-EMP-002 | Format | Iqama number: 10 digits starting with 1 or 2 | REGEX: ^[12][0-9]{9}$ |
| BR-EMP-003 | Date | Hire date cannot be in the future | CHECK: hire_date <= CURRENT_DATE |
| BR-EMP-004 | Calculation | Probation end date = hire_date + 90 days | probation_end_date = hire_date + INTERVAL '90 days' |
| BR-EMP-005 | Auto-calculation | is_saudi determined by nationality | is_saudi = (nationality = 'Saudi') |
| BR-EMP-006 | Salary | Basic salary must be > 0 | CHECK: basic_salary > 0 |
| BR-EMP-007 | Saudi Min Wage | Saudi employees: basic >= 4000 SAR | CHECK: NOT is_saudi OR basic_salary >= 4000 |
| BR-EMP-008 | Email | Email must be unique if provided | UNIQUE INDEX ON email WHERE email IS NOT NULL |
| BR-EMP-009 | Status | Status values: active, on_leave, terminated | CHECK: status IN ('active', 'on_leave', 'terminated') |
| BR-EMP-010 | Termination | Cannot terminate without termination_date | CHECK: status != 'terminated' OR termination_date IS NOT NULL |

### BR-002: Payroll Management Rules

| Rule ID | Category | Description | Formula/Logic |
|---------|----------|-------------|---------------|
| BR-PAY-001 | GOSI Employee | Employee contribution: 10% of GOSI base | employee_gosi = MIN(basic + housing + transport, 45000) × 0.10 |
| BR-PAY-002 | GOSI Employer Saudi | Employer contribution for Saudi: 12% | employer_gosi = MIN(basic + housing + transport, 45000) × 0.12 |
| BR-PAY-003 | GOSI Employer Non-Saudi | Employer contribution for non-Saudi: 2% | employer_gosi = MIN(basic + housing + transport, 45000) × 0.02 |
| BR-PAY-004 | GOSI Cap | Maximum GOSI wage: 45,000 SAR | gosi_base = MIN(basic + allowances, 45000) |
| BR-PAY-005 | Gross Salary | Sum of all earnings | gross = basic + housing + transport + food + mobile + other + overtime + bonus |
| BR-PAY-006 | Net Salary | Gross minus all deductions | net = gross - (gosi_employee + loan + advance + absence + penalties) |
| BR-PAY-007 | Overtime Rate | Standard overtime: 1.25x hourly rate | overtime_pay = (basic/240) × hours × 1.25 |
| BR-PAY-008 | Daily Rate | Daily rate for deductions | daily_rate = gross / 30 |
| BR-PAY-009 | Absence Deduction | Deduct full daily rate per absent day | absence_deduction = daily_rate × absence_days |
| BR-PAY-010 | Batch Status | Valid states and transitions | draft → pending_approval → approved → processed → paid |
| BR-PAY-011 | WPS Deadline | Must submit before month end | submission_date <= LAST_DAY(payroll_month) |
| BR-PAY-012 | Payment Method | Valid methods | CHECK: payment_method IN ('wps', 'cash', 'check') |
| BR-PAY-013 | IBAN Required | WPS requires valid IBAN | CHECK: payment_method != 'wps' OR iban IS NOT NULL |
| BR-PAY-014 | Lock After Process | Cannot edit processed payroll | CHECK: status NOT IN ('processed', 'paid') |
| BR-PAY-015 | Approval Amount | Batches > 500K require dual approval | IF total_amount > 500000 THEN require_approvals = 2 |

### BR-003: Leave Management Rules

| Rule ID | Category | Description | Formula/Logic |
|---------|----------|-------------|---------------|
| BR-LEV-001 | Annual Leave Year 1-5 | 21 days per year | annual_entitlement = 21 |
| BR-LEV-002 | Annual Leave Year 5+ | 30 days per year after 5 years service | IF service_years >= 5 THEN annual_entitlement = 30 |
| BR-LEV-003 | Leave Accrual | Monthly accrual | monthly_accrual = annual_entitlement / 12 |
| BR-LEV-004 | Sick Leave Total | 120 days per year | sick_entitlement = 120 |
| BR-LEV-005 | Sick Leave Payment 1 | First 30 days: 100% paid | IF days <= 30 THEN pay_rate = 1.0 |
| BR-LEV-006 | Sick Leave Payment 2 | Days 31-90: 50% paid | IF days BETWEEN 31 AND 90 THEN pay_rate = 0.5 |
| BR-LEV-007 | Sick Leave Payment 3 | Days 91-120: Unpaid | IF days > 90 THEN pay_rate = 0.0 |
| BR-LEV-008 | Hajj Leave | 10 days once per 5 years | IF last_hajj IS NULL OR (CURRENT_DATE - last_hajj) >= 1825 THEN eligible = TRUE |
| BR-LEV-009 | Maternity Leave | 70 days full paid | maternity_days = 70, pay_rate = 1.0 |
| BR-LEV-010 | Paternity Leave | 3 days full paid | paternity_days = 3, pay_rate = 1.0 |
| BR-LEV-011 | Balance Check | Cannot request more than available | CHECK: requested_days <= available_balance |
| BR-LEV-012 | Overlap Check | No overlapping approved leaves | CHECK: NOT EXISTS (SELECT 1 FROM leave_requests WHERE status = 'approved' AND dates_overlap) |
| BR-LEV-013 | Future Date | Start date must be in future | CHECK: start_date > CURRENT_DATE |
| BR-LEV-014 | Date Order | End date must be >= start date | CHECK: end_date >= start_date |
| BR-LEV-015 | Weekend Exclusion | Weekends not counted in leave days | working_days = EXCLUDE(start_date, end_date, ['Friday', 'Saturday']) |
| BR-LEV-016 | Holiday Exclusion | Public holidays not counted | working_days = EXCLUDE_HOLIDAYS(start_date, end_date) |
| BR-LEV-017 | Medical Certificate | Required for sick leave > 3 days | IF leave_type = 'sick' AND days > 3 THEN medical_certificate_required = TRUE |
| BR-LEV-018 | Probation Restriction | No annual leave during probation | IF CURRENT_DATE < probation_end_date THEN annual_leave_blocked = TRUE |
| BR-LEV-019 | Balance Carryover | Max 30 days carryover | next_year_balance = MIN(unused_balance, 30) |
| BR-LEV-020 | Minimum Notice | 3 days advance notice for annual leave | CHECK: start_date >= CURRENT_DATE + INTERVAL '3 days' |

### BR-004: Attendance Rules

| Rule ID | Category | Description | Formula/Logic |
|---------|----------|-------------|---------------|
| BR-ATT-001 | Standard Hours | 8 hours per day | standard_hours = 8 |
| BR-ATT-002 | Grace Period | 30 minutes late without penalty | IF late_minutes <= 30 THEN penalty = 0 |
| BR-ATT-003 | Late Penalty 1 | 30-60 minutes: Warning | IF late_minutes BETWEEN 31 AND 60 THEN penalty = 'warning' |
| BR-ATT-004 | Late Penalty 2 | >60 minutes: 0.5 day deduction | IF late_minutes > 60 THEN deduction = 0.5 |
| BR-ATT-005 | Half Day | Less than 4 hours worked | IF working_hours < 4 THEN status = 'half_day' |
| BR-ATT-006 | Absent | No check-in recorded | IF check_in IS NULL THEN status = 'absent' |
| BR-ATT-007 | Overtime Calculation | Hours beyond 8 per day | overtime_hours = MAX(0, working_hours - 8) |
| BR-ATT-008 | Overtime Rate | 1.25x for first 2 hours | IF overtime <= 2 THEN rate = 1.25 |
| BR-ATT-009 | Overtime Rate Extended | 1.5x after 2 hours | IF overtime > 2 THEN rate = 1.5 |
| BR-ATT-010 | Daily Overtime Limit | Max 2 hours per day | CHECK: overtime_hours <= 2 |
| BR-ATT-011 | Weekly Overtime Limit | Max 10 hours per week | CHECK: SUM(weekly_overtime) <= 10 |
| BR-ATT-012 | Working Hours Calc | Check-out minus check-in minus break | working_hours = (check_out - check_in) - break_duration |
| BR-ATT-013 | Break Time | Standard 1 hour unpaid break | break_duration = 1 hour |
| BR-ATT-014 | Weekend Status | Friday-Saturday | IF day_of_week IN ('Friday', 'Saturday') THEN status = 'weekend' |
| BR-ATT-015 | Leave Override | On approved leave = not absent | IF has_approved_leave THEN status = 'on_leave' |

### BR-005: Compliance Rules (Nitaqat)

| Rule ID | Category | Description | Formula/Logic |
|---------|----------|-------------|---------------|
| BR-NIT-001 | Saudi Percentage | Saudi employees / Total employees × 100 | saudi_percentage = (saudi_count / total_count) × 100 |
| BR-NIT-002 | Platinum Band | >= 90% Saudi employees | IF saudi_percentage >= 90 THEN band = 'platinum' |
| BR-NIT-003 | Green Band | >= 75% Saudi employees | IF saudi_percentage >= 75 AND < 90 THEN band = 'green' |
| BR-NIT-004 | Yellow Band | >= 50% Saudi employees | IF saudi_percentage >= 50 AND < 75 THEN band = 'yellow' |
| BR-NIT-005 | Red Band | < 50% Saudi employees | IF saudi_percentage < 50 THEN band = 'red' |
| BR-NIT-006 | Size Small | 1-9 employees | IF total_employees BETWEEN 1 AND 9 THEN size = 'small' |
| BR-NIT-007 | Size Medium | 10-49 employees | IF total_employees BETWEEN 10 AND 49 THEN size = 'medium' |
| BR-NIT-008 | Size Large | 50-499 employees | IF total_employees BETWEEN 50 AND 499 THEN size = 'large' |
| BR-NIT-009 | Size Very Large | 500+ employees | IF total_employees >= 500 THEN size = 'very_large' |
| BR-NIT-010 | Effective Count | Discount factors for certain categories | effective_saudi = full_saudi + (female_saudi × 1.5) + (disabled_saudi × 4) |
| BR-NIT-011 | Weekly Snapshot | Calculate every Sunday | run_date = EVERY SUNDAY AT 00:00 |
| BR-NIT-012 | Active Only | Count only active employees | WHERE status = 'active' |

### BR-006: Loan and Advance Rules

| Rule ID | Category | Description | Formula/Logic |
|---------|----------|-------------|---------------|
| BR-LON-001 | Max Loan Limit 1 | Cannot exceed 6 months basic salary | CHECK: amount <= (basic_salary × 6) |
| BR-LON-002 | Max Loan Limit 2 | Cannot exceed 50% of EOSB | CHECK: amount <= (eos_benefit × 0.5) |
| BR-LON-003 | Service Requirement | Minimum 6 months service | CHECK: service_months >= 6 |
| BR-LON-004 | Max Installments | Maximum 12 monthly installments | CHECK: installments <= 12 |
| BR-LON-005 | One Loan Rule | Only one active loan at a time | CHECK: NOT EXISTS (SELECT 1 FROM loans WHERE status = 'active' AND employee_id = NEW.employee_id) |
| BR-LON-006 | Debt Ratio | Total obligations < 33% of salary | CHECK: (total_obligations / gross_salary) < 0.33 |
| BR-LON-007 | Interest Free | No interest charged | interest_rate = 0 |
| BR-LON-008 | Monthly Deduction | Equal installments | monthly_installment = amount / installments |
| BR-ADV-001 | Max Advance Limit | Cannot exceed 1 month basic salary | CHECK: amount <= basic_salary |
| BR-ADV-002 | Advance Frequency | Maximum 1 advance per 12 months | CHECK: (CURRENT_DATE - last_advance_date) >= 365 |
| BR-ADV-003 | Advance Service | Minimum 3 months service | CHECK: service_months >= 3 |
| BR-ADV-004 | Advance Repayment | Full amount deducted next payroll | deduction_months = 1 |
| BR-ADV-005 | No Active Loan | Cannot have advance with active loan | CHECK: NOT EXISTS active_loan |

### BR-007: End of Service Benefits (EOSB) Rules

| Rule ID | Category | Description | Formula/Logic |
|---------|----------|-------------|---------------|
| BR-EOS-001 | Service 0-2 Years | 1/3 of monthly salary per month | IF service <= 2 THEN eos = (monthly_salary / 3) × service_months |
| BR-EOS-002 | Service 2-5 Years | 1/2 of monthly salary per month for years 3-5 | eos_2_5 = (monthly_salary / 2) × months_in_range |
| BR-EOS-003 | Service 5+ Years | Full monthly salary per month after 5 years | eos_5plus = monthly_salary × months_in_range |
| BR-EOS-004 | Termination Reason | Reduced if employee resigns < 2 years | IF resignation AND service < 2 THEN eos = 0 |
| BR-EOS-005 | Termination Reason | 50% if employee resigns 2-5 years | IF resignation AND service BETWEEN 2 AND 5 THEN eos = eos × 0.5 |
| BR-EOS-006 | Termination Reason | Full if employee resigns 5+ years | IF resignation AND service >= 5 THEN eos = eos × 1.0 |
| BR-EOS-007 | Termination Reason | Full if employer terminates (except misconduct) | IF employer_terminated AND NOT misconduct THEN eos = eos × 1.0 |
| BR-EOS-008 | Salary Base | Based on last drawn salary | last_salary = basic + housing + transport |
| BR-EOS-009 | Deductions | Deduct outstanding loans/advances | final_eos = calculated_eos - outstanding_loans - outstanding_advances |
| BR-EOS-010 | Notice Period | Reduce by notice period shortfall | IF notice_shortfall THEN deduct = (days_short × daily_rate) |

---

## User Journey Maps

### Journey 1: New Employee Onboarding (Employee Perspective)

**User Persona**: Ahmed, New Employee
**Goal**: Complete onboarding and start working
**Touchpoints**: Email, Employee Portal, Manager Interactions

```
PHASE 1: PRE-HIRE
┌─────────────────────────────────────────────────────────────┐
│ Touchpoint: Email Notification                              │
│ Actor: HR                                                   │
│ Action: Sends offer letter and onboarding instructions     │
│ Employee Emotion: 😊 Excited                                │
│ Employee Thought: "Can't wait to start!"                   │
└─────────────────────────────────────────────────────────────┘

PHASE 2: DAY 1 - WELCOME
┌─────────────────────────────────────────────────────────────┐
│ Touchpoint: In-Person Welcome                               │
│ Actor: HR Staff                                             │
│ Actions:                                                    │
│  - Welcome to office                                        │
│  - Collect signed documents                                 │
│  - Provide employee handbook                                │
│  - Issue employee badge                                     │
│  - Provide credentials for portal                           │
│ Employee Emotion: 😊😅 Excited but nervous                  │
│ Employee Thought: "So much information!"                   │
│ Pain Point: Information overload                            │
└─────────────────────────────────────────────────────────────┘

PHASE 3: PORTAL ACCESS
┌─────────────────────────────────────────────────────────────┐
│ Touchpoint: Employee Portal - First Login                   │
│ Actor: Ahmed (Employee)                                     │
│ Actions:                                                    │
│  1. Opens email with login credentials                      │
│  2. Navigates to portal URL                                 │
│  3. Enters username and password                            │
│  4. System prompts for password change                      │
│  5. Sets new secure password                                │
│  6. Completes profile (emergency contacts, bank details)    │
│ Employee Emotion: 😐 Neutral, focused                       │
│ Employee Thought: "Let me get this done correctly"         │
│ System Response: Success confirmation                       │
│ Next Action: View onboarding checklist                      │
└─────────────────────────────────────────────────────────────┘

PHASE 4: ONBOARDING CHECKLIST
┌─────────────────────────────────────────────────────────────┐
│ Touchpoint: Onboarding Dashboard                            │
│ Actor: Ahmed (Employee)                                     │
│ System Shows:                                               │
│  ☑ Complete profile information                             │
│  ☐ Submit copies of Iqama and passport                      │
│  ☐ Complete bank account details                            │
│  ☐ Acknowledge employee handbook                            │
│  ☐ Complete orientation training                            │
│  ☐ Meet with direct manager                                 │
│  ☐ Setup email and system accounts                          │
│ Progress: 14% Complete                                      │
│ Employee Emotion: 😊 Motivated                              │
│ Employee Thought: "Clear steps - I can do this!"           │
│ Positive: Clear visual progress tracking                    │
└─────────────────────────────────────────────────────────────┘

PHASE 5: DOCUMENT UPLOAD
┌─────────────────────────────────────────────────────────────┐
│ Touchpoint: Document Management                             │
│ Actor: Ahmed (Employee)                                     │
│ Actions:                                                    │
│  1. Clicks "Upload Documents"                               │
│  2. Selects "Iqama" document type                           │
│  3. Chooses file from device                                │
│  4. System validates file (PDF, max 5MB)                    │
│  5. Enters Iqama number and expiry date                     │
│  6. Submits for HR verification                             │
│  7. Repeats for passport                                    │
│ System Response: "Documents uploaded successfully"          │
│ Employee Emotion: 😊 Satisfied                              │
│ Employee Thought: "That was easy!"                         │
│ Positive: Drag-and-drop interface, clear requirements      │
└─────────────────────────────────────────────────────────────┘

PHASE 6: MANAGER MEETING
┌─────────────────────────────────────────────────────────────┐
│ Touchpoint: In-Person Manager Meeting                       │
│ Actor: Direct Manager                                       │
│ Actions:                                                    │
│  - Welcome to the team                                      │
│  - Explain role and responsibilities                        │
│  - Introduce team members                                   │
│  - Set initial goals and expectations                       │
│  - Answer questions                                         │
│ Duration: 45 minutes                                        │
│ Employee Emotion: 😊 Confident                              │
│ Employee Thought: "I'm going to enjoy working here!"       │
│ Positive: Manager is supportive and clear                   │
└─────────────────────────────────────────────────────────────┘

PHASE 7: WEEK 1 - ONGOING
┌─────────────────────────────────────────────────────────────┐
│ Touchpoint: Daily Portal Use                                │
│ Actor: Ahmed (Employee)                                     │
│ Daily Actions:                                              │
│  - Check-in/check-out for attendance                        │
│  - View team calendar                                       │
│  - Access training materials                                │
│  - Review upcoming tasks                                    │
│ Employee Emotion: 😊 Comfortable                            │
│ Employee Thought: "I'm getting the hang of this"           │
│ Checklist Progress: 85% Complete                            │
└─────────────────────────────────────────────────────────────┘

PHASE 8: WEEK 2 - SETTLED
┌─────────────────────────────────────────────────────────────┐
│ Touchpoint: Full System Access                              │
│ Actor: Ahmed (Employee)                                     │
│ Onboarding Complete ✓                                       │
│ Available Self-Service Actions:                             │
│  - Request leave                                            │
│  - Submit expense claims                                    │
│  - View payslips                                            │
│  - Update personal information                              │
│  - Enroll in training programs                              │
│ Employee Emotion: 😊😎 Confident and productive             │
│ Employee Thought: "I'm now fully integrated!"              │
│ Success Metrics:                                            │
│  ✓ Completed all onboarding tasks                           │
│  ✓ Attended orientation                                     │
│  ✓ Met all team members                                     │
│  ✓ First productive contribution made                       │
└─────────────────────────────────────────────────────────────┘
```

**Emotional Journey Graph**:
```
Excitement
   10│    ●
    9│         ●
    8│              ●                    ●
    7│                   ●          ●
    6│                        ●
    5│
   ─┴────────────────────────────────────────
    Pre   Day1  Login  Tasks  Docs  Mgr  Complete
```

**Pain Points Identified**:
1. Information overload on Day 1
2. Password complexity requirements (minor frustration)
3. Waiting for HR document verification

**Opportunities for Improvement**:
1. Gamify onboarding checklist with rewards
2. Video tutorials for each step
3. Automated reminders for pending tasks
4. Peer buddy assignment

---

### Journey 2: Manager Approving Leave Request

**User Persona**: Sarah, Department Manager
**Goal**: Review and approve team leave requests
**Context**: Busy morning with meetings

```
TRIGGER: New Leave Request Notification
┌─────────────────────────────────────────────────────────────┐
│ Touchpoint: Email Notification (8:15 AM)                    │
│ Content: "New leave request from Hassan (5 days, Mar 15-19)"│
│ Manager Emotion: 😐 Busy                                     │
│ Manager Thought: "I'll check this when I have a moment"    │
│ Action: Marks email as unread for later                     │
└─────────────────────────────────────────────────────────────┘

DELAY: 3 Hours (in meetings)

PHASE 1: PORTAL ACCESS
┌─────────────────────────────────────────────────────────────┐
│ Touchpoint: Portal Login (11:30 AM - between meetings)      │
│ Actor: Sarah (Manager)                                      │
│ Screen Shows:                                               │
│  🔔 Notification Badge: "3 Pending Approvals"               │
│  - 1 Leave Request                                          │
│  - 2 Expense Claims                                         │
│ Manager Emotion: 😟 Concerned                               │
│ Manager Thought: "I need to handle these quickly"          │
│ Clicks: "Pending Requests"                                  │
└─────────────────────────────────────────────────────────────┘

PHASE 2: REQUEST REVIEW
┌─────────────────────────────────────────────────────────────┐
│ Touchpoint: Pending Approvals Dashboard                     │
│ Actor: Sarah (Manager)                                      │
│ Screen Shows (Summary View):                                │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Hassan Ali - Annual Leave - 5 days                   │   │
│ │ Mar 15-19, 2026 │ Balance: 12 days │ ⏰ 3h ago       │   │
│ │ Reason: "Family vacation in Dubai"                   │   │
│ │ [View Details] [Quick Approve] [Reject]              │   │
│ └──────────────────────────────────────────────────────┘   │
│ Manager Emotion: 😐 Evaluating                              │
│ Manager Thought: "Need to check team coverage"             │
│ Clicks: "View Details"                                      │
└─────────────────────────────────────────────────────────────┘

PHASE 3: DETAILED REVIEW
┌─────────────────────────────────────────────────────────────┐
│ Touchpoint: Leave Request Detail View                       │
│ Actor: Sarah (Manager)                                      │
│ Screen Shows:                                               │
│  Employee: Hassan Ali (Senior Developer)                    │
│  Leave Type: Annual Leave                                   │
│  Dates: March 15-19, 2026 (5 working days)                  │
│  Current Balance: 12 days → After: 7 days                   │
│  Reason: Family vacation in Dubai                           │
│                                                             │
│  📅 TEAM CALENDAR WIDGET:                                    │
│  ┌────────────────────────────────────────────┐            │
│  │ Week of Mar 15-19:                         │            │
│  │ ✓ Ahmed: Available                         │            │
│  │ ✓ Fatima: Available                        │            │
│  │ ✓ Mohammed: Available                      │            │
│  │ ⚠ Sara: On leave Mar 18-19 (2 days overlap)│            │
│  │                                            │            │
│  │ Team Strength: 75% (3 of 4 available)     │            │
│  └────────────────────────────────────────────┘            │
│                                                             │
│  📊 PROJECT DEADLINES:                                       │
│  ⚠ Project Alpha: Demo on Mar 20 (Hassan is contributor)   │
│  ✓ No critical blockers identified                          │
│                                                             │
│ Manager Emotion: 🤔 Thoughtful decision                     │
│ Manager Thought: "Team coverage is OK, but project demo... │
│                  I should ask Hassan about handover"       │
│ Insight: Context-rich display helps informed decision       │
└─────────────────────────────────────────────────────────────┘

PHASE 4: DECISION PROCESS
┌─────────────────────────────────────────────────────────────┐
│ Mental Checklist:                                           │
│  ✓ Team coverage: Acceptable (75%)                          │
│  ⚠ Project deadline: Demo after return                      │
│  ✓ Employee deserves time off (good performance)            │
│  ✓ Adequate notice period (4 weeks in advance)              │
│                                                             │
│ Decision: APPROVE with condition (complete demo prep)       │
│                                                             │
│ Manager Emotion: 😊 Confident in decision                   │
│ Manager Thought: "This works if Hassan prepares handover"  │
└─────────────────────────────────────────────────────────────┘

PHASE 5: APPROVAL ACTION
┌─────────────────────────────────────────────────────────────┐
│ Touchpoint: Approval Form                                   │
│ Actor: Sarah (Manager)                                      │
│ Actions:                                                    │
│  1. Clicks "Approve" button                                 │
│  2. System shows comment box (optional)                     │
│  3. Sarah types:                                            │
│     "Approved. Please ensure Project Alpha demo materials   │
│     are prepared and handed over to Ahmed before you leave."│
│  4. Clicks "Confirm Approval"                               │
│  5. System processes approval (< 1 second)                  │
│  6. Success message: "Leave request approved successfully"  │
│                                                             │
│ Manager Emotion: 😊 Satisfied                               │
│ Manager Thought: "Done! Next approval..."                  │
│ Time Spent: 3 minutes total                                 │
│ Positive: Quick, informed decision with context             │
└─────────────────────────────────────────────────────────────┘

PHASE 6: POST-APPROVAL
┌─────────────────────────────────────────────────────────────┐
│ System Actions (Automatic):                                 │
│  ✓ Deduct 5 days from Hassan's leave balance                │
│  ✓ Send email notification to Hassan (approved)             │
│  ✓ Add leave dates to team calendar                         │
│  ✓ Update pending approvals count (now shows 2)             │
│  ✓ Log approval in audit trail                              │
│  ✓ Create calendar events                                   │
│                                                             │
│ Manager Dashboard Updates:                                  │
│  - Pending: 2 (down from 3)                                 │
│  - Approved today: 1                                        │
│                                                             │
│ Manager Emotion: 😊 Productive                              │
│ Manager Thought: "System makes this so efficient!"         │
│ Sarah proceeds to review expense claims...                  │
└─────────────────────────────────────────────────────────────┘
```

**Emotional Journey**:
```
Satisfaction
   10│                                    ●
    9│                              ●
    8│
    7│                    ●
    6│          ●
    5│                         ⚠
    4│     ●
   ─┴────────────────────────────────────────
    Alert  Login  List  Details Decision Approve
```

**Key Success Factors**:
1. **Context at a Glance**: Team calendar integration
2. **Quick Decision Making**: All info in one view
3. **Mobile Responsive**: Can approve on-the-go
4. **Notification Management**: Email + in-app alerts

**Time Metrics**:
- Time to open portal: 3 hours (delayed by meetings)
- Time to review: 2 minutes
- Time to decide: 30 seconds
- Time to approve: 30 seconds
- **Total active time**: 3 minutes

**Manager Satisfaction Drivers**:
- No need to check external calendars
- Project deadline visibility
- Comment capability for conditions
- One-click approval option
- Clear audit trail

---

## Complete Use Case Specifications

### UC-PAY-001: Process Monthly Payroll

**Use Case Name**: Process Monthly Payroll Batch
**ID**: UC-PAY-001
**Priority**: Critical
**Actor**: Finance Staff (Primary), Finance Manager (Approver)
**Stakeholders**: Employees, Management, GOSI, Banks
**Scope**: Payroll Management Module
**Level**: Business Process
**Category**: Core Business Function

**Preconditions**:
1. Current month attendance records are complete
2. All leave requests for the month are processed
3. All expense claims are approved
4. Loan/advance records are up to date
5. GOSI rates are configured
6. Bank account details are validated for all employees
7. User is authenticated with Finance role

**Success Guarantee** (Postconditions):
1. Payroll batch created with status "processed"
2. Individual payslips generated for all employees
3. Net salary calculated accurately for each employee
4. GOSI contributions recorded for filing
5. WPS file generated and ready for bank upload
6. All employees notified of payroll completion
7. Audit trail complete
8. Financial records updated

**Main Success Scenario**:

**Step 1: Initiate Payroll Batch**
```
1. Finance Staff logs into system
2. Navigates to Payroll > Create New Batch
3. System displays payroll batch creation form
4. Finance Staff enters:
   - Pay period: February 1-28, 2026
   - Payment date: February 27, 2026
   - Batch name: "February 2026 Payroll"
   - Cost center: Select applicable
5. Finance Staff clicks "Create Batch"
6. System validates:
   ✓ Pay period not overlapping with existing batch
   ✓ Payment date within pay period month
   ✓ User has permission
7. System fetches all active employees (status = 'active')
8. System creates payroll_batch record (status: 'draft')
9. System creates payroll_items for each employee
10. System displays batch summary:
    - Total employees: 150
    - Status: Draft
    - Estimated total: SAR 1,250,000
```

**Step 2: Calculate Payroll for Each Employee**
```
FOR EACH employee IN active_employees:

  A. Fetch Base Compensation
     - basic_salary
     - housing_allowance
     - transportation_allowance
     - food_allowance
     - mobile_allowance
     - other_allowances

  B. Calculate Overtime
     - Fetch attendance records for pay period
     - Sum overtime_hours
     - Calculate: overtime_amount = (basic/240) × overtime_hours × 1.25

  C. Add Variable Pay
     - Fetch approved bonuses for period
     - Fetch commission amounts
     - Sum all variable pay

  D. Calculate Gross Salary
     gross_salary = basic + all_allowances + overtime + bonuses + commissions

  E. Calculate GOSI Contributions
     gosi_base = MIN(basic + housing + transport, 45000)
     employee_gosi = gosi_base × 0.10
     IF employee.is_saudi THEN
       employer_gosi = gosi_base × 0.12
     ELSE
       employer_gosi = gosi_base × 0.02
     END IF

  F. Calculate Absence Deduction
     absence_days = COUNT(attendance WHERE status = 'absent')
     daily_rate = gross_salary / 30
     absence_deduction = absence_days × daily_rate

  G. Calculate Loan Deduction
     active_loans = SELECT * FROM loans
                    WHERE employee_id = employee.id
                    AND status = 'active'
     loan_deduction = SUM(active_loans.monthly_installment)

  H. Calculate Advance Deduction
     active_advances = SELECT * FROM advances
                       WHERE employee_id = employee.id
                       AND status = 'active'
     advance_deduction = SUM(active_advances.monthly_deduction)

  I. Calculate Other Deductions
     other_deductions = SUM(penalties, other_deductions)

  J. Calculate Net Salary
     total_deductions = employee_gosi
                      + absence_deduction
                      + loan_deduction
                      + advance_deduction
                      + other_deductions
     net_salary = gross_salary - total_deductions

  K. Update Payroll Item
     UPDATE payroll_items SET
       gross_salary = calculated_gross,
       gosi_employee = calculated_employee_gosi,
       gosi_employer = calculated_employer_gosi,
       absence_deduction = calculated_absence,
       loan_deduction = calculated_loan,
       advance_deduction = calculated_advance,
       other_deductions = calculated_other,
       net_salary = calculated_net

END FOR

System updates batch totals:
- Total gross: SUM(all gross_salary)
- Total net: SUM(all net_salary)
- Total GOSI: SUM(all gosi_employee + gosi_employer)
```

**Step 3: Review and Validate**
```
11. Finance Staff reviews batch summary
12. System displays payroll report with:
    - Employee count: 150
    - Total gross: SAR 1,567,000
    - Total deductions: SAR 317,000
    - Total net: SAR 1,250,000
    - Total GOSI (employee): SAR 156,700
    - Total GOSI (employer): SAR 160,300
13. Finance Staff reviews individual payroll items (spot checks)
14. Finance Staff identifies issue: Employee "Ahmed" has incorrect overtime
15. Finance Staff clicks "Edit" on Ahmed's payroll item
16. System allows editing (batch still in draft)
17. Finance Staff corrects overtime hours
18. System recalculates Ahmed's net salary
19. System updates batch totals
20. Finance Staff saves changes
```

**Step 4: Submit for Approval**
```
21. Finance Staff clicks "Submit for Approval"
22. System checks:
    ✓ All payroll items calculated
    ✓ No negative net salaries
    ✓ All employees have bank details (if WPS)
23. System evaluates approval workflow:
    IF batch_total > 500000 THEN
      approval_type = 'dual' (Finance Manager + HR Manager)
    ELSE
      approval_type = 'single' (Finance Manager)
    END IF
24. System creates workflow instance
25. System updates batch status: 'pending_approval'
26. System sends notification to Finance Manager
27. System displays: "Batch submitted for approval"
```

**Step 5: Approval Process** (Finance Manager)
```
28. Finance Manager receives notification
29. Finance Manager logs into system
30. Navigates to Pending Approvals
31. Clicks on "February 2026 Payroll" batch
32. System displays batch details and summary report
33. Finance Manager reviews:
    - Total amount within budget? ✓
    - Employee count matches headcount? ✓
    - GOSI calculations correct? ✓
    - No anomalies detected? ✓
34. Finance Manager clicks "Approve"
35. System prompts for optional comment
36. Finance Manager enters: "Approved for processing"
37. System records approval:
    - Approver: Finance Manager
    - Timestamp: 2026-02-24 14:30:00
    - Comment: Saved
38. System checks if all required approvals received
39. IF dual approval required AND only 1 approval THEN
      WAIT for second approval
    ELSE
      Proceed to next step
    END IF
40. System updates batch status: 'approved'
41. System notifies Finance Staff: "Batch approved, ready to process"
```

**Step 6: Process Payroll**
```
42. Finance Staff clicks "Process Payroll"
43. System confirms: "Process payroll for 150 employees?"
44. Finance Staff confirms
45. System performs transaction:
    BEGIN TRANSACTION
      FOR EACH payroll_item:
        a. Generate payslip record
        b. Update GOSI contribution records
        c. Update loan disbursement (remaining balance)
        d. Update advance disbursement (mark as paid)
        e. Create accounting entries (if enabled)
        f. Mark payroll_item as processed
      END FOR
      g. Update batch status: 'processed'
      h. Lock batch (no further edits)
      i. Log all actions in audit trail
    COMMIT TRANSACTION
46. System displays: "Payroll processed successfully"
47. System shows next action: "Generate WPS File"
```

**Step 7: Generate WPS File**
```
48. Finance Staff clicks "Generate WPS File"
49. System displays WPS configuration form:
    - Bank: Select from configured banks
    - Payment date: Pre-filled (2026-02-27)
    - Employer ID: Auto-filled from company settings
50. Finance Staff selects: "Saudi National Bank"
51. Finance Staff clicks "Generate"
52. System validates:
    ✓ All employees have IBAN
    ✓ All IBAN numbers valid format (SA + 22 digits)
    ✓ Total amount matches batch net total
53. System generates SIF file:
    Header Record:
      - Record Type: 100
      - Employer ID: 123456789
      - Payment Date: 27022026
      - Total Records: 150
      - Total Amount: 1250000.00
      - Currency: SAR

    Detail Records (for each employee):
      - Record Type: 200
      - Employee ID: [iqama_number]
      - Employee Name: [full_name]
      - IBAN: [bank_iban]
      - Salary: [net_salary]
      - Basic: [basic_salary]
      - Housing: [housing_allowance]
      - Other: [sum_other_allowances]
      - Deductions: [total_deductions]

    Footer Record:
      - Record Type: 900
      - Total Records: 150
      - Total Amount: 1250000.00
      - Checksum: [calculated]

54. System saves WPS file:
    - Filename: WPS_FEB2026_20260224_143000.sif
    - Location: System storage + download
55. System creates wps_payroll_files record
56. System displays: "WPS file generated successfully"
57. Finance Staff clicks "Download"
58. File downloads to Finance Staff computer
```

**Step 8: Upload to Bank (Manual External)**
```
59. Finance Staff logs into bank portal (external)
60. Uploads WPS file
61. Bank validates file format
62. Bank returns MOL reference number: MOL-2026-02-123456
63. Finance Staff returns to HR system
64. Enters MOL reference number
65. System updates wps_payroll_files:
    - mol_reference: MOL-2026-02-123456
    - upload_date: 2026-02-24
    - status: submitted
66. System logs action
```

**Step 9: Mark as Paid (After Bank Confirmation)**
```
67. [Wait 2-3 days for bank processing]
68. Bank confirms payment completion
69. Finance Staff marks batch as "Paid"
70. System updates batch status: 'paid'
71. System records payment_date: 2026-02-27
72. System triggers post-payment notifications
```

**Step 10: Employee Notifications**
```
73. System sends email to each employee:
    Subject: "February 2026 Salary Paid"
    Body:
      - Payment date: February 27, 2026
      - Net amount: [individual_net_salary]
      - "View your payslip in the portal"
      - Link to payslip

74. System creates in-app notification for each employee
75. Employees can view and download payslips from portal
```

**Alternative Flows**:

**A1: Validation Error During Creation**
```
At Step 6:
6a. System detects overlapping batch exists
6b. System displays error: "Payroll batch already exists for February 2026"
6c. Finance Staff cancels or selects different period
6d. Return to Step 4
```

**A2: Calculation Error**
```
At Step 2K:
2Ka. System detects negative net salary for employee
2Kb. System flags error in batch summary
2Kc. Finance Staff investigates employee record
2Kd. Finance Staff corrects deduction amounts
2Ke. System recalculates
2Kf. Continue to Step 3
```

**A3: Approval Rejection**
```
At Step 35:
35a. Finance Manager clicks "Reject"
35b. System requires rejection reason
35c. Finance Manager enters: "GOSI calculations need review for 5 new hires"
35d. System updates batch status: 'rejected'
35e. System notifies Finance Staff with reason
35f. Finance Staff reviews and corrects
35g. Return to Step 21 (resubmit)
```

**A4: Dual Approval Required**
```
At Step 39:
39a. Batch total is SAR 1,250,000 (> SAR 500,000)
39b. Requires: Finance Manager + HR Manager approval
39c. Finance Manager approves (first approval)
39d. System waits for HR Manager approval
39e. HR Manager receives notification
39f. HR Manager reviews and approves (second approval)
39g. System checks: Both approvals received ✓
39h. Continue to Step 40
```

**A5: WPS File Generation Fails**
```
At Step 52:
52a. System detects 3 employees missing IBAN
52b. System displays error: "Cannot generate WPS file. Missing IBAN for:"
    - Ahmed Ali (EMP-001)
    - Sara Mohammed (EMP-045)
    - Hassan Fahad (EMP-089)
52c. Finance Staff updates employee bank details
52d. Return to Step 48
```

**A6: Bank Rejects WPS File**
```
At Step 62:
62a. Bank returns error: "Invalid IBAN format for record 45"
62b. Finance Staff notes error
62c. Finance Staff corrects employee IBAN in system
62d. Return to Step 48 (regenerate file)
```

**Business Rules Applied**:
- BR-PAY-001 to BR-PAY-015 (all payroll rules)
- BR-EMP-001 (employee must be active)
- BR-ATT-001 to BR-ATT-015 (attendance for overtime/absence)
- GOSI contribution caps and rates

**Non-Functional Requirements**:
- **Performance**: Batch calculation for 1000 employees < 60 seconds
- **Accuracy**: 100% calculation accuracy (zero tolerance)
- **Availability**: System available 99.9% during payroll period
- **Security**: All payroll data encrypted, access logged
- **Audit**: Complete audit trail for all actions
- **Compliance**: WPS file format per SAMA/MOL standards

**Special Requirements**:
- Support for multiple cost centers
- Multi-currency support (future)
- Integration with accounting systems
- Payroll corrections and amendments
- Historical payroll archive (7 years retention)

**Technology and Data Variations**:
- Database: PostgreSQL with RLS
- File Format: SIF (Salary Information File) for WPS
- Calculations: Server-side (not client-side)
- Batch size: Supports up to 10,000 employees

**Frequency**: Monthly (12 times per year)
**Open Issues**:
- Integration with bank API (currently manual upload)
- Real-time GOSI API sync (currently batch)

---

This documentation provides a complete foundation for understanding the system's business processes, rules, and user interactions. The specifications are production-ready and can be used for:
- Developer implementation guidance
- QA test case creation
- User training materials
- Business process optimization
- Compliance audits
- System integration planning
