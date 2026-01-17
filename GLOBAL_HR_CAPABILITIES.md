# Global HR Capabilities - Multi-Country Enterprise System

## Overview

The Global HR Capabilities module transforms your HR system into a truly international platform, enabling seamless management of employees across multiple countries with full compliance, multi-currency support, and localized operations.

## Key Features

### 1. Multi-Country Support

#### Pre-configured Countries
- **24 major countries** with complete compliance settings
- **Middle East**: Saudi Arabia, UAE, Egypt, Jordan, Kuwait, Bahrain, Oman, Qatar
- **Europe**: UK, Germany, France, Italy, Spain, Netherlands, Switzerland
- **Americas**: USA, Canada, Mexico, Brazil
- **Asia-Pacific**: Japan, China, India, Australia, Singapore

#### Country Configuration
Each country includes:
- **Regional Information**: Region, subregion, capital city
- **Financial Settings**: Default currency, date/time formats
- **Working Week**: Configurable working days and hours
- **Labor Laws**: Min wage, overtime rules, leave entitlements
- **Tax Settings**: Income tax, social security, pension requirements
- **Compliance**: Work permit requirements, mandatory insurance
- **Timezone Management**: UTC offset and timezone handling
- **Language Support**: Multiple language configurations

### 2. Multi-Currency System

#### Supported Currencies (30+)
- SAR, USD, EUR, GBP, AED, EGP, JPY, CNY, INR, CAD, AUD, CHF, and more
- Each with proper decimal places, symbols, and formatting rules

#### Exchange Rate Management
- Historical exchange rate tracking
- Automatic currency conversion using `convert_currency()` function
- Support for inverse rate calculations
- Manual and API-based rate updates

#### Currency Features
- **Symbol Position**: Before or after amount
- **Decimal Handling**: 0-3 decimal places based on currency
- **Thousand Separators**: Locale-specific formatting
- **Multi-currency Payroll**: Pay employees in their local currency

### 3. Tax Calculation Engine

#### Country-Specific Tax Rules
- **Progressive Tax Brackets**: Multi-tiered tax rates
- **Flat Rate Taxes**: Simple percentage-based taxation
- **Hybrid Systems**: Combination of methods

#### Tax Types Supported
- Income Tax
- Social Security / GOSI
- Pension Contributions
- Health Insurance
- Unemployment Insurance
- Custom Taxes

#### Tax Configuration
- **Employee vs Employer Split**: Separate contribution percentages
- **Annual Caps**: Maximum taxable income limits
- **Personal Allowances**: Tax-free thresholds
- **Dependent Deductions**: Additional allowances per dependent
- **Effective Date Ranges**: Historical tax rule tracking

#### Sample Tax Rules Included
- **Saudi Arabia**: GOSI (22%), SANED (2%)
- **UK**: Income Tax (20-40%), National Insurance (12%)
- **USA**: Federal Tax (10-37%), Social Security (12.4%), Medicare (2.9%)
- **Germany**: Income Tax (42%), Pension (18.6%), Health (14.6%)

### 4. Holiday Calendar Management

#### Holiday Types
- Public Holidays
- Bank Holidays
- Religious Holidays
- National Days
- Observances

#### Holiday Features
- **Recurring Holidays**: Automatically repeat each year
- **Regional Holidays**: Specific to regions within a country
- **Lunar Calendar Support**: For Islamic holidays
- **Pay Multipliers**: Special pay rates for working on holidays
- **Work Permission**: Track if work is allowed on holiday

#### Pre-loaded Holidays (2024)
- Saudi: National Day, Eid Al-Fitr, Eid Al-Adha, Islamic New Year
- UAE: New Year, Eids, Islamic New Year, National Day
- US: New Year, Independence Day, Thanksgiving, Christmas
- UK: New Year, Easter, Bank Holidays, Christmas, Boxing Day
- And more for all supported countries

### 5. Labor Law Compliance

#### Employment Types Supported
- Permanent
- Fixed-term
- Contractor
- Intern
- Part-time
- Seasonal
- Apprentice

#### Labor Law Configurations
- **Contract Requirements**: Written contract mandates
- **Working Hours**: Daily, weekly, and consecutive day limits
- **Rest Periods**: Break requirements and intervals
- **Overtime Rules**: Calculation methods and multipliers
- **Notice Periods**: Termination notice requirements
- **Severance Pay**: End of service benefit calculations
- **Leave Accrual**: How vacation days are earned
- **Probation Period**: Duration and rules

### 6. Expatriate Management

#### Assignment Types
- **Short-term**: Less than 1 year
- **Long-term**: More than 1 year
- **Permanent**: Permanent relocation
- **Cross-border Commuter**: Daily/weekly commutes
- **Remote Worker**: Work from different country

#### Expatriate Features
- **Home and Host Country Tracking**: Full dual-country management
- **Assignment Dates**: Start, end, and expected return tracking
- **Multi-currency Compensation**: Base salary in any currency
- **Comprehensive Allowances**:
  - Housing Allowance
  - Transportation Allowance
  - Education Allowance
  - Relocation Allowance
  - Hardship Allowance
  - Cost of Living Adjustment

#### Tax Treatment Options
- **Tax Equalization**: Company absorbs tax differences
- **Tax Protection**: Maximum tax burden protection
- **Dual Tax Liability**: Track home and host country obligations

#### Benefits Support
- Home leave frequency and ticket provisions
- Dependent ticket allowances
- International health insurance tracking
- Relocation assistance
- Moving cost coverage
- Temporary accommodation

### 7. Work Permit Management

#### Permit Types
- Work Visa
- Residence Permit
- Work Authorization
- Sponsorship

#### Permit Tracking
- **Issue and Expiry Dates**: Full lifecycle tracking
- **Status Management**: Pending, Approved, Rejected, Expired, Renewed
- **Application Tracking**: Reference numbers and dates
- **Restrictions**: Work, employer, and location limitations
- **Renewal Management**: Automatic alerts before expiry
- **Sponsorship**: Track sponsor details
- **Document Storage**: Upload and store permit documents

#### Compliance Alerts
- Automatic alerts 30+ days before expiry
- Email notifications to HR and employee
- Dashboard visibility for expiring permits
- Renewal tracking and follow-up

### 8. Global Payroll Processing

#### Multi-Country Payroll Runs
- Process payroll across multiple countries simultaneously
- Consolidated reporting with country breakdowns
- Multi-currency calculation and conversion
- Country-specific tax calculations

#### Payroll Settings per Country
- **Payment Frequency**: Weekly, biweekly, monthly
- **Payment Day**: Configurable day of month
- **Currency Options**: Local or multi-currency
- **Bank Transfer Settings**: Processing days configuration
- **Rounding Rules**: Country-specific rounding
- **13th/14th Month**: Support for additional salary months
- **Salary Advance**: Country-specific advance rules

#### Cross-Border Transfers
- **Source to Destination**: Full transfer tracking
- **Exchange Rate Capture**: Rate and date recording
- **Fee Tracking**: Transfer fees and bank charges
- **Banking Details**: SWIFT, IBAN, account numbers
- **Transfer Status**: Pending to completed lifecycle
- **Purpose Documentation**: Compliance documentation
- **Approval Workflow**: Multi-level approvals
- **Payment Methods**: Wire, SWIFT, SEPA, ACH, local

### 9. Employee Work Locations

#### Multi-Location Support
- Employees can have multiple work locations
- Primary location designation
- Start and end dates for each location
- Tax residency tracking per location
- Work permit linkage
- Payroll country specification
- Cost center allocation

### 10. Compliance Checklist

#### Compliance Categories
- Registration
- Reporting
- Filing
- Audit
- Renewal

#### Compliance Tracking
- **Requirement Management**: Track all compliance items
- **Due Dates**: Automatic deadline tracking
- **Status Monitoring**: Pending, In Progress, Completed, Overdue
- **Document Requirements**: Required vs uploaded documents
- **Assignment**: Assign tasks to responsible parties
- **Penalties**: Track penalty amounts if missed
- **Legal References**: Link to relevant laws and regulations

### 11. Global Reporting

#### Report Types
- Headcount by Country
- Payroll by Country and Currency
- Tax Summary Reports
- Compliance Status Reports
- Demographics by Region

#### Reporting Features
- **Multi-country Selection**: Choose specific countries or all
- **Date Range Flexibility**: Monthly, quarterly, annual
- **Currency Consolidation**: Convert to base currency
- **Export Options**: PDF, Excel, CSV, JSON
- **Summary Views**: High-level executive summaries
- **Detailed Breakdowns**: Drill-down capabilities

## Database Schema

### Core Tables

#### countries (24+ pre-populated)
- Complete country master data
- Labor law configurations
- Tax settings
- Working week and hours
- Leave entitlements
- Currency and timezone

#### currencies (30+ supported)
- Currency codes and names
- Symbols and formatting rules
- Decimal place configuration
- Active status

#### exchange_rates
- Historical rate tracking
- Source attribution
- Effective date ranges
- Bidirectional conversion support

#### country_tax_rules
- Tax type and name
- Calculation methods
- Brackets and rates
- Employee/employer splits
- Caps and allowances
- Effective periods

#### country_labor_laws
- Employment type specific rules
- Contract requirements
- Working hour limits
- Overtime multipliers
- Leave accrual methods
- Termination rules

#### country_holidays
- Holiday dates and types
- Recurrence patterns
- Regional variations
- Pay multipliers
- Work permissions

### Employee Global Management

#### employee_work_locations
- Multi-location assignments
- Primary location designation
- Tax residency tracking
- Work permit references
- Payroll country settings

#### expatriates
- International assignments
- Home and host countries
- Assignment types and dates
- Multi-currency compensation
- Allowances and benefits
- Tax treatment options

#### work_permits
- Permit type and number
- Issue and expiry dates
- Status tracking
- Application history
- Restrictions
- Renewal management

### Global Payroll

#### global_payroll_runs
- Multi-country processing
- Consolidated totals
- Country breakdowns
- Approval workflow
- Payment tracking

#### cross_border_transfers
- Source and destination
- Currency conversion
- Exchange rates
- Banking details
- Transfer status
- Compliance documentation

#### tax_calculations
- Detailed tax breakdowns
- Income tax
- Social security
- Pension contributions
- Health insurance
- Net salary calculation

### Compliance

#### country_payroll_settings
- Frequency and timing
- Currency configuration
- Bank transfer settings
- Rounding rules
- Filing requirements

#### country_compliance_checklist
- Compliance requirements
- Due dates and status
- Document tracking
- Penalty management
- Assignment and responsibility

#### global_reports
- Report storage
- Multi-country scope
- Date range configuration
- File attachments
- Status tracking

## Helper Functions

### Currency Conversion

#### get_exchange_rate()
```sql
SELECT get_exchange_rate('SAR', 'USD', CURRENT_DATE);
-- Returns exchange rate for SAR to USD
```

#### convert_currency()
```sql
SELECT convert_currency(10000, 'SAR', 'USD', CURRENT_DATE);
-- Converts 10,000 SAR to USD using current rate
```

### Usage Examples

**Convert employee salary to base currency:**
```sql
SELECT
  full_name,
  salary,
  salary_currency,
  convert_currency(salary, salary_currency, 'SAR', CURRENT_DATE) as salary_in_sar
FROM employees;
```

**Get total payroll in company base currency:**
```sql
SELECT
  SUM(convert_currency(salary, salary_currency, 'SAR', CURRENT_DATE)) as total_payroll_sar
FROM employees
WHERE status = 'active';
```

## Usage Guide

### Setting Up Global Operations

1. **Review Country Configuration**
   - Countries are pre-loaded with default settings
   - Customize working hours, leave days, and compliance requirements
   - Update min wage and overtime multipliers as needed

2. **Configure Exchange Rates**
   - Rates are seeded with sample data
   - Update rates regularly (daily/weekly)
   - Consider automated rate updates via API

3. **Set Up Tax Rules**
   - Review pre-configured tax rules
   - Add company-specific tax configurations
   - Set effective dates for tax changes

4. **Define Payroll Settings per Country**
   - Configure payment frequency and dates
   - Set up bank transfer settings
   - Define rounding rules

5. **Import Holiday Calendars**
   - Holidays are pre-loaded for 2024
   - Import future year holidays
   - Add company-specific holidays

### Managing Expatriates

1. **Create Assignment**
   - Select employee
   - Choose home and host countries
   - Set assignment type and dates
   - Configure compensation and allowances

2. **Monitor Assignments**
   - View upcoming assignments
   - Track assignment duration
   - Monitor costs and benefits

3. **Handle Extensions**
   - Update end dates
   - Adjust compensation
   - Modify allowances

4. **Complete Assignments**
   - Set actual return date
   - Update status to completed
   - Archive assignment records

### Work Permit Management

1. **Add Permit**
   - Link to employee
   - Enter permit details
   - Upload documentation
   - Set expiry alerts

2. **Track Renewals**
   - Monitor expiry dates
   - Initiate renewals early
   - Track application status
   - Update permit status

3. **Handle Expirations**
   - Receive automatic alerts
   - Take corrective action
   - Update employee status if needed

### Processing Global Payroll

1. **Create Global Run**
   - Select month and year
   - Choose countries to include
   - Initiate processing

2. **Calculate Taxes**
   - System applies country-specific rules
   - Calculates employee and employer portions
   - Generates tax breakdowns

3. **Currency Conversion**
   - Converts to base currency for reporting
   - Uses exchange rates for payment date
   - Tracks conversions for audit

4. **Approve and Pay**
   - Review consolidated totals
   - Approve payroll run
   - Initiate bank transfers
   - Track payment status

### Cross-Border Transfers

1. **Create Transfer**
   - Select employee and transfer type
   - Enter source and destination details
   - Specify amounts and currencies
   - Add exchange rate

2. **Approval Process**
   - Submit for approval
   - Multi-level authorization
   - Compliance checks

3. **Initiate Transfer**
   - Provide banking details
   - Generate transfer reference
   - Track with SWIFT/reference number

4. **Monitor Status**
   - Pending → Processing → Completed
   - Track expected vs actual arrival
   - Handle failures and retries

### Global Reporting

1. **Select Report Type**
   - Headcount, payroll, tax, compliance, demographics

2. **Configure Scope**
   - Choose countries (all or specific)
   - Set date range
   - Select currencies

3. **Generate Report**
   - System consolidates data
   - Applies currency conversions
   - Creates visualizations

4. **Export and Share**
   - Download in preferred format
   - Share with stakeholders
   - Archive for compliance

## Access and Permissions

### Dashboard Access
- **Route**: `/global-hr`
- **Required Roles**: Super Admin, Admin, HR Manager, Finance Manager

### Feature Permissions
- **View Global Data**: All authenticated users with company access
- **Manage Countries**: Super Admin, Admin
- **Manage Exchange Rates**: Super Admin, Admin, Finance Manager
- **Manage Tax Rules**: Super Admin, Admin, Finance Manager
- **Manage Expatriates**: Super Admin, Admin, HR Manager
- **Manage Work Permits**: Super Admin, Admin, HR Manager
- **Process Global Payroll**: Super Admin, Admin, Finance Manager
- **Manage Compliance**: Super Admin, Admin, HR Manager
- **Generate Reports**: Super Admin, Admin, HR Manager, Finance Manager

## Integration Points

### Existing Modules

**Employees Module**
- Work locations automatically linked
- Expatriate status visible in profile
- Tax residency tracking

**Payroll Module**
- Multi-currency salary processing
- Country-specific tax calculations
- Exchange rate application

**Leave Module**
- Holiday calendar integration
- Country-specific leave entitlements
- Accrual rate variations

**Attendance Module**
- Working hours by country
- Overtime multipliers
- Holiday detection

**Compliance Module**
- Work permit expiry alerts
- Visa status tracking
- Labor law adherence

## Best Practices

### Data Management
1. **Regular Updates**: Keep exchange rates current
2. **Annual Review**: Update tax rules yearly
3. **Holiday Import**: Import next year's holidays in advance
4. **Compliance Tracking**: Monitor work permit expirations

### Expatriate Management
1. **Early Planning**: Set up assignments before start date
2. **Documentation**: Upload all permits and visas
3. **Cost Tracking**: Monitor total compensation costs
4. **Regular Review**: Check assignment progress quarterly

### Payroll Processing
1. **Multi-step Review**: Validate before approval
2. **Currency Check**: Verify exchange rates
3. **Tax Validation**: Confirm tax calculations
4. **Audit Trail**: Maintain complete records

### Compliance
1. **Proactive Monitoring**: Check expiring permits monthly
2. **Document Everything**: Store all compliance documents
3. **Regular Audits**: Review compliance checklist
4. **Stay Informed**: Monitor labor law changes

## Security and Compliance

### Data Protection
- Row Level Security on all tables
- Company isolation enforced
- Encrypted sensitive data
- Audit logging enabled

### Compliance Standards
- GDPR compliant (EU)
- Saudi Labor Law compliant
- Multi-country statutory requirements
- Tax filing support

### Access Controls
- Role-based permissions
- Department isolation options
- Multi-level approvals
- Delegation support

## Technical Specifications

### Performance
- Indexed for fast queries
- Optimized currency conversion
- Efficient tax calculations
- Cached exchange rates

### Scalability
- Supports unlimited countries
- Unlimited employees per country
- Unlimited expatriate assignments
- Historical data retention

### Integration
- RESTful API ready
- Webhook support
- Export capabilities
- Import utilities

## Future Enhancements

### Planned Features
1. **Automated Exchange Rates**: API integration for daily updates
2. **Tax Filing**: Electronic filing support
3. **Compliance Automation**: Auto-generate compliance reports
4. **Localization**: Full multi-language UI
5. **Mobile App**: Global HR mobile access
6. **AI Insights**: Predictive compliance alerts
7. **Blockchain**: Immutable audit trails
8. **Payroll APIs**: Third-party payroll provider integration

## Support and Maintenance

### Regular Maintenance
- Monthly: Update exchange rates
- Quarterly: Review tax rules
- Annually: Import new holidays, update country settings
- As needed: Add new countries, update compliance requirements

### Monitoring
- Expiring permits dashboard
- Compliance checklist tracking
- SLA monitoring
- Exception reporting

### Troubleshooting
- Detailed error logging
- Audit trail for all changes
- Support for data corrections
- Rollback capabilities

## Conclusion

The Global HR Capabilities module provides everything needed to manage a truly international workforce:

✅ **24+ countries** pre-configured with full compliance
✅ **30+ currencies** with automatic conversion
✅ **Tax calculation engines** for major countries
✅ **Holiday calendars** with regional support
✅ **Expatriate management** with full benefit tracking
✅ **Work permit tracking** with automatic alerts
✅ **Multi-currency payroll** with consolidated reporting
✅ **Cross-border payments** with full audit trail
✅ **Compliance management** with checklists and deadlines
✅ **Global reporting** with currency consolidation

This system enables HR teams to confidently manage employees across borders while maintaining full compliance with local laws and regulations in each country.

For additional support or to add new countries, contact your system administrator.
