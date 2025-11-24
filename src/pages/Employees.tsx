import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types/database';
import { Plus, Upload, Download, Pencil, Trash2, Search, Eye, Filter, X } from 'lucide-react';
import { EmployeeForm } from '@/components/EmployeeForm';
import { BulkUpload } from '@/components/BulkUpload';
import { EmployeeDetail } from '@/components/EmployeeDetail';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';
import * as XLSX from 'xlsx';

interface Department {
  id: string;
  name_en: string;
  name_ar: string;
}

interface EmployeeWithPayroll extends Employee {
  payroll?: { basic_salary: number }[];
  department?: { name_en: string; name_ar: string };
}

export function Employees() {
  const { currentCompany } = useCompany();
  const { t, isRTL, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [employees, setEmployees] = useState<EmployeeWithPayroll[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeWithPayroll[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // New filter states
  const [filterNationality, setFilterNationality] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterIqamaExpiry, setFilterIqamaExpiry] = useState('');
  const [filterSalaryMin, setFilterSalaryMin] = useState('');
  const [filterSalaryMax, setFilterSalaryMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (currentCompany) {
      fetchEmployees();
      fetchDepartments();
      subscribeToChanges();
    }
  }, [currentCompany]);

  useEffect(() => {
    filterEmployees();
  }, [searchTerm, employees, searchParams, filterNationality, filterDepartment, filterIqamaExpiry, filterSalaryMin, filterSalaryMax]);

  const { sortedData, sortConfig, requestSort } = useSortableData(filteredEmployees);

  const fetchEmployees = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (employeesError) throw employeesError;

      // Fetch payroll data separately
      const { data: payrollData, error: payrollError } = await supabase
        .from('payroll')
        .select('employee_id, basic_salary')
        .eq('company_id', currentCompany.id);

      if (payrollError) console.error('Error fetching payroll:', payrollError);

      // Merge payroll data with employees
      const enrichedEmployees = (employeesData || []).map(emp => {
        const payroll = payrollData?.filter(p => p.employee_id === emp.id) || [];
        return {
          ...emp,
          payroll: payroll
        };
      });

      setEmployees(enrichedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name_en, name_ar')
        .eq('company_id', currentCompany.id)
        .order('name_en');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const subscribeToChanges = () => {
    if (!currentCompany) return;

    const channel = supabase
      .channel('employees_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees',
          filter: `company_id=eq.${currentCompany.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setEmployees((prev) => [payload.new as Employee, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setEmployees((prev) =>
              prev.map((emp) =>
                emp.id === payload.new.id ? (payload.new as Employee) : emp
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setEmployees((prev) => prev.filter((emp) => emp.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filterEmployees = () => {
    let filtered = [...employees];

    const statusFilter = searchParams.get('status');
    const nationalityFilterParam = searchParams.get('nationality');
    const genderFilter = searchParams.get('gender');

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(emp => emp.status === statusFilter);
    }

    // URL nationality filter
    if (nationalityFilterParam === 'saudi') {
      filtered = filtered.filter(emp => emp.is_saudi === true);
    } else if (nationalityFilterParam === 'non-saudi') {
      filtered = filtered.filter(emp => emp.is_saudi === false);
    }

    // Gender filter
    if (genderFilter) {
      filtered = filtered.filter(emp => emp.gender === genderFilter);
    }

    // Nationality filter (new)
    if (filterNationality) {
      if (filterNationality === 'saudi') {
        filtered = filtered.filter(emp => emp.is_saudi === true);
      } else if (filterNationality === 'non-saudi') {
        filtered = filtered.filter(emp => emp.is_saudi === false);
      } else {
        filtered = filtered.filter(emp => emp.nationality.toLowerCase() === filterNationality.toLowerCase());
      }
    }

    // Department filter (new)
    if (filterDepartment && filterDepartment !== '') {
      filtered = filtered.filter(emp => emp.department_id === filterDepartment);
    }

    // Iqama expiry filter (new)
    if (filterIqamaExpiry) {
      const today = new Date();
      filtered = filtered.filter(emp => {
        if (!emp.iqama_expiry) return false;
        const expiryDate = new Date(emp.iqama_expiry);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (filterIqamaExpiry === 'expired') {
          return daysUntilExpiry < 0;
        } else if (filterIqamaExpiry === '30days') {
          return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
        } else if (filterIqamaExpiry === '60days') {
          return daysUntilExpiry >= 0 && daysUntilExpiry <= 60;
        } else if (filterIqamaExpiry === '90days') {
          return daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
        }
        return true;
      });
    }

    // Salary range filter (new)
    if (filterSalaryMin || filterSalaryMax) {
      filtered = filtered.filter(emp => {
        // Get the most recent salary or 0 if no payroll data
        const salary = emp.payroll && emp.payroll.length > 0 ? emp.payroll[0].basic_salary : 0;
        const min = filterSalaryMin ? parseFloat(filterSalaryMin) : 0;
        const max = filterSalaryMax ? parseFloat(filterSalaryMax) : Infinity;

        // If no salary data and min is set, exclude this employee
        if (salary === 0 && filterSalaryMin) return false;

        return salary >= min && salary <= max;
      });
    }

    // Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.first_name_en.toLowerCase().includes(term) ||
          emp.last_name_en.toLowerCase().includes(term) ||
          emp.employee_number.toLowerCase().includes(term) ||
          emp.email?.toLowerCase().includes(term) ||
          emp.nationality.toLowerCase().includes(term) ||
          emp.job_title_en.toLowerCase().includes(term)
      );
    }

    console.log('Filter results:', {
      total: employees.length,
      filtered: filtered.length,
      filters: { filterNationality, filterDepartment, filterIqamaExpiry, filterSalaryMin, filterSalaryMax }
    });
    setFilteredEmployees(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee');
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleView = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setShowDetail(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  const handleClearFilters = () => {
    setFilterNationality('');
    setFilterDepartment('');
    setFilterIqamaExpiry('');
    setFilterSalaryMin('');
    setFilterSalaryMax('');
  };

  const getUniqueNationalities = () => {
    const nationalities = new Set<string>();
    employees.forEach(emp => {
      if (emp.nationality) nationalities.add(emp.nationality);
    });
    return Array.from(nationalities).sort();
  };

  const hasActiveFilters = filterNationality || filterDepartment || filterIqamaExpiry || filterSalaryMin || filterSalaryMax;

  const handleExport = () => {
    const exportData = employees.map((emp) => ({
      'Employee Number': emp.employee_number,
      'First Name (EN)': emp.first_name_en,
      'Last Name (EN)': emp.last_name_en,
      'First Name (AR)': emp.first_name_ar || '',
      'Last Name (AR)': emp.last_name_ar || '',
      Email: emp.email || '',
      Phone: emp.phone || '',
      Nationality: emp.nationality,
      'Is Saudi': emp.is_saudi ? 'Yes' : 'No',
      Gender: emp.gender,
      'Date of Birth': emp.date_of_birth || '',
      'Hire Date': emp.hire_date,
      'Job Title (EN)': emp.job_title_en,
      'Job Title (AR)': emp.job_title_ar || '',
      'Employment Type': emp.employment_type,
      Status: emp.status,
      'Iqama Number': emp.iqama_number || '',
      'Iqama Expiry': emp.iqama_expiry || '',
      'Passport Number': emp.passport_number || '',
      'Passport Expiry': emp.passport_expiry || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, `employees_${currentCompany?.name_en}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const getActiveFilters = () => {
    const filters = [];
    const statusFilter = searchParams.get('status');
    const nationalityFilter = searchParams.get('nationality');
    const genderFilter = searchParams.get('gender');

    if (statusFilter) filters.push({ key: 'status', label: `Status: ${statusFilter}` });
    if (nationalityFilter) filters.push({ key: 'nationality', label: `Nationality: ${nationalityFilter}` });
    if (genderFilter) filters.push({ key: 'gender', label: `Gender: ${genderFilter}` });

    return filters;
  };

  const activeFilters = getActiveFilters();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t.employees.title}</h1>
          <p className="text-gray-600 mt-1">{t.employees.subtitle}</p>
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {activeFilters.map(filter => (
                <span
                  key={filter.key}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                >
                  {filter.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleExport}
            className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="h-4 w-4" />
            <span>{t.employees.exportData}</span>
          </button>
          <button
            onClick={() => setShowBulkUpload(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Upload className="h-4 w-4" />
            <span>{t.employees.bulkUpload}</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="h-4 w-4" />
            <span>{t.employees.addEmployee}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400`} />
              <input
                type="text"
                placeholder={t.employees.searchEmployees}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500`}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-md transition-colors ${showFilters ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-gray-300 hover:bg-gray-50'} ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Filter className="h-4 w-4" />
              <span>{t.common.filters}</span>
              {hasActiveFilters && (
                <span className="ml-1 px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
                  {[filterNationality, filterDepartment, filterIqamaExpiry, filterSalaryMin || filterSalaryMax].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Nationality Filter */}
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.employees.nationality}
                  </label>
                  <select
                    value={filterNationality}
                    onChange={(e) => setFilterNationality(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">{t.common.all}</option>
                    <option value="saudi">{t.employees.saudi}</option>
                    <option value="non-saudi">{t.employees.nonSaudi}</option>
                    <optgroup label={t.employees.specificCountries}>
                      {getUniqueNationalities().map(nat => (
                        <option key={nat} value={nat}>{nat}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Department Filter */}
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.common.department}
                  </label>
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">{t.common.all}</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {language === 'ar' && dept.name_ar ? dept.name_ar : dept.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Iqama Expiry Filter */}
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.employees.iqamaExpiry}
                  </label>
                  <select
                    value={filterIqamaExpiry}
                    onChange={(e) => setFilterIqamaExpiry(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">{t.common.all}</option>
                    <option value="expired">{t.employees.expired}</option>
                    <option value="30days">{t.employees.expiring30Days}</option>
                    <option value="60days">{t.employees.expiring60Days}</option>
                    <option value="90days">{t.employees.expiring90Days}</option>
                  </select>
                </div>

                {/* Salary Range Start */}
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.employees.salaryRange}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder={t.employees.min}
                      value={filterSalaryMin}
                      onChange={(e) => setFilterSalaryMin(e.target.value)}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="number"
                      placeholder={t.employees.max}
                      value={filterSalaryMax}
                      onChange={(e) => setFilterSalaryMax(e.target.value)}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Filter Actions */}
              {hasActiveFilters && (
                <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                  <button
                    onClick={handleClearFilters}
                    className={`flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <X className="h-4 w-4" />
                    <span>{t.common.clearFilters}</span>
                  </button>
                </div>
              )}

              {/* Active Filters Summary */}
              {hasActiveFilters && (
                <div className={`flex flex-wrap gap-2 pt-2 border-t border-gray-200 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-sm text-gray-600">{t.common.activeFilters}:</span>
                  {filterNationality && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {t.employees.nationality}: {filterNationality === 'saudi' ? t.employees.saudi : filterNationality === 'non-saudi' ? t.employees.nonSaudi : filterNationality}
                    </span>
                  )}
                  {filterDepartment && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {t.common.department}: {departments.find(d => d.id === filterDepartment)?.name_en}
                    </span>
                  )}
                  {filterIqamaExpiry && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                      {t.employees.iqamaExpiry}: {filterIqamaExpiry === 'expired' ? t.employees.expired : filterIqamaExpiry === '30days' ? t.employees.expiring30Days : filterIqamaExpiry === '60days' ? t.employees.expiring60Days : t.employees.expiring90Days}
                    </span>
                  )}
                  {(filterSalaryMin || filterSalaryMax) && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                      {t.employees.salary}: {filterSalaryMin || '0'} - {filterSalaryMax || '∞'}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <p className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.common.showing} <span className="font-semibold text-gray-900">{filteredEmployees.length}</span> {t.common.of} <span className="font-semibold text-gray-900">{employees.length}</span> {t.employees.totalRecords}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader
                  label={t.employees.employeeNumber}
                  sortKey="employee_number"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.common.name}
                  sortKey="first_name_en"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.employees.jobTitle}
                  sortKey="job_title_en"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.employees.iqamaNumber}
                  sortKey="iqama_number"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.employees.iqamaExpiry}
                  sortKey="iqama_expiry"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.employees.nationality}
                  sortKey="nationality"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.common.status}
                  sortKey="status"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.employees.hireDate}
                  sortKey="hire_date"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <th className={`px-6 py-3 ${isRTL ? 'text-left' : 'text-right'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No employees found. Click "Add Employee" or "Bulk Upload" to get started.
                  </td>
                </tr>
              ) : (
                sortedData.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {employee.employee_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.first_name_en} {employee.last_name_en}
                      </div>
                      <div className="text-sm text-gray-500">{employee.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.job_title_en}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.iqama_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.iqama_expiry ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          new Date(employee.iqama_expiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {new Date(employee.iqama_expiry).toLocaleDateString()}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        employee.is_saudi
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {employee.nationality}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        employee.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : employee.status === 'on_leave'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(employee.hire_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleView(employee.id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(employee)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-700">
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
        </div>
      </div>

      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          onClose={handleFormClose}
          onSuccess={fetchEmployees}
        />
      )}

      {showBulkUpload && (
        <BulkUpload
          onClose={() => setShowBulkUpload(false)}
          onSuccess={fetchEmployees}
        />
      )}

      {showDetail && selectedEmployeeId && (
        <EmployeeDetail
          employeeId={selectedEmployeeId}
          onClose={() => {
            setShowDetail(false);
            setSelectedEmployeeId(null);
          }}
        />
      )}
    </div>
  );
}
