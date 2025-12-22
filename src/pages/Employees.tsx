import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types/database';
import { Plus, Upload, Download, Pencil, Trash2, Search, Eye, Filter, X, ChevronDown, Users, Building2, Calendar, DollarSign, RefreshCw, Check, FileText, Mail, Phone, Briefcase, CheckSquare, Settings, Grid, List, AlertTriangle, Clock, MapPin, UserCheck, UserX, Archive, Activity, Bookmark, BarChart3, Zap, Command } from 'lucide-react';
import { EmployeeForm } from '@/components/EmployeeForm';
import { BulkUpload } from '@/components/BulkUpload';
import { EmployeeDetail } from '@/components/EmployeeDetail';
import { ScrollableTable } from '@/components/ScrollableTable';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';
import { EmployeeQuickActions } from '@/components/employees/EmployeeQuickActions';
import { SavedViewsManager } from '@/components/employees/SavedViewsManager';
import { EmployeeAnalyticsDashboard } from '@/components/employees/EmployeeAnalyticsDashboard';
import { EmployeeLifecycleTracker } from '@/components/employees/EmployeeLifecycleTracker';
import { EmployeeKeyboardShortcuts } from '@/components/employees/EmployeeKeyboardShortcuts';
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

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

export function Employees() {
  const { currentCompany } = useCompany();
  const { t, isRTL, language } = useLanguage();
  const { userRole } = useAuth();
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

  const [filterNationality, setFilterNationality] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterIqamaExpiry, setFilterIqamaExpiry] = useState('');
  const [filterSalaryMin, setFilterSalaryMin] = useState('');
  const [filterSalaryMax, setFilterSalaryMax] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterPreset, setFilterPreset] = useState('');
  const [isFilterAnimating, setIsFilterAnimating] = useState(false);

  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showSavedViews, setShowSavedViews] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showLifecycleTracker, setShowLifecycleTracker] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'employee_number', label: 'Employee Number', visible: true },
    { key: 'name', label: 'Name', visible: true },
    { key: 'job_title', label: 'Job Title', visible: true },
    { key: 'department', label: 'Department', visible: true },
    { key: 'iqama_number', label: 'Iqama Number', visible: true },
    { key: 'iqama_expiry', label: 'Iqama Expiry', visible: true },
    { key: 'nationality', label: 'Nationality', visible: true },
    { key: 'status', label: 'Status', visible: true },
    { key: 'hire_date', label: 'Hire Date', visible: true },
    { key: 'email', label: 'Email', visible: false },
    { key: 'phone', label: 'Phone', visible: false },
    { key: 'salary', label: 'Salary', visible: false },
  ]);

  useEffect(() => {
    if (currentCompany) {
      fetchEmployees();
      fetchDepartments();
      subscribeToChanges();
    }
  }, [currentCompany]);

  useEffect(() => {
    filterEmployees();
  }, [searchTerm, employees, searchParams, filterNationality, filterDepartment, filterIqamaExpiry, filterSalaryMin, filterSalaryMax, filterStatus]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 'k':
            e.preventDefault();
            document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
            break;
          case 'n':
            e.preventDefault();
            setShowForm(true);
            break;
          case 'e':
            e.preventDefault();
            if (userRole?.role === 'super_admin') handleExport();
            break;
          case 'u':
            e.preventDefault();
            if (userRole?.role === 'super_admin') setShowBulkUpload(true);
            break;
          case 'f':
            e.preventDefault();
            setShowFilters(!showFilters);
            break;
          case 's':
            e.preventDefault();
            setShowSavedViews(true);
            break;
          case 'v':
            e.preventDefault();
            setShowSavedViews(true);
            break;
          case 'a':
            e.preventDefault();
            setShowAnalytics(true);
            break;
          case 'l':
            e.preventDefault();
            setShowLifecycleTracker(true);
            break;
          case '1':
            e.preventDefault();
            setViewMode('table');
            break;
          case '2':
            e.preventDefault();
            setViewMode('cards');
            break;
        }
      } else if (e.key === '?') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showFilters, userRole]);

  const { sortedData, sortConfig, requestSort } = useSortableData(filteredEmployees);

  const fetchEmployees = async () => {
    if (!currentCompany) {
      console.log('No company context available');
      setLoading(false);
      return;
    }

    console.log('Fetching employees for company:', currentCompany.id);
    setLoading(true);
    try {
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*, departments!employees_department_id_fkey(name_en, name_ar)')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        throw employeesError;
      }

      console.log('Fetched employees:', employeesData?.length || 0);

      const { data: payrollData, error: payrollError } = await supabase
        .from('payroll')
        .select('employee_id, basic_salary')
        .eq('company_id', currentCompany.id);

      if (payrollError) console.error('Error fetching payroll:', payrollError);

      const enrichedEmployees = (employeesData || []).map(emp => {
        const payroll = payrollData?.filter(p => p.employee_id === emp.id) || [];
        return {
          ...emp,
          payroll: payroll
        };
      });

      setEmployees(enrichedEmployees);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      alert(`Failed to load employees: ${error.message || 'Unknown error'}. Please check the console for details.`);
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

    const statusFilter = searchParams.get('status') || filterStatus;
    const nationalityFilterParam = searchParams.get('nationality');
    const genderFilter = searchParams.get('gender');

    if (statusFilter) {
      filtered = filtered.filter(emp => emp.status === statusFilter);
    }

    if (nationalityFilterParam === 'saudi') {
      filtered = filtered.filter(emp => emp.is_saudi === true);
    } else if (nationalityFilterParam === 'non-saudi') {
      filtered = filtered.filter(emp => emp.is_saudi === false);
    }

    if (genderFilter) {
      filtered = filtered.filter(emp => emp.gender === genderFilter);
    }

    if (filterNationality) {
      if (filterNationality === 'saudi') {
        filtered = filtered.filter(emp => emp.is_saudi === true);
      } else if (filterNationality === 'non-saudi') {
        filtered = filtered.filter(emp => emp.is_saudi === false);
      } else {
        filtered = filtered.filter(emp => emp.nationality.toLowerCase() === filterNationality.toLowerCase());
      }
    }

    if (filterDepartment && filterDepartment !== '') {
      filtered = filtered.filter(emp => emp.department_id === filterDepartment);
    }

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

    if (filterSalaryMin || filterSalaryMax) {
      filtered = filtered.filter(emp => {
        const salary = emp.payroll && emp.payroll.length > 0 ? emp.payroll[0].basic_salary : 0;
        const min = filterSalaryMin ? parseFloat(filterSalaryMin) : 0;
        const max = filterSalaryMax ? parseFloat(filterSalaryMax) : Infinity;

        if (salary === 0 && filterSalaryMin) return false;

        return salary >= min && salary <= max;
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.first_name_en.toLowerCase().includes(term) ||
          emp.last_name_en.toLowerCase().includes(term) ||
          emp.employee_number.toLowerCase().includes(term) ||
          emp.email?.toLowerCase().includes(term) ||
          emp.nationality.toLowerCase().includes(term) ||
          emp.job_title_en.toLowerCase().includes(term) ||
          emp.iqama_number?.toLowerCase().includes(term)
      );
    }

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

  const handleBulkDelete = async () => {
    if (selectedEmployees.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedEmployees.size} employee(s)?`)) return;

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .in('id', Array.from(selectedEmployees));

      if (error) throw error;
      setSelectedEmployees(new Set());
    } catch (error) {
      console.error('Error deleting employees:', error);
      alert('Failed to delete employees');
    }
  };

  const handleBulkStatusChange = async (status: 'active' | 'on_leave' | 'terminated') => {
    if (selectedEmployees.size === 0) return;

    try {
      const { error } = await supabase
        .from('employees')
        .update({ status })
        .in('id', Array.from(selectedEmployees));

      if (error) throw error;
      setSelectedEmployees(new Set());
      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee status:', error);
      alert('Failed to update employee status');
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
      setFilterStatus('');
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
          setFilterStatus('');
          break;
        case 'saudi-only':
          setFilterNationality('saudi');
          setFilterDepartment('');
          setFilterIqamaExpiry('');
          setFilterSalaryMin('');
          setFilterSalaryMax('');
          setFilterStatus('');
          break;
        case 'non-saudi':
          setFilterNationality('non-saudi');
          setFilterDepartment('');
          setFilterIqamaExpiry('');
          setFilterSalaryMin('');
          setFilterSalaryMax('');
          setFilterStatus('');
          break;
        case 'active':
          setFilterNationality('');
          setFilterDepartment('');
          setFilterIqamaExpiry('');
          setFilterSalaryMin('');
          setFilterSalaryMax('');
          setFilterStatus('active');
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
        case 'status':
          setFilterStatus('');
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

  const hasActiveFilters = filterNationality || filterDepartment || filterIqamaExpiry || filterSalaryMin || filterSalaryMax || filterStatus;

  const handleExport = () => {
    const exportData = filteredEmployees.map((emp) => ({
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
      Department: emp.department?.name_en || '',
      'Basic Salary': emp.payroll && emp.payroll.length > 0 ? emp.payroll[0].basic_salary : 0,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, `employees_${currentCompany?.name_en}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map(emp => emp.id)));
    }
  };

  const toggleSelectEmployee = (id: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEmployees(newSelected);
  };

  const toggleColumn = (key: string) => {
    setColumns(columns.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  const handleLoadView = useCallback((view: any) => {
    setFilterNationality(view.filter_config.nationality || '');
    setFilterDepartment(view.filter_config.department || '');
    setFilterIqamaExpiry(view.filter_config.iqamaExpiry || '');
    setFilterSalaryMin(view.filter_config.salaryMin || '');
    setFilterSalaryMax(view.filter_config.salaryMax || '');
    setFilterStatus(view.filter_config.status || '');
    setColumns(view.column_config);
    setShowSavedViews(false);
  }, []);

  const getStatistics = () => {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'active').length;
    const onLeave = employees.filter(e => e.status === 'on_leave').length;
    const terminated = employees.filter(e => e.status === 'terminated').length;
    const saudi = employees.filter(e => e.is_saudi).length;
    const nonSaudi = employees.filter(e => !e.is_saudi).length;

    const expiringSoon = employees.filter(emp => {
      if (!emp.iqama_expiry) return false;
      const today = new Date();
      const expiryDate = new Date(emp.iqama_expiry);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
    }).length;

    const avgSalary = employees.reduce((sum, emp) => {
      const salary = emp.payroll && emp.payroll.length > 0 ? emp.payroll[0].basic_salary : 0;
      return sum + salary;
    }, 0) / (employees.length || 1);

    return { total, active, onLeave, terminated, saudi, nonSaudi, expiringSoon, avgSalary };
  };

  const stats = getStatistics();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const currentFilters = {
    nationality: filterNationality,
    department: filterDepartment,
    iqamaExpiry: filterIqamaExpiry,
    salaryMin: filterSalaryMin,
    salaryMax: filterSalaryMax,
    status: filterStatus
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{t.employees.title}</h1>
            <button
              onClick={() => setShowStats(!showStats)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Toggle Statistics"
            >
              <Activity className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => setShowKeyboardShortcuts(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Keyboard Shortcuts"
            >
              <Command className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <p className="text-gray-600 mt-1">{t.employees.subtitle}</p>
        </div>
        <div className={`flex gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={fetchEmployees}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow text-sm"
            title="Refresh employee data"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowLifecycleTracker(true)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow text-sm"
            title="Ctrl + L"
          >
            <Clock className="h-4 w-4" />
            <span>Lifecycle</span>
          </button>
          <button
            onClick={() => setShowAnalytics(true)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow text-sm"
            title="Ctrl + A"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </button>
          <button
            onClick={() => setShowSavedViews(true)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow text-sm"
            title="Ctrl + V"
          >
            <Bookmark className="h-4 w-4" />
            <span>Views</span>
          </button>
          {userRole?.role === 'super_admin' && (
            <>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow text-sm"
                title="Ctrl + E"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              <button
                onClick={() => setShowBulkUpload(true)}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm hover:shadow text-sm"
                title="Ctrl + U"
              >
                <Upload className="h-4 w-4" />
                <span>Import</span>
              </button>
            </>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all shadow-sm hover:shadow"
            title="Ctrl + N"
          >
            <Plus className="h-4 w-4" />
            <span>{t.employees.addEmployee}</span>
          </button>
        </div>
      </div>

      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => applyFilterPreset('active')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active</p>
                <p className="text-2xl font-bold text-green-900">{stats.active}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">On Leave</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.onLeave}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Terminated</p>
                <p className="text-2xl font-bold text-red-900">{stats.terminated}</p>
              </div>
              <UserX className="h-8 w-8 text-red-500 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => applyFilterPreset('saudi-only')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Saudi</p>
                <p className="text-2xl font-bold text-emerald-900">{stats.saudi}</p>
              </div>
              <MapPin className="h-8 w-8 text-emerald-500 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-4 border border-cyan-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => applyFilterPreset('non-saudi')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-600">Non-Saudi</p>
                <p className="text-2xl font-bold text-cyan-900">{stats.nonSaudi}</p>
              </div>
              <Building2 className="h-8 w-8 text-cyan-500 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => applyFilterPreset('expiring-soon')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Expiring</p>
                <p className="text-2xl font-bold text-orange-900">{stats.expiringSoon}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg p-4 border border-violet-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-violet-600">Avg Salary</p>
                <p className="text-2xl font-bold text-violet-900">{Math.round(stats.avgSalary).toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-violet-500 opacity-80" />
            </div>
          </div>
        </div>
      )}

      {selectedEmployees.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">
              {selectedEmployees.size} employee{selectedEmployees.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange('active')}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <UserCheck className="h-4 w-4" />
              Active
            </button>
            <button
              onClick={() => handleBulkStatusChange('on_leave')}
              className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <Clock className="h-4 w-4" />
              Leave
            </button>
            <button
              onClick={() => handleBulkStatusChange('terminated')}
              className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <Archive className="h-4 w-4" />
              Terminate
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <button
              onClick={() => setSelectedEmployees(new Set())}
              className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400`} />
              <input
                type="text"
                placeholder={`${t.employees.searchEmployees} (Ctrl + K)`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all`}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-lg font-medium transition-all duration-200 ${showFilters ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-200' : 'bg-white border-gray-300 text-gray-700 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700'} ${isRTL ? 'flex-row-reverse' : ''}`}
              title="Ctrl + F"
            >
              <Filter className="h-4 w-4" />
              <span>{t.common.filters}</span>
              {hasActiveFilters && (
                <span className={`ml-1 px-2 py-0.5 text-xs font-semibold rounded-full animate-pulse ${showFilters ? 'bg-white text-primary-600' : 'bg-primary-600 text-white'}`}>
                  {[filterNationality, filterDepartment, filterIqamaExpiry, filterSalaryMin || filterSalaryMax, filterStatus].filter(Boolean).length}
                </span>
              )}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowColumnSettings(!showColumnSettings)}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all font-medium text-gray-700"
              >
                <Settings className="h-4 w-4" />
                <span>Columns</span>
              </button>
              {showColumnSettings && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowColumnSettings(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">Column Visibility</h3>
                    </div>
                    <div className="p-2">
                      {columns.map(col => (
                        <label key={col.key} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.visible}
                            onChange={() => toggleColumn(col.key)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center border-2 border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2.5 transition-colors ${viewMode === 'table' ? 'bg-primary-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title="Ctrl + 1"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2.5 transition-colors border-l-2 border-gray-300 ${viewMode === 'cards' ? 'bg-primary-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title="Ctrl + 2"
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className={`bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 space-y-6 border border-gray-200 shadow-sm transition-all duration-300 ${isFilterAnimating ? 'opacity-50' : 'opacity-100'}`}>
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
                    onClick={() => applyFilterPreset('active')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${filterPreset === 'active' ? 'bg-emerald-500 text-white shadow-md scale-105' : 'bg-white text-gray-700 border border-gray-300 hover:border-emerald-500 hover:text-emerald-600 hover:shadow'}`}
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Active Only</span>
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

              <div className="border-t border-gray-200"></div>

              <div className="space-y-2">
                <p className={`text-xs font-semibold text-gray-500 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.employees.advancedFilters}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

                  <div className="group">
                    <label className={`flex items-center gap-2 text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}>
                      <Activity className="h-4 w-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                      Status
                    </label>
                    <div className="relative">
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all duration-200 appearance-none cursor-pointer hover:border-gray-300"
                      >
                        <option value="">{t.common.all}</option>
                        <option value="active">Active</option>
                        <option value="on_leave">On Leave</option>
                        <option value="terminated">Terminated</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

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
                {filterStatus && (
                  <button
                    onClick={() => removeFilter('status')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-medium rounded-full hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-sm hover:shadow group"
                  >
                    <Activity className="h-3 w-3" />
                    <span>{filterStatus}</span>
                    <X className="h-3 w-3 opacity-70 group-hover:opacity-100" />
                  </button>
                )}
                {(filterSalaryMin || filterSalaryMax) && (
                  <button
                    onClick={() => removeFilter('salary')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-violet-600 text-white text-xs font-medium rounded-full hover:from-violet-600 hover:to-violet-700 transition-all duration-200 shadow-sm hover:shadow group"
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

        {viewMode === 'table' ? (
          <ScrollableTable maxHeight="calc(100vh - 450px)">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  {columns.find(c => c.key === 'employee_number')?.visible && (
                    <SortableTableHeader
                      label={t.employees.employeeNumber}
                      sortKey="employee_number"
                      currentSort={sortConfig}
                      onSort={requestSort}
                    />
                  )}
                  {columns.find(c => c.key === 'name')?.visible && (
                    <SortableTableHeader
                      label={t.common.name}
                      sortKey="first_name_en"
                      currentSort={sortConfig}
                      onSort={requestSort}
                    />
                  )}
                  {columns.find(c => c.key === 'job_title')?.visible && (
                    <SortableTableHeader
                      label={t.employees.jobTitle}
                      sortKey="job_title_en"
                      currentSort={sortConfig}
                      onSort={requestSort}
                    />
                  )}
                  {columns.find(c => c.key === 'department')?.visible && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                  )}
                  {columns.find(c => c.key === 'iqama_number')?.visible && (
                    <SortableTableHeader
                      label={t.employees.iqamaNumber}
                      sortKey="iqama_number"
                      currentSort={sortConfig}
                      onSort={requestSort}
                    />
                  )}
                  {columns.find(c => c.key === 'iqama_expiry')?.visible && (
                    <SortableTableHeader
                      label={t.employees.iqamaExpiry}
                      sortKey="iqama_expiry"
                      currentSort={sortConfig}
                      onSort={requestSort}
                    />
                  )}
                  {columns.find(c => c.key === 'nationality')?.visible && (
                    <SortableTableHeader
                      label={t.employees.nationality}
                      sortKey="nationality"
                      currentSort={sortConfig}
                      onSort={requestSort}
                    />
                  )}
                  {columns.find(c => c.key === 'status')?.visible && (
                    <SortableTableHeader
                      label={t.common.status}
                      sortKey="status"
                      currentSort={sortConfig}
                      onSort={requestSort}
                    />
                  )}
                  {columns.find(c => c.key === 'hire_date')?.visible && (
                    <SortableTableHeader
                      label={t.employees.hireDate}
                      sortKey="hire_date"
                      currentSort={sortConfig}
                      onSort={requestSort}
                    />
                  )}
                  {columns.find(c => c.key === 'email')?.visible && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                  )}
                  {columns.find(c => c.key === 'phone')?.visible && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                  )}
                  {columns.find(c => c.key === 'salary')?.visible && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salary
                    </th>
                  )}
                  <th className={`px-6 py-3 ${isRTL ? 'text-left' : 'text-right'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    {t.common.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Users className="h-12 w-12 text-gray-300" />
                        <p className="text-gray-500 font-medium">No employees found</p>
                        {employees.length === 0 ? (
                          <>
                            <p className="text-sm text-gray-400">Click "Add Employee" or use keyboard shortcut Ctrl + N</p>
                            <button
                              onClick={() => setShowForm(true)}
                              className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                              Add Your First Employee
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-400">
                              {filteredEmployees.length === 0 && employees.length > 0
                                ? `All ${employees.length} employees are hidden by active filters`
                                : 'Try adjusting your search or filters'}
                            </p>
                            {hasActiveFilters && (
                              <button
                                onClick={handleClearFilters}
                                className="mt-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                              >
                                <RefreshCw className="h-4 w-4" />
                                Clear All Filters
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedData.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.has(employee.id)}
                          onChange={() => toggleSelectEmployee(employee.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      {columns.find(c => c.key === 'employee_number')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {employee.employee_number}
                        </td>
                      )}
                      {columns.find(c => c.key === 'name')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold shadow-sm">
                              {employee.first_name_en.charAt(0)}{employee.last_name_en.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {employee.first_name_en} {employee.last_name_en}
                              </div>
                              {columns.find(c => c.key === 'email')?.visible === false && employee.email && (
                                <div className="text-sm text-gray-500">{employee.email}</div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      {columns.find(c => c.key === 'job_title')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-gray-400" />
                            {employee.job_title_en}
                          </div>
                        </td>
                      )}
                      {columns.find(c => c.key === 'department')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.departments?.name_en || '-'}
                        </td>
                      )}
                      {columns.find(c => c.key === 'iqama_number')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.iqama_number || '-'}
                        </td>
                      )}
                      {columns.find(c => c.key === 'iqama_expiry')?.visible && (
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
                      )}
                      {columns.find(c => c.key === 'nationality')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            employee.is_saudi
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {employee.nationality}
                          </span>
                        </td>
                      )}
                      {columns.find(c => c.key === 'status')?.visible && (
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
                      )}
                      {columns.find(c => c.key === 'hire_date')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(employee.hire_date).toLocaleDateString()}
                        </td>
                      )}
                      {columns.find(c => c.key === 'email')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.email || '-'}
                        </td>
                      )}
                      {columns.find(c => c.key === 'phone')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.phone || '-'}
                        </td>
                      )}
                      {columns.find(c => c.key === 'salary')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.payroll && employee.payroll.length > 0
                            ? `${employee.payroll[0].basic_salary.toLocaleString()} SAR`
                            : '-'
                          }
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleView(employee.id)}
                            className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(employee)}
                            className="text-primary-600 hover:text-primary-900 p-1 hover:bg-primary-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <EmployeeQuickActions
                            employee={employee}
                            onView={() => handleView(employee.id)}
                            onEdit={() => handleEdit(employee)}
                            onDelete={() => handleDelete(employee.id)}
                            onStatusChange={(status) => handleBulkStatusChange(status)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollableTable>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedData.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12 space-y-3">
                  <Users className="h-12 w-12 text-gray-300" />
                  <p className="text-gray-500 font-medium">No employees found</p>
                  {employees.length === 0 ? (
                    <>
                      <p className="text-sm text-gray-400">Click "Add Employee" or use keyboard shortcut Ctrl + N</p>
                      <button
                        onClick={() => setShowForm(true)}
                        className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Add Your First Employee
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-400">
                        {filteredEmployees.length === 0 && employees.length > 0
                          ? `All ${employees.length} employees are hidden by active filters`
                          : 'Try adjusting your search or filters'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleClearFilters}
                          className="mt-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Clear All Filters
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                sortedData.map((employee) => (
                  <div
                    key={employee.id}
                    className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                    onClick={() => handleView(employee.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {employee.first_name_en.charAt(0)}{employee.last_name_en.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                            {employee.first_name_en} {employee.last_name_en}
                          </h3>
                          <p className="text-xs text-gray-500">{employee.employee_number}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedEmployees.has(employee.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectEmployee(employee.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                        <span>{employee.job_title_en}</span>
                      </div>
                      {employee.departments && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span>{employee.departments.name_en}</span>
                        </div>
                      )}
                      {employee.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                      )}
                      {employee.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{employee.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        employee.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : employee.status === 'on_leave'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.status}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        employee.is_saudi
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {employee.nationality}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(employee);
                        }}
                        className="flex-1 px-3 py-1.5 bg-primary-50 text-primary-700 rounded hover:bg-primary-100 transition-colors text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(employee.id);
                        }}
                        className="px-3 py-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors text-xs font-medium"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {filteredEmployees.length} of {employees.length} employees
            </div>
            <div className="text-xs text-gray-500">
              Press <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono">?</kbd> for keyboard shortcuts
            </div>
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

      {showSavedViews && (
        <SavedViewsManager
          currentFilters={currentFilters}
          currentColumns={columns}
          currentSort={sortConfig}
          onLoadView={handleLoadView}
          onClose={() => setShowSavedViews(false)}
        />
      )}

      {showAnalytics && currentCompany && (
        <EmployeeAnalyticsDashboard
          companyId={currentCompany.id}
        />
      )}

      {showLifecycleTracker && (
        <EmployeeLifecycleTracker
          onClose={() => setShowLifecycleTracker(false)}
        />
      )}

      {showKeyboardShortcuts && (
        <EmployeeKeyboardShortcuts
          onClose={() => setShowKeyboardShortcuts(false)}
        />
      )}
    </div>
  );
}
