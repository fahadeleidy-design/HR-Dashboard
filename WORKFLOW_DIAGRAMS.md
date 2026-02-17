# Workflow Diagrams

## Saudi HR Management System - Complete Workflow Documentation

**Document Version**: 1.0
**Last Updated**: February 17, 2026

---

## Table of Contents

1. [Workflow Engine Architecture](#workflow-engine-architecture)
2. [Leave Request Workflows](#leave-request-workflows)
3. [Expense Claim Workflows](#expense-claim-workflows)
4. [Loan and Advance Workflows](#loan-and-advance-workflows)
5. [Recruitment Workflows](#recruitment-workflows)
6. [Performance Review Workflows](#performance-review-workflows)
7. [Document Approval Workflows](#document-approval-workflows)
8. [Payroll Approval Workflows](#payroll-approval-workflows)
9. [Employee Lifecycle Workflows](#employee-lifecycle-workflows)
10. [Escalation and Delegation](#escalation-and-delegation)

---

## Workflow Engine Architecture

### Core Components

```
┌────────────────────────────────────────────────────────────────┐
│                    WORKFLOW TEMPLATE                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Template Configuration                                   │  │
│  │  - Name (EN/AR)                                          │  │
│  │  - Description                                           │  │
│  │  │  - Entity Type (leave_request, expense_claim, etc.)   │  │
│  │  - Trigger Conditions                                    │  │
│  │  - SLA Hours                                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  WORKFLOW STEPS (Sequential/Parallel)                    │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │  │
│  │  │   START    │→ │  APPROVAL  │→ │  CONDITION │→ ...   │  │
│  │  └────────────┘  └────────────┘  └────────────┘        │  │
│  │                                                          │  │
│  │  Each Step Contains:                                    │  │
│  │  - Step Type (start, approval, condition, etc.)        │  │
│  │  - Step Name                                            │  │
│  │  - Approval Type (if approval step)                    │  │
│  │  - Approver Assignment Rules                           │  │
│  │  - SLA Hours                                            │  │
│  │  - Escalation Rules                                     │  │
│  │  - Conditions (if conditional step)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  WORKFLOW CONNECTIONS                                     │  │
│  │  - From Step → To Step                                   │  │
│  │  - Condition-based routing                               │  │
│  │  - Parallel/Sequential flow control                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              ↓
                   WORKFLOW INSTANTIATION
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                    WORKFLOW INSTANCE                            │
│  - Instance ID                                                  │
│  - Entity Type + Entity ID                                     │
│  - Current Step                                                 │
│  - Status (pending, in_progress, approved, rejected, etc.)     │
│  - Started At / Completed At                                    │
│  - SLA Status (on_track, at_risk, breached)                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  WORKFLOW INSTANCE STEPS                                  │  │
│  │  - Step execution records                                 │  │
│  │  - Status per step                                        │  │
│  │  - Assignee per step                                      │  │
│  │  - Completed timestamp                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  WORKFLOW APPROVALS                                       │  │
│  │  - Approver ID                                            │  │
│  │  - Action (approved, rejected, returned)                 │  │
│  │  - Comments                                               │  │
│  │  - Timestamp                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Workflow Step Types

1. **Start Step**: Entry point of workflow
   - No approvers
   - Auto-transitions to next step
   - Records workflow initiation

2. **Approval Step**: Requires human approval
   - Approval Types:
     - `any_one`: Any single approver can approve
     - `all`: All approvers must approve (unanimous)
     - `majority`: >50% must approve
     - `sequential`: Approvers in order
     - `weighted`: Vote-based decision
   - Approver Assignment:
     - Specific user
     - Role (HR, Finance, Manager)
     - Department head
     - Direct manager
     - Manager chain (skip level)
     - Budget owner
     - Custom field mapping
     - External email

3. **Condition Step**: Branching logic
   - Evaluates conditions on entity fields
   - Operators: equals, not_equals, greater_than, less_than, contains, in, between
   - Multiple conditions with AND/OR
   - Routes to different steps based on result

4. **Parallel Step**: Split execution
   - Spawn multiple parallel paths
   - Each path executes independently

5. **Merge Step**: Join parallel paths
   - Waits for all parallel paths to complete
   - Continues to next step after merge

6. **Notification Step**: Send notifications
   - Email/SMS/In-app notifications
   - Template-based messaging
   - Multiple recipients

7. **Automation Step**: Execute automated actions
   - Call external APIs
   - Update database records
   - Trigger other workflows

8. **Delay Step**: Time-based waiting
   - Wait for specified duration
   - Scheduled execution

9. **End Step**: Workflow completion
   - Marks workflow as complete
   - Triggers post-completion actions

---

## Leave Request Workflows

### Workflow 1: Standard Leave Approval

**Entity Type**: `leave_request`
**Trigger**: Employee submits leave request
**Applies To**: Annual leave, Hajj leave, Emergency leave

```
┌─────────────────────────────────────────────────────────────┐
│  START                                                       │
│  - Trigger: Employee submits leave request                  │
│  - Input: Leave type, dates, reason                         │
│  - Validation: Balance check, overlap check                 │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  CONDITION: Leave Duration                                   │
│  - Field: total_days                                        │
│  - Operator: greater_than                                   │
│  - Value: 7                                                 │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
      ≤ 7 days               > 7 days
           ↓                      ↓
┌──────────────────┐    ┌─────────────────────────────────────┐
│  APPROVAL        │    │  APPROVAL (Parallel)                │
│  - Type: any_one │    │  Step 1: Direct Manager             │
│  - Approver:     │    │  - Type: sequential                 │
│    Direct Manager│    │  - Approver: Direct Manager         │
│  - SLA: 24 hours │    │  - SLA: 24 hours                    │
│  - Actions:      │    │                                     │
│    • Approve     │    │  Step 2: Department Head            │
│    • Reject      │    │  - Type: sequential                 │
│    • Return      │    │  - Approver: Department Head        │
└────────┬─────────┘    │  - SLA: 24 hours                    │
         │              │  - Escalation: After 48h → HR Mgr   │
         │              └──────────┬──────────────────────────┘
         │                         │
         └────────────┬────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  DECISION: Approved?                                         │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
       Approved                Rejected
           ↓                      ↓
┌──────────────────┐    ┌─────────────────────────────────────┐
│  AUTOMATION      │    │  NOTIFICATION                       │
│  - Deduct balance│    │  - Recipient: Employee              │
│  - Block calendar│    │  - Message: "Leave rejected"        │
│  - Create absence│    │  - Reason: Approver comment         │
└────────┬─────────┘    └──────────┬──────────────────────────┘
         ↓                         ↓
┌──────────────────┐         ┌──────────────────────────────┐
│  NOTIFICATION    │         │  END (Rejected)              │
│  - Employee      │         └──────────────────────────────┘
│  - HR Department │
│  - Manager       │
└────────┬─────────┘
         ↓
┌──────────────────┐
│  END (Approved)  │
└──────────────────┘
```

### Workflow 2: Sick Leave Approval

**Entity Type**: `leave_request`
**Trigger**: Employee submits sick leave
**Special Rules**: Medical certificate required > 3 days

```
┌─────────────────────────────────────────────────────────────┐
│  START                                                       │
│  - Trigger: Employee submits sick leave request             │
│  - Input: Dates, medical certificate (optional)             │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  CONDITION: Duration Check                                   │
│  - Field: total_days                                        │
│  - Operator: greater_than                                   │
│  - Value: 3                                                 │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
       ≤ 3 days               > 3 days
           ↓                      ↓
┌──────────────────┐    ┌─────────────────────────────────────┐
│  AUTO-APPROVAL   │    │  CONDITION: Medical Certificate?    │
│  - No approval   │    │  - Field: has_medical_certificate   │
│    required      │    │  - Operator: equals                 │
│  - Deduct balance│    │  - Value: true                      │
│  - Mark approved │    └────┬──────────────────┬─────────────┘
└────────┬─────────┘         ↓                  ↓
         │             Certificate         No Certificate
         │              Provided               ↓
         │                  ↓           ┌──────────────────┐
         │         ┌────────────────┐   │  NOTIFICATION    │
         │         │  APPROVAL      │   │  - Recipient:    │
         │         │  - Approver: HR│   │    Employee      │
         │         │  - Verify cert │   │  - Message:      │
         │         │  - SLA: 24h    │   │    "Please upload│
         │         └────────┬───────┘   │    medical cert" │
         │                  │           └───────┬──────────┘
         │                  │                   │
         │                  │                   ↓
         │                  │            ┌──────────────────┐
         │                  │            │  DELAY           │
         │                  │            │  - Wait 48 hours │
         │                  │            └──────┬───────────┘
         │                  │                   │
         │                  ↓                   ↓
         │         ┌────────────────────────────┐
         │         │  CONDITION: Cert Uploaded? │
         │         └────────┬───────────┬───────┘
         │                  ↓           ↓
         │               YES           NO
         │                  │           │
         │                  │           ↓
         │                  │    ┌──────────────────┐
         │                  │    │  AUTO-REJECT     │
         │                  │    │  - Reason:       │
         │                  │    │    "No medical   │
         │                  │    │    certificate"  │
         │                  │    └──────────────────┘
         │                  │
         └──────────────────┴──────────┐
                                       ↓
                            ┌──────────────────┐
                            │  END             │
                            └──────────────────┘
```

---

## Expense Claim Workflows

### Workflow 3: Amount-Based Expense Approval

**Entity Type**: `expense_claim`
**Trigger**: Employee submits expense claim
**Business Rule**: Approval levels based on amount

```
┌─────────────────────────────────────────────────────────────┐
│  START                                                       │
│  - Trigger: Employee submits expense claim                  │
│  - Input: Amount, category, receipts, description           │
│  - Validation: Receipt required for amount > 100 SAR        │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  CONDITION: Policy Compliance Check                          │
│  - Check expense category limits                            │
│  - Check receipt requirements                               │
│  - Check mileage rates (if applicable)                      │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
      Compliant              Non-Compliant
           ↓                      ↓
           │              ┌────────────────┐
           │              │  NOTIFICATION  │
           │              │  - Policy      │
           │              │    violation   │
           │              │  - Return to   │
           │              │    employee    │
           │              └────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│  CONDITION: Amount Threshold (Multi-level routing)           │
│  - Field: total_amount                                      │
└──────┬─────────────┬─────────────┬──────────────────────────┘
       ↓             ↓             ↓
   < 1000 SAR   1000-5000 SAR  > 5000 SAR
       ↓             ↓             ↓
┌──────────┐  ┌──────────────┐  ┌────────────────────────────┐
│ APPROVAL │  │  APPROVAL    │  │  APPROVAL (Parallel)       │
│ - Type:  │  │  - Type:     │  │  Step 1: Department Head   │
│   any_one│  │    sequential│  │  - Type: all               │
│ - Manager│  │  - Dept Head │  │  - SLA: 24 hours           │
│ - SLA:   │  │  - Finance   │  │                            │
│   24h    │  │    Manager   │  │  Step 2: Finance Director  │
└────┬─────┘  │  - SLA: 48h  │  │  - Type: all               │
     │        └──────┬───────┘  │  - SLA: 48 hours           │
     │               │          │                            │
     │               │          │  Step 3: HR Manager        │
     │               │          │  - Type: all               │
     │               │          │  - Reason: >5K review      │
     │               │          └────────────┬───────────────┘
     │               │                       │
     └───────────────┴───────────┬───────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────┐
│  DECISION: All Required Approvals Received?                  │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
       Approved                Rejected
           ↓                      ↓
┌──────────────────┐    ┌─────────────────────────────────────┐
│  AUTOMATION      │    │  NOTIFICATION                       │
│  - Create payment│    │  - Recipient: Employee              │
│  - Update finance│    │  - Message: Rejection reason        │
│  - Record in     │    └──────────┬──────────────────────────┘
│    accounting    │               ↓
└────────┬─────────┘         ┌──────────────────────────────┐
         ↓                   │  END (Rejected)              │
┌──────────────────┐         └──────────────────────────────┘
│  NOTIFICATION    │
│  - Employee:     │
│    "Approved for │
│    reimbursement"│
│  - Finance:      │
│    Process payment│
└────────┬─────────┘
         ↓
┌──────────────────┐
│  DELAY           │
│  - Wait for      │
│    payment       │
│    processing    │
│  - Typical: 3-5  │
│    business days │
└────────┬─────────┘
         ↓
┌──────────────────┐
│  NOTIFICATION    │
│  - Employee:     │
│    "Payment      │
│    processed"    │
│  - Amount: XXXX  │
│  - Date: XX/XX   │
└────────┬─────────┘
         ↓
┌──────────────────┐
│  END (Completed) │
└──────────────────┘
```

---

## Loan and Advance Workflows

### Workflow 4: Employee Loan Request

**Entity Type**: `loan`
**Trigger**: Employee requests loan
**Business Rules**:
- Maximum: 50% of End of Service Benefits (EOSB)
- Maximum: 6 months of basic salary
- Minimum service: 6 months
- Maximum repayment: 12 months

```
┌─────────────────────────────────────────────────────────────┐
│  START                                                       │
│  - Trigger: Employee requests loan                          │
│  - Input: Amount, installments, reason                      │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  VALIDATION: Eligibility Check                               │
│  1. Service period >= 6 months?                             │
│  2. No existing active loan?                                │
│  3. Good standing (no disciplinary issues)?                 │
│  4. Amount <= (6 × Basic Salary)?                           │
│  5. Amount <= (50% of EOSB)?                                │
│  6. Installments <= 12 months?                              │
│  7. Total obligations < 33% of salary?                      │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
        Eligible            Not Eligible
           ↓                      ↓
           │              ┌────────────────┐
           │              │  AUTO-REJECT   │
           │              │  - Show reason │
           │              │  - Advise steps│
           │              └────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│  AUTOMATION: Calculate Repayment                             │
│  - Monthly installment = Amount / Installments              │
│  - Interest (if applicable) = 0% (interest-free policy)     │
│  - Total repayment = Amount                                 │
│  - Display payment schedule to employee                      │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  APPROVAL: Direct Manager                                    │
│  - Approver: Direct Manager                                 │
│  - Type: any_one                                            │
│  - SLA: 48 hours                                            │
│  - Decision: Approve based on performance & attendance      │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
       Approved                Rejected
           ↓                      ↓
           │              ┌────────────────┐
           │              │  NOTIFICATION  │
           │              │  - Employee    │
           │              │  - Reason shown│
           │              └────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│  APPROVAL: HR Manager                                        │
│  - Approver: HR Manager                                     │
│  - Type: any_one                                            │
│  - SLA: 48 hours                                            │
│  - Review: Employment history, loan history                 │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
       Approved                Rejected
           ↓                      ↓
           │              └────────────────┐
           ↓                               ↓
┌─────────────────────────────────────────────────────────────┐
│  CONDITION: Amount Threshold                                 │
│  - Field: amount                                            │
│  - Operator: greater_than                                   │
│  - Value: 10000                                             │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
      ≤ 10000 SAR            > 10000 SAR
           ↓                      ↓
           │              ┌────────────────────────────────────┐
           │              │  APPROVAL: Finance Director        │
           │              │  - Approver: Finance Director      │
           │              │  - Type: any_one                   │
           │              │  - SLA: 72 hours                   │
           │              │  - Review: Budget impact           │
           │              └─────────┬──────────────────────────┘
           │                        ↓
           └────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  AUTOMATION: Process Loan                                    │
│  1. Create loan record (status: approved)                   │
│  2. Schedule disbursement                                   │
│  3. Create repayment schedule                               │
│  4. Link to payroll for automatic deduction                 │
│  5. Update employee obligations                             │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  NOTIFICATION: Approval                                      │
│  - Employee: "Loan approved. Disbursement in 3-5 days."     │
│  - Finance: "Prepare disbursement"                          │
│  - Payroll: "Add deduction starting next cycle"             │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  DELAY: Disbursement Processing                              │
│  - Wait: 3-5 business days                                  │
│  - Finance prepares bank transfer                           │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  AUTOMATION: Disburse Loan                                   │
│  - Create disbursement record                               │
│  - Update loan status: active                               │
│  - Mark first installment date                              │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  NOTIFICATION: Disbursement Completed                        │
│  - Employee: "Loan amount transferred to your account"      │
│  - Amount: XXXXX SAR                                        │
│  - First deduction: Next payroll (XX/XX/2026)               │
│  - Monthly installment: XXXX SAR                            │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  END: Loan Active                                            │
│  - Monthly deductions start automatically                   │
│  - Employee can view balance in portal                      │
│  - Early repayment allowed                                  │
└─────────────────────────────────────────────────────────────┘
```

### Workflow 5: Salary Advance Request

**Entity Type**: `advance`
**Trigger**: Employee requests advance
**Business Rules**:
- Maximum: 1 month's basic salary
- Maximum: 1 advance per year
- Minimum service: 3 months
- Repayment: 1-3 months

```
┌─────────────────────────────────────────────────────────────┐
│  START                                                       │
│  - Trigger: Employee requests advance                       │
│  - Input: Amount (max: 1 month salary)                      │
│  - Reason: Required field                                   │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  VALIDATION: Quick Eligibility                               │
│  1. Service period >= 3 months?                             │
│  2. No advance in last 12 months?                           │
│  3. Amount <= Basic Salary?                                 │
│  4. No active loan or advance?                              │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
        Eligible            Not Eligible
           ↓                      ↓
           │              ┌────────────────┐
           │              │  AUTO-REJECT   │
           │              │  - Eligibility │
           │              │    criteria    │
           │              └────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│  APPROVAL: Manager (Fast-track)                              │
│  - Approver: Direct Manager                                 │
│  - Type: any_one                                            │
│  - SLA: 24 hours (urgent)                                   │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
       Approved                Rejected
           ↓                      │
           ↓                      │
┌─────────────────────────────────────────────────────────────┐
│  APPROVAL: Finance                                           │
│  - Approver: Finance Staff                                  │
│  - Type: any_one                                            │
│  - SLA: 24 hours                                            │
│  - Auto-approve if amount < 5000 SAR                        │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
       Approved                Rejected
           ↓                      │
           └──────────────────────┴────────────┐
                                               ↓
                                    ┌──────────────────────┐
                                    │  NOTIFICATION        │
                                    │  - Employee: Rejected│
                                    └──────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│  AUTOMATION: Process Advance                                 │
│  - Create advance record                                    │
│  - Schedule immediate disbursement                          │
│  - Repayment: Deduct from next payroll (full amount)        │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  NOTIFICATION                                                │
│  - Employee: "Advance approved. Transfer within 24 hours."  │
│  - Finance: "Process urgent payment"                        │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  DELAY: Same-day processing                                  │
│  - Wait: Up to 24 hours                                     │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  NOTIFICATION: Payment Completed                             │
│  - Employee: "Advance paid. Will deduct from next salary."  │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  END: Advance Active                                         │
│  - Full deduction on next payroll                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Recruitment Workflows

### Workflow 6: Job Requisition Approval

**Entity Type**: `job_requisition`
**Trigger**: Manager creates job requisition
**Process**: Budget approval → Recruitment start

```
┌─────────────────────────────────────────────────────────────┐
│  START                                                       │
│  - Trigger: Manager creates job requisition                 │
│  - Input: Position, department, salary range, headcount     │
│  - Justification: Required field                            │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  VALIDATION                                                  │
│  - Position exists in job architecture?                     │
│  - Salary range within band?                                │
│  - Budget code valid?                                       │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  APPROVAL: Department Head                                   │
│  - Approver: Department Head                                │
│  - Type: any_one                                            │
│  - Review: Business need, workload justification            │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
       Approved                Rejected
           ↓                      │
           ↓                      └──────────────┐
┌─────────────────────────────────────────────────────────────┐
│  APPROVAL: HR Manager                                        │
│  - Approver: HR Manager                                     │
│  - Type: any_one                                            │
│  - Review: Position availability, market competitiveness    │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
       Approved                Rejected
           ↓                      │
           ↓                      └──────────────┐
┌─────────────────────────────────────────────────────────────┐
│  APPROVAL: Finance                                           │
│  - Approver: Finance Manager                                │
│  - Type: any_one                                            │
│  - Review: Budget availability                              │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
       Approved                Rejected
           ↓                      │
           │                      └──────────────┐
           ↓                                     ↓
┌─────────────────────────────────────────────────────────────┐
│  AUTOMATION: Activate Requisition                            │
│  - Status: open                                             │
│  - Create job posting                                       │
│  - Assign recruiter                                         │
│  - Post to job boards (if configured)                       │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  NOTIFICATION                                                │
│  - Recruiter: Start sourcing candidates                     │
│  - Manager: Requisition approved                            │
│  - Department: New opening announced                        │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  END: Recruitment Process Starts                             │
│  - Candidate sourcing begins                                │
│  - Interview process configured                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Escalation and Delegation

### Escalation Mechanism

**Trigger**: SLA breach or no action within defined timeframe

```
┌─────────────────────────────────────────────────────────────┐
│  APPROVAL STEP ACTIVE                                        │
│  - Assigned to: Manager A                                   │
│  - SLA: 48 hours                                            │
│  - Escalation: After 36 hours                               │
└────────────────────┬────────────────────────────────────────┘
                     ↓
              Time progresses...
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  CONDITION: 24 hours elapsed                                 │
│  - No action taken                                          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  NOTIFICATION: First Reminder                                │
│  - Recipient: Manager A                                     │
│  - Message: "Pending approval reminder"                     │
│  - Priority: Normal                                         │
└────────────────────┬────────────────────────────────────────┘
                     ↓
              Time progresses...
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  CONDITION: 36 hours elapsed (Escalation trigger)            │
│  - Still no action                                          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  ESCALATION TRIGGERED                                        │
│  - Create escalation record                                 │
│  - Reason: SLA at risk                                      │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  NOTIFICATION: Escalation                                    │
│  - Recipient 1: Manager A (urgent reminder)                 │
│  - Recipient 2: Department Head (escalation target)         │
│  - Recipient 3: HR Manager (for awareness)                  │
│  - Message: "Approval overdue - escalated"                  │
│  - Priority: High                                           │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  PARALLEL ASSIGNMENT                                         │
│  - Original approver: Manager A (still active)              │
│  - Escalation approver: Department Head (can also approve)  │
│  - First to act completes the step                          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
              Time progresses...
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  CONDITION: 48 hours elapsed (SLA breach)                    │
│  - Still no action                                          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  SLA BREACHED                                                │
│  - Mark instance as "SLA breached"                          │
│  - Update metrics                                           │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  DECISION: Auto-approval enabled?                            │
└──────────┬──────────────────────┬───────────────────────────┘
           ↓                      ↓
         YES                     NO
           ↓                      ↓
┌──────────────────┐    ┌─────────────────────────────────────┐
│  AUTO-APPROVE    │    │  FINAL ESCALATION                   │
│  - After 72 hours│    │  - Escalate to HR Director          │
│  - Automatic     │    │  - Manual intervention required     │
│    approval      │    │  - Investigate blocker              │
└──────────────────┘    └─────────────────────────────────────┘
```

### Delegation Workflow

**Use Case**: Manager delegates approval authority during absence

```
┌─────────────────────────────────────────────────────────────┐
│  Manager Sets Up Delegation                                  │
│  - From: Manager A                                          │
│  - To: Manager B                                            │
│  - Start Date: 2026-03-01                                   │
│  - End Date: 2026-03-15                                     │
│  - Scope: All workflows (or specific types)                │
│  - Permissions: Approve, Reject, Return                     │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  System Activates Delegation                                 │
│  - Status: active                                           │
│  - Effective from: 2026-03-01 00:00:00                      │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  New Approval Arrives (within delegation period)             │
│  - Original assignee: Manager A                             │
│  - Delegation active: YES                                   │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  System Routes to Delegate                                   │
│  - Assigned to: Manager B                                   │
│  - Note: "Acting on behalf of Manager A"                    │
│  - Delegation ID: Referenced                                │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Manager B Reviews and Approves                              │
│  - Action: Approved                                         │
│  - Comment: "Approved as delegated approver"                │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  System Records Approval                                     │
│  - Approver: Manager B                                      │
│  - On behalf of: Manager A                                  │
│  - Delegation: Referenced in audit trail                    │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Notifications                                               │
│  - Employee: "Approved by Manager B (on behalf of Manager A)"│
│  - Manager A: CC notification (for awareness)               │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Delegation Period Ends                                      │
│  - Date: 2026-03-15 23:59:59                                │
│  - System deactivates delegation                            │
│  - Future approvals route to Manager A again                │
└─────────────────────────────────────────────────────────────┘
```

---

This completes the workflow diagrams documentation. All workflows follow the same structural patterns with variations based on business rules and approval requirements.
