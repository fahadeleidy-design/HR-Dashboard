# Email Notification Templates - Special Offices HRMS

## Overview

A comprehensive email notification system with professional, responsive HTML templates for all HR processes.

## Features

- **10 Professional Templates** covering all major HR workflows
- **Responsive Design** - Works on all devices
- **Dual Format** - HTML and Plain Text versions
- **Variable Substitution** - Dynamic content using `{{variable}}` placeholders
- **Categorized** - Organized by HR function
- **Saudi-Specific** - Compliance messaging and Arabic-ready
- **Branded** - Special Offices HRMS branding

## Template Categories

### 1. Leave Management (4 templates)
- **leave_request_submitted** - Employee confirmation when leave submitted
- **leave_request_approved** - Approval notification with remaining balance
- **leave_request_rejected** - Rejection with reason and next steps
- **leave_pending_approval** - Manager notification for pending requests

### 2. Payroll (3 templates)
- **payslip_ready** - Monthly payslip available notification
- **loan_request_approved** - Loan approval with repayment schedule
- **document_expiry_alert** - Critical document expiry warnings

### 3. Employee Lifecycle (1 template)
- **employee_welcome** - Onboarding email with first day details and credentials

### 4. System (1 template)
- **password_reset** - Secure password reset with expiring link

## Template Variables

All templates support dynamic variables for personalization:

### Common Variables
- `{{employee_name}}` - Employee full name
- `{{company_name}}` - Company name
- `{{system_url}}` - HRMS system URL
- `{{date}}` - Current date

### Leave-Specific
- `{{leave_type}}` - Annual, Sick, etc.
- `{{start_date}}` / `{{end_date}}` - Leave period
- `{{duration}}` - Days requested
- `{{remaining_balance}}` - Balance after approval
- `{{rejection_reason}}` - Reason for rejection
- `{{approver_name}}` - Manager who approved/rejected

### Payroll-Specific
- `{{month}}` / `{{year}}` - Payroll period
- `{{basic_salary}}` / `{{net_salary}}` - Salary amounts
- `{{allowances}}` / `{{deductions}}` - Salary components
- `{{payment_date}}` - Transfer date

### Loan-Specific
- `{{amount}}` - Loan amount in SAR
- `{{monthly_deduction}}` - Monthly installment
- `{{installments}}` - Number of payments
- `{{start_date}}` / `{{end_date}}` - Loan period

### Compliance-Specific
- `{{document_type}}` - Iqama, Passport, etc.
- `{{document_number}}` - Document ID
- `{{expiry_date}}` - Expiration date
- `{{days_remaining}}` - Days until expiry

## Design Features

### Professional Styling
- Gradient headers with category-specific colors
- Clean card-based layouts
- Clear call-to-action buttons
- Information boxes with visual hierarchy
- Status indicators (success, warning, error)

### Responsive Layout
- Mobile-friendly design
- Maximum width: 600px
- Flexible content areas
- Touch-friendly buttons

### Color Scheme
- **Leave Management** - Blue/Purple gradients
- **Approvals** - Green for success, Red for rejection
- **Payroll** - Cyan/Teal financial theme
- **Compliance** - Red/Orange alerts
- **Onboarding** - Purple celebration theme

## Usage

### Access Templates
Navigate to: **Settings > Email Settings > Email Templates**

### Load Default Templates
1. Click "Load Default Templates" button
2. System loads all 10 professional templates
3. Templates are ready to use immediately

### Preview Templates
1. Find template in the list
2. Click the eye icon to preview
3. View HTML rendering and plain text version
4. Check variable placeholders

### Activate/Deactivate
- Toggle templates on/off as needed
- Inactive templates won't be used for notifications
- Useful for testing or temporary disabling

### Customize Templates
Templates can be customized per company while maintaining professional design.

## Email Queue System

All emails are queued and processed asynchronously:
- **Priority Levels** - 1 (highest) to 10 (lowest)
- **Retry Logic** - Automatic retry on failure (max 3 attempts)
- **Status Tracking** - pending, sending, sent, failed, cancelled
- **Queue Dashboard** - View statistics in Email Settings

## SMTP Configuration

Configure your email server in Settings > Email Settings:
- Office 365 defaults pre-configured
- Support for any SMTP server
- TLS/SSL encryption
- Test email functionality
- Connection validation

## Template Keys

Use these keys when triggering emails programmatically:

```typescript
// Leave Management
'leave_request_submitted'
'leave_request_approved'
'leave_request_rejected'
'leave_pending_approval'

// Payroll
'payslip_ready'
'loan_request_approved'

// Compliance
'document_expiry_alert'

// Employee Lifecycle
'employee_welcome'

// System
'password_reset'
```

## Triggering Emails

### From Database Function
```sql
SELECT queue_template_email(
  p_company_id := 'uuid',
  p_template_key := 'leave_request_approved',
  p_to_email := 'employee@company.com',
  p_to_name := 'John Smith',
  p_variables := '{
    "employee_name": "John Smith",
    "leave_type": "Annual Leave",
    "start_date": "2024-03-15",
    "end_date": "2024-03-20",
    "duration": "5",
    "approver_name": "Manager Name",
    "approval_date": "2024-03-10",
    "remaining_balance": "25",
    "company_name": "My Company"
  }'::jsonb,
  p_priority := 5
);
```

### From Frontend
```typescript
// Example in a React component
const { data, error } = await supabase.rpc('queue_template_email', {
  p_company_id: companyId,
  p_template_key: 'leave_request_approved',
  p_to_email: employee.email,
  p_to_name: employee.full_name,
  p_variables: {
    employee_name: employee.full_name,
    leave_type: 'Annual Leave',
    // ... other variables
  }
});
```

## Best Practices

1. **Test First** - Use test emails before production
2. **Check Variables** - Ensure all required variables are provided
3. **Monitor Queue** - Watch for failed emails in dashboard
4. **Customize Gradually** - Start with defaults, customize as needed
5. **Backup Templates** - Keep copies before major changes
6. **Consistent Branding** - Maintain company brand across templates
7. **Mobile Testing** - Preview on mobile devices
8. **Plain Text** - Always provide plain text version

## Compliance Notes

- Templates include Saudi Labor Law references where applicable
- GOSI and compliance-specific messaging
- Document expiry alerts meet regulatory requirements
- Arabic RTL support ready (templates available in both languages)

## Support

For questions about email templates:
- Check template variables documentation
- Review preview before sending
- Test with small audience first
- Monitor email queue for delivery status

---

**Special Offices HRMS** - Professional Email Communication System
