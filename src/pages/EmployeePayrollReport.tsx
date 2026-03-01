import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { buildCompanyFilter } from '@/lib/queryHelpers';
import { Search, Building2, Users, RefreshCw, X, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { ScrollableTable } from '@/components/ScrollableTable';
import * as XLSX from 'xlsx';

interface EmployeeRow {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  iqama_number: string | null;
  passport_number: string | null;
  is_saudi: boolean;
  nationality: string | null;
  gender: string | null;
  date_of_birth: string | null;
  hire_date: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  contract_type: string | null;
  employment_type: string | null;
  job_title_en: string | null;
  job_title_ar: string | null;
  department_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  address_en: string | null;
  marital_status: string | null;
  number_of_dependents: number | null;
  work_permit_number: string | null;
  work_permit_expiry: string | null;
  visa_number: string | null;
  visa_expiry: string | null;
  iqama_expiry: string | null;
  passport_expiry: string | null;
  sponsor_name: string | null;
  company_name: string;
  status: string;
  iban: string | null;
  bank_name: string | null;
  payment_method: string | null;
  basic_salary: number | null;
  housing_allowance: number | null;
  transportation_allowance: number | null;
  other_allowances: number | null;
  gross_salary: number | null;
  gosi_employee: number | null;
  gosi_employer: number | null;
  other_deductions: number | null;
  net_salary: number | null;
}

export function EmployeePayrollReport() {
  const { currentCompany, isConsolidatedView, companies } = useCompany();
  const { isRTL } = useLanguage();

  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [filtered, setFiltered] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (currentCompany || (isConsolidatedView && companies.length > 0)) {
      fetchData();
    }
  }, [currentCompany, isConsolidatedView, companies]);

  useEffect(() => {
    applyFilters();
  }, [rows, search, filterCompany, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: employees, error } = await buildCompanyFilter(
        supabase
          .from('employees')
          .select(`
            id,
            employee_number,
            first_name_en, last_name_en,
            first_name_ar, last_name_ar,
            iqama_number, passport_number,
            is_saudi, nationality, gender,
            date_of_birth, hire_date,
            contract_start_date, contract_end_date, contract_type,
            employment_type, job_title_en, job_title_ar,
            email, phone, city, country, address_en,
            marital_status, number_of_dependents,
            work_permit_number, work_permit_expiry,
            visa_number, visa_expiry,
            iqama_expiry, passport_expiry,
            sponsor_name, status, company_id, department_id,
            companies!employees_company_id_fkey(name_en),
            departments!employees_department_id_fkey(name_en)
          `)
          .order('company_id')
          .order('first_name_en'),
        isConsolidatedView,
        companies,
        currentCompany
      );

      if (error) throw error;

      const employeeIds = (employees || []).map((e: any) => e.id);

      const { data: payrollData } = await supabase
        .from('payroll')
        .select(`
          employee_id, iban, bank_name, payment_method,
          basic_salary, housing_allowance, transportation_allowance,
          other_allowances, gross_salary, gosi_employee, gosi_employer,
          other_deductions, net_salary, effective_from, created_at
        `)
        .in('employee_id', employeeIds)
        .order('effective_from', { ascending: false })
        .order('created_at', { ascending: false });

      const latestPayroll = new Map<string, any>();
      (payrollData || []).forEach((p: any) => {
        if (!latestPayroll.has(p.employee_id)) {
          latestPayroll.set(p.employee_id, p);
        }
      });

      const result: EmployeeRow[] = (employees || []).map((emp: any) => {
        const p = latestPayroll.get(emp.id);
        return {
          id: emp.id,
          employee_number: emp.employee_number,
          first_name_en: emp.first_name_en,
          last_name_en: emp.last_name_en,
          first_name_ar: emp.first_name_ar,
          last_name_ar: emp.last_name_ar,
          iqama_number: emp.iqama_number,
          passport_number: emp.passport_number,
          is_saudi: emp.is_saudi,
          nationality: emp.nationality,
          gender: emp.gender,
          date_of_birth: emp.date_of_birth,
          hire_date: emp.hire_date,
          contract_start_date: emp.contract_start_date,
          contract_end_date: emp.contract_end_date,
          contract_type: emp.contract_type,
          employment_type: emp.employment_type,
          job_title_en: emp.job_title_en,
          job_title_ar: emp.job_title_ar,
          department_name: emp.departments?.name_en || null,
          email: emp.email,
          phone: emp.phone,
          city: emp.city,
          country: emp.country,
          address_en: emp.address_en,
          marital_status: emp.marital_status,
          number_of_dependents: emp.number_of_dependents,
          work_permit_number: emp.work_permit_number,
          work_permit_expiry: emp.work_permit_expiry,
          visa_number: emp.visa_number,
          visa_expiry: emp.visa_expiry,
          iqama_expiry: emp.iqama_expiry,
          passport_expiry: emp.passport_expiry,
          sponsor_name: emp.sponsor_name,
          company_name: emp.companies?.name_en || 'N/A',
          status: emp.status,
          iban: p?.iban || null,
          bank_name: p?.bank_name || null,
          payment_method: p?.payment_method || null,
          basic_salary: p?.basic_salary ?? null,
          housing_allowance: p?.housing_allowance ?? null,
          transportation_allowance: p?.transportation_allowance ?? null,
          other_allowances: p?.other_allowances ?? null,
          gross_salary: p?.gross_salary ?? null,
          gosi_employee: p?.gosi_employee ?? null,
          gosi_employer: p?.gosi_employer ?? null,
          other_deductions: p?.other_deductions ?? null,
          net_salary: p?.net_salary ?? null,
        };
      });

      setRows(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let data = [...rows];

    if (filterCompany) {
      data = data.filter(r => r.company_name === filterCompany);
    }

    if (filterStatus) {
      data = data.filter(r => r.status === filterStatus);
    }

    if (search) {
      const term = search.toLowerCase();
      data = data.filter(r =>
        r.first_name_en?.toLowerCase().includes(term) ||
        r.last_name_en?.toLowerCase().includes(term) ||
        r.employee_number?.toLowerCase().includes(term) ||
        r.iqama_number?.toLowerCase().includes(term) ||
        r.bank_name?.toLowerCase().includes(term) ||
        r.iban?.toLowerCase().includes(term) ||
        r.company_name?.toLowerCase().includes(term) ||
        r.job_title_en?.toLowerCase().includes(term) ||
        r.department_name?.toLowerCase().includes(term) ||
        r.email?.toLowerCase().includes(term)
      );
    }

    setFiltered(data);
  };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const today = new Date().toLocaleDateString('en-GB');
    const dateStr = new Date().toISOString().split('T')[0];

    const headers = [
      '#', 'Emp. No.', 'Full Name (EN)', 'Full Name (AR)', 'Company', 'Department',
      'Job Title (EN)', 'Job Title (AR)', 'Employment Type', 'Contract Type', 'Status',
      'ID / Iqama No.', 'ID Type', 'Iqama Expiry',
      'Passport No.', 'Passport Expiry',
      'Work Permit No.', 'Work Permit Expiry',
      'Visa No.', 'Visa Expiry',
      'Nationality', 'Saudi', 'Gender', 'Date of Birth',
      'Email', 'Phone',
      'City', 'Country', 'Address',
      'Marital Status', 'Dependents',
      'Hire Date', 'Contract Start', 'Contract End',
      'Sponsor Name',
      'IBAN', 'Bank Name', 'Payment Method',
      'Basic Salary (SAR)', 'Housing Allowance (SAR)', 'Transport Allowance (SAR)',
      'Other Allowances (SAR)', 'Gross Salary (SAR)',
      'GOSI Employee (SAR)', 'GOSI Employer (SAR)', 'Other Deductions (SAR)',
      'Net Salary (SAR)',
    ];

    const buildRows = (data: EmployeeRow[]) =>
      data.map((r, i) => [
        i + 1,
        r.employee_number,
        `${r.first_name_en} ${r.last_name_en}`,
        r.first_name_ar && r.last_name_ar ? `${r.first_name_ar} ${r.last_name_ar}` : '',
        r.company_name,
        r.department_name || '',
        r.job_title_en || '',
        r.job_title_ar || '',
        r.employment_type || '',
        r.contract_type || '',
        r.status,
        r.iqama_number || '',
        r.is_saudi ? 'National ID' : 'Iqama',
        r.iqama_expiry || '',
        r.passport_number || '',
        r.passport_expiry || '',
        r.work_permit_number || '',
        r.work_permit_expiry || '',
        r.visa_number || '',
        r.visa_expiry || '',
        r.nationality || '',
        r.is_saudi ? 'Yes' : 'No',
        r.gender || '',
        r.date_of_birth || '',
        r.email || '',
        r.phone || '',
        r.city || '',
        r.country || '',
        r.address_en || '',
        r.marital_status || '',
        r.number_of_dependents ?? '',
        r.hire_date || '',
        r.contract_start_date || '',
        r.contract_end_date || '',
        r.sponsor_name || '',
        (r.iban || '').trim(),
        (r.bank_name || '').trim(),
        r.payment_method || '',
        r.basic_salary ?? '',
        r.housing_allowance ?? '',
        r.transportation_allowance ?? '',
        r.other_allowances ?? '',
        r.gross_salary ?? '',
        r.gosi_employee ?? '',
        r.gosi_employer ?? '',
        r.other_deductions ?? '',
        r.net_salary ?? '',
      ]);

    const totalRow = (data: EmployeeRow[]) => {
      const row: (string | number)[] = new Array(headers.length).fill('');
      row[0] = 'TOTAL';
      row[2] = `${data.length} employees`;
      const salaryIdx = headers.indexOf('Basic Salary (SAR)');
      [
        'Basic Salary (SAR)', 'Housing Allowance (SAR)', 'Transport Allowance (SAR)',
        'Other Allowances (SAR)', 'Gross Salary (SAR)',
        'GOSI Employee (SAR)', 'GOSI Employer (SAR)', 'Other Deductions (SAR)',
        'Net Salary (SAR)',
      ].forEach((col, ci) => {
        const idx = headers.indexOf(col);
        const field = [
          'basic_salary', 'housing_allowance', 'transportation_allowance',
          'other_allowances', 'gross_salary',
          'gosi_employee', 'gosi_employer', 'other_deductions',
          'net_salary',
        ][ci] as keyof EmployeeRow;
        row[idx] = data.reduce((s, r) => s + ((r[field] as number) || 0), 0);
      });
      return row;
    };

    const colWidths = [
      { wch: 5 }, { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 28 }, { wch: 22 },
      { wch: 28 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 12 },
      { wch: 18 }, { wch: 14 }, { wch: 16 },
      { wch: 16 }, { wch: 16 },
      { wch: 18 }, { wch: 18 },
      { wch: 14 }, { wch: 14 },
      { wch: 16 }, { wch: 8 }, { wch: 10 }, { wch: 14 },
      { wch: 28 }, { wch: 16 },
      { wch: 14 }, { wch: 14 }, { wch: 30 },
      { wch: 14 }, { wch: 10 },
      { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 22 },
      { wch: 32 }, { wch: 24 }, { wch: 16 },
      { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 18 }, { wch: 18 },
      { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 18 },
    ];

    const makeSheet = (data: EmployeeRow[], title: string) => {
      const sheetData: (string | number)[][] = [
        [title],
        [`Generated: ${today}   |   Total Employees: ${data.length}`],
        [],
        headers,
        ...buildRows(data),
        [],
        totalRow(data),
      ];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws['!cols'] = colWidths;
      return ws;
    };

    XLSX.utils.book_append_sheet(wb, makeSheet(filtered, 'Employee Complete Report - All Companies'), 'All Companies');

    const byCompany = new Map<string, EmployeeRow[]>();
    filtered.forEach(r => {
      if (!byCompany.has(r.company_name)) byCompany.set(r.company_name, []);
      byCompany.get(r.company_name)!.push(r);
    });

    byCompany.forEach((emps, companyName) => {
      const safeName = companyName.replace(/[\\/:*?"<>|]/g, '').substring(0, 31);
      XLSX.utils.book_append_sheet(wb, makeSheet(emps, companyName), safeName);
    });

    XLSX.writeFile(wb, `employee_complete_report_${dateStr}.xlsx`);
  };

  const uniqueCompanies = Array.from(new Set(rows.map(r => r.company_name))).sort();
  const totalSalary = filtered.reduce((sum, r) => sum + (r.basic_salary || 0), 0);
  const withIBAN = filtered.filter(r => r.iban).length;
  const withoutIBAN = filtered.filter(r => !r.iban).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Complete Report</h1>
          <p className="text-gray-600 mt-1">Full employee data including personal info, documents, bank details, and salary — exportable per company</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Generate Document
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <p className="text-sm font-medium text-blue-600">Total Employees</p>
          <p className="text-2xl font-bold text-blue-900">{filtered.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <p className="text-sm font-medium text-green-600">Total Basic Salary</p>
          <p className="text-2xl font-bold text-green-900">{totalSalary.toLocaleString()} SAR</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
          <p className="text-sm font-medium text-emerald-600">With IBAN</p>
          <p className="text-2xl font-bold text-emerald-900">{withIBAN}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <p className="text-sm font-medium text-orange-600">Missing IBAN</p>
          <p className="text-2xl font-bold text-orange-900">{withoutIBAN}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
          <div className="flex-1 min-w-60 relative">
            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400`} />
            <input
              type="text"
              placeholder="Search by name, number, Iqama, IBAN, bank, email, department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
            />
          </div>

          {(isConsolidatedView || uniqueCompanies.length > 1) && (
            <div className="relative min-w-48">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <select
                value={filterCompany}
                onChange={e => setFilterCompany(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
              >
                <option value="">All Companies</option>
                {uniqueCompanies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          )}

          <div className="relative min-w-40">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="terminated">Terminated</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {(search || filterCompany || filterStatus) && (
            <button
              onClick={() => { setSearch(''); setFilterCompany(''); setFilterStatus(''); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>

        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-900">{filtered.length}</span>
          {filtered.length !== rows.length && <span> of {rows.length}</span>} employees
          <span className="ml-2 text-gray-400">— Export includes 49 data columns per employee</span>
        </div>

        <ScrollableTable maxHeight="calc(100vh - 440px)">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Emp. No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Job Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID / Iqama</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">IBAN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank Name</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Basic Salary</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Salary</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="h-12 w-12 text-gray-300" />
                      <p className="text-gray-500 font-medium">No employees found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.employee_number}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                          {row.first_name_en?.charAt(0)}{row.last_name_en?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{row.first_name_en} {row.last_name_en}</p>
                          {row.nationality && <p className="text-xs text-gray-400">{row.nationality}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Building2 className="h-3 w-3" />
                        {row.company_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.department_name || <span className="text-gray-400">-</span>}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.job_title_en || <span className="text-gray-400">-</span>}</td>
                    <td className="px-4 py-3">
                      {row.iqama_number ? (
                        <div>
                          <p className="text-sm font-mono text-gray-900">{row.iqama_number}</p>
                          <p className="text-xs text-gray-400">{row.is_saudi ? 'National ID' : 'Iqama'}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.iban ? (
                        <span className="text-sm font-mono text-gray-900">{row.iban.trim()}</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.bank_name?.trim() || <span className="text-gray-400">-</span>}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {row.basic_salary != null ? row.basic_salary.toLocaleString() : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-green-700">
                      {row.net_salary != null ? row.net_salary.toLocaleString() : <span className="text-gray-400 font-normal">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        row.status === 'active' ? 'bg-green-100 text-green-800'
                        : row.status === 'on_leave' ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={9} className="px-4 py-3 text-sm font-semibold text-gray-700">
                    Totals ({filtered.length} employees)
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                    {filtered.reduce((s, r) => s + (r.basic_salary || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-green-700">
                    {filtered.reduce((s, r) => s + (r.net_salary || 0), 0).toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </ScrollableTable>
      </div>
    </div>
  );
}
