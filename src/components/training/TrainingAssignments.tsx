import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Users, Plus, X, Search, Building2, UserCheck, UserX, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface Employee {
  id: string;
  first_name_en: string;
  last_name_en: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  employee_number: string;
  department_id: string | null;
  company_id: string;
  departments: {
    name_en: string;
    name_ar: string | null;
  } | null;
  companies: {
    name_en: string;
    name_ar: string | null;
  };
}

interface Department {
  id: string;
  name_en: string;
  name_ar: string | null;
  company_id: string;
  companies: {
    name_en: string;
    name_ar: string | null;
  };
}

interface Enrollment {
  id: string;
  employee_id: string;
  enrollment_date: string;
  completion_status: string;
  completion_date: string | null;
  employees: Employee;
}

interface DepartmentAssignment {
  id: string;
  department_id: string;
  assigned_at: string;
  is_mandatory: boolean;
  departments: Department;
}

interface TrainingAssignmentsProps {
  programId: string;
  companyId: string;
}

export default function TrainingAssignments({ programId, companyId }: TrainingAssignmentsProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { language } = useLanguage();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [departmentAssignments, setDepartmentAssignments] = useState<DepartmentAssignment[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { logError } = useErrorHandler();
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [expandedSection, setExpandedSection] = useState<'employees' | 'departments' | null>('employees');

  useEffect(() => {
    if (programId && companyId) {
      fetchData();
    }
  }, [programId, companyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchEnrollments(),
        fetchDepartmentAssignments(),
        fetchAvailableEmployees(),
        fetchAvailableDepartments()
      ]);
    } catch (error) {
      logError(error, 'medium', { component: 'TrainingAssignments', action: 'fetchData' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async () => {
    const { data, error } = await supabase
      .from('training_enrollments')
      .select(`
        id,
        employee_id,
        enrollment_date,
        completion_status,
        completion_date,
        employees:employee_id (
          id,
          first_name_en,
          last_name_en,
          first_name_ar,
          last_name_ar,
          employee_number,
          department_id,
          company_id,
          departments:department_id (
            name_en,
            name_ar
          ),
          companies:company_id (
            name_en,
            name_ar
          )
        )
      `)
      .eq('training_program_id', programId)
      .order('enrollment_date', { ascending: false });

    if (error) throw error;
    setEnrollments(data || []);
  };

  const fetchDepartmentAssignments = async () => {
    const { data, error } = await supabase
      .from('training_department_assignments')
      .select(`
        id,
        department_id,
        assigned_at,
        is_mandatory,
        departments:department_id (
          id,
          name_en,
          name_ar,
          company_id,
          companies:company_id (
            name_en,
            name_ar
          )
        )
      `)
      .eq('training_program_id', programId);

    if (error) throw error;
    setDepartmentAssignments(data || []);
  };

  const fetchAvailableEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        first_name_en,
        last_name_en,
        first_name_ar,
        last_name_ar,
        employee_number,
        department_id,
        company_id,
        departments:department_id (
          name_en,
          name_ar
        ),
        companies:company_id (
          name_en,
          name_ar
        )
      `)
      .eq('status', 'active')
      .order('first_name_en');

    if (error) throw error;
    setAvailableEmployees(data || []);
  };

  const fetchAvailableDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select(`
        id,
        name_en,
        name_ar,
        company_id,
        companies:company_id (
          name_en,
          name_ar
        )
      `)
      .order('name_en');

    if (error) throw error;
    setAvailableDepartments(data || []);
  };

  const handleAssignEmployees = async () => {
    if (selectedEmployees.length === 0) return;

    try {
      const enrollmentData = selectedEmployees.map(empId => ({
        training_program_id: programId,
        employee_id: empId,
        enrollment_date: new Date().toISOString().split('T')[0],
        completion_status: 'enrolled'
      }));

      const { error } = await supabase
        .from('training_enrollments')
        .insert(enrollmentData);

      if (error) throw error;

      showToast(
        language === 'ar'
          ? `تم تسجيل ${selectedEmployees.length} موظف بنجاح`
          : `Successfully enrolled ${selectedEmployees.length} employee(s)`,
        'success'
      );

      setSelectedEmployees([]);
      setShowAddEmployee(false);
      fetchEnrollments();
    } catch (error: any) {
      logError(error, 'medium', { component: 'TrainingAssignments', action: 'assignEmployees' });
      showToast(error.message, 'error');
    }
  };

  const handleAssignDepartments = async () => {
    if (selectedDepartments.length === 0) return;

    try {
      const assignmentData = selectedDepartments.map(deptId => ({
        training_program_id: programId,
        department_id: deptId,
        company_id: companyId,
        assigned_by: user?.id,
        is_mandatory: true
      }));

      const { error: assignError } = await supabase
        .from('training_department_assignments')
        .insert(assignmentData);

      if (assignError) throw assignError;

      for (const deptId of selectedDepartments) {
        const { error: enrollError } = await supabase.rpc('enroll_department_employees', {
          p_training_program_id: programId,
          p_department_id: deptId
        });

        if (enrollError) {
          logError(enrollError, 'medium', { component: 'TrainingAssignments', action: 'autoEnrollDepartmentEmployees' });
        }
      }

      showToast(
        language === 'ar'
          ? `تم تسجيل ${selectedDepartments.length} قسم بنجاح`
          : `Successfully assigned ${selectedDepartments.length} department(s)`,
        'success'
      );

      setSelectedDepartments([]);
      setShowAddDepartment(false);
      fetchData();
    } catch (error: any) {
      logError(error, 'medium', { component: 'TrainingAssignments', action: 'assignDepartments' });
      showToast(error.message, 'error');
    }
  };

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    if (!window.confirm(language === 'ar' ? 'هل تريد إلغاء التسجيل؟' : 'Remove this enrollment?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('training_enrollments')
        .delete()
        .eq('id', enrollmentId);

      if (error) throw error;

      showToast(
        language === 'ar' ? 'تم إلغاء التسجيل بنجاح' : 'Enrollment removed successfully',
        'success'
      );
      fetchEnrollments();
    } catch (error: any) {
      logError(error, 'medium', { component: 'TrainingAssignments', action: 'removeEnrollment' });
      showToast(error.message, 'error');
    }
  };

  const handleRemoveDepartmentAssignment = async (assignmentId: string) => {
    if (!window.confirm(language === 'ar' ? 'هل تريد إلغاء تعيين القسم؟' : 'Remove this department assignment?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('training_department_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      showToast(
        language === 'ar' ? 'تم إلغاء تعيين القسم بنجاح' : 'Department assignment removed successfully',
        'success'
      );
      fetchDepartmentAssignments();
    } catch (error: any) {
      logError(error, 'medium', { component: 'TrainingAssignments', action: 'removeDepartmentAssignment' });
      showToast(error.message, 'error');
    }
  };

  const filteredEmployees = availableEmployees.filter(emp => {
    const isNotEnrolled = !enrollments.some(e => e.employee_id === emp.id);
    if (!isNotEnrolled) return false;

    if (!searchTerm) return true;

    const search = searchTerm.toLowerCase();
    const fullNameEn = `${emp.first_name_en} ${emp.last_name_en}`.toLowerCase();
    const fullNameAr = emp.first_name_ar && emp.last_name_ar
      ? `${emp.first_name_ar} ${emp.last_name_ar}`.toLowerCase()
      : '';
    const empNumber = emp.employee_number.toLowerCase();
    const deptName = emp.departments?.name_en?.toLowerCase() || '';
    const companyName = emp.companies?.name_en?.toLowerCase() || '';

    return fullNameEn.includes(search) ||
      fullNameAr.includes(search) ||
      empNumber.includes(search) ||
      deptName.includes(search) ||
      companyName.includes(search);
  });

  const filteredDepartments = availableDepartments.filter(dept => {
    const isNotAssigned = !departmentAssignments.some(da => da.department_id === dept.id);
    if (!isNotAssigned) return false;

    if (!searchTerm) return true;

    const search = searchTerm.toLowerCase();
    const nameEn = dept.name_en.toLowerCase();
    const nameAr = dept.name_ar?.toLowerCase() || '';
    const companyName = dept.companies?.name_en?.toLowerCase() || '';

    return nameEn.includes(search) || nameAr.includes(search) || companyName.includes(search);
  });

  const getEmployeeName = (emp: Employee) => {
    if (language === 'ar' && emp.first_name_ar && emp.last_name_ar) {
      return `${emp.first_name_ar} ${emp.last_name_ar}`;
    }
    return `${emp.first_name_en} ${emp.last_name_en}`;
  };

  const getDepartmentName = (dept: Department | null) => {
    if (!dept) return '-';
    if (language === 'ar' && dept.name_ar) {
      return dept.name_ar;
    }
    return dept.name_en;
  };

  const getCompanyName = (company: { name_en: string; name_ar: string | null }) => {
    if (language === 'ar' && company.name_ar) {
      return company.name_ar;
    }
    return company.name_en;
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      enrolled: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    const statusLabels = {
      enrolled: language === 'ar' ? 'مسجل' : 'Enrolled',
      completed: language === 'ar' ? 'مكتمل' : 'Completed',
      cancelled: language === 'ar' ? 'ملغي' : 'Cancelled'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors]}`}>
        {statusLabels[status as keyof typeof statusLabels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const enrolledCount = enrollments.length;
  const completedCount = enrollments.filter(e => e.completion_status === 'completed').length;
  const assignedDepartmentCount = departmentAssignments.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {language === 'ar' ? 'الموظفين المسجلين' : 'Enrolled Employees'}
              </p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{enrolledCount}</p>
            </div>
            <UserCheck className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {language === 'ar' ? 'المكتملين' : 'Completed'}
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">{completedCount}</p>
            </div>
            <Users className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {language === 'ar' ? 'الأقسام المعينة' : 'Assigned Departments'}
              </p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{assignedDepartmentCount}</p>
            </div>
            <Building2 className="h-10 w-10 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div
          className="flex items-center justify-between p-4 cursor-pointer border-b border-gray-200 hover:bg-gray-50"
          onClick={() => setExpandedSection(expandedSection === 'employees' ? null : 'employees')}
        >
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {language === 'ar' ? 'الموظفين المسجلين' : 'Enrolled Employees'} ({enrolledCount})
            </h3>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAddEmployee(true);
              }}
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
              {language === 'ar' ? 'إضافة موظف' : 'Add Employee'}
            </button>
            {expandedSection === 'employees' ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>

        {expandedSection === 'employees' && (
          <div className="p-4">
            {enrollments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {language === 'ar' ? 'لا يوجد موظفين مسجلين' : 'No employees enrolled'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ar' ? 'الموظف' : 'Employee'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ar' ? 'القسم' : 'Department'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ar' ? 'الشركة' : 'Company'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ar' ? 'تاريخ التسجيل' : 'Enrolled Date'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ar' ? 'الحالة' : 'Status'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ar' ? 'إجراءات' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {enrollments.map((enrollment) => (
                      <tr key={enrollment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {getEmployeeName(enrollment.employees)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {enrollment.employees.employee_number}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {getDepartmentName(enrollment.employees.departments)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {getCompanyName(enrollment.employees.companies)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(enrollment.enrollment_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(enrollment.completion_status)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleRemoveEnrollment(enrollment.id)}
                            className="text-red-600 hover:text-red-800"
                            title={language === 'ar' ? 'إلغاء التسجيل' : 'Remove'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div
          className="flex items-center justify-between p-4 cursor-pointer border-b border-gray-200 hover:bg-gray-50"
          onClick={() => setExpandedSection(expandedSection === 'departments' ? null : 'departments')}
        >
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Building2 className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {language === 'ar' ? 'الأقسام المعينة' : 'Assigned Departments'} ({assignedDepartmentCount})
            </h3>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAddDepartment(true);
              }}
              className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
              {language === 'ar' ? 'إضافة قسم' : 'Add Department'}
            </button>
            {expandedSection === 'departments' ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>

        {expandedSection === 'departments' && (
          <div className="p-4">
            {departmentAssignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {language === 'ar' ? 'لا يوجد أقسام معينة' : 'No departments assigned'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ar' ? 'القسم' : 'Department'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ar' ? 'الشركة' : 'Company'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ar' ? 'تاريخ التعيين' : 'Assigned Date'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ar' ? 'إجباري' : 'Mandatory'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ar' ? 'إجراءات' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {departmentAssignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {getDepartmentName(assignment.departments)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {getCompanyName(assignment.departments.companies)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(assignment.assigned_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {assignment.is_mandatory ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {language === 'ar' ? 'إجباري' : 'Mandatory'}
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {language === 'ar' ? 'اختياري' : 'Optional'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleRemoveDepartmentAssignment(assignment.id)}
                            className="text-red-600 hover:text-red-800"
                            title={language === 'ar' ? 'إلغاء التعيين' : 'Remove'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {language === 'ar' ? 'إضافة موظفين' : 'Add Employees'}
              </h3>
              <button
                onClick={() => {
                  setShowAddEmployee(false);
                  setSelectedEmployees([]);
                  setSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث عن موظف...' : 'Search employees...'}
                  className="w-full pl-10 rtl:pl-3 rtl:pr-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {selectedEmployees.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  {language === 'ar'
                    ? `تم اختيار ${selectedEmployees.length} موظف`
                    : `${selectedEmployees.length} employee(s) selected`}
                </div>
              )}
            </div>

            <div className="overflow-y-auto max-h-96 p-4">
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {language === 'ar' ? 'لا يوجد موظفين متاحين' : 'No available employees'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEmployees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center space-x-3 rtl:space-x-reverse p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmployees([...selectedEmployees, emp.id]);
                          } else {
                            setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {getEmployeeName(emp)}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center space-x-2 rtl:space-x-reverse mt-1">
                          <span>{emp.employee_number}</span>
                          <span>•</span>
                          <span>{getDepartmentName(emp.departments)}</span>
                          <span>•</span>
                          <span>{getCompanyName(emp.companies)}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 rtl:space-x-reverse p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowAddEmployee(false);
                  setSelectedEmployees([]);
                  setSearchTerm('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleAssignEmployees}
                disabled={selectedEmployees.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {language === 'ar' ? 'إضافة' : 'Add'} ({selectedEmployees.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddDepartment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {language === 'ar' ? 'إضافة أقسام' : 'Add Departments'}
              </h3>
              <button
                onClick={() => {
                  setShowAddDepartment(false);
                  setSelectedDepartments([]);
                  setSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث عن قسم...' : 'Search departments...'}
                  className="w-full pl-10 rtl:pl-3 rtl:pr-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              {selectedDepartments.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  {language === 'ar'
                    ? `تم اختيار ${selectedDepartments.length} قسم`
                    : `${selectedDepartments.length} department(s) selected`}
                </div>
              )}
            </div>

            <div className="overflow-y-auto max-h-96 p-4">
              {filteredDepartments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {language === 'ar' ? 'لا يوجد أقسام متاحة' : 'No available departments'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDepartments.map((dept) => (
                    <label
                      key={dept.id}
                      className="flex items-center space-x-3 rtl:space-x-reverse p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDepartments.includes(dept.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDepartments([...selectedDepartments, dept.id]);
                          } else {
                            setSelectedDepartments(selectedDepartments.filter(id => id !== dept.id));
                          }
                        }}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {getDepartmentName(dept)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {getCompanyName(dept.companies)}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 rtl:space-x-reverse p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowAddDepartment(false);
                  setSelectedDepartments([]);
                  setSearchTerm('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleAssignDepartments}
                disabled={selectedDepartments.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {language === 'ar' ? 'إضافة' : 'Add'} ({selectedDepartments.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
