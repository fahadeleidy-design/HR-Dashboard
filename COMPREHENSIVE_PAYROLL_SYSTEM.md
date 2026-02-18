# Comprehensive Payroll Management System

## Overview

A fully-featured, production-ready payroll processing system designed specifically for Saudi Arabia with complete compliance for GOSI, WPS (Wage Protection System), tax calculations, and zakat management.

## Key Features

### 1. **Payroll Processing Engine**
- Flexible component-based salary structure
- Automatic calculation of earnings, deductions, and employer costs
- Attendance-based calculations
- Performance-based bonuses
- Formula-driven component calculations
- Prorated salary calculations for partial months

### 2. **Salary Components System**
**Pre-configured Components:**
- Basic Salary (system component)
- Housing Allowance (GOSI-applicable)
- Transportation Allowance
- Food Allowance
- Mobile Allowance
- Overtime Pay (formula-based)
- Performance Bonus
- Annual Bonus
- GOSI Employee Share (9.75% Saudi, 2% Non-Saudi)
- Loan Deductions
- Advance Deductions
- Absence Deductions
- Late Deductions
- Income Tax
- Zakat (2.5% for Saudi nationals)

**Component Features:**
- Custom calculation methods (fixed, percentage, formula, attendance-based)
- Taxable/non-taxable flags
- GOSI applicability
- Proration support
- Display order configuration
- Multi-language support (English/Arabic)

### 3. **GOSI Calculations**
**Automatic Compliance:**
- Saudi Nationals: 9.75% employee + 12% employer
- Non-Saudis: 2% employee + 2% employer
- Housing allowance inclusion
- Contribution base capping (45,000 SAR maximum)
- Occupational hazard rates
- Monthly GOSI reports generation

**GOSI Features:**
- Automatic rate application based on nationality
- Contribution base calculation (basic + housing)
- Min/max contribution limits enforcement
- Detailed breakdown by employee
- Ready for MOL submission

### 4. **WPS (Wage Protection System)**
**Complete WPS Compliance:**
- SIF file format generation
- MOL establishment ID integration
- Bank-specific file formats
- Employee IBAN validation
- Working days tracking
- Salary month/year recording

**Supported Banks:**
- Al Rajhi Bank (80)
- Saudi National Bank (10)
- Riyad Bank (20)
- Alinma Bank (95)
- Bank AlJazira (60)
- Bank Albilad (91)
- Saudi Investment Bank (65)
- Arab National Bank (05)

**WPS File Features:**
- Automatic file generation from approved payroll
- MOL reference number tracking
- Submission status monitoring
- File download for bank upload
- Compliance validation

### 5. **Tax Calculation**
**Iqama-Based Tax System:**
- Resident vs non-resident classification
- Gross income calculation
- Taxable income determination
- Automatic tax rate application
- Year-to-date tracking
- Tax exemptions management

### 6. **Zakat Management**
**Saudi Nationals Only:**
- 2.5% of zakatable income
- Nisab threshold validation
- Automatic deduction option
- Year-to-date tracking
- Payment status monitoring

### 7. **Payroll Calendar & Cycles**
**Flexible Scheduling:**
- Monthly, semi-monthly, bi-weekly, weekly frequencies
- Configurable payment day
- Attendance cutoff day
- Calculation lead time
- Approval lead time

**Cycle Management:**
- Draft → Calculating → Calculated → Validating → Pending Approval → Approved → Paid
- Employee count tracking
- Total gross/deductions/net calculations
- Error tracking and resolution
- Cycle locking mechanism

### 8. **Validation System**
**Comprehensive Checks:**
- Zero or negative net salary detection
- Missing bank details warnings
- IBAN validation
- Duplicate employee detection
- Payroll limit validations
- Custom validation rules

**Error Severity Levels:**
- **Error**: Blocks payroll processing
- **Warning**: Allows processing with notification
- **Info**: Informational messages

### 9. **Approval Workflow**
**Multi-Level Approvals:**
- Configurable approval chains
- Level-based approvers
- Approval/rejection tracking
- Comments and justification
- Reminder notifications
- Approval expiration

**Approval Features:**
- Sequential approval levels
- Parallel approval options
- Escalation rules
- Automatic approval thresholds
- Audit trail

### 10. **Off-Cycle Payments**
**Special Payments:**
- Bonuses
- Termination payments
- Commission payments
- Retroactive adjustments
- One-time allowances

### 11. **Retroactive Payments**
**Adjustment System:**
- Historical period adjustments
- Original cycle reference
- Automatic recalculation
- Adjustment tracking
- Approval workflow

### 12. **Garnishments & Deductions**
**Legal Deductions:**
- Court orders
- Child support
- Loan attachments
- Priority-based processing
- Fixed amount or percentage
- Balance tracking
- Completion monitoring

### 13. **Bank File Generation**
**Multiple Formats:**
- Excel (XLSX)
- CSV
- Bank-specific text formats
- Custom formatting support

**File Features:**
- Employee details
- Bank account information
- Payment amounts
- Reference numbers
- Batch totals
- Digital signatures support

### 14. **Payslip Distribution**
**Multi-Channel Distribution:**
- Email delivery
- Portal access
- PDF generation
- View/download tracking
- Multi-language support

**Payslip Features:**
- Detailed earnings breakdown
- Deductions itemization
- GOSI contributions
- Tax withholding
- Net salary calculation
- YTD figures
- Company branding

### 15. **Cost Allocation**
**Cost Center Distribution:**
- Percentage-based allocation
- Multiple cost centers per employee
- Automatic calculation
- Department charging
- Project costing

### 16. **Year-End Processing**
**Annual Compliance:**
- WPS annual summary
- Tax forms generation
- GOSI annual reconciliation
- End-of-service calculations
- Year-end reports

### 17. **Multi-Country Support**
**Regional Flexibility:**
- Country-specific rules
- Currency management
- Tax regime configuration
- Social security variations
- Labor law compliance

### 18. **Saudi-Specific Features**

#### Ramadan Working Hours
- Automatic 2-hour reduction
- Configurable working hours
- Salary impact calculations
- Compliance tracking

#### GOSI Integration
- Direct API integration support
- Automated submissions
- Response tracking
- Error handling

#### MOL Compliance
- Establishment ID management
- Labor law adherence
- Penalty calculations
- Violation tracking

## Database Schema

### Core Tables

**payroll_components_v2** - Salary components master
- Component code, name (EN/AR)
- Type (earning, deduction, employer_cost)
- Calculation method
- Tax/GOSI applicability
- Display settings

**payroll_cycles_v2** - Payroll runs
- Period start/end dates
- Payment date
- Status tracking
- Employee count
- Financial totals
- Error tracking

**payroll_cycle_employees_v2** - Employee payroll details
- Employee snapshot
- Working days
- Salary breakdown
- GOSI contributions
- Tax amounts
- Bank details
- Calculation status

**payroll_cycle_components_v2** - Component breakdown
- Per-employee component amounts
- Calculation details
- Base amounts and rates
- Units (hours, days)

**payroll_employee_components_v2** - Component assignments
- Employee-specific components
- Effective dates
- Amounts/percentages
- Recurring vs one-time

### Saudi-Specific Tables

**payroll_gosi_contributions_v2** - GOSI tracking
- National ID
- Contribution base
- Employee/employer rates
- Contribution amounts
- Hazard calculations

**payroll_wps_files_v2** - WPS file management
- File generation details
- Bank information
- MOL submission tracking
- Acceptance/rejection status

**payroll_tax_withholding_v2** - Tax calculations
- Iqama details
- Taxable income
- Tax rates and amounts
- YTD tracking

**payroll_zakat_calculations_v2** - Zakat management
- Zakatable income
- Zakat amounts
- Deduction status
- YTD tracking

### Supporting Tables

**payroll_validations_v2** - Validation results
**payroll_approvals_v2** - Approval workflow
**payroll_adjustments_v2** - Retroactive changes
**payroll_bank_files_v2** - Bank file generation
**payroll_payslips_v2** - Payslip tracking
**payroll_cost_allocation_v2** - Cost distribution
**payroll_garnishments_v2** - Legal deductions

## API Functions

### Payroll Processing

```typescript
// Calculate payroll cycle
const { data, error } = await supabase.rpc('calculate_payroll_cycle', {
  p_cycle_id: cycleId
});

// Returns: { success: true, employees_processed: 150, message: 'Completed' }
```

### GOSI Calculation

```typescript
// Calculate GOSI contribution
const { data, error } = await supabase.rpc('calculate_gosi_contribution', {
  p_cycle_employee_id: employeeId,
  p_basic_salary: 10000,
  p_housing_allowance: 3000,
  p_nationality: 'Saudi'
});

// Returns: contribution details with rates and amounts
```

### Validation

```typescript
// Validate payroll cycle
const { data, error } = await supabase.rpc('validate_payroll_cycle', {
  p_cycle_id: cycleId
});

// Returns: { success: true, errors: 0, warnings: 5 }
```

### Component Seeding

```typescript
// Seed default components for a company
const { error } = await supabase.rpc('seed_payroll_components', {
  p_company_id: companyId
});
```

## User Interface

### Payroll Dashboard (`/payroll-v2`)
**Path**: Comprehensive Payroll System

**Features:**
- Active cycles overview
- Pending approvals count
- YTD payroll totals
- Employee statistics
- Quick cycle creation
- Cycle calculation
- Validation triggers
- Report downloads

### WPS File Generation
**Tab**: WPS Files

**Features:**
- WPS file generation from approved cycles
- Bank selection
- MOL establishment ID
- File download (SIF format)
- Submission tracking
- Acceptance/rejection status
- MOL reference numbers

### Payroll Reports
**Tab**: Reports

**Available Reports:**
1. Payroll Register - Detailed breakdown by employee
2. GOSI Report - Monthly contributions summary
3. Tax Report - Income tax withholding
4. Cost Center Report - Payroll by cost center
5. Bank Transfer File - Ready for bank upload
6. Payroll Summary - Executive overview

### Payroll Settings
**Tab**: Settings

**Configuration Options:**
- GOSI rates (Saudi/Non-Saudi)
- Maximum contribution base
- Payroll frequency and calendar
- Payment day configuration
- Tax thresholds
- Zakat rates
- Ramadan working hours
- Calculation lead times

## Workflow Examples

### Monthly Payroll Processing

1. **Create Cycle**
   - Set period dates
   - Set payment date
   - Name the cycle

2. **Calculate Payroll**
   - System fetches active employees
   - Retrieves assigned components
   - Calculates attendance-based amounts
   - Applies GOSI rates
   - Calculates tax withholding
   - Computes zakat (if applicable)
   - Processes loans and advances
   - Applies garnishments
   - Generates totals

3. **Validate**
   - Check for errors
   - Validate bank details
   - Verify calculation accuracy
   - Flag warnings

4. **Review & Approve**
   - HR reviews calculations
   - Finance approves
   - Management final approval

5. **Generate Files**
   - Create WPS file
   - Generate bank file
   - Produce payslips

6. **Process Payment**
   - Upload to bank
   - Mark as paid
   - Distribute payslips
   - Update records

### Off-Cycle Bonus Payment

1. Create off-cycle cycle
2. Add bonus component
3. Calculate for selected employees
4. Skip validation (optional)
5. Fast-track approval
6. Generate payment file
7. Process immediately

### Retroactive Salary Adjustment

1. Create adjustment record
2. Specify original cycle
3. Define adjustment amount
4. Set effective period
5. Get approval
6. Process in next cycle
7. Track adjustment

## Compliance & Security

### Saudi Labor Law
✅ GOSI contribution compliance
✅ WPS mandatory submission
✅ Ramadan working hours
✅ End-of-service calculations
✅ Minimum wage enforcement
✅ Overtime calculations (1.5x)

### Data Security
- Row-level security (RLS)
- Role-based access control
- Encrypted sensitive data
- Audit logging
- Data retention policies

### Financial Controls
- Multi-level approvals
- Validation gates
- Error prevention
- Reconciliation reports
- Audit trails

## Best Practices

### Payroll Processing
1. Calculate 5 days before payment
2. Validate immediately after calculation
3. Get approvals 3 days before payment
4. Generate files 2 days before payment
5. Process on scheduled date

### Component Management
1. Use descriptive codes
2. Set proper tax/GOSI flags
3. Configure proration as needed
4. Order components logically
5. Test calculations before activation

### GOSI Compliance
1. Verify nationality data accuracy
2. Include housing allowance properly
3. Respect contribution caps
4. Submit files on time
5. Keep submission records

### WPS Compliance
1. Maintain valid IBAN for all employees
2. Generate files within 15 days
3. Use correct bank codes
4. Verify establishment ID
5. Track MOL responses

## Troubleshooting

### Common Issues

**Calculation Errors**
- Check component assignments
- Verify attendance data
- Review formula syntax
- Check for circular references

**GOSI Incorrect**
- Verify nationality
- Check housing allowance inclusion
- Confirm contribution base
- Review rate settings

**WPS File Rejected**
- Validate IBAN format
- Check employee data completeness
- Verify bank code
- Confirm establishment ID

**Validation Failures**
- Review error messages
- Fix bank details
- Verify calculation logic
- Check for data issues

## Integration Points

### GOSI API
- Contribution submission
- Rate updates
- Employee verification
- Compliance checks

### MOL System
- WPS file submission
- Status tracking
- Compliance reports
- Violation alerts

### Banking Systems
- File upload
- Payment confirmation
- Reconciliation
- Error handling

### Attendance System
- Working days import
- Overtime hours
- Absence tracking
- Leave deductions

---

**Special Offices HRMS** - Comprehensive Payroll System
**Version**: 2.0.0
**Saudi Arabia Compliant**
**Last Updated**: 2024
