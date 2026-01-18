import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, Search, Building2, UserCheck, Save, X } from 'lucide-react';

interface Employee {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
  first_name_ar: string;
  last_name_ar: string;
  email: string;
  department_id: string | null;
  job_title_en: string;
  company_id: string;
  manager_id: string | null;
  manager?: {
    id: string;
    first_name_en: string;
    last_name_en: string;
    first_name_ar: string;
    last_name_ar: string;
  };
  companies?: {
    name_en: string;
    name_ar: string;
  };
  departments?: {
    name_en: string;
    name_ar: string;
  };
}

export default function ManagerAssignment() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { language, t } = useLanguage();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [companies, setCompanies] = useState<Array<{ id: string; name_en: string; name_ar: string }>>([]);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [selectedManager, setSelectedManager] = useState<string>('');

  useEffect(() => {
    if (user) {
      console.log('Loading manager assignment data for user:', user.id);
      loadData();
    }
  }, [selectedCompany, user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Check user role
      const { data: userRoleData } = await supabase
        .from('user_roles')
        .select('role, company_id')
        .eq('user_id', user?.id)
        .single();

      console.log('User role:', userRoleData);

      // Load companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name_en, name_ar')
        .order('name_en');

      if (companiesError) {
        console.error('Error loading companies:', companiesError);
        throw companiesError;
      }
      console.log('Loaded companies:', companiesData?.length || 0);
      setCompanies(companiesData || []);

      // Load employees - simplified query without nested selects to avoid RLS issues
      let query = supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .order('first_name_en');

      if (selectedCompany !== 'all') {
        query = query.eq('company_id', selectedCompany);
        console.log('Loading employees for company:', selectedCompany);
      } else {
        console.log('Loading all employees');
      }

      const { data: employeesData, error: employeesError } = await query;

      if (employeesError) {
        console.error('Error loading employees:', employeesError);
        throw employeesError;
      }

      console.log('Loaded employees:', employeesData?.length || 0);
      console.log('Sample employee data:', employeesData?.[0]);

      // Manually fetch company and department names if needed
      const companyMap = new Map(companiesData?.map(c => [c.id, { name_en: c.name_en, name_ar: c.name_ar }]));

      // Get unique department IDs
      const deptIds = [...new Set(employeesData?.map(e => e.department_id).filter(Boolean))];
      let departmentMap = new Map();

      if (deptIds.length > 0) {
        const { data: depts } = await supabase
          .from('departments')
          .select('id, name_en, name_ar')
          .in('id', deptIds);

        if (depts) {
          departmentMap = new Map(depts.map(d => [d.id, { name_en: d.name_en, name_ar: d.name_ar }]));
        }
      }

      // Manually map manager, company, and department information
      const employeesWithManagers = (employeesData || []).map(emp => {
        const manager = employeesData?.find(e => e.id === emp.manager_id);
        const company = companyMap.get(emp.company_id);
        const department = emp.department_id ? departmentMap.get(emp.department_id) : undefined;

        return {
          ...emp,
          manager: manager ? {
            id: manager.id,
            first_name_en: manager.first_name_en,
            last_name_en: manager.last_name_en,
            first_name_ar: manager.first_name_ar,
            last_name_ar: manager.last_name_ar,
          } : undefined,
          companies: company,
          departments: department
        };
      });

      console.log('Setting employees:', employeesWithManagers.length);
      setEmployees(employeesWithManagers);

      // Set potential managers (all active employees)
      setManagers(employeesWithManagers);
      console.log('Data load complete');
    } catch (error: any) {
      console.error('Error loading data:', error);
      const errorMessage = error.message || 'Failed to load data';
      console.error('Full error details:', JSON.stringify(error, null, 2));
      showToast(
        `${language === 'ar' ? 'خطأ في تحميل البيانات' : 'Error loading data'}: ${errorMessage}`,
        'error'
      );
      setEmployees([]);
      setManagers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (employee: Employee) => {
    setEditingEmployee(employee.id);
    setSelectedManager(employee.manager_id || '');
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setSelectedManager('');
  };

  const handleSaveManager = async (employeeId: string) => {
    try {
      setSaving(employeeId);

      const { error } = await supabase
        .from('employees')
        .update({
          manager_id: selectedManager || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', employeeId);

      if (error) throw error;

      showToast(
        language === 'ar' ? 'تم تحديث المدير بنجاح' : 'Manager updated successfully',
        'success'
      );

      setEditingEmployee(null);
      setSelectedManager('');
      await loadData();
    } catch (error: any) {
      console.error('Error updating manager:', error);
      showToast(error.message, 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleBulkUpdate = async () => {
    if (!window.confirm(
      language === 'ar'
        ? 'هل تريد حقاً تطبيق التغييرات المعلقة؟'
        : 'Are you sure you want to apply pending changes?'
    )) {
      return;
    }

    // Implementation for bulk updates can be added here if needed
    showToast(
      language === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully',
      'success'
    );
  };

  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      emp.first_name_en.toLowerCase().includes(searchLower) ||
      emp.last_name_en.toLowerCase().includes(searchLower) ||
      emp.first_name_ar.includes(searchTerm) ||
      emp.last_name_ar.includes(searchTerm) ||
      emp.employee_number.toLowerCase().includes(searchLower) ||
      (emp.email && emp.email.toLowerCase().includes(searchLower));

    return matchesSearch;
  });

  console.log('Render - Total employees:', employees.length, 'Filtered:', filteredEmployees.length);

  const getEmployeeDisplayName = (emp: Employee) => {
    return language === 'ar'
      ? `${emp.first_name_ar} ${emp.last_name_ar}`
      : `${emp.first_name_en} ${emp.last_name_en}`;
  };

  const getManagersForEmployee = (employeeId: string, employeeCompanyId: string) => {
    // Filter out the employee themselves - allow managers from any company
    return managers.filter(m => m.id !== employeeId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {language === 'ar' ? 'إدارة المديرين' : 'Manager Assignment'}
            </h1>
            <p className="text-sm text-gray-600">
              {language === 'ar'
                ? 'تعيين وإدارة المديرين للموظفين عبر جميع الشركات'
                : 'Assign and manage employee managers across all companies'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              placeholder={language === 'ar' ? 'البحث عن موظف...' : 'Search employee...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent rtl:pr-10 rtl:pl-4"
            />
          </div>

          {/* Company Filter */}
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 rtl:left-auto rtl:right-3" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none rtl:pr-10 rtl:pl-4"
            >
              <option value="all">
                {language === 'ar' ? 'جميع الشركات' : 'All Companies'}
              </option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {language === 'ar' ? company.name_ar : company.name_en}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {language === 'ar' ? 'إجمالي الموظفين' : 'Total Employees'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {language === 'ar' ? 'لديهم مدير' : 'With Manager'}
              </p>
              <p className="text-2xl font-bold text-green-600">
                {employees.filter(e => e.manager_id).length}
              </p>
            </div>
            <UserCheck className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {language === 'ar' ? 'بدون مدير' : 'Without Manager'}
              </p>
              <p className="text-2xl font-bold text-amber-600">
                {employees.filter(e => !e.manager_id).length}
              </p>
            </div>
            <Users className="h-8 w-8 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rtl:text-right">
                  {language === 'ar' ? 'الموظف' : 'Employee'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rtl:text-right">
                  {language === 'ar' ? 'الشركة' : 'Company'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rtl:text-right">
                  {language === 'ar' ? 'القسم' : 'Department'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rtl:text-right">
                  {language === 'ar' ? 'المدير الحالي' : 'Current Manager'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rtl:text-right">
                  {language === 'ar' ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {getEmployeeDisplayName(employee)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {employee.employee_number} • {employee.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {language === 'ar'
                      ? employee.companies?.name_ar
                      : employee.companies?.name_en}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.departments
                      ? (language === 'ar' ? employee.departments.name_ar : employee.departments.name_en)
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingEmployee === employee.id ? (
                      <select
                        value={selectedManager}
                        onChange={(e) => setSelectedManager(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">
                          {language === 'ar' ? 'بدون مدير' : 'No Manager'}
                        </option>
                        {getManagersForEmployee(employee.id, employee.company_id).map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {getEmployeeDisplayName(manager)} ({manager.employee_number})
                            {manager.companies && ` - ${language === 'ar' ? manager.companies.name_ar : manager.companies.name_en}`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm">
                        {employee.manager ? (
                          <span className="text-gray-900">
                            {language === 'ar'
                              ? `${employee.manager.first_name_ar} ${employee.manager.last_name_ar}`
                              : `${employee.manager.first_name_en} ${employee.manager.last_name_en}`}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">
                            {language === 'ar' ? 'بدون مدير' : 'No manager assigned'}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {editingEmployee === employee.id ? (
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <button
                          onClick={() => handleSaveManager(employee.id)}
                          disabled={saving === employee.id}
                          className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving === employee.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 rtl:mr-0 rtl:ml-2"></div>
                          ) : (
                            <Save className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                          )}
                          {language === 'ar' ? 'حفظ' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={saving === employee.id}
                          className="inline-flex items-center px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                        >
                          <X className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(employee)}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <UserCheck className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                        {language === 'ar' ? 'تعيين مدير' : 'Assign Manager'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {language === 'ar' ? 'لا توجد موظفين' : 'No employees found'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {employees.length === 0
                  ? (language === 'ar'
                      ? 'لا توجد موظفين في هذه الشركة أو لا يمكنك الوصول إليهم'
                      : 'No employees in this company or you do not have access')
                  : (language === 'ar'
                      ? 'حاول تغيير معايير البحث'
                      : 'Try changing your search criteria')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
