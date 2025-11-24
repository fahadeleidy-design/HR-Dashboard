import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types/database';
import { Plus, Upload, Download, Pencil, Trash2, Search, Eye, Filter, X, ChevronDown, Users, Building2, Calendar, DollarSign, RefreshCw } from 'lucide-react';
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
  const [filterPreset, setFilterPreset] = useState('');
  const [isFilterAnimating, setIsFilterAnimating] = useState(false);

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
    setIsFilterAnimating(true);
    setTimeout(() => {
      setFilterNationality('');
      setFilterDepartment('');
      setFilterIqamaExpiry('');
      setFilterSalaryMin('');
      setFilterSalaryMax('');
      setFilterPreset('');
      setIsFilterAnimating(false);
    }, 150);
  };

  const applyFilterPreset = (preset: string) => {
    setFilterPreset(preset);
    setIsFilterAnimating(true);

    setTimeout(() => {
      switch(preset) {
        case 'expiring-soon':
          setFilterNationality('');
          setFilterDepartment('');
          setFilterIqamaExpiry('30days');
          setFilterSalaryMin('');
          setFilterSalaryMax('');
          break;
        case 'saudi-only':
          setFilterNationality('saudi');
          setFilterDepartment('');
          setFilterIqamaExpiry('');
          setFilterSalaryMin('');
          setFilterSalaryMax('');
          break;
        case 'non-saudi':
          setFilterNationality('non-saudi');
          setFilterDepartment('');
          setFilterIqamaExpiry('');
          setFilterSalaryMin('');
          setFilterSalaryMax('');
          break;
        case 'high-salary':
          setFilterNationality('');
          setFilterDepartment('');
          setFilterIqamaExpiry('');
          setFilterSalaryMin('10000');
          setFilterSalaryMax('');
          break;
        default:
          handleClearFilters();
      }
      setIsFilterAnimating(false);
    }, 150);
  };

  const removeFilter = (filterType: string) => {
    setIsFilterAnimating(true);
    setTimeout(() => {
      switch(filterType) {
        case 'nationality':
          setFilterNationality('');
          break;
        case 'department':
          setFilterDepartment('');
          break;
        case 'iqama':
          setFilterIqamaExpiry('');
          break;
        case 'salary':
          setFilterSalaryMin('');
          setFilterSalaryMax('');
          break;
      }
      setIsFilterAnimating(false);
    }, 100);
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
              className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-lg font-medium transition-all duration-200 ${showFilters ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-200' : 'bg-white border-gray-300 text-gray-700 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700'} ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Filter className="h-4 w-4" />
              <span>{t.common.filters}</span>
              {hasActiveFilters && (
                <span className={`ml-1 px-2 py-0.5 text-xs font-semibold rounded-full animate-pulse ${showFilters ? 'bg-white text-primary-600' : 'bg-primary-600 text-white'}`}>
                  {[filterNationality, filterDepartment, filterIqamaExpiry, filterSalaryMin || filterSalaryMax].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className={`bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 space-y-6 border border-gray-200 shadow-sm transition-all duration-300 ${isFilterAnimating ? 'opacity-50' : 'opacity-100'}`}>
              {/* Quick Filter Presets */}
              <div className="space-y-2">
                <p className={`text-xs font-semibold text-gray-500 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.employees.quickFilters}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => applyFilterPreset('expiring-soon')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${filterPreset === 'expiring-soon' ? 'bg-orange-500 text-white shadow-md scale-105' : 'bg-white text-gray-700 border border-gray-300 hover:border-orange-500 hover:text-orange-600 hover:shadow'}`}
                  >
                    <Calendar className="h-4 w-4" />
                    <span>{t.employees.expiringSoon}</span>
                  </button>
                  <button
                    onClick={() => applyFilterPreset('saudi-only')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${filterPreset === 'saudi-only' ? 'bg-green-500 text-white shadow-md scale-105' : 'bg-white text-gray-700 border border-gray-300 hover:border-green-500 hover:text-green-600 hover:shadow'}`}
                  >
                    <Users className="h-4 w-4" />
                    <span>{t.employees.saudiOnly}</span>
                  </button>
                  <button
                    onClick={() => applyFilterPreset('non-saudi')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${filterPreset === 'non-saudi' ? 'bg-blue-500 text-white shadow-md scale-105' : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500 hover:text-blue-600 hover:shadow'}`}
                  >
                    <Users className="h-4 w-4" />
                    <span>{t.employees.nonSaudiOnly}</span>
                  </button>
                  <button
                    onClick={() => applyFilterPreset('high-salary')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${filterPreset === 'high-salary' ? 'bg-purple-500 text-white shadow-md scale-105' : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-500 hover:text-purple-600 hover:shadow'}`}
                  >
                    <DollarSign className="h-4 w-4" />
                    <span>{t.employees.highSalary}</span>
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearFilters}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-red-600 border border-red-300 hover:bg-red-50 hover:border-red-400 transition-all duration-200"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>{t.common.clearAll}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200"></div>

              {/* Advanced Filters */}
              <div className="space-y-2">
                <p className={`text-xs font-semibold text-gray-500 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.employees.advancedFilters}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Nationality Filter */}
                <div className="group">
                  <label className={`flex items-center gap-2 text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}>
                    <Users className="h-4 w-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                    {t.employees.nationality}
                  </label>
                  <div className="relative">
                    <select
                      value={filterNationality}
                      onChange={(e) => setFilterNationality(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all duration-200 appearance-none cursor-pointer hover:border-gray-300"
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
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Department Filter */}
                <div className="group">
                  <label className={`flex items-center gap-2 text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}>
                    <Building2 className="h-4 w-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                    {t.common.department}
                  </label>
                  <div className="relative">
                    <select
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all duration-200 appearance-none cursor-pointer hover:border-gray-300"
                    >
                      <option value="">{t.common.all}</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {language === 'ar' && dept.name_ar ? dept.name_ar : dept.name_en}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Iqama Expiry Filter */}
                <div className="group">
                  <label className={`flex items-center gap-2 text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}>
                    <Calendar className="h-4 w-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                    {t.employees.iqamaExpiry}
                  </label>
                  <div className="relative">
                    <select
                      value={filterIqamaExpiry}
                      onChange={(e) => setFilterIqamaExpiry(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all duration-200 appearance-none cursor-pointer hover:border-gray-300"
                    >
                      <option value="">{t.common.all}</option>
                      <option value="expired">{t.employees.expired}</option>
                      <option value="30days">{t.employees.expiring30Days}</option>
                      <option value="60days">{t.employees.expiring60Days}</option>
                      <option value="90days">{t.employees.expiring90Days}</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Salary Range */}
                <div className="group">
                  <label className={`flex items-center gap-2 text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}>
                    <DollarSign className="h-4 w-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                    {t.employees.salaryRange}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder={t.employees.min}
                      value={filterSalaryMin}
                      onChange={(e) => setFilterSalaryMin(e.target.value)}
                      className="w-1/2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all duration-200 hover:border-gray-300"
                    />
                    <input
                      type="number"
                      placeholder={t.employees.max}
                      value={filterSalaryMax}
                      onChange={(e) => setFilterSalaryMax(e.target.value)}
                      className="w-1/2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all duration-200 hover:border-gray-300"
                    />
                  </div>
                </div>
              </div>
            </div>
            </div>
          )}

          {/* Active Filter Chips - Outside filter panel, always visible */}
          {hasActiveFilters && !showFilters && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className={`flex flex-wrap gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-500">
                  {t.common.activeFilters}:
                </span>
                {filterNationality && (
                  <button
                    onClick={() => removeFilter('nationality')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-full hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow group"
                  >
                    <Users className="h-3 w-3" />
                    <span>{filterNationality === 'saudi' ? t.employees.saudi : filterNationality === 'non-saudi' ? t.employees.nonSaudi : filterNationality}</span>
                    <X className="h-3 w-3 opacity-70 group-hover:opacity-100" />
                  </button>
                )}
                {filterDepartment && (
                  <button
                    onClick={() => removeFilter('department')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-medium rounded-full hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow group"
                  >
                    <Building2 className="h-3 w-3" />
                    <span>{departments.find(d => d.id === filterDepartment)?.name_en}</span>
                    <X className="h-3 w-3 opacity-70 group-hover:opacity-100" />
                  </button>
                )}
                {filterIqamaExpiry && (
                  <button
                    onClick={() => removeFilter('iqama')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-medium rounded-full hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-sm hover:shadow group"
                  >
                    <Calendar className="h-3 w-3" />
                    <span>{filterIqamaExpiry === 'expired' ? t.employees.expired : filterIqamaExpiry === '30days' ? t.employees.expiring30Days : filterIqamaExpiry === '60days' ? t.employees.expiring60Days : t.employees.expiring90Days}</span>
                    <X className="h-3 w-3 opacity-70 group-hover:opacity-100" />
                  </button>
                )}
                {(filterSalaryMin || filterSalaryMax) && (
                  <button
                    onClick={() => removeFilter('salary')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-medium rounded-full hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow group"
                  >
                    <DollarSign className="h-3 w-3" />
                    <span>{filterSalaryMin || '0'} - {filterSalaryMax || '∞'}</span>
                    <X className="h-3 w-3 opacity-70 group-hover:opacity-100" />
                  </button>
                )}
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full hover:bg-gray-200 transition-all duration-200"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>{t.common.clearAll}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 leading-none">{t.employees.totalRecords}</p>
                <p className="text-sm font-bold text-gray-900 leading-tight mt-0.5">
                  {t.common.showing} <span className="text-primary-600">{filteredEmployees.length}</span>
                  {filteredEmployees.length !== employees.length && (
                    <span className="text-gray-400"> / {employees.length}</span>
                  )}
                </p>
              </div>
            </div>
            {filteredEmployees.length !== employees.length && (
              <div className="ml-auto">
                <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 ease-out"
                    style={{ width: `${(filteredEmployees.length / employees.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
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
