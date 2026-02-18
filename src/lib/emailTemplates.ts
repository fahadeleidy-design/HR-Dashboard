export interface EmailTemplate {
  template_key: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  variables: string[];
  category: string;
  language: string;
}

export const emailTemplates: EmailTemplate[] = [
  {
    template_key: 'leave_request_submitted',
    name: 'Leave Request Submitted',
    subject: 'Leave Request Submitted - {{leave_type}}',
    body_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Special Offices HRMS</h1>
      <p>Leave Request Confirmation</p>
    </div>
    <div class="content">
      <h2>Hello {{employee_name}},</h2>
      <p>Your leave request has been successfully submitted and is now pending approval.</p>

      <div class="info-box">
        <strong>Leave Details:</strong><br>
        <strong>Type:</strong> {{leave_type}}<br>
        <strong>From:</strong> {{start_date}}<br>
        <strong>To:</strong> {{end_date}}<br>
        <strong>Duration:</strong> {{duration}} days<br>
        <strong>Request ID:</strong> {{request_id}}
      </div>

      <p>Your manager will review your request shortly. You will receive a notification once a decision is made.</p>

      <a href="{{system_url}}/leave" class="button">View Request Status</a>
    </div>
    <div class="footer">
      <p>&copy; {{company_name}} - Special Offices HRMS</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`,
    body_text: `Leave Request Submitted

Hello {{employee_name}},

Your leave request has been successfully submitted and is now pending approval.

Leave Details:
- Type: {{leave_type}}
- From: {{start_date}}
- To: {{end_date}}
- Duration: {{duration}} days
- Request ID: {{request_id}}

Your manager will review your request shortly.

View Status: {{system_url}}/leave

---
{{company_name}} - Special Offices HRMS`,
    variables: ['employee_name', 'leave_type', 'start_date', 'end_date', 'duration', 'request_id', 'company_name', 'system_url'],
    category: 'leave',
    language: 'en'
  },
  {
    template_key: 'leave_request_approved',
    name: 'Leave Request Approved',
    subject: '✓ Leave Request Approved - {{leave_type}}',
    body_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Request Approved</h1>
      <p>Special Offices HRMS</p>
    </div>
    <div class="content">
      <h2>Great News, {{employee_name}}!</h2>

      <div class="success-box">
        <strong>Your leave request has been approved by {{approver_name}}.</strong>
      </div>

      <div class="info-box">
        <strong>Approved Leave Details:</strong><br>
        <strong>Type:</strong> {{leave_type}}<br>
        <strong>From:</strong> {{start_date}}<br>
        <strong>To:</strong> {{end_date}}<br>
        <strong>Duration:</strong> {{duration}} days<br>
        <strong>Approved on:</strong> {{approval_date}}
      </div>

      <p><strong>Remaining Balance:</strong> {{remaining_balance}} days</p>

      <p>Your leave has been officially recorded in the system. Enjoy your time off!</p>
    </div>
    <div class="footer">
      <p>&copy; {{company_name}} - Special Offices HRMS</p>
    </div>
  </div>
</body>
</html>`,
    body_text: `Leave Request Approved

Great News, {{employee_name}}!

Your leave request has been approved by {{approver_name}}.

Approved Leave Details:
- Type: {{leave_type}}
- From: {{start_date}}
- To: {{end_date}}
- Duration: {{duration}} days
- Approved on: {{approval_date}}

Remaining Balance: {{remaining_balance}} days

Enjoy your time off!

---
{{company_name}} - Special Offices HRMS`,
    variables: ['employee_name', 'leave_type', 'start_date', 'end_date', 'duration', 'approver_name', 'approval_date', 'remaining_balance', 'company_name'],
    category: 'leave',
    language: 'en'
  },
  {
    template_key: 'leave_request_rejected',
    name: 'Leave Request Rejected',
    subject: 'Leave Request - Action Required',
    body_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .warning-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Leave Request Update</h1>
      <p>Special Offices HRMS</p>
    </div>
    <div class="content">
      <h2>Hello {{employee_name}},</h2>

      <div class="warning-box">
        <strong>Your leave request was not approved at this time.</strong>
      </div>

      <div class="info-box">
        <strong>Request Details:</strong><br>
        <strong>Type:</strong> {{leave_type}}<br>
        <strong>From:</strong> {{start_date}}<br>
        <strong>To:</strong> {{end_date}}<br>
        <strong>Duration:</strong> {{duration}} days
      </div>

      <p><strong>Reason:</strong><br>{{rejection_reason}}</p>

      <p>If you have questions about this decision, please contact {{approver_name}} or your HR department.</p>

      <a href="{{system_url}}/leave" class="button">Submit New Request</a>
    </div>
    <div class="footer">
      <p>&copy; {{company_name}} - Special Offices HRMS</p>
    </div>
  </div>
</body>
</html>`,
    body_text: `Leave Request Update

Hello {{employee_name}},

Your leave request was not approved at this time.

Request Details:
- Type: {{leave_type}}
- From: {{start_date}}
- To: {{end_date}}
- Duration: {{duration}} days

Reason: {{rejection_reason}}

For questions, please contact {{approver_name}} or HR.

---
{{company_name}} - Special Offices HRMS`,
    variables: ['employee_name', 'leave_type', 'start_date', 'end_date', 'duration', 'rejection_reason', 'approver_name', 'company_name', 'system_url'],
    category: 'leave',
    language: 'en'
  },
  {
    template_key: 'leave_pending_approval',
    name: 'Leave Pending Approval (Manager)',
    subject: 'Action Required: Leave Request from {{employee_name}}',
    body_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ Action Required</h1>
      <p>Special Offices HRMS</p>
    </div>
    <div class="content">
      <h2>Hello {{manager_name}},</h2>

      <div class="alert-box">
        <strong>A new leave request requires your approval</strong>
      </div>

      <div class="info-box">
        <strong>Employee:</strong> {{employee_name}}<br>
        <strong>Department:</strong> {{department}}<br>
        <strong>Leave Type:</strong> {{leave_type}}<br>
        <strong>From:</strong> {{start_date}}<br>
        <strong>To:</strong> {{end_date}}<br>
        <strong>Duration:</strong> {{duration}} days<br>
        <strong>Current Balance:</strong> {{current_balance}} days<br>
        <strong>Requested on:</strong> {{request_date}}
      </div>

      <p><strong>Reason:</strong><br>{{reason}}</p>

      <p>Please review and approve or reject this request at your earliest convenience.</p>

      <a href="{{system_url}}/pending-requests" class="button">Review Request</a>
    </div>
    <div class="footer">
      <p>&copy; {{company_name}} - Special Offices HRMS</p>
    </div>
  </div>
</body>
</html>`,
    body_text: `Action Required: Leave Request

Hello {{manager_name}},

A new leave request requires your approval.

Employee: {{employee_name}}
Department: {{department}}
Leave Type: {{leave_type}}
From: {{start_date}}
To: {{end_date}}
Duration: {{duration}} days
Current Balance: {{current_balance}} days

Reason: {{reason}}

Review at: {{system_url}}/pending-requests

---
{{company_name}} - Special Offices HRMS`,
    variables: ['manager_name', 'employee_name', 'department', 'leave_type', 'start_date', 'end_date', 'duration', 'current_balance', 'reason', 'request_date', 'company_name', 'system_url'],
    category: 'leave',
    language: 'en'
  },
  {
    template_key: 'payslip_ready',
    name: 'Payslip Ready',
    subject: 'Your Payslip for {{month}} {{year}} is Ready',
    body_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .salary-box { background: #ecfeff; border: 2px solid #06b6d4; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .amount { font-size: 32px; font-weight: bold; color: #0891b2; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Payslip Ready</h1>
      <p>Special Offices HRMS</p>
    </div>
    <div class="content">
      <h2>Hello {{employee_name}},</h2>

      <p>Your payslip for <strong>{{month}} {{year}}</strong> is now available for download.</p>

      <div class="salary-box">
        <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">Net Salary</div>
        <div class="amount">{{net_salary}} SAR</div>
      </div>

      <div class="info-box">
        <strong>Payment Summary:</strong><br>
        <strong>Basic Salary:</strong> {{basic_salary}} SAR<br>
        <strong>Allowances:</strong> {{allowances}} SAR<br>
        <strong>Deductions:</strong> {{deductions}} SAR<br>
        <strong>Payment Date:</strong> {{payment_date}}
      </div>

      <p>Your salary will be transferred to your bank account on the specified payment date.</p>

      <a href="{{system_url}}/payroll" class="button">Download Payslip</a>
    </div>
    <div class="footer">
      <p>&copy; {{company_name}} - Special Offices HRMS</p>
    </div>
  </div>
</body>
</html>`,
    body_text: `Payslip Ready - {{month}} {{year}}

Hello {{employee_name}},

Your payslip for {{month}} {{year}} is now available.

Payment Summary:
- Basic Salary: {{basic_salary}} SAR
- Allowances: {{allowances}} SAR
- Deductions: {{deductions}} SAR
- Net Salary: {{net_salary}} SAR
- Payment Date: {{payment_date}}

Download at: {{system_url}}/payroll

---
{{company_name}} - Special Offices HRMS`,
    variables: ['employee_name', 'month', 'year', 'basic_salary', 'allowances', 'deductions', 'net_salary', 'payment_date', 'company_name', 'system_url'],
    category: 'payroll',
    language: 'en'
  },
  {
    template_key: 'loan_request_approved',
    name: 'Loan Request Approved',
    subject: '✓ Loan Request Approved - {{amount}} SAR',
    body_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Loan Approved</h1>
      <p>Special Offices HRMS</p>
    </div>
    <div class="content">
      <h2>Hello {{employee_name}},</h2>

      <div class="success-box">
        <strong>Your loan request has been approved!</strong>
      </div>

      <div class="info-box">
        <strong>Loan Details:</strong><br>
        <strong>Amount:</strong> {{amount}} SAR<br>
        <strong>Monthly Deduction:</strong> {{monthly_deduction}} SAR<br>
        <strong>Number of Installments:</strong> {{installments}}<br>
        <strong>Start Date:</strong> {{start_date}}<br>
        <strong>End Date:</strong> {{end_date}}<br>
        <strong>Approved by:</strong> {{approver_name}}
      </div>

      <p>The loan amount will be disbursed with your next salary payment. Monthly deductions will begin from {{start_date}}.</p>

      <p><strong>Important:</strong> As per Saudi Labor Law, this loan is subject to your continued employment.</p>
    </div>
    <div class="footer">
      <p>&copy; {{company_name}} - Special Offices HRMS</p>
    </div>
  </div>
</body>
</html>`,
    body_text: `Loan Request Approved

Hello {{employee_name}},

Your loan request has been approved!

Loan Details:
- Amount: {{amount}} SAR
- Monthly Deduction: {{monthly_deduction}} SAR
- Installments: {{installments}}
- Start Date: {{start_date}}
- End Date: {{end_date}}

The amount will be disbursed with your next salary.

---
{{company_name}} - Special Offices HRMS`,
    variables: ['employee_name', 'amount', 'monthly_deduction', 'installments', 'start_date', 'end_date', 'approver_name', 'company_name'],
    category: 'payroll',
    language: 'en'
  },
  {
    template_key: 'document_expiry_alert',
    name: 'Document Expiry Alert',
    subject: '⚠️ Important: {{document_type}} Expiring Soon',
    body_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .alert-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Document Expiry Alert</h1>
      <p>Special Offices HRMS</p>
    </div>
    <div class="content">
      <h2>Hello {{employee_name}},</h2>

      <div class="alert-box">
        <strong>Action Required: Your {{document_type}} is expiring soon!</strong>
      </div>

      <div class="info-box">
        <strong>Document Details:</strong><br>
        <strong>Type:</strong> {{document_type}}<br>
        <strong>Document Number:</strong> {{document_number}}<br>
        <strong>Expiry Date:</strong> {{expiry_date}}<br>
        <strong>Days Remaining:</strong> {{days_remaining}} days
      </div>

      <p>Please renew your {{document_type}} immediately and submit the updated document to HR to ensure compliance with Saudi regulations.</p>

      <a href="{{system_url}}/documents" class="button">Upload Document</a>
    </div>
    <div class="footer">
      <p>&copy; {{company_name}} - Special Offices HRMS</p>
    </div>
  </div>
</body>
</html>`,
    body_text: `Document Expiry Alert

Hello {{employee_name}},

ACTION REQUIRED: Your {{document_type}} is expiring soon!

Document Details:
- Type: {{document_type}}
- Number: {{document_number}}
- Expiry Date: {{expiry_date}}
- Days Remaining: {{days_remaining}} days

Please renew immediately and upload to: {{system_url}}/documents

---
{{company_name}} - Special Offices HRMS`,
    variables: ['employee_name', 'document_type', 'document_number', 'expiry_date', 'days_remaining', 'company_name', 'system_url'],
    category: 'compliance',
    language: 'en'
  },
  {
    template_key: 'employee_welcome',
    name: 'Employee Welcome Email',
    subject: 'Welcome to {{company_name}} - Your Journey Starts Here!',
    body_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .welcome-box { background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome Aboard!</h1>
      <p>Special Offices HRMS</p>
    </div>
    <div class="content">
      <div class="welcome-box">
        <h2 style="color: #7c3aed; margin-top:0;">Welcome to {{company_name}}!</h2>
        <p style="font-size: 18px; margin-bottom:0;">We are excited to have you join our team</p>
      </div>

      <h2>Dear {{employee_name}},</h2>

      <p>Congratulations on joining {{company_name}} as <strong>{{job_title}}</strong>!</p>

      <div class="info-box">
        <strong>Your First Day Details:</strong><br>
        <strong>Start Date:</strong> {{start_date}}<br>
        <strong>Time:</strong> {{start_time}}<br>
        <strong>Location:</strong> {{office_location}}<br>
        <strong>Department:</strong> {{department}}<br>
        <strong>Manager:</strong> {{manager_name}}
      </div>

      <div class="info-box">
        <strong>Login Credentials:</strong><br>
        <strong>URL:</strong> {{system_url}}<br>
        <strong>Username:</strong> {{username}}<br>
        <strong>Temporary Password:</strong> {{temp_password}}<br>
        <em>(Change on first login)</em>
      </div>

      <a href="{{system_url}}" class="button">Access HRMS</a>

      <p>We look forward to seeing you soon!</p>

      <p>Best regards,<br>
      {{company_name}}</p>
    </div>
    <div class="footer">
      <p>&copy; {{company_name}} - Special Offices HRMS</p>
    </div>
  </div>
</body>
</html>`,
    body_text: `Welcome to {{company_name}}!

Dear {{employee_name}},

Congratulations on joining {{company_name}} as {{job_title}}!

First Day Details:
- Date: {{start_date}}
- Time: {{start_time}}
- Location: {{office_location}}
- Department: {{department}}
- Manager: {{manager_name}}

HRMS Access:
- URL: {{system_url}}
- Username: {{username}}
- Password: {{temp_password}}

Welcome aboard!

Best regards,
{{company_name}}

---
{{company_name}} - Special Offices HRMS`,
    variables: ['employee_name', 'job_title', 'start_date', 'start_time', 'office_location', 'department', 'manager_name', 'system_url', 'username', 'temp_password', 'company_name'],
    category: 'hr',
    language: 'en'
  },
  {
    template_key: 'password_reset',
    name: 'Password Reset',
    subject: 'Password Reset Request - Special Offices HRMS',
    body_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Password Reset</h1>
      <p>Special Offices HRMS</p>
    </div>
    <div class="content">
      <h2>Hello {{user_name}},</h2>

      <p>We received a request to reset your password. Click the button below to create a new password:</p>

      <a href="{{reset_link}}" class="button">Reset Password</a>

      <p>Or copy this link: {{reset_link}}</p>

      <div class="warning-box">
        <strong>Security Notice:</strong><br>
        - This link expires in {{expiry_hours}} hours<br>
        - If you didn't request this, ignore this email
      </div>
    </div>
    <div class="footer">
      <p>&copy; {{company_name}} - Special Offices HRMS</p>
    </div>
  </div>
</body>
</html>`,
    body_text: `Password Reset Request

Hello {{user_name}},

Reset your password here:
{{reset_link}}

This link expires in {{expiry_hours}} hours.

If you didn't request this, ignore this email.

---
{{company_name}} - Special Offices HRMS`,
    variables: ['user_name', 'reset_link', 'expiry_hours', 'company_name'],
    category: 'system',
    language: 'en'
  }
];
