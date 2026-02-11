import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Employee, Department } from '@/types/database';
import { X } from 'lucide-react';
import { SearchableSelect } from '@/components/SearchableSelect';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface EmployeeFormProps {
  employee: Employee | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmployeeForm({ employee, onClose, onSuccess }: EmployeeFormProps) {
  const { currentCompany, isConsolidatedView, companies: availableCompanies } = useCompany();
  const { t, isRTL } = useLanguage();
  const [companies, setCompanies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [payroll, setPayroll] = useState<any>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    employee?.company_id ||
    currentCompany?.id ||
    (isConsolidatedView && availableCompanies.length > 0 ? availableCompanies[0].id : '')
  );
  const [formData, setFormData] = useState({
    employee_number: employee?.employee_number || '',
    first_name_en: employee?.first_name_en || '',
    last_name_en: employee?.last_name_en || '',
    first_name_ar: employee?.first_name_ar || '',
    last_name_ar: employee?.last_name_ar || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    nationality: employee?.nationality || '',
    is_saudi: employee?.is_saudi || false,
    has_disability: employee?.has_disability || false,
    gender: employee?.gender || 'male',
    date_of_birth: employee?.date_of_birth || '',
    hire_date: employee?.hire_date || new Date().toISOString().split('T')[0],
    probation_end_date: employee?.probation_end_date || '',
    contract_start_date: employee?.contract_start_date || '',
    contract_end_date: employee?.contract_end_date || '',
    job_title_en: employee?.job_title_en || '',
    job_title_ar: employee?.job_title_ar || '',
    employment_type: employee?.employment_type || 'indefinite',
    status: employee?.status || 'active',
    iqama_number: employee?.iqama_number || '',
    iqama_expiry: employee?.iqama_expiry || '',
    passport_number: employee?.passport_number || '',
    passport_expiry: employee?.passport_expiry || '',
    department_id: employee?.department_id || null,
    manager_id: employee?.manager_id || null,
  });
  const [payrollData, setPayrollData] = useState({
    basic_salary: '0',
    housing_allowance: '0',
    transportation_allowance: '0',
    other_allowances: '0',
    iban: '',
    bank_name: '',
  });
  const { logError } = useErrorHandler();

  useEffect(() => {
    fetchCompanies();
    if (employee) {
      fetchPayroll();
    }
  }, [employee]);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchDepartments();
      fetchManagers();
    }
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name_en, name_ar')
        .order('name_en');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'EmployeeForm', action: 'fetchCompanies' });
    }
  };

  const fetchDepartments = async () => {
    if (!selectedCompanyId) return;

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('name_en');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'EmployeeForm', action: 'fetchDepartments' });
    }
  };

  const fetchManagers = async () => {
    if (!selectedCompanyId) return;

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, first_name_en, last_name_en, job_title_en')
        .eq('company_id', selectedCompanyId)
        .eq('status', 'active')
        .order('first_name_en');

      if (error) throw error;
      setManagers(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'EmployeeForm', action: 'fetchManagers' });
    }
  };

  const fetchPayroll = async () => {
    if (!employee) return;

    try {
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .eq('employee_id', employee.id)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPayroll(data);
        setPayrollData({
          basic_salary: data.basic_salary?.toString() || '0',
          housing_allowance: data.housing_allowance?.toString() || '0',
          transportation_allowance: data.transportation_allowance?.toString() || '0',
          other_allowances: data.other_allowances?.toString() || '0',
          iban: data.iban || '',
          bank_name: data.bank_name || '',
        });
      }
    } catch (error) {
      logError(error, 'medium', { component: 'EmployeeForm', action: 'fetchPayroll' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;

    setLoading(true);

    try {
      console.log('Starting employee creation process...');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Session check:', { hasSession: !!session, error: sessionError });

      if (sessionError) {
        logError(sessionError, 'medium', { component: 'EmployeeForm', action: 'sessionError' });
        alert(`Session error: ${sessionError.message}`);
        setLoading(false);
        return;
      }

      if (!session) {
        alert('Your session has expired. Please log in again.');
        setLoading(false);
        return;
      }

      console.log('Checking user role...');
      const { data: userRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      console.log('User role check:', { role: userRoles?.role, error: roleError });

      if (roleError) {
        logError(roleError, 'medium', { component: 'EmployeeForm', action: 'checkUserRole' });
        alert(`Error checking permissions: ${roleError.message}`);
        setLoading(false);
        return;
      }

      if (!userRoles || !['hr', 'super_admin'].includes(userRoles.role)) {
        alert('You do not have permission to create employees. Only HR and Super Admin users can create employees.');
        setLoading(false);
        return;
      }

      const employeeData = {
        ...formData,
        company_id: selectedCompanyId,
        department_id: formData.department_id || null,
        manager_id: formData.manager_id || null,
        first_name_ar: formData.first_name_ar || null,
        last_name_ar: formData.last_name_ar || null,
        email: formData.email || null,
        phone: formData.phone || null,
        date_of_birth: formData.date_of_birth || null,
        probation_end_date: formData.probation_end_date || null,
        contract_start_date: formData.contract_start_date || null,
        contract_end_date: formData.contract_end_date || null,
        job_title_ar: formData.job_title_ar || null,
        iqama_number: formData.iqama_number || null,
        iqama_expiry: formData.iqama_expiry || null,
        passport_number: formData.passport_number || null,
        passport_expiry: formData.passport_expiry || null,
      };

      let employeeId = employee?.id;

      if (employee) {
        console.log('Updating existing employee...');
        const { error } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', employee.id);

        console.log('Update result:', { error });
        if (error) throw error;
      } else {
        console.log('Creating new employee with data:', employeeData);
        const { data, error } = await supabase
          .from('employees')
          .insert([employeeData])
          .select();

        console.log('Insert result:', { data, error });
        if (error) throw error;
        if (data && data[0]) {
          employeeId = data[0].id;
          console.log('New employee created with ID:', employeeId);
        }
      }

      if (employeeId && parseFloat(payrollData.basic_salary) > 0) {
        const basicSalary = parseFloat(payrollData.basic_salary) || 0;
        const housingAllowance = parseFloat(payrollData.housing_allowance) || 0;
        const transportationAllowance = parseFloat(payrollData.transportation_allowance) || 0;
        const otherAllowances = parseFloat(payrollData.other_allowances) || 0;
        const grossSalary = basicSalary + housingAllowance + transportationAllowance + otherAllowances;

        const gosiWageCeiling = 45000;
        const gosiBase = basicSalary + housingAllowance;
        const gosiWage = Math.min(gosiBase, gosiWageCeiling);

        let gosiEmployee = 0;
        let gosiEmployer = 0;

        if (formData.is_saudi) {
          gosiEmployee = gosiWage * 0.0975;
          gosiEmployer = gosiWage * 0.1175;
        } else {
          gosiEmployee = 0;
          gosiEmployer = gosiWage * 0.02;
        }

        const payrollRecord = {
          employee_id: employeeId,
          company_id: selectedCompanyId,
          basic_salary: basicSalary,
          housing_allowance: housingAllowance,
          transportation_allowance: transportationAllowance,
          other_allowances: otherAllowances,
          gross_salary: grossSalary,
          gosi_employee: gosiEmployee,
          gosi_employer: gosiEmployer,
          net_salary: grossSalary - gosiEmployee,
          iban: payrollData.iban || null,
          bank_name: payrollData.bank_name || null,
          effective_from: formData.hire_date,
        };

        if (payroll) {
          const { data: allPayrollRecords } = await supabase
            .from('payroll')
            .select('id')
            .eq('employee_id', employeeId);

          if (allPayrollRecords && allPayrollRecords.length > 0) {
            const payrollIds = allPayrollRecords.map(p => p.id);
            await supabase
              .from('payroll')
              .update(payrollRecord)
              .in('id', payrollIds);
          }
        } else {
          await supabase
            .from('payroll')
            .insert(payrollRecord);
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      logError(error, 'medium', { component: 'EmployeeForm', action: 'saveEmployee' });

      let errorMessage = 'Failed to save employee';

      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection and try again.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      if (error?.details) {
        errorMessage += `\n\nDetails: ${error.details}`;
      }

      if (error?.hint) {
        errorMessage += `\n\nHint: ${error.hint}`;
      }

      if (error?.code === 'PGRST301') {
        errorMessage = 'Permission denied. You may not have the required role to create employees. Please contact your system administrator.';
      }


      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handlePayrollChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPayrollData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 max-h-[90vh] flex flex-col">
        <div className={`flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h2 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {employee ? t.employees.editEmployee : t.employees.addEmployee}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form id="employee-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.common.company} *
              </label>
              <SearchableSelect
                options={[
                  { value: '', label: t.employees.selectCompany },
                  ...companies.map(company => ({
                    value: company.id,
                    label: company.name_en,
                    searchText: `${company.name_en} ${company.name_ar || ''}`
                  }))
                ]}
                value={selectedCompanyId}
                onChange={(value) => {
                  setSelectedCompanyId(value);
                  setFormData(prev => ({ ...prev, department_id: null }));
                }}
                placeholder={t.employees.selectCompany}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.common.department}
              </label>
              <SearchableSelect
                options={[
                  ...departments.map(dept => ({
                    value: dept.id,
                    label: dept.name_en,
                    searchText: `${dept.name_en} ${dept.name_ar || ''}`
                  }))
                ]}
                value={formData.department_id || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, department_id: value || null }))}
                placeholder={t.employees.selectDepartment}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.directManager}
              </label>
              <SearchableSelect
                options={[
                  ...managers
                    .filter(m => m.id !== employee?.id)
                    .map(manager => ({
                      value: manager.id,
                      label: `${manager.first_name_en} ${manager.last_name_en}`,
                      searchText: `${manager.first_name_en} ${manager.last_name_en} ${manager.employee_number} ${manager.job_title_en || ''}`
                    }))
                ]}
                value={formData.manager_id || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, manager_id: value || null }))}
                placeholder={t.employees.selectManager}
              />
              <p className={`mt-1 text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.selectManagerHelp}
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.employeeNumber} *
              </label>
              <input
                type="text"
                name="employee_number"
                required
                value={formData.employee_number}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.employeeNameEn} *
              </label>
              <input
                type="text"
                value={`${formData.first_name_en} ${formData.last_name_en}`.trim()}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed text-left"
                placeholder={t.employees.autoGenerated}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.employeeNameAr}
              </label>
              <input
                type="text"
                value={`${formData.first_name_ar} ${formData.last_name_ar}`.trim()}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
                placeholder={t.employees.autoGenerated}
                dir="rtl"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.firstNameEn} *
              </label>
              <input
                type="text"
                name="first_name_en"
                required
                value={formData.first_name_en}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-left"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.lastNameEn} *
              </label>
              <input
                type="text"
                name="last_name_en"
                required
                value={formData.last_name_en}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-left"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.firstNameAr}
              </label>
              <input
                type="text"
                name="first_name_ar"
                value={formData.first_name_ar}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                dir="rtl"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.lastNameAr}
              </label>
              <input
                type="text"
                name="last_name_ar"
                value={formData.last_name_ar}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                dir="rtl"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.common.email}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.common.phone}
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.nationality} *
              </label>
              <input
                type="text"
                name="nationality"
                required
                value={formData.nationality}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.gender} *
              </label>
              <select
                name="gender"
                required
                value={formData.gender}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <option value="male">{t.employees.male}</option>
                <option value="female">{t.employees.female}</option>
              </select>
            </div>

            <div className="md:col-span-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 cursor-pointer ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <input
                      type="checkbox"
                      name="is_saudi"
                      checked={formData.is_saudi}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{t.employees.isSaudi}</span>
                  </label>
                </div>
                {formData.is_saudi && (
                  <div>
                    <label className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 cursor-pointer ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                      <input
                        type="checkbox"
                        name="has_disability"
                        checked={formData.has_disability}
                        onChange={handleChange}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{t.employees.hasDisability}</span>
                    </label>
                    <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'mr-6 text-right' : 'ml-6 text-left'}`}>
                      {t.employees.disabilityHelp}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.dateOfBirth}
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.hireDate} *
              </label>
              <input
                type="date"
                name="hire_date"
                required
                value={formData.hire_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.probationEndDate}
              </label>
              <input
                type="date"
                name="probation_end_date"
                value={formData.probation_end_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.contractStartDate}
              </label>
              <input
                type="date"
                name="contract_start_date"
                value={formData.contract_start_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.contractEndDate}
              </label>
              <input
                type="date"
                name="contract_end_date"
                value={formData.contract_end_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
              />
              <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.employees.leaveEmpty}</p>
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.jobTitleEn} *
              </label>
              <input
                type="text"
                name="job_title_en"
                required
                value={formData.job_title_en}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-left"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.jobTitleAr}
              </label>
              <input
                type="text"
                name="job_title_ar"
                value={formData.job_title_ar}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                dir="rtl"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.employmentType} *
              </label>
              <select
                name="employment_type"
                required
                value={formData.employment_type}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <option value="indefinite">{t.employees.indefinite}</option>
                <option value="fixed_term">{t.employees.fixedTerm}</option>
                <option value="temporary">{t.employees.temporary}</option>
                <option value="part_time">{t.employees.partTime}</option>
                <option value="seasonal">{t.employees.seasonal}</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.status} *
              </label>
              <select
                name="status"
                required
                value={formData.status}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <option value="active">{t.common.active}</option>
                <option value="on_leave">{t.employees.onLeave}</option>
                <option value="terminated">{t.dashboard.terminated}</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.iqamaNumber}
              </label>
              <input
                type="text"
                name="iqama_number"
                value={formData.iqama_number}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.iqamaExpiry}
              </label>
              <input
                type="date"
                name="iqama_expiry"
                value={formData.iqama_expiry}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.passportNumber}
              </label>
              <input
                type="text"
                name="passport_number"
                value={formData.passport_number}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.passportExpiry}
              </label>
              <input
                type="date"
                name="passport_expiry"
                value={formData.passport_expiry}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.employees.payrollInformation}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.employees.basicSalary}
                </label>
                <input
                  type="number"
                  name="basic_salary"
                  min="0"
                  step="0.01"
                  value={payrollData.basic_salary}
                  onChange={handlePayrollChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.employees.housingAllowance}
                </label>
                <input
                  type="number"
                  name="housing_allowance"
                  min="0"
                  step="0.01"
                  value={payrollData.housing_allowance}
                  onChange={handlePayrollChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.employees.transportationAllowance}
                </label>
                <input
                  type="number"
                  name="transportation_allowance"
                  min="0"
                  step="0.01"
                  value={payrollData.transportation_allowance}
                  onChange={handlePayrollChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.employees.otherAllowances}
                </label>
                <input
                  type="number"
                  name="other_allowances"
                  min="0"
                  step="0.01"
                  value={payrollData.other_allowances}
                  onChange={handlePayrollChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.employees.iban}
                </label>
                <input
                  type="text"
                  name="iban"
                  value={payrollData.iban}
                  onChange={handlePayrollChange}
                  placeholder={t.employees.ibanPlaceholder}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.employees.bankName}
                </label>
                <input
                  type="text"
                  name="bank_name"
                  value={payrollData.bank_name}
                  onChange={handlePayrollChange}
                  placeholder={t.employees.bankNamePlaceholder}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className={`text-sm font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t.employees.gosiCalculation}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className={`flex justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-gray-600">{t.employees.grossSalary}:</span>
                    <span className="font-medium">
                      {(
                        (parseFloat(payrollData.basic_salary) || 0) +
                        (parseFloat(payrollData.housing_allowance) || 0) +
                        (parseFloat(payrollData.transportation_allowance) || 0) +
                        (parseFloat(payrollData.other_allowances) || 0)
                      ).toLocaleString('en-SA', { minimumFractionDigits: 2 })} SAR
                    </span>
                  </div>
                  <div className={`flex justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-gray-600">{t.employees.gosiWageBase}:</span>
                    <span className="font-medium">
                      {(
                        (parseFloat(payrollData.basic_salary) || 0) +
                        (parseFloat(payrollData.housing_allowance) || 0)
                      ).toLocaleString('en-SA', { minimumFractionDigits: 2 })} SAR
                    </span>
                  </div>
                  <div className={`flex justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-gray-600">{t.employees.gosiWageCapped}:</span>
                    <span className="font-medium">
                      {Math.min(
                        (parseFloat(payrollData.basic_salary) || 0) +
                        (parseFloat(payrollData.housing_allowance) || 0),
                        45000
                      ).toLocaleString('en-SA', { minimumFractionDigits: 2 })} SAR
                    </span>
                  </div>
                </div>
                <div>
                  <div className={`flex justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-gray-600">{t.employees.employeeGosi} ({formData.is_saudi ? '9.75%' : '0%'}):</span>
                    <span className="font-medium text-red-600">
                      {(() => {
                        const gosiBase = (parseFloat(payrollData.basic_salary) || 0) + (parseFloat(payrollData.housing_allowance) || 0);
                        const gosiWage = Math.min(gosiBase, 45000);
                        const rate = formData.is_saudi ? 0.0975 : 0;
                        return (gosiWage * rate).toLocaleString('en-SA', { minimumFractionDigits: 2 });
                      })()} SAR
                    </span>
                  </div>
                  <div className={`flex justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-gray-600">{t.employees.employerGosi} ({formData.is_saudi ? '11.75%' : '2%'}):</span>
                    <span className="font-medium text-orange-600">
                      {(() => {
                        const gosiBase = (parseFloat(payrollData.basic_salary) || 0) + (parseFloat(payrollData.housing_allowance) || 0);
                        const gosiWage = Math.min(gosiBase, 45000);
                        const rate = formData.is_saudi ? 0.1175 : 0.02;
                        return (gosiWage * rate).toLocaleString('en-SA', { minimumFractionDigits: 2 });
                      })()} SAR
                    </span>
                  </div>
                  <div className={`flex justify-between pt-2 border-t border-blue-300 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-gray-900 font-semibold">{t.employees.netSalary}:</span>
                    <span className="font-bold text-green-600">
                      {(() => {
                        const grossSalary = (parseFloat(payrollData.basic_salary) || 0) +
                          (parseFloat(payrollData.housing_allowance) || 0) +
                          (parseFloat(payrollData.transportation_allowance) || 0) +
                          (parseFloat(payrollData.other_allowances) || 0);
                        const gosiBase = (parseFloat(payrollData.basic_salary) || 0) + (parseFloat(payrollData.housing_allowance) || 0);
                        const gosiWage = Math.min(gosiBase, 45000);
                        const rate = formData.is_saudi ? 0.0975 : 0;
                        const netSalary = grossSalary - (gosiWage * rate);
                        return netSalary.toLocaleString('en-SA', { minimumFractionDigits: 2 });
                      })()} SAR
                    </span>
                  </div>
                </div>
              </div>
              <div className={`text-xs text-gray-500 mt-3 space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {formData.is_saudi ? (
                  <>
                    <p className="font-medium">{t.employees.gosiSaudiTotal}</p>
                    <p className={isRTL ? 'mr-2' : 'ml-2'}>• {t.employees.gosiSaudiBreakdown1}</p>
                    <p className={isRTL ? 'mr-2' : 'ml-2'}>• {t.employees.gosiSaudiBreakdown2}</p>
                    <p className={isRTL ? 'mr-2' : 'ml-2'}>• {t.employees.gosiSaudiBreakdown3}</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">{t.employees.gosiNonSaudiTotal}</p>
                    <p className={isRTL ? 'mr-2' : 'ml-2'}>• {t.employees.gosiNonSaudiBreakdown}</p>
                  </>
                )}
                <p className="font-medium mt-2">{t.employees.gosiCalculatedOn}</p>
              </div>
            </div>
          </div>

        </form>

        <div className={`flex ${isRTL ? 'flex-row-reverse space-x-reverse' : 'justify-end'} space-x-3 p-6 border-t border-gray-200 flex-shrink-0 bg-white`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            form="employee-form"
            disabled={loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t.employees.saving : employee ? t.employees.updateEmployee : t.employees.addEmployee}
          </button>
        </div>
      </div>
    </div>
  );
}
