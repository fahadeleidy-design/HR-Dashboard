# Troubleshooting and FAQ Guide

## Saudi HR Management System - Common Issues and Solutions

**Version**: 1.0
**Last Updated**: February 17, 2026
**For**: All users and support staff

---

## Table of Contents

1. [Login and Access Issues](#login-and-access-issues)
2. [Leave Management Issues](#leave-management-issues)
3. [Payroll and Compensation Issues](#payroll-and-compensation-issues)
4. [Expense Claim Issues](#expense-claim-issues)
5. [Attendance Issues](#attendance-issues)
6. [Performance and Display Issues](#performance-and-display-issues)
7. [Document and Upload Issues](#document-and-upload-issues)
8. [Approval Workflow Issues](#approval-workflow-issues)
9. [General Questions (FAQ)](#general-questions-faq)
10. [Contact Support](#contact-support)

---

## Chapter 1: Login and Access Issues

### Issue 1.1: Cannot Log In - Invalid Credentials

**Symptoms:**
- Error message: "Invalid username or password"
- Cannot access system despite entering credentials

**Possible Causes:**
- Incorrect username or password
- Caps Lock enabled
- Account not yet activated
- Account locked or disabled

**Solutions:**

**Solution A: Verify Username**
1. Check your welcome email from HR
2. Username is usually:
   - Your work email (ahmed.ali@company.com)
   - OR your employee number (EMP-12345)
3. Do NOT use your personal email
4. Try both options if unsure

**Solution B: Check Password**
1. Ensure Caps Lock is OFF
2. Check for extra spaces (before/after password)
3. Passwords are case-sensitive: `Password123` ≠ `password123`
4. Try typing password in Notepad first, then copy-paste

**Solution C: Reset Password**
1. Click **"Forgot Password?"** on login page
2. Enter your email address
3. Check email for reset link (check spam folder)
4. Link expires in 1 hour
5. Click link and create new password
6. Must meet requirements:
   - At least 8 characters
   - One uppercase letter
   - One lowercase letter
   - One number
   - One special character (!@#$%...)

**Solution D: Account Locked**
- After 5 failed login attempts, account locks for 30 minutes
- Wait 30 minutes and try again
- OR contact IT Helpdesk to unlock immediately

**Solution E: New Employee**
- Account activation may take 24-48 hours after hire date
- Contact HR if more than 48 hours have passed

**Still Not Working?**
Contact IT Helpdesk with:
- Your employee number
- Full name
- Department
- When you last successfully logged in (if ever)

---

### Issue 1.2: Password Reset Email Not Received

**Symptoms:**
- Clicked "Forgot Password" but no email received
- Cannot reset password

**Solutions:**

**Solution A: Check Spam/Junk Folder**
1. Open your email client
2. Check Spam, Junk, or Promotions folder
3. Look for email from: noreply@yourcompany-hr.app
4. Mark as "Not Spam" if found

**Solution B: Wait 10 Minutes**
- Email delivery can take 5-10 minutes
- Refresh your inbox

**Solution C: Verify Email Address**
- Ensure you entered the correct work email
- Use the email registered in HR system
- Try again with correct email

**Solution D: Check Email Server**
- Your company email might be down
- Try accessing other emails
- Contact IT if email service is down

**Solution E: Whitelist System Emails**
1. Add noreply@yourcompany-hr.app to your contacts
2. Add @yourcompany-hr.app domain to safe senders
3. Request IT to whitelist if corporate firewall blocks

**Solution F: Alternative Method**
- Contact IT Helpdesk directly
- They can reset password manually
- Provide: Employee number, government ID for verification

---

### Issue 1.3: Session Expired / Logged Out Automatically

**Symptoms:**
- Suddenly logged out while working
- Message: "Your session has expired"
- Need to log in again

**Cause:**
- Sessions expire after 8 hours of inactivity for security
- Or after 24 hours total (even if active)

**Solutions:**

**Solution A: Log In Again**
- Simply log in again with your credentials
- Your work is usually saved automatically

**Solution B: Save Work Frequently**
- Click "Save Draft" on forms before taking breaks
- System auto-saves every 5 minutes on most forms

**Solution C: Increase Session Duration**
- Check "Remember me" on login (extends to 7 days)
- ⚠️ Only on personal devices (not shared computers)

**Solution D: Keep Tab Active**
- Browser tabs in background may lose connection
- Keep HR system tab active/visible
- Or refresh page every few hours

**Prevent Future Issues:**
- Save work frequently
- Don't leave forms open for hours without saving
- Log out properly when done (don't just close browser)

---

### Issue 1.4: "Access Denied" or Permission Errors

**Symptoms:**
- Error: "You don't have permission to access this page"
- Error: "Access denied"
- Missing menu items or features

**Causes:**
- Insufficient user permissions
- Role not assigned correctly
- Feature restricted to certain roles

**Solutions:**

**Solution A: Verify Your Role**
1. Click profile icon (top-right)
2. View "My Role" or "Permissions"
3. Confirm your role matches your job:
   - Employee
   - Manager
   - HR Staff
   - Finance
   - Admin

**Solution B: Check Module Access**
- Some modules are role-restricted:
  - Payroll Processing: Finance only
  - Employee Management: HR/Admin only
  - Compliance: HR/Admin only
  - Team Reports: Managers only

**Solution C: Request Access**
1. Contact your manager or HR
2. Explain which feature you need access to
3. Provide business justification
4. HR/Admin will update your permissions

**Solution D: Company Policy**
- Some features may be restricted by company policy
- Example: Only senior managers can approve expenses > 5000 SAR
- Verify with HR if this is policy-based restriction

**Solution E: Temporary Access Issue**
- Log out completely
- Clear browser cache (Ctrl+Shift+Delete)
- Log in again
- Permissions refresh on new login

---

## Chapter 2: Leave Management Issues

### Issue 2.1: "Insufficient Leave Balance" Error

**Symptoms:**
- Cannot submit leave request
- Error: "You don't have enough leave balance"
- Request days exceed available days

**Causes:**
- Requested more days than available
- Leave hasn't accrued yet (new employees)
- Pending requests have reserved balance

**Solutions:**

**Solution A: Check Available Balance**
1. Go to: Leave → My Balances
2. View "Available" column (not "Entitled")
3. Available = Entitled - Used - Pending

Example:
```
Annual Leave:
Entitled: 21 days
Used: 10 days
Pending: 3 days (reserved by pending request)
Available: 8 days ← This is what you can request
```

**Solution B: Reduce Requested Days**
- Request fewer days
- Split request into multiple requests across months
- Wait for pending requests to be approved/rejected (releases reserved balance)

**Solution C: Wait for Accrual (New Employees)**
- Leave accrues monthly: 1.75 days/month for annual leave
- Formula: (Service months × 1.75)
- Example: After 3 months = 5.25 days available
- Wait for next month if insufficient

**Solution D: Cancel Pending Requests**
1. Go to: Leave → My Requests
2. Find pending requests
3. Cancel ones you don't need
4. Balance is released immediately
5. Resubmit new request

**Solution E: Different Leave Type**
- Use different leave type if available
- Example: Use sick leave instead of annual leave
- Or unpaid leave (requires manager approval)

**Solution F: Balance Error**
- If balance seems incorrect, check with HR
- Provide: Employee number, leave type, expected balance
- HR will investigate and correct if error

---

### Issue 2.2: Leave Request Showing Wrong Number of Days

**Symptoms:**
- System calculates different number of days than expected
- Calculation includes/excludes days unexpectedly

**Explanation:**
System automatically excludes:
- Weekends (Friday-Saturday in Saudi Arabia)
- Public holidays
- Days you're already on approved leave

**Example:**
```
Request: March 15-22 (8 calendar days)
System Calculation:
- March 15 (Sun): ✓ Counted
- March 16 (Mon): ✓ Counted
- March 17 (Tue): ✓ Counted
- March 18 (Wed): ✓ Counted
- March 19 (Thu): ✓ Counted
- March 20 (Fri): ✗ Weekend (not counted)
- March 21 (Sat): ✗ Weekend (not counted)
- March 22 (Sun): ✓ Counted
Total Working Days: 6 days
```

**Solutions:**

**Solution A: Verify Calculation**
1. Count only working days (Sun-Thu)
2. Exclude Fridays and Saturdays
3. Check company calendar for public holidays

**Solution B: Extend End Date**
- If you need more working days
- Add weekend days to get desired working days
- Example: Want 10 working days? Add 2 weeks + 2 days

**Solution C: Check Public Holidays**
- System knows public holidays
- Go to: Company Calendar or Settings
- View public holiday list
- These are automatically excluded

**Solution D: Half-Day Option**
- Check "Half Day" box for partial days
- First or second half of day
- Counts as 0.5 days

---

### Issue 2.3: Cannot Cancel Approved Leave

**Symptoms:**
- Leave approved but need to cancel
- Cancel button disabled or missing
- Error when trying to cancel

**Causes:**
- Leave start date passed (already started)
- Company policy restricts cancellation
- Requires manager approval to cancel

**Solutions:**

**Solution A: Before Leave Starts**
1. Go to: Leave → My Requests
2. Find approved request
3. Click "Cancel Request"
4. Provide reason
5. Submit cancellation (may need approval)

**Solution B: Leave Already Started**
- Cannot cancel through system
- Must contact manager directly
- Manager may be able to cancel remaining days
- HR can adjust records manually

**Solution C: Emergency Cancellation**
1. Email manager immediately
2. Explain urgent situation
3. Manager contacts HR
4. HR makes manual adjustment

**Solution D: Partial Cancellation**
- Cancel remaining days only
- Example: 5-day leave, cancel last 2 days
- Return to work early
- Inform manager and HR

**Solution E: Company Policy**
- Some companies don't allow cancellation within X days of start
- Check leave policy
- May need CEO/HR Director approval

**Workaround:**
- Still go on leave as approved
- Request new leave for future dates
- HR adjusts balance retroactively if needed

---

## Chapter 3: Payroll and Compensation Issues

### Issue 3.1: Payslip Not Available

**Symptoms:**
- Expected payslip not showing
- "No payslips found" message
- Missing for specific month

**Causes:**
- Payroll not yet processed
- Too early in month
- Employment status issue
- System error

**Solutions:**

**Solution A: Check Payroll Date**
- Payslips typically available on 27th of month
- For February salary, check on Feb 27
- May be delayed 1-2 days for bank holidays

**Solution B: Verify Employment Status**
1. Ensure you were employed during that month
2. New hires: First payslip next month after hire
3. Terminated employees: Final payslip within 10 days

**Solution C: Check with Finance**
- If past expected date and still missing
- Email: finance@company.com
- Provide: Employee number, missing month
- They'll investigate

**Solution D: Browser Cache**
1. Clear browser cache:
   - Chrome: Ctrl+Shift+Delete
   - Select "Cached images and files"
   - Clear data
2. Refresh page (F5)
3. Log out and log in again

**Solution E: Payroll Batch Delayed**
- Company-wide issue if nobody has payslips
- Check for announcements
- Finance will notify if delayed

---

### Issue 3.2: Wrong Salary Amount in Payslip

**Symptoms:**
- Net salary different than expected
- Deductions seem incorrect
- Missing allowances or bonuses

**Common Causes and Checks:**

**Check A: Absence Deductions**
- Were you absent any days?
- Formula: (Daily rate × Absent days)
- Daily rate = Gross Salary / 30

**Check B: Late/Early Leave Deductions**
- Check attendance penalties
- Review attendance records
- Late > 30 minutes may trigger deduction

**Check C: Loan/Advance Deductions**
- Do you have active loan or advance?
- Check: Loans/Advances module
- Monthly installment deducted automatically

**Check D: GOSI Deduction**
- 10% of (Basic + Housing + Transportation)
- Maximum base: 45,000 SAR
- Example:
  ```
  Basic: 8,000 SAR
  Housing: 4,000 SAR
  Transport: 1,000 SAR
  Total: 13,000 SAR
  GOSI: 13,000 × 10% = 1,300 SAR
  ```

**Check E: Pro-Rated Salary**
- Did you join mid-month?
- Salary calculated: (Monthly salary / 30) × Days worked
- Example: Joined on 15th = 15 days = 50% of monthly salary

**Check F: Unpaid Leave**
- Unpaid leave days deducted
- Formula: (Daily rate × Unpaid leave days)

**Solutions:**

**Solution 1: Review Payslip Breakdown**
- Open payslip detail view
- Check each component:
  - Earnings: Basic, allowances, overtime, bonuses
  - Deductions: GOSI, loans, absences, other
- Compare with previous months

**Solution 2: Check Attendance Impact**
1. Go to: Attendance → My Records
2. Select payroll month
3. Count absence/late days
4. Verify calculation

**Solution 3: Verify with Contract**
- Check your employment contract
- Confirm salary components
- Ensure all allowances included

**Solution 4: Request Salary Statement**
1. Go to: Payroll → Documents
2. Request detailed salary statement
3. Shows all components and calculations

**Solution 5: Contact Finance**
If discrepancy confirmed:
1. Email: finance@company.com
2. Subject: "Payslip Discrepancy - [Month] [Your Name]"
3. Attach:
   - Current payslip
   - Previous payslip (for comparison)
   - Calculation showing error
4. Finance will investigate and issue correction

---

### Issue 3.3: Cannot Download Payslip PDF

**Symptoms:**
- Download button not working
- PDF file corrupted or won't open
- Blank PDF

**Solutions:**

**Solution A: Check Browser Pop-up Blocker**
1. Look for blocked pop-up notification
2. Click "Always allow pop-ups from this site"
3. Try download again

**Solution B: Try Different Browser**
- Chrome (recommended)
- Firefox
- Safari
- Edge

**Solution C: Clear Browser Cache**
1. Ctrl+Shift+Delete (Windows) / Cmd+Shift+Delete (Mac)
2. Clear cached images and files
3. Restart browser
4. Try again

**Solution D: Check PDF Reader**
- Ensure Adobe Reader or PDF viewer installed
- Update to latest version
- Try opening in browser instead of downloading

**Solution E: Alternative: Print to PDF**
1. View payslip in browser
2. Click Print button or Ctrl+P
3. Select "Save as PDF" as printer
4. Save to your device

**Solution F: Request from Finance**
- Email finance@company.com
- Request payslip PDF via email
- They'll send directly to your email

---

## Chapter 4: Expense Claim Issues

### Issue 4.1: Expense Claim Rejected

**Symptoms:**
- Claim status shows "Rejected"
- Not receiving reimbursement

**Common Rejection Reasons:**

**Reason A: Missing Receipt**
- **Required**: Receipt for all expenses > 100 SAR
- **Solution**: Re-submit with receipt attached

**Reason B: Exceeds Policy Limit**
- Example: Meals policy limit: 150 SAR/day
- Your claim: 200 SAR
- **Solution**:
  - Split between two days if multi-day
  - Remove excess amount
  - Get approval for policy exception (rare)

**Reason C: Ineligible Expense Category**
- Personal expenses not reimbursable
- **Check policy** for eligible categories
- **Solution**: Remove ineligible items

**Reason D: Unclear Description**
- "Various expenses" not acceptable
- Must specify what was purchased
- **Solution**: Provide detailed description

**Reason E: Duplicate Claim**
- Same expense submitted twice
- **Solution**: Check for duplicates before resubmitting

**Reason F: Expense Too Old**
- Policy: Submit within 30 days of expense
- **Solution**: Request exception from manager (may be denied)

**Steps to Resolve:**

1. **View Rejection Reason**
   - Open claim details
   - Read manager's rejection comments

2. **Correct the Issue**
   - Address reason given
   - Add missing information
   - Remove problem items

3. **Resubmit**
   - Create new claim (don't edit rejected one)
   - Attach corrected information
   - Reference previous claim number in description

4. **Contact Manager**
   - If rejection reason unclear
   - Discuss before resubmitting
   - Get clarity on policy

---

### Issue 4.2: Receipt Upload Failing

**Symptoms:**
- Cannot upload receipt image/PDF
- Upload fails or hangs
- Error message

**Causes:**
- File size too large
- Unsupported file format
- Internet connection issue
- Browser compatibility

**Solutions:**

**Solution A: Check File Size**
- Maximum: 5 MB per file
- **Reduce size**:
  - Compress image (use online tool)
  - Reduce image quality/resolution
  - Convert to PDF (often smaller)

**Solution B: Verify File Format**
- **Supported**: PDF, JPG, JPEG, PNG
- **Not supported**: TIFF, BMP, HEIC, others
- **Convert** unsupported formats:
  - Windows: Paint → Save as JPG
  - Mac: Preview → Export as JPG
  - Online: CloudConvert.com

**Solution C: Check Internet Connection**
- Ensure stable connection
- Avoid uploading on poor WiFi
- Try wired connection if available

**Solution D: Try Different Browser**
- Chrome (recommended)
- Firefox
- Safari

**Solution E: Mobile Upload**
- Use mobile phone camera
- Take photo of receipt
- Upload from phone
- Often easier than scanning

**Solution F: Rename File**
- Remove special characters from filename
- Use: letters, numbers, underscores only
- Example: `taxi_receipt_march15.pdf`
- Avoid: `Taxi Receipt (15/3/2026) #1.pdf`

**Solution G: Email Receipts**
- If upload persistently fails
- Email receipts to: receipts@company.com
- Reference your claim number in subject
- Finance will attach manually

---

## Chapter 5: Attendance Issues

### Issue 5.1: Forgot to Check In/Out

**Symptoms:**
- Didn't check in when arrived
- Forgot to check out when left
- Attendance record shows absent or incomplete

**Solutions:**

**Solution A: Same Day Correction**
- If you realize same day:
1. Check in/out now
2. Contact manager immediately
3. Manager can adjust times if within reason

**Solution B: Request Attendance Correction**
1. Go to: Attendance → Request Correction
2. Fill form:
   - Date
   - Correct check-in time
   - Correct check-out time
   - Reason for missed check-in/out
3. Submit to manager for approval

```
[Example Correction Request]
Date: March 17, 2026
Issue: Missed check-in
Correct Check-In Time: 08:00 AM
Correct Check-Out Time: 05:00 PM
Reason: "System was down this morning. I arrived at usual time (8 AM) but could not check in. My meeting calendar and badge access log can verify my presence."
```

**Solution C: Provide Proof**
- Attach supporting evidence:
  - Meeting invitations (shows you were in office)
  - Email timestamps
  - Badge access logs (from security)
  - Colleague confirmation

**Solution D: Recurring Issue**
- If system frequently fails:
  - Report to IT: support@company.com
  - They'll investigate technical issue
  - May provide alternative check-in method

**Prevention:**
- Set phone reminder for check-in/out
- Use mobile app (more reliable)
- Check-in immediately upon arrival
- Check-out before leaving desk

---

### Issue 5.2: Attendance Shows Wrong Time

**Symptoms:**
- Check-in/out time incorrect
- Shows late when actually on time
- Time doesn't match actual

**Causes:**
- Device clock wrong
- Timezone issue
- System sync problem
- Network delay

**Solutions:**

**Solution A: Check Device Clock**
1. Verify your device time is correct
2. Set to automatic time sync
3. Ensure correct timezone (AST - Arabia Standard Time)

**Solution B: Request Time Correction**
1. Go to: Attendance → Request Correction
2. Specify correct time
3. Provide reason: "System recorded wrong time"
4. Submit to manager

**Solution C: Use Official Time**
- Always use company-provided time sources
- Not personal phone time (may be off)
- Check wall clocks or official company time

**Solution D: Report Persistent Issue**
- If happens repeatedly:
- Email IT: support@company.com
- Subject: "Attendance time sync issue"
- Include: Your device type, location

---

## Chapter 6: Performance and Display Issues

### Issue 6.1: System Running Slow

**Symptoms:**
- Pages take long to load
- Actions delayed
- Frequent freezing

**Solutions:**

**Solution A: Check Internet Speed**
- Run speed test: speedtest.net
- Minimum required: 1 Mbps
- If slow: Contact IT or ISP

**Solution B: Close Other Tabs/Programs**
- Close unused browser tabs
- Close other programs using internet
- Restart browser

**Solution C: Clear Browser Cache**
1. Ctrl+Shift+Delete (Windows) / Cmd+Shift+Delete (Mac)
2. Select:
   - Cached images and files
   - Cookies
3. Time range: Last 7 days
4. Clear data
5. Restart browser

**Solution D: Update Browser**
- Ensure latest browser version
- Chrome: chrome://settings/help
- Firefox: about:support
- Update if available

**Solution E: Try Incognito/Private Mode**
- Ctrl+Shift+N (Chrome) / Cmd+Shift+N (Safari)
- If faster in incognito: Extension conflict
- Disable extensions one by one to find culprit

**Solution F: Check System Status**
- Company-wide slowness?
- Ask colleagues if they're experiencing same
- Check for system maintenance announcement
- Contact IT if widespread issue

---

### Issue 6.2: Page Not Displaying Correctly

**Symptoms:**
- Missing buttons or fields
- Layout broken
- Text overlapping
- Arabic text displaying wrong (if RTL issue)

**Solutions:**

**Solution A: Refresh Page**
- Press F5 or Ctrl+R
- Or click browser refresh button

**Solution B: Hard Refresh**
- Ctrl+Shift+R (Windows)
- Cmd+Shift+R (Mac)
- Forces reload of all assets

**Solution C: Clear Cache**
1. Ctrl+Shift+Delete
2. Clear cached images and files
3. Restart browser

**Solution D: Check Zoom Level**
- Press Ctrl+0 (zero) to reset zoom
- Should be at 100%
- Too zoomed in/out causes layout issues

**Solution E: Update Browser**
- Old browsers may not support latest features
- Update to latest version
- Recommended: Chrome, Firefox, Edge

**Solution F: Try Different Browser**
- Test in another browser
- If works in other browser: Browser-specific issue
- Report to IT with browser details

**Solution G: Disable Browser Extensions**
- Ad blockers may break layout
- Temporarily disable all extensions
- Test if issue resolved
- Re-enable one by one to identify culprit

---

## Chapter 7: Document and Upload Issues

### Issue 7.1: Document Upload Failing

**Symptoms:**
- Upload button not working
- File upload progress bar stuck
- Error message during upload

**Solutions:**

**Solution A: Check File Size**
- Maximum: 10 MB per file
- Check file size: Right-click → Properties
- **Reduce if too large**:
  - Compress PDF (online tools)
  - Reduce image resolution
  - Split large files

**Solution B: Verify File Type**
- **Allowed**: PDF, DOC, DOCX, JPG, JPEG, PNG, XLS, XLSX
- **Not allowed**: EXE, ZIP, RAR, other executable files
- Convert if necessary

**Solution C: Check Filename**
- Remove special characters: /, \, :, *, ?, ", <, >, |
- Use only: letters, numbers, spaces, underscores, hyphens
- **Bad**: `My Contract (Final) - V2.pdf`
- **Good**: `My_Contract_Final_V2.pdf`

**Solution D: Stable Internet Connection**
- Ensure stable connection
- Don't close browser during upload
- Wait for 100% completion
- Large files may take several minutes

**Solution E: Try Different Browser**
- Chrome (recommended)
- Firefox
- Edge

**Solution F: Upload from Different Device**
- Try from phone
- Try from different computer
- Rules out device-specific issue

**Solution G: Contact IT**
If all else fails:
- Email document to: documents@company.com
- Subject: "Document Upload Assistance - [Your Name]"
- Mention document type and purpose
- They'll upload manually

---

## Chapter 8: Approval Workflow Issues

### Issue 8.1: Request Stuck in "Pending" Status

**Symptoms:**
- Request submitted days/weeks ago
- Still shows "Pending"
- No response from approver

**Causes:**
- Approver hasn't reviewed yet
- Approver on leave/unavailable
- Notification not received
- Technical issue

**Solutions:**

**Solution A: Check SLA Timeline**
- Typical approval timeframes:
  - Leave: 24-48 hours
  - Expenses: 48-72 hours
  - Loans: 3-5 days
- If within timeline: Wait

**Solution B: Send Reminder to Approver**
- View request details
- Note approver name
- Send polite reminder email or message:
```
Subject: Reminder: Leave Request Pending Approval

Hi [Manager Name],

I submitted a leave request (#LR-2026-001234) on March 15th for
annual leave from March 20-24.

Could you please review when you have a moment?

Thank you,
Ahmed
```

**Solution C: Check Approver Availability**
- Is approver on leave?
- Check team calendar
- May need to wait for return
- Or request escalation

**Solution D: Request Escalation**
- If very urgent and approver unavailable
- Contact HR: hr@company.com
- Explain situation
- HR can escalate to backup approver

**Solution E: Check Delegation**
- Approver may have delegated approval authority
- Check with manager's team
- Delegated approver should have received notification

**Solution F: Verify Request Submitted**
1. Go to: My Requests
2. Confirm status is "Pending" (not "Draft")
3. If "Draft": It wasn't submitted
4. Open and submit it

**Solution G: Cancel and Resubmit**
- Last resort if truly stuck
- Cancel request
- Create new request
- May trigger notifications again

---

### Issue 8.2: Don't Know Who to Contact for Approval

**Symptoms:**
- Request needs approval but unsure who
- Multiple potential approvers
- Approval chain unclear

**Solutions:**

**Solution A: Check Request Details**
- View your pending request
- Look for "Assigned Approver" field
- Shows who has it currently

**Solution B: Check Workflow**
1. Request detail page
2. View "Approval Timeline" or "Workflow"
3. Shows approval chain:
   ```
   Step 1: Manager [Current]
   Step 2: Department Head [Pending]
   Step 3: HR Manager [Pending]
   ```

**Solution C: Ask Your Manager**
- Direct manager is usually first approver
- They can guide you on approval chain

**Solution D: Contact HR**
- HR knows all approval workflows
- Email: hr@company.com
- Provide request number
- They'll clarify approval chain

**Solution E: Check Company Policy**
- Review policy for that request type
- Example: Leave policy explains leave approval process
- Usually documented

---

## Chapter 9: General Questions (FAQ)

### Q1: How often is my leave balance updated?

**Answer:**
- **Accrual**: Automatically on the 1st of each month
- **Usage**: Immediately when leave is approved
- **View**: Real-time in Leave → My Balances

Annual Leave Example:
- Entitlement: 21 days/year
- Monthly accrual: 1.75 days
- Credited on 1st of month at 00:01 AM

---

### Q2: When will I receive my salary?

**Answer:**
**Payroll Schedule:**
- **Processing**: 23rd-26th of month
- **Payment Date**: 27th of month
- **Bank Transfer**: WPS (Wage Protection System)
- **In Account**: By 27th evening or 28th morning

**If 27th is Weekend/Holiday:**
- Payment processed previous working day
- Example: If 27th is Friday, paid on Thursday 26th

**Check Payslip:**
- Available on payment date
- Payroll → My Payslips

---

### Q3: Can I work overtime without approval?

**Answer:**
**No. Overtime requires pre-approval.**

**Process:**
1. Discuss with manager first
2. Get written approval (email acceptable)
3. Work the overtime hours
4. Submit attendance correction if needed
5. System calculates overtime pay

**Overtime Rules:**
- Rate: 1.25× normal hourly rate (first 2 hours)
- Rate: 1.5× normal hourly rate (after 2 hours)
- Maximum: 2 hours/day, 10 hours/week
- Without approval: May not be paid

---

### Q4: How long does it take to get expense reimbursement?

**Answer:**
**Timeline:**
1. **Submit Claim**: Day 0
2. **Manager Approval**: 2-3 business days
3. **Finance Processing**: 3-5 business days
4. **Payment**: Next payroll cycle

**Total**: Usually 7-10 business days to approval, then paid with next salary

**Urgent Expenses:**
- Contact Finance for expedited processing
- May process sooner if urgent

**Check Status:**
- Expenses → My Claims
- Track approval progress

---

### Q5: Can I view other employees' salaries?

**Answer:**
**No. Salary information is confidential.**

**You Can View:**
- ✓ Your own salary and payslips
- ✓ Your team's salary (if HR Manager/Finance)
- ✓ Salary ranges for positions (if HR)

**You Cannot View:**
- ❌ Specific salaries of colleagues
- ❌ Other employees' payslips
- ❌ Individual compensation details

**Privacy:**
- System enforces strict access controls
- Attempts to access unauthorized data are logged
- Violations may result in disciplinary action

---

### Q6: What if I disagree with my performance review?

**Answer:**
**Steps:**

1. **Review Carefully**
   - Read all comments and ratings
   - Note specific areas of disagreement

2. **Request Meeting with Manager**
   - Discuss concerns professionally
   - Provide examples and evidence
   - Seek clarification

3. **Submit Written Response**
   - System allows employee comments on reviews
   - State your perspective
   - Be professional and factual

4. **Escalate if Necessary**
   - If unresolved with manager
   - Contact HR: hr@company.com
   - Request review meeting
   - HR will mediate

5. **Formal Appeal**
   - If still unresolved
   - Submit formal appeal to HR Director
   - Provide documentation
   - HR investigates

**Remember:**
- Focus on facts, not emotions
- Provide evidence for your viewpoint
- Be open to feedback
- Goal is improvement, not argument

---

### Q7: How do I change my password?

**Answer:**
**Method A: From Profile Menu**
1. Click profile icon (top-right)
2. Select "Settings"
3. Go to "Security" tab
4. Click "Change Password"
5. Enter:
   - Current password
   - New password
   - Confirm new password
6. Click "Update Password"

**Method B: Forgot Password**
1. Log out
2. Click "Forgot Password?" on login page
3. Enter email
4. Check email for reset link
5. Create new password

**Password Requirements:**
- At least 8 characters
- One uppercase letter
- One lowercase letter
- One number
- One special character
- Cannot be same as last 5 passwords

---

### Q8: Can I access the system from my phone?

**Answer:**
**Yes! The system is mobile-responsive.**

**Mobile Access:**
1. Open browser on phone (Chrome, Safari)
2. Navigate to: https://yourcompany-hr.app
3. Log in with same credentials
4. Interface adapts to phone screen

**Mobile App:**
- Native mobile app: Check with IT if available
- May have additional features:
  - Push notifications
  - Offline access
  - Biometric login
  - Camera for receipts

**Recommended:**
- Use mobile for quick tasks:
  - Check-in/out
  - View payslips
  - Quick approvals
  - Upload receipts
- Use desktop for:
  - Complex forms
  - Reports
  - Detailed data entry

---

### Q9: What happens if I submit a request by mistake?

**Answer:**
**You can cancel it:**

**If Pending:**
1. Go to: My Requests
2. Find the request
3. Click "Cancel" or "Delete"
4. Confirm cancellation
5. Request removed immediately

**If Approved:**
- More complex (see Issue 2.3)
- May need manager approval to cancel
- Contact manager immediately

**If Processed:**
- Too late to cancel in system
- Contact HR for manual reversal
- Example: Leave already deducted, HR can restore balance

**Prevention:**
- Review carefully before submitting
- Check all details
- Save as draft first if unsure

---

### Q10: How do I print/save a page?

**Answer:**
**Method A: Browser Print**
1. Click Print button (if available)
2. Or press Ctrl+P (Windows) / Cmd+P (Mac)
3. Select printer or "Save as PDF"
4. Adjust settings
5. Print or Save

**Method B: Download PDF (if available)**
- Many reports have "Download PDF" button
- Click it
- PDF downloads automatically
- Open and print from PDF

**Method C: Screenshot**
- Windows: Win+Shift+S (Snipping Tool)
- Mac: Cmd+Shift+4
- Capture what you need
- Paste into document

**Tip:**
- Use "Print to PDF" to save any page as PDF
- Better than screenshots for documents

---

## Chapter 10: Contact Support

### When to Contact Each Department

#### IT Helpdesk
**Contact For:**
- Login issues
- Password problems
- Technical errors
- System not working
- Browser issues
- Performance problems

**Contact Info:**
- **Email**: support@company.com
- **Phone**: +966 XX XXX XXXX (Ext. 100)
- **Hours**: Sun-Thu, 8 AM - 5 PM
- **Response**: Within 24 hours
- **Emergency**: 24/7 hotline for critical issues

---

#### HR Department
**Contact For:**
- Leave policies
- Personal information updates
- Employment verification
- Benefits questions
- Contract inquiries
- General HR policies

**Contact Info:**
- **Email**: hr@company.com
- **Phone**: Ext. 200
- **Location**: HR Office, 2nd Floor
- **Hours**: Sun-Thu, 8 AM - 4 PM

---

#### Finance Department
**Contact For:**
- Payroll questions
- Salary discrepancies
- Expense reimbursements
- Loan/advance inquiries
- WPS issues
- Tax documents

**Contact Info:**
- **Email**: finance@company.com
- **Phone**: Ext. 300
- **Location**: Finance Office, 3rd Floor
- **Hours**: Sun-Thu, 8 AM - 3 PM

---

### Creating Effective Support Tickets

**Include:**
1. **Your Information**
   - Full name
   - Employee number
   - Department
   - Contact number

2. **Issue Description**
   - What happened?
   - When did it happen?
   - What were you trying to do?

3. **Error Messages**
   - Exact error text
   - Screenshot (very helpful)

4. **Steps to Reproduce**
   - Step 1: Went to...
   - Step 2: Clicked...
   - Step 3: Error appeared

5. **What You've Tried**
   - List troubleshooting steps already attempted
   - Prevents duplicate suggestions

6. **Urgency Level**
   - Critical: Cannot work
   - High: Major feature broken
   - Medium: Inconvenient but have workaround
   - Low: Minor issue or question

**Example Good Ticket:**
```
Subject: Cannot Submit Leave Request - Error 500

Issue:
When I try to submit my leave request, I get "Error 500:
Internal Server Error" message.

Steps to Reproduce:
1. Go to Leave → Request Leave
2. Fill form (Annual Leave, Mar 20-24)
3. Click "Submit Request"
4. Error appears

What I've Tried:
- Cleared browser cache
- Tried different browser (Chrome and Firefox)
- Logged out and back in
- Still same error

Screenshots: [attached]

Employee: Ahmed Ali (#EMP-12345)
Department: IT
Urgency: High (need leave approved by today)
```

---

## Appendix: Error Code Reference

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| **401** | Not authenticated | Log in again |
| **403** | Access denied | Check permissions |
| **404** | Page not found | Check URL, contact IT |
| **500** | Server error | Try later, contact IT if persists |
| **503** | Service unavailable | System maintenance, wait |

### HTTP Status Codes

**2xx - Success**
- 200: OK
- 201: Created

**4xx - Client Errors**
- 400: Bad request (check your input)
- 401: Unauthorized (log in)
- 403: Forbidden (no permission)
- 404: Not found (wrong URL)

**5xx - Server Errors**
- 500: Internal error (contact IT)
- 502: Bad gateway (temporary issue)
- 503: Service unavailable (maintenance)
- 504: Gateway timeout (try again)

---

## Quick Troubleshooting Checklist

Before contacting support, try:

```
□ Refresh the page (F5)
□ Clear browser cache
□ Try different browser
□ Log out and log in again
□ Check internet connection
□ Try on different device
□ Wait 10 minutes and retry
□ Check for system announcements
```

If all fail: Contact appropriate support team with details

---

**Document Version**: 1.0
**Last Updated**: February 17, 2026
**For Support**: support@company.com / Ext. 100

---

**End of Troubleshooting and FAQ Guide**
