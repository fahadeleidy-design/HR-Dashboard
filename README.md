# Saudi HR Management System

A comprehensive HR Management System built for Saudi Arabia, compliant with Saudi Labor Law, Nitaqat regulations, GOSI, and WPS requirements.

## Features

### ✅ Core Features

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

## Next Steps

The system is ready for additional modules:
- Payroll processing
- Leave request workflows
- Attendance tracking
- Performance reviews
- Training management
- GOSI & WPS reporting

## License

Proprietary - All rights reserved