# Automated Governance Reporting System

## Overview

A comprehensive, enterprise-grade automated reporting system designed for governance, compliance, and controlled data distribution with full audit trails.

## Key Features

### 1. **Role-Based Data Control**
- Reports automatically filter data based on user roles
- Row-level security ensures users only see authorized data
- Configurable role assignments per report
- Department and cost center isolation

### 2. **Scheduled & Event-Driven Generation**
- **Daily** - Run every day at specified time
- **Weekly** - Run on specific day of week
- **Monthly** - Run on specific day of month
- **Quarterly** - Run every quarter
- **Yearly** - Run annually
- **On-Demand** - Manual execution by authorized users

### 3. **Secure Email Transmission**
- Encrypted attachment support for sensitive reports
- Password-protected files for confidential data
- Delivery tracking with open/download statistics
- Automatic retry on delivery failure
- Support for multiple recipients and roles

### 4. **Delivery Tracking & Compliance**
- Complete audit trail of all report activities
- Delivery status tracking (sent, delivered, opened, downloaded)
- Access revocation capabilities
- Time-based access expiration
- IP address and user agent logging

### 5. **Centralized Configuration**
- Company-specific report customization
- Email template customization
- Recipient management by role or email
- Approval workflow configuration
- Retention policy settings

### 6. **Approval Workflows**
- Multi-level approval chains
- Automatic approval for low-sensitivity reports
- Mandatory approval for confidential/restricted data
- Approval expiration and reminders
- Comprehensive approval audit trail

## System Architecture

### Database Schema

#### Core Tables

**report_definitions** - Global report templates
- report_key, name, description
- data_source, query_template, columns
- allowed_roles, row_level_filter
- sensitivity level (public, internal, confidential, restricted)
- requires_approval, encrypt_attachment flags

**report_configurations** - Company-specific settings
- Links to report_definitions
- custom_name, is_enabled
- default_recipients, recipient_roles
- email_subject, email_body customization
- approval_chain configuration

**report_schedules** - Automated execution
- frequency (daily, weekly, monthly, quarterly, yearly)
- schedule_time, schedule_day, timezone
- next_run_at calculation
- run_count, failure_count tracking
- notification preferences

**report_executions** - Generation history
- execution_type (scheduled, manual, event_triggered)
- status (pending, generating, completed, failed)
- parameters, filters_applied
- file_path, file_url, encryption details
- duration_seconds, row_count metrics

**report_deliveries** - Distribution tracking
- recipient_email, delivery_method
- status (pending, sent, delivered, opened, failed)
- sent_at, delivered_at, opened_at, downloaded_at
- download_count, last_accessed_at
- access_expires_at, access_revoked

**report_approvals** - Approval workflow
- approval_level, approver_id
- status (pending, approved, rejected, expired)
- approved_at, rejected_at, comments
- reminder tracking

**report_compliance_log** - Audit trail
- event_type (generated, delivered, accessed, revoked)
- user_id, user_email, user_role
- user_ip_address, user_agent
- contains_pii, contains_financial flags
- business_justification

## Pre-Configured Reports

### Payroll Reports (3)
1. **Monthly Payroll Summary** - Comprehensive payroll by department
2. **Salary Expense by Department** - Cost analysis with charts
3. **GOSI Contributions Report** - Employee and employer shares

### Compliance Reports (3)
1. **Document Expiry Tracking** - All expiring documents with alerts
2. **Nitaqat Compliance Report** - Saudization status and gaps
3. **Employee Contract Status** - Contract renewals and expirations

### HR Reports (4)
1. **Headcount by Department** - Employee distribution analysis
2. **Leave Balance Summary** - Leave entitlements and usage
3. **Turnover Analysis** - Separation rates by department
4. **Employee Demographics** - Workforce composition

### Finance Reports (4)
1. **Cost Center Analysis** - Budget vs actual with variance
2. **EOS Liability Report** - End of service exposure
3. **Loan Portfolio Summary** - Active loans and repayment
4. **Expense Analysis Report** - Category-wise expense breakdown

## Security Features

### Data Protection
- **Encryption** - AES-256 encryption for sensitive attachments
- **Password Protection** - Automatic password generation for encrypted files
- **Access Control** - Role-based and time-based restrictions
- **Row-Level Security** - Automatic data filtering by role
- **Audit Logging** - Complete trail of all access events

### Compliance
- **GDPR Compliant** - Data retention and deletion policies
- **Saudi Labor Law** - Compliance with local regulations
- **PII Tracking** - Flag reports containing personal data
- **Financial Data** - Special handling for financial information
- **Business Justification** - Required for sensitive data access

## User Interface

### Report Configuration Page
**Path**: `/governance-reports` → Configure tab

Features:
- Browse available report definitions by category
- Enable/disable reports for your company
- Configure recipients (emails and roles)
- Customize email subjects and body
- Set approval requirements
- Override default settings

### Scheduling Manager
**Path**: `/governance-reports` → Schedules tab

Features:
- Create automated schedules
- Set frequency (daily, weekly, monthly, etc.)
- Configure execution time and timezone
- Monitor run history and failures
- Pause/resume schedules
- Notification settings

### Execution History
**Path**: `/governance-reports` → Execution History tab

Features:
- View all report generation history
- Monitor status (pending, generating, completed, failed)
- Download completed reports
- View execution metrics
- Retry failed executions
- Cancel pending executions

### Compliance Audit
**Path**: `/governance-reports` → Compliance Audit tab

Features:
- Complete audit trail
- Filter by event type, user, date range
- PII access tracking
- Encrypted delivery tracking
- Export audit logs
- Compliance metrics dashboard

## API Integration

### Create Report Configuration

```typescript
const { data, error } = await supabase
  .from('report_configurations')
  .insert({
    company_id: companyId,
    report_definition_id: reportDefId,
    is_enabled: true,
    default_recipients: ['cfo@company.com', 'hr@company.com'],
    recipient_roles: ['finance', 'hr'],
    email_subject: 'Monthly Payroll Report - {{month}} {{year}}',
    requires_approval_override: false,
  });
```

### Create Automated Schedule

```typescript
const { data, error } = await supabase
  .from('report_schedules')
  .insert({
    company_id: companyId,
    report_configuration_id: configId,
    frequency: 'monthly',
    schedule_time: '08:00:00',
    schedule_day: 1, // First day of month
    timezone: 'Asia/Riyadh',
    is_active: true,
    notify_on_failure: true,
  });
```

### Execute Report Manually

```typescript
const { data, error } = await supabase
  .from('report_executions')
  .insert({
    company_id: companyId,
    report_configuration_id: configId,
    execution_type: 'manual',
    status: 'pending',
    parameters: {
      date_range_start: '2024-01-01',
      date_range_end: '2024-01-31',
    },
    generated_by: userId,
  });
```

### Query Execution History

```typescript
const { data, error } = await supabase
  .from('report_executions')
  .select(`
    *,
    report_configuration:report_configurations(
      custom_name,
      report_definition:report_definitions(name, category)
    )
  `)
  .eq('company_id', companyId)
  .order('created_at', { ascending: false })
  .limit(50);
```

### View Compliance Log

```typescript
const { data, error } = await supabase
  .from('report_compliance_log')
  .select('*')
  .eq('company_id', companyId)
  .eq('event_type', 'accessed')
  .eq('contains_pii', true)
  .order('event_timestamp', { ascending: false });
```

## Workflow Examples

### Scenario 1: Monthly Payroll Report

1. **Configuration** (One-time setup)
   - Enable "Monthly Payroll Summary" report
   - Add recipients: CFO, Finance Manager, HR Director
   - Set encryption: true (confidential data)
   - Require approval: true (finance director approval)

2. **Schedule**
   - Frequency: Monthly
   - Day: 1st of each month
   - Time: 08:00 AM (Riyadh time)
   - Auto-execute: enabled

3. **Execution Flow**
   - System generates report on 1st of month at 8 AM
   - Report status: pending approval
   - Finance Director receives approval notification
   - After approval, report is encrypted and emailed
   - Recipients receive encrypted PDF with password
   - All events logged in compliance audit

### Scenario 2: Document Expiry Alert

1. **Configuration**
   - Enable "Document Expiry Tracking" report
   - Recipients: HR team (role-based)
   - Sensitivity: Internal
   - No encryption needed

2. **Schedule**
   - Frequency: Weekly
   - Day: Monday
   - Time: 09:00 AM

3. **Execution Flow**
   - Report runs every Monday at 9 AM
   - Lists all documents expiring in next 30 days
   - Color-coded by urgency (red < 7 days, yellow < 14 days)
   - Automatically emails HR team
   - HR takes action based on report

### Scenario 3: Compliance Audit Request

1. **On-Demand Execution**
   - Compliance officer requests "Nitaqat Compliance" report
   - System checks user has required role
   - Report generated immediately
   - Available for download in execution history

2. **Audit Trail**
   - Request logged with officer details
   - Generation time and duration tracked
   - Data accessed summary recorded
   - Download events tracked with IP address

## Best Practices

### Configuration
1. Start with default settings and customize gradually
2. Use role-based recipients for automatic distribution
3. Test reports manually before scheduling
4. Set appropriate retention periods
5. Enable encryption for confidential data

### Scheduling
1. Schedule reports during off-peak hours
2. Stagger multiple reports to avoid system load
3. Monitor failure rates and adjust schedules
4. Enable failure notifications for critical reports
5. Set realistic frequencies based on data volatility

### Security
1. Use minimum required permissions for report access
2. Enable approval workflows for sensitive data
3. Set access expiration for delivered reports
4. Review compliance logs regularly
5. Revoke access when employees leave

### Performance
1. Limit date ranges for large datasets
2. Use appropriate file formats (PDF for final, Excel for analysis)
3. Schedule resource-intensive reports during off-hours
4. Archive old executions based on retention policy
5. Monitor execution durations and optimize queries

## Troubleshooting

### Report Not Generating
- Check if schedule is active
- Verify report configuration is enabled
- Check for approval bottlenecks
- Review error messages in execution history
- Verify data source availability

### Delivery Failures
- Verify recipient email addresses
- Check SMTP configuration
- Review email queue status
- Check attachment size limits
- Verify email server connectivity

### Missing Data in Reports
- Check user role permissions
- Verify row-level security filters
- Review filter parameters
- Check data source query
- Confirm data exists for selected period

### Approval Delays
- Check if approvers are notified
- Verify approver roles and permissions
- Review approval expiration settings
- Send reminder notifications
- Configure backup approvers

## Compliance Notes

### Data Protection
- All reports comply with data protection regulations
- PII flagging for sensitive data tracking
- Encryption available for confidential reports
- Access revocation capabilities
- Comprehensive audit trails

### Saudi Labor Law Compliance
- Report templates include required labor law metrics
- GOSI compliance tracking
- Nitaqat reporting
- Contract renewal tracking
- End of service calculations

### Audit Requirements
- All events automatically logged
- Immutable audit trail
- User attribution for all actions
- IP address and user agent tracking
- Business justification fields

---

**Special Offices HRMS** - Enterprise Governance Reporting System
**Version**: 1.0.0
**Last Updated**: 2024
