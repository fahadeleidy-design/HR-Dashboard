# Complete Enterprise Management System (EMS) for Saudi Arabia

A comprehensive **17-module** Enterprise Management System built for Saudi Arabia, fully compliant with Saudi Labor Law, Nitaqat, GOSI, WPS, Muqeem, and Absher.

## 🎯 System Overview

**Total Modules**: 17 Fully Integrated Modules
**Database Tables**: 40+ Tables with Complete RLS Security
**Real-time**: All modules support real-time data synchronization
**Saudi Compliant**: Built-in Saudi regulations and governmental integrations

## ✅ All Modules

### 📊 Core HR Modules (9 Modules)

#### 1. Employee Management (Full CRUD with Real-time Sync)
- **View Employees**: Searchable data table showing all employee information
- **Add Employee**: Comprehensive form with all required fields (English/Arabic names, contact info, employment details)
- **Edit Employee**: Update any employee information with instant sync
- **Delete Employee**: Remove employees with confirmation dialog
- **Real-time Updates**: All changes sync automatically across all users without page refresh
- **Export to Excel**: Download complete employee data in Excel format
- **Bulk Upload from Excel**: Import hundreds of employees at once with validation

#### 2. Bulk Employee Upload System
- Download pre-configured Excel template with sample data
- Upload Excel files (.xlsx, .xls) with employee data
- Automatic validation with detailed error reporting
- Supports all fields: names (EN/AR), contact, nationality, documents, employment details
- Row-by-row error messages for easy correction
- Success confirmation with count of imported employees

#### 3. Real-time Data Synchronization
- PostgreSQL real-time subscriptions via Supabase
- Instant UI updates when any user makes changes
- Multi-user collaboration support
- No page refresh needed

#### 4. Dashboard with Key Metrics
- Total and active employee counts
- Saudi vs Non-Saudi employee breakdown
- Real-time Nitaqat compliance status with color indicators
- Saudization percentage visualization
- Pending leave requests alerts
- Expiring documents warnings (90-day notice)

#### 5. Authentication & Security
- Email/password authentication
- Role-based access control
- Row-level security with company data isolation
- Protected routes
- Secure session management

#### 6. Multi-Company Support
- Manage multiple companies in one system
- Easy company switching
- Company-specific data isolation
- Department management per company

## Database Schema

The system includes comprehensive tables for:
- **Employees**: Complete employee records with Saudi-specific fields
- **Companies**: Multi-company support with Nitaqat tracking
- **Departments**: Organizational structure
- **Payroll**: Salary structure with GOSI calculations
- **Leave Management**: Saudi Labor Law compliant leave types
- **Attendance**: Daily tracking with overtime
- **Compliance**: Nitaqat, GOSI, WPS tracking
- **Documents**: Document management with expiry alerts
- **Performance & Training**: Employee development tracking
- **Audit Logs**: Complete change history

### Saudi Labor Law Features

#### Pre-configured Leave Types
- Annual Leave: 21 days (30 after 5 years)
- Sick Leave: 120 days (tiered payment)
- Hajj Leave: 10 days
- Maternity Leave: 70 days
- Paternity Leave: 3 days
- Emergency & Bereavement Leave

#### Compliance Functions
- End of Service Benefits (EOSB) calculator
- Nitaqat metrics calculator
- GOSI contribution calculator (10% employee, 12%/2% employer)
- Leave balance tracking

## Quick Start

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Usage Guide

### Bulk Employee Upload

1. **Navigate to Employees** page from sidebar
2. **Click "Bulk Upload"** button
3. **Download Template**: Click "Download Excel Template"
4. **Fill in Data**: Add your employee information to the template
   - Required fields: Employee Number, First/Last Name (EN), Nationality, Hire Date, Job Title, Gender, Is Saudi
   - Optional fields: Arabic names, contact info, documents, etc.
5. **Upload File**: Click "Choose Excel File" and select your completed file
6. **Review Validation**: Check for any errors (red alerts will show row numbers and issues)
7. **Confirm Upload**: Click "Upload Employees" to import
8. **Success**: Green confirmation will show number of employees imported

### Managing Employees

#### Add Single Employee
1. Click "Add Employee"
2. Fill in the form
3. Click "Add Employee" to save

#### Edit Employee
1. Click the pencil icon (✏️) next to any employee
2. Update information
3. Click "Update Employee"

#### Delete Employee
1. Click the trash icon (🗑️) next to any employee
2. Confirm deletion

#### Search & Filter
- Use search bar to filter by: name, employee number, email, nationality, or job title
- Results update instantly as you type

#### Export Data
- Click "Export" button to download all employees as Excel
- File includes all employee data in spreadsheet format

### Real-time Features

All changes sync automatically:
- **Add**: New employees appear immediately for all users
- **Update**: Edits show up instantly across all sessions
- **Delete**: Removed employees disappear in real-time

No page refresh needed! Changes are pushed via WebSocket.

## Excel Template Format

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| Employee Number | ✅ | Text | EMP001 |
| First Name (EN) | ✅ | Text | Ahmed |
| Last Name (EN) | ✅ | Text | Al-Rashid |
| Nationality | ✅ | Text | Saudi Arabia |
| Is Saudi | ✅ | Yes/No | Yes |
| Gender | ✅ | male/female | male |
| Hire Date | ✅ | YYYY-MM-DD | 2024-01-01 |
| Job Title (EN) | ✅ | Text | Software Engineer |
| Employment Type | ✅ | full_time/part_time/contract | full_time |
| Email | Optional | Email | ahmed@example.com |
| Phone | Optional | Text | +966501234567 |
| First/Last Name (AR) | Optional | Arabic | أحمد / الراشد |
| Date of Birth | Optional | YYYY-MM-DD | 1990-01-15 |
| Iqama/Passport Info | Optional | Text/Date | Numbers and expiry dates |

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + Lucide Icons
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Excel**: XLSX library
- **Real-time**: PostgreSQL subscriptions

## Key Benefits

✅ **Save Time**: Upload hundreds of employees in seconds instead of entering one by one
✅ **Stay Synced**: All users see changes instantly without refreshing
✅ **Saudi Compliant**: Built-in support for Saudi Labor Law requirements
✅ **Secure**: Company data isolation with row-level security
✅ **Flexible**: Add, edit, delete, export, or bulk upload as needed
✅ **User-Friendly**: Clean interface with search, validation, and error handling

## 🎉 All 17 Modules Completed

### Core HR Modules (9)

1. ✅ **Employee Management** - Full CRUD, bulk upload, real-time sync, detailed profiles, leave balance
2. ✅ **Payroll Management** - GOSI calculations (10%/12%/2%), salary components, net pay
3. ✅ **Leave Management** - Request/approval workflow, balance tracking, Saudi leave types
4. ✅ **Attendance Tracking** - Check-in/out, overtime, monthly reports, status monitoring
5. ✅ **Performance Management** - Reviews, ratings, goals, performance tracking
6. ✅ **Training Management** - Programs, enrollments, certifications, duration tracking
7. ✅ **Document Management** - Expiry alerts, status tracking, document repository
8. ✅ **Compliance & Reporting** - Nitaqat, GOSI, WPS, saudization metrics
9. ✅ **Settings** - Company info, departments, user management

### Advanced Enterprise Modules (8)

10. ✅ **Vehicle Management** ⭐ NEW
    - Fleet tracking with make, model, year
    - Vehicle assignments to employees
    - Maintenance schedules and history
    - **Absher traffic violations integration ready**
    - Insurance and registration expiry tracking
    - Mileage tracking and fuel management

11. ✅ **Governmental Documents** ⭐ NEW
    - Commercial Registration (CR) tracking
    - Ministry licenses and permits
    - Municipality licenses
    - Civil Defense certificates
    - Chamber of Commerce membership
    - Zakat & VAT certificates
    - Renewal reminders and cost tracking

12. ✅ **Real Estate & Assets** ⭐ NEW
    - Property management (owned/leased)
    - Office, warehouse, factory tracking
    - Asset inventory (IT, furniture, equipment)
    - Depreciation tracking
    - Asset assignments to employees
    - Maintenance schedules

13. ✅ **Contract Management** ⭐ NEW
    - Vendor and client contracts
    - Lease agreements
    - Service contracts
    - Auto-renewal tracking
    - Contract value and payment terms
    - Expiry alerts

14. ✅ **Insurance Management** ⭐ NEW
    - Health insurance policies
    - Vehicle insurance
    - Property and liability insurance
    - Claims management
    - Premium tracking
    - Coverage and deductible management

15. ✅ **Business Travel** ⭐ NEW
    - Travel requests and approvals
    - Domestic and international trips
    - Cost tracking and advance payments
    - Flight and hotel booking status
    - Travel expense integration

16. ✅ **Expense Management** ⭐ NEW
    - Employee expense claims
    - Approval workflow
    - Receipt management
    - Reimbursement tracking
    - Multi-currency support
    - Travel expense linking

17. ✅ **Visa & Work Permits** ⭐ NEW (Muqeem Integration Ready)
    - Work visa quota management
    - Iqama (residence permit) tracking
    - Visa transfers (in/out)
    - Exit re-entry permits
    - **Muqeem system integration ready**
    - Final exit processing
    - Visa request workflow

## 🌟 Key Features Across All Modules

✅ **Real-time Synchronization** - All changes appear instantly for all users
✅ **Excel Export** - Export data from any module to Excel
✅ **Advanced Search & Filter** - Find anything quickly
✅ **Saudi Compliant** - Built-in Saudi regulations
✅ **Bilingual** - Full English and Arabic support
✅ **Mobile Responsive** - Works on all devices
✅ **Secure** - Row-level security with company isolation
✅ **Analytics** - Interactive charts and dashboards
✅ **Expiry Alerts** - Automated alerts for expiring documents
✅ **Approval Workflows** - Multi-level approvals
✅ **Audit Trail** - Complete history tracking

## License

Proprietary - All rights reserved