# Business Process Documentation

## Saudi HR Management System - Complete Documentation

**Document Version**: 1.0
**Last Updated**: February 17, 2026
**System Name**: Enterprise Saudi HR Management System
**Technology Stack**: React + TypeScript + Supabase + PostgreSQL

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [User Roles and Permissions](#user-roles-and-permissions)
4. [Core Business Processes](#core-business-processes)
5. [Module-Specific Documentation](#module-specific-documentation)
6. [Integration Points](#integration-points)
7. [Compliance Framework](#compliance-framework)
8. [Security and Data Governance](#security-and-data-governance)

---

## Executive Summary

The Saudi HR Management System is an enterprise-grade Human Capital Management (HCM) platform designed specifically for Saudi Arabian businesses. The system ensures full compliance with Saudi Labor Law, GOSI regulations, Nitaqat requirements, and Wage Protection System (WPS) mandates.

### Key System Capabilities

- **17 Integrated Modules**: Employee Management, Payroll, Leave, Attendance, Performance, Training, Documents, Compliance, and more
- **Multi-Tenant Architecture**: Supports multiple companies with complete data isolation
- **Advanced Workflow Engine**: Configurable approval workflows with conditional logic and SLA tracking
- **Saudi Labor Law Compliance**: Built-in compliance for leave, EOSB, GOSI, Nitaqat, and WPS
- **Government Integration Ready**: GOSI API, Muqeem, Absher integration capabilities
- **Bilingual Support**: Full English and Arabic RTL support
- **172 Database Tables**: Comprehensive data model covering all HR processes
- **8 User Roles**: Granular permission system from Super Admin to Employee

### Primary Business Objectives

1. **Automate HR Operations**: Reduce manual work through automated workflows and calculations
2. **Ensure Legal Compliance**: Built-in Saudi labor law compliance and government reporting
3. **Improve Data Accuracy**: Single source of truth with validation and audit trails
4. **Enable Self-Service**: Employee and manager portals for routine transactions
5. **Provide Analytics**: Real-time dashboards and reporting for decision-making
6. **Secure Data**: Multi-level security with RLS, RBAC, and encryption

---

## System Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Employee │  │ Manager  │  │    HR    │  │  Finance │   │
│  │  Portal  │  │  Portal  │  │  Portal  │  │  Portal  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React Components + TypeScript Business Logic        │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Context    │  │   Workflow   │  │   Validation    │  │
│  │  Management  │  │    Engine    │  │     Rules       │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Supabase   │  │     Edge     │  │   External      │  │
│  │   REST API   │  │  Functions   │  │   APIs (GOSI)   │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   PostgreSQL Database (172 Tables)                   │  │
│  │   - Core HR Tables (40+)                             │  │
│  │   - Workflow Tables (12)                             │  │
│  │   - Compliance Tables (20+)                          │  │
│  │   - Analytics Tables (15+)                           │  │
│  │   - Audit Tables (5)                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Row-Level Security (RLS) + Multi-Tenant Isolation  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  INTEGRATION LAYER                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   GOSI   │  │  Muqeem  │  │  Absher  │  │   Email  │   │
│  │   API    │  │   (WIP)  │  │   (WIP)  │  │   SMTP   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
User Action → Frontend Validation → API Call → RLS Check
→ Business Logic → Database Transaction → Audit Log
→ Real-time Sync → Workflow Trigger → Notification
```

---

## User Roles and Permissions

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                     SUPER ADMIN                         │
│  - System-wide administration                           │
│  - Multi-company access                                 │
│  - Tenant configuration                                 │
│  - Cannot be assigned to regular users                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                        ADMIN                            │
│  - Company-level administration                         │
│  - Full module access within company                    │
│  - User management                                      │
│  - System configuration                                 │
└─────────────────────────────────────────────────────────┘
                          ↓
         ┌────────────────┴────────────────┐
         ↓                                  ↓
┌───────────────────┐            ┌──────────────────────┐
│    HR MANAGER     │            │   FINANCE MANAGER    │
│  - HR operations  │            │  - Payroll access    │
│  - Approvals      │            │  - Financial reports │
│  - Reporting      │            │  - Budget control    │
└───────────────────┘            └──────────────────────┘
         ↓                                  ↓
┌───────────────────┐            ┌──────────────────────┐
│       HR          │            │      FINANCE         │
│  - Employee CRUD  │            │  - Payroll processing│
│  - Document mgmt  │            │  - GOSI filing       │
│  - Leave approval │            │  - Payment tracking  │
└───────────────────┘            └──────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│                       MANAGER                           │
│  - Team member management                               │
│  - Approval authority (leave, expenses, attendance)     │
│  - Performance reviews                                  │
│  - Department reporting                                 │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│                      EMPLOYEE                           │
│  - Personal information viewing                         │
│  - Request submission (leave, expense, loan)            │
│  - Payslip viewing                                      │
│  - Self-service portal                                  │
└─────────────────────────────────────────────────────────┘
```

### Permission Matrix

| Module | Super Admin | Admin | HR Manager | HR | Finance | Manager | Employee |
|--------|-------------|-------|------------|----|---------|---------|---------||
| **Employees** | CRUD+Export | CRUD+Export | CRUD+Export | CRUD+Export | Read | Read (Team) | Read (Self) |
| **Payroll** | CRUD+Export | CRUD+Export | Approve | Read | CRUD+Approve | Read (Team) | Read (Self) |
| **Leave** | CRUD+Approve | CRUD+Approve | CRUD+Approve | CRUD+Approve | Read | Approve (Team) | Request+Read |
| **Attendance** | CRUD+Export | CRUD+Export | CRUD+Export | CRUD+Export | Read | Read (Team) | Submit+Read |
| **Performance** | CRUD+Export | CRUD+Export | CRUD | CRUD | Read | Review (Team) | Self-assess |
| **Training** | CRUD | CRUD | CRUD | CRUD | Read | Assign (Team) | Enroll |
| **Documents** | CRUD+Export | CRUD+Export | CRUD | CRUD | Read | Read (Team) | Upload+Read |
| **Compliance** | Read | Read | CRUD+Export | CRUD+Export | Read | Read | None |
| **Expenses** | Approve | Approve | Approve | Read | Approve+Process | Approve (Team) | Submit |
| **Loans/Advances** | Approve | Approve | Approve | Approve | Approve+Disburse | Approve (Team) | Request |
| **Recruitment** | CRUD | CRUD | CRUD | CRUD | Read | Read | None |
| **Settings** | CRUD | CRUD | Read | Read | Read | None | None |
| **Reports** | All | All | HR Reports | HR Reports | Finance Reports | Team Reports | Self Reports |
| **Audit Log** | Read | Read | Read | Read | Read | None | None |
| **Workflows** | CRUD | CRUD | CRUD | Read | Read | Read | None |

**Legend:**
- **C**reate, **R**ead, **U**pdate, **D**elete
- **Approve**: Workflow approval authority
- **Export**: Data export capability
- **Team**: Limited to direct reports
- **Self**: Limited to own records

### Permission Scope Levels

#### Company-Level Scope
- Access to all data within the assigned company
- Applies to: Super Admin (all companies), Admin, HR Manager, Finance Manager

#### Department-Level Scope
- Access limited to specific department(s)
- Configurable via `department_data_isolation` table
- Applies to: Managers (optionally), HR staff (optionally)

#### Team-Level Scope
- Access limited to direct reports
- Based on `manager_id` relationship
- Applies to: Managers

#### Self-Level Scope
- Access only to own records
- Applies to: Employees

---

## Core Business Processes

### Process Categories

1. **Employee Lifecycle Management**
   - Onboarding
   - Employment Management
   - Performance Management
   - Offboarding

2. **Time and Attendance**
   - Daily Attendance
   - Leave Management
   - Overtime Tracking

3. **Compensation and Benefits**
   - Payroll Processing
   - Salary Administration
   - Loans and Advances
   - End of Service Benefits

4. **Talent Management**
   - Recruitment
   - Training and Development
   - Performance Reviews
   - Succession Planning

5. **Compliance and Reporting**
   - GOSI Filing
   - Nitaqat Tracking
   - WPS Submission
   - Audit and Reporting

6. **Operations Management**
   - Document Management
   - Asset Management
   - Travel Management
   - Expense Management

---

## Module-Specific Documentation

### 1. Employee Management Module

#### Overview
The Employee Management module serves as the central hub for all employee-related data. It provides comprehensive CRUD operations, bulk import capabilities, and integration with all other HR modules.

#### Key Features
- Employee directory with advanced search and filtering
- Bilingual data entry (English/Arabic)
- Employee number generation and management
- Iqama and passport tracking
- Bank account management
- Emergency contact management
- Dependent tracking
- Document attachment
- Employee status management
- Real-time data synchronization

#### User Journey: Adding a New Employee

**Actor**: HR Staff

**Preconditions**:
- User has HR role with write permissions
- Company and department structure are configured
- Required employee data is available

**Main Flow**:

```
1. HR clicks "Add Employee" button
   ↓
2. System displays employee form with required fields
   ↓
3. HR enters employee information:
   - Personal details (name, nationality, DOB)
   - Iqama/Passport details
   - Contact information
   - Employment details (hire date, job title, department)
   - Salary information
   - Bank account details
   ↓
4. System validates all fields:
   - Employee number uniqueness
   - Iqama format (10 digits, starts with 1 or 2)
   - Hire date not in future
   - Email format (if provided)
   ↓
5. HR submits form
   ↓
6. System performs multi-step creation:
   a. Creates employee record in employees table
   b. Creates bank account record (if provided)
   c. Initializes leave balances based on leave types
   d. Sets probation end date (hire_date + 90 days)
   e. Determines is_saudi based on nationality
   f. Logs creation in audit_log
   ↓
7. System displays success message with employee number
   ↓
8. System returns to employee directory with new employee visible
```

**Postconditions**:
- Employee record created in database
- Leave balances initialized
- Audit trail recorded
- Employee appears in directory
- Employee is included in Nitaqat calculations
- Workflow notifications sent (if configured)

**Alternative Flows**:

**A1: Validation Error**
```
4a. System detects validation error
    ↓
4b. System highlights invalid field(s) with error message
    ↓
4c. HR corrects the error
    ↓
4d. Return to step 4
```

**A2: Duplicate Employee Number**
```
6a. System detects duplicate employee number
    ↓
6b. System returns error: "Employee number already exists"
    ↓
6c. HR modifies employee number
    ↓
6d. Return to step 5
```

**Business Rules**:
1. Employee number must be unique per company
2. Iqama number format: 10 digits starting with 1 or 2
3. Hire date cannot be in the future
4. Probation period: 90 days from hire date
5. Is_saudi: Automatically set based on nationality = "Saudi"
6. Email must be unique across system (if provided)
7. Mobile number required for Saudi nationals
8. Basic salary must be greater than zero
9. Saudi employees must have Iqama number
10. Non-Saudi employees must have passport and visa information

#### Decision Table: Employee Status Determination

| Condition | Active | On Leave | Terminated |
|-----------|--------|----------|------------|
| Has hire_date ≤ today | ✓ | ✓ | ✓ |
| Has no termination_date | ✓ | ✓ | ✗ |
| Has approved leave for today | ✗ | ✓ | ✗ |
| termination_date ≤ today | ✗ | ✗ | ✓ |

#### Use Cases

**UC-EMP-001: Create Employee**
- **Primary Actor**: HR Staff
- **Scope**: Employee Management Module
- **Level**: User Goal
- **Preconditions**: User authenticated with HR role
- **Success Guarantee**: Employee created with all dependent records
- **Main Success Scenario**: See User Journey above
- **Extensions**: Bulk upload via Excel

**UC-EMP-002: Update Employee**
- **Primary Actor**: HR Staff
- **Main Success Scenario**:
  1. HR searches for employee
  2. HR clicks "Edit" button
  3. System loads employee data into form
  4. HR modifies fields
  5. System validates changes
  6. HR saves changes
  7. System updates records and logs change

**UC-EMP-003: Terminate Employee**
- **Primary Actor**: HR Manager
- **Main Success Scenario**:
  1. HR Manager navigates to employee detail
  2. HR Manager clicks "Terminate" option
  3. System displays termination form
  4. HR Manager enters:
     - Termination date
     - Termination reason
     - Notice period (if applicable)
     - Final working day
  5. System calculates End of Service benefits
  6. System displays EOS calculation for review
  7. HR Manager confirms termination
  8. System:
     - Updates employee status to "terminated"
     - Creates EOS calculation record
     - Cancels future leave requests
     - Marks employee inactive in payroll
     - Logs termination in audit trail
  9. System triggers offboarding workflow

**UC-EMP-004: Bulk Upload Employees**
- **Primary Actor**: HR Staff
- **Main Success Scenario**:
  1. HR downloads Excel template
  2. HR fills template with employee data
  3. HR uploads filled template
  4. System parses Excel file
  5. System validates each row
  6. System displays validation results
  7. HR reviews and fixes errors (if any)
  8. HR confirms import
  9. System creates all valid employee records
  10. System displays import summary

**UC-EMP-005: View Employee Profile**
- **Primary Actor**: Employee, Manager, HR
- **Main Success Scenario**:
  1. User navigates to employee directory
  2. User searches/filters for employee
  3. User clicks on employee name
  4. System displays employee profile with tabs:
     - Personal Information
     - Employment Details
     - Compensation
     - Documents
     - Leave Balances
     - Attendance History
     - Performance Reviews
     - Training Records
  5. System applies permission-based filtering:
     - Employees see only own profile
     - Managers see team members
     - HR sees all within company
  6. User views desired information

---

### 2. Payroll Management Module

#### Overview
The Payroll module automates salary calculations, GOSI contributions, deductions, and payment processing. It ensures compliance with Saudi Labor Law and generates WPS files for bank submission.

#### Workflow Diagram: Payroll Processing

```
┌─────────────────────────────────────────────────────────────┐
│                   START: New Payroll Period                  │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Create Payroll Batch                               │
│  - Actor: Finance Staff                                     │
│  - Input: Pay period (from/to dates)                        │
│  - Action: System fetches all active employees              │
│  - Output: Payroll batch (status: draft)                    │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Calculate Payroll Items                            │
│  - For Each Employee:                                       │
│    a. Fetch basic salary + allowances                       │
│    b. Calculate overtime from attendance                    │
│    c. Calculate absence deductions                          │
│    d. Calculate GOSI contributions (employee + employer)    │
│    e. Deduct active loan/advance installments               │
│    f. Calculate net salary                                  │
│  - Status: Items created                                    │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  DECISION: Batch Total Amount?                              │
│  - Condition: total_amount                                  │
└─────────┬───────────────────────┬───────────────────────────┘
          ↓                       ↓
    < 500K SAR              ≥ 500K SAR
          ↓                       ↓
┌──────────────────┐    ┌─────────────────────────────────────┐
│ STEP 3a:         │    │ STEP 3b:                            │
│ Manager Approval │    │ Finance Manager + HR Manager        │
│ (Single Level)   │    │ (Parallel Approval)                 │
└────────┬─────────┘    └──────────┬──────────────────────────┘
         │                         │
         └────────┬────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: All Approvals Received?                            │
│  - If YES: Proceed                                          │
│  - If NO: Wait or Escalate (after 48 hours)                │
│  - If REJECTED: Return to Finance for revision              │
└─────────────────────┬───────────────────────────────────────┘
                      ↓ (Approved)
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Process Payroll Batch                              │
│  - Actor: Finance Staff                                     │
│  - Action: Mark batch as "processed"                        │
│  - System Actions:                                          │
│    a. Lock payroll items (no further edits)                │
│    b. Generate individual payslips                          │
│    c. Update GOSI contribution records                      │
│    d. Update loan disbursement balances                     │
│    e. Create accounting entries (if integrated)             │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: Generate WPS File                                  │
│  - Actor: Finance Staff                                     │
│  - Input: Bank code, payment date                           │
│  - System generates SIF file format:                        │
│    • Header: Company details, batch info                    │
│    • Records: Employee IBAN, amount, salary details         │
│    • Footer: Total count, total amount                      │
│  - Output: WPS file ready for bank upload                   │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 7: Upload to Bank                                     │
│  - Actor: Finance Staff                                     │
│  - Action: Upload WPS file to bank portal (manual)          │
│  - System: Mark batch as "paid" when confirmed              │
│  - Bank processes payments within 24-48 hours               │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 8: Post-Payment Activities                            │
│  - Send payslip notifications to employees                  │
│  - Update employee payment history                          │
│  - Generate payroll reports                                 │
│  - Archive payroll batch                                    │
│  - Log all activities in audit trail                        │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                   END: Payroll Completed                     │
└─────────────────────────────────────────────────────────────┘
```

#### Calculation Algorithms

**Algorithm 1: Gross Salary Calculation**
```
Input: employee_id, pay_period_start, pay_period_end
Output: gross_salary

Step 1: Fetch base salary components
  basic_salary = employee.basic_salary
  housing_allowance = employee.housing_allowance
  transport_allowance = employee.transport_allowance
  food_allowance = employee.food_allowance
  mobile_allowance = employee.mobile_allowance
  other_allowances = employee.other_allowances

Step 2: Calculate overtime
  overtime_hours = SUM(attendance.overtime_hours
                      WHERE attendance.date BETWEEN pay_period_start AND pay_period_end
                      AND attendance.employee_id = employee_id)
  hourly_rate = basic_salary / 240  // 30 days × 8 hours
  overtime_amount = overtime_hours × hourly_rate × 1.25

Step 3: Calculate bonuses and commissions
  bonus_amount = SUM(bonuses WHERE period matches)
  commission_amount = SUM(commissions WHERE period matches)

Step 4: Sum all earnings
  gross_salary = basic_salary
               + housing_allowance
               + transport_allowance
               + food_allowance
               + mobile_allowance
               + other_allowances
               + overtime_amount
               + bonus_amount
               + commission_amount

Return gross_salary
```

**Algorithm 2: GOSI Contribution Calculation**
```
Input: employee_id, gross_salary
Output: employee_gosi, employer_gosi

Constants:
  MAX_GOSI_WAGE = 45000 SAR
  EMPLOYEE_RATE = 0.10  // 10%
  EMPLOYER_SAUDI_RATE = 0.12  // 12%
  EMPLOYER_NONSAUDI_RATE = 0.02  // 2%

Step 1: Calculate GOSI base
  gosi_base = basic_salary + housing_allowance + transport_allowance
  IF gosi_base > MAX_GOSI_WAGE THEN
    gosi_base = MAX_GOSI_WAGE
  END IF

Step 2: Calculate employee contribution
  employee_gosi = gosi_base × EMPLOYEE_RATE

Step 3: Calculate employer contribution
  IF employee.is_saudi = TRUE THEN
    employer_gosi = gosi_base × EMPLOYER_SAUDI_RATE
  ELSE
    employer_gosi = gosi_base × EMPLOYER_NONSAUDI_RATE
  END IF

Return employee_gosi, employer_gosi
```

**Algorithm 3: Net Salary Calculation**
```
Input: gross_salary, employee_id, pay_period
Output: net_salary

Step 1: Calculate GOSI deduction
  (employee_gosi, employer_gosi) = Calculate_GOSI(employee_id, gross_salary)

Step 2: Calculate absence deduction
  absence_days = COUNT(attendance WHERE status = 'absent'
                       AND date BETWEEN pay_period_start AND pay_period_end)
  daily_rate = gross_salary / 30
  absence_deduction = absence_days × daily_rate

Step 3: Calculate loan deduction
  active_loans = SELECT * FROM loans
                 WHERE employee_id = employee_id
                 AND status = 'active'
                 AND remaining_amount > 0
  loan_deduction = SUM(active_loans.monthly_installment)

Step 4: Calculate advance deduction
  active_advances = SELECT * FROM advances
                    WHERE employee_id = employee_id
                    AND status = 'active'
                    AND remaining_amount > 0
  advance_deduction = SUM(active_advances.monthly_deduction)

Step 5: Calculate other deductions
  other_deductions = SUM(penalties, other_deductions)

Step 6: Calculate net salary
  total_deductions = employee_gosi
                   + absence_deduction
                   + loan_deduction
                   + advance_deduction
                   + other_deductions

  net_salary = gross_salary - total_deductions

Return net_salary
```

#### Business Rules

1. **Payroll Period**: Standard monthly payroll, 1st to last day of month
2. **Payment Date**: Typically 27th of the month (configurable)
3. **WPS Deadline**: Must submit to bank before end of month
4. **GOSI Maximum Wage**: 45,000 SAR for contribution calculation
5. **Overtime Rate**: 1.25x hourly rate for standard overtime
6. **Absence Deduction**: Full day deduction after 30 minutes late
7. **Probation Salary**: Can differ from confirmed salary
8. **Minimum Wage**: Saudi minimum wage: 4,000 SAR/month (as of 2023)
9. **End of Month**: All payroll must be processed before period close
10. **Approval Requirement**: All batches > 500K require dual approval

---

### 3. Leave Management Module

#### Overview
The Leave Management module handles all employee leave requests, approvals, and balance tracking. It is fully compliant with Saudi Labor Law leave entitlements.

#### Saudi Labor Law Leave Entitlements

| Leave Type | Entitlement | Payment | Conditions |
|------------|-------------|---------|------------|
| **Annual Leave** | 21 days/year<br/>30 days after 5 years | 100% | Requires manager approval<br/>Cannot exceed balance |
| **Sick Leave** | 120 days/year | 1st 30 days: 100%<br/>Next 60 days: 50%<br/>Last 30 days: 0% | Medical certificate required after 3 days<br/>Renewable annually |
| **Hajj Leave** | 10 days | 100% | Once per 5 years<br/>Requires manager approval |
| **Maternity Leave** | 70 days | 100% | 4 weeks before, 6 weeks after delivery<br/>Medical certificate required |
| **Paternity Leave** | 3 days | 100% | Within 7 days of birth |
| **Bereavement Leave** | 3 days (spouse/parent)<br/>1 day (others) | 100% | Proof of death certificate |
| **Emergency Leave** | Variable | Variable | Manager discretion |
| **Unpaid Leave** | Variable | 0% | Manager approval required |

#### User Journey: Submitting a Leave Request

**Actor**: Employee

**Preconditions**:
- Employee is authenticated
- Employee has leave balance available
- No overlapping approved leave exists

**Main Flow**:

```
1. Employee navigates to Leave module
   ↓
2. System displays current leave balances:
   - Annual Leave: 15 days remaining
   - Sick Leave: 120 days remaining
   - Other leave types
   ↓
3. Employee clicks "Request Leave"
   ↓
4. System displays leave request form
   ↓
5. Employee selects:
   - Leave type: Annual Leave
   - Start date: 2026-03-15
   - End date: 2026-03-20
   - Reason: "Family vacation"
   ↓
6. System calculates:
   - Total days: 6 days (excluding weekends/holidays)
   - Remaining balance after: 9 days
   ↓
7. System validates:
   ✓ Balance sufficient: 15 days available
   ✓ No overlapping leaves
   ✓ Start date in future
   ✓ End date >= Start date
   ✓ Manager is assigned
   ↓
8. Employee submits request
   ↓
9. System performs transaction:
   a. Creates leave_request record (status: pending)
   b. Reserves balance (temporary hold)
   c. Creates workflow instance
   d. Assigns to direct manager for approval
   e. Sends notification to manager
   f. Logs action in audit trail
   ↓
10. System displays confirmation:
    "Leave request submitted successfully.
     Waiting for approval from [Manager Name]."
   ↓
11. System sends email notification to:
    - Employee (confirmation)
    - Manager (pending approval)
```

**Postconditions**:
- Leave request created with status "pending"
- Manager receives notification
- Balance temporarily reserved
- Employee can track request status
- Request appears in manager's pending approvals

**Alternative Flows**:

**A1: Insufficient Balance**
```
7a. System detects insufficient balance
    ↓
7b. System displays error:
    "Insufficient leave balance.
     Requested: 6 days, Available: 3 days"
    ↓
7c. Employee adjusts dates or cancels request
```

**A2: Overlapping Leave**
```
7a. System detects overlapping approved leave
    ↓
7b. System displays error:
    "You have approved leave from 2026-03-18 to 2026-03-22.
     Please select different dates."
    ↓
7c. Employee adjusts dates
```

**A3: No Manager Assigned**
```
7a. System detects employee has no manager
    ↓
7b. System checks leave type configuration
    ↓
7c. If requires_approval = TRUE:
    - Route to HR manager
    - Notify HR of missing manager assignment
    ↓
7d. If requires_approval = FALSE:
    - Auto-approve request
    - Deduct balance immediately
```

#### User Journey: Approving a Leave Request

**Actor**: Manager

**Preconditions**:
- Manager is authenticated
- Leave request is assigned to manager
- Request status is "pending"

**Main Flow**:

```
1. Manager receives notification:
   "New leave request from [Employee Name]"
   ↓
2. Manager navigates to Pending Requests
   ↓
3. System displays list of pending approvals:
   - Leave requests
   - Expense claims
   - Loan requests
   - etc.
   ↓
4. Manager filters for "Leave Requests"
   ↓
5. Manager clicks on employee's leave request
   ↓
6. System displays request details:
   - Employee: John Doe
   - Leave Type: Annual Leave
   - Start Date: 2026-03-15
   - End Date: 2026-03-20
   - Total Days: 6 days
   - Reason: Family vacation
   - Current Balance: 15 days
   - Balance After: 9 days
   - Team Absence Calendar (shows other team members on leave)
   ↓
7. Manager reviews:
   - Workload during requested period
   - Team coverage
   - Business priorities
   ↓
8. Manager clicks "Approve" button
   ↓
9. System prompts for optional comment
   ↓
10. Manager enters: "Approved. Enjoy your vacation!"
    ↓
11. Manager confirms approval
    ↓
12. System performs transaction:
    a. Updates leave_request.status = 'approved'
    b. Updates leave_request.approver_id = manager.id
    c. Updates leave_request.approved_at = NOW()
    d. Deducts balance from leave_balances
    e. Completes workflow instance
    f. Creates leave_request_approvals record
    g. Logs approval in audit trail
    h. Sends notifications
    ↓
13. System displays success message
    ↓
14. System sends notifications to:
    - Employee (approval confirmation)
    - HR department (for records)
    - Calendar systems (block dates)
```

**Postconditions**:
- Leave request status changed to "approved"
- Leave balance deducted
- Employee notified
- Leave dates blocked in calendar
- Audit trail updated

**Alternative Flows**:

**A1: Manager Rejects Request**
```
8a. Manager clicks "Reject" button
    ↓
8b. System requires rejection reason
    ↓
8c. Manager enters reason:
    "Critical project deadline during this period.
     Please reschedule after March 25."
    ↓
8d. Manager confirms rejection
    ↓
8e. System:
    - Updates status to 'rejected'
    - Releases reserved balance
    - Completes workflow with rejection
    - Notifies employee with reason
```

**A2: Manager Requests Modification**
```
8a. Manager clicks "Return for Modification"
    ↓
8b. Manager suggests alternative dates
    ↓
8c. System returns request to employee with comments
    ↓
8d. Employee receives notification with manager's feedback
    ↓
8e. Employee can modify and resubmit
```

#### Business Rules

1. **Balance Accrual**: 1.75 days per month (21 days / 12 months)
2. **Balance Cap**: Maximum 30 days carryover to next year
3. **Minimum Notice**: 3 days advance notice for annual leave
4. **Maximum Duration**: 30 consecutive days for annual leave
5. **Approval Timeline**: Manager must approve within 48 hours (SLA)
6. **Sick Leave Certificate**: Required after 3 consecutive days
7. **Public Holidays**: Not counted as leave days
8. **Weekends**: Excluded from leave day calculation (Friday-Saturday)
9. **Probation Period**: No annual leave during first 90 days
10. **Leave Cancellation**: Employee can cancel pending requests
11. **Emergency Cancellation**: Manager can cancel approved leaves with justification
12. **Half-Day Leave**: Minimum 0.5 day request allowed
13. **Leave During Notice**: Restricted during notice period
14. **Leave Encashment**: Can encash up to 10 days at year-end (if policy allows)
15. **Return to Work**: Must check-in on first day after leave

---

### 4. Attendance Management Module

#### Overview
The Attendance module tracks daily employee presence, working hours, overtime, and exceptions. It integrates with payroll for automatic deduction calculations.

#### Daily Attendance Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  Employee Arrives at Work                                   │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  CHECK-IN                                                   │
│  - Method: Biometric device / Mobile app / Manual entry    │
│  - Timestamp: 2026-02-17 08:15:00                          │
│  - Location: Office GPS / Device ID                         │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  System Records Check-In                                    │
│  - Creates attendance record                                │
│  - Status: present                                          │
│  - Check-in time: 08:15                                     │
│  - Late calculation:                                        │
│    Expected: 08:00, Actual: 08:15 → 15 minutes late        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  DECISION: Late Status?                                     │
│  - IF late_minutes <= 30: Grace period (no penalty)        │
│  - IF 30 < late_minutes <= 60: Warning                     │
│  - IF late_minutes > 60: Half-day deduction                │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
    ≤ 30 minutes          > 30 minutes
           ↓                      ↓
    No penalty              Penalty applied
           │                      │
           └──────────┬───────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  Employee Works During Day                                  │
│  - Normal working hours: 08:00 - 17:00 (9 hours with break)│
│  - Break time: 12:00 - 13:00 (1 hour unpaid)               │
│  - Net working hours: 8 hours                               │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  CHECK-OUT                                                  │
│  - Timestamp: 2026-02-17 18:30:00                          │
│  - Location: Office GPS / Device ID                         │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  System Calculates Working Hours                            │
│  - Check-in: 08:15                                          │
│  - Check-out: 18:30                                         │
│  - Total duration: 10 hours 15 minutes                      │
│  - Break deduction: 1 hour                                  │
│  - Net hours: 9 hours 15 minutes                            │
│  - Regular hours: 8 hours                                   │
│  - Overtime hours: 1 hour 15 minutes                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  DECISION: Overtime Approval Required?                      │
│  - IF overtime > 0 AND not pre-approved:                   │
│    Route to manager for approval                            │
│  - IF pre-approved:                                         │
│    Auto-approve and calculate payment                       │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
   Pre-approved              Not approved
           ↓                      ↓
    Calculate pay         Send to manager
           │                      │
           └──────────┬───────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  Store Final Attendance Record                              │
│  - Date: 2026-02-17                                         │
│  - Check-in: 08:15                                          │
│  - Check-out: 18:30                                         │
│  - Status: present                                          │
│  - Working hours: 9.25                                      │
│  - Overtime hours: 1.25                                     │
│  - Late minutes: 15                                         │
│  - Penalty: None (grace period)                             │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  Month-End Payroll Integration                              │
│  - Sum overtime hours: Used in payroll calculation          │
│  - Count absence days: Calculate deductions                 │
│  - Aggregate late minutes: Policy-based penalties           │
└─────────────────────────────────────────────────────────────┘
```

#### Attendance Status Determination

| Scenario | Check-In | Check-Out | Status | Deduction |
|----------|----------|-----------|--------|-----------|
| On-time, full day | 08:00 | 17:00 | present | None |
| Late 15 min | 08:15 | 17:00 | present | None (grace) |
| Late 45 min | 08:45 | 17:00 | present | 0.5 day |
| Late 2 hours | 10:00 | 17:00 | half_day | 0.5 day |
| Early leave | 08:00 | 15:00 | present | 0.5 day |
| No check-in | - | - | absent | 1 day |
| Weekend | - | - | weekend | None |
| Public holiday | - | - | holiday | None |
| Approved leave | - | - | on_leave | None |
| Sick with certificate | - | - | sick_leave | Per leave policy |

#### Business Rules

1. **Standard Working Hours**: 8 hours per day, 40 hours per week
2. **Grace Period**: 30 minutes late without penalty
3. **Half-Day**: Less than 4 hours worked
4. **Absent**: No check-in recorded
5. **Overtime**: Hours beyond 8 per day (max 2 hours/day)
6. **Overtime Rate**: 1.25x normal hourly rate
7. **Weekly Overtime Limit**: 10 hours per week
8. **Weekend**: Friday and Saturday (configurable)
9. **Shift-Based**: Support for multiple shift patterns
10. **Remote Work**: GPS-based location tracking
11. **Biometric Verification**: Fingerprint/face recognition
12. **Manager Override**: Manager can manually adjust attendance
13. **Exception Requests**: Employee can request late/early leave approval
14. **Consecutive Absence**: 3+ days triggers investigation
15. **Ramadan Hours**: Reduced working hours (6 hours/day)

---

This documentation continues in the supplementary files that follow. The above represents the first section covering Employee, Payroll, Leave, and Attendance modules in detail.

For complete documentation, refer to:
- `WORKFLOW_DIAGRAMS.md` - Detailed workflow diagrams for all processes
- `USER_JOURNEY_MAPS.md` - User journeys for all user roles
- `BUSINESS_RULES_CATALOG.md` - Complete business rules repository
- `USE_CASE_SPECIFICATIONS.md` - Detailed use case documentation
- `INTEGRATION_GUIDE.md` - External system integration documentation
